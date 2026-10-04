# Synthesizes the built-in sounds that are not from Mixkit:
#   correct.mp3, wrong.mp3, applause.mp3, clapping.mp3 (apps/web/public/sounds)
#   background.mp3 (apps/web/src/assets)
# Run from the repository root (needs uv and lame):
#   uv run --with numpy --with scipy python tools/media/sounds.py
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
rng = np.random.default_rng(11)
ROOT = Path(__file__).resolve().parents[2]


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def seconds(t):
    return np.arange(int(t * SR)) / SR


def env(n, a=0.01, r=0.1):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.clip((n / SR - t) / max(r, 1e-4), 0, 1)


def add(buf, start, sig, pan=0.0):
    """Mixes sig (mono or stereo) into the stereo buf at start seconds."""
    i = int(start * SR)
    if i >= len(buf):
        return
    if sig.ndim == 1:
        left, right = np.sqrt((1 - pan) / 2), np.sqrt((1 + pan) / 2)
        sig = np.stack([sig * left, sig * right], axis=1)
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += sig


def lowpass(x, cutoff, order=2):
    return sosfilt(butter(order, min(cutoff, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def osc(freq, dur, kind="saw", detune=0.0, vibrato=0.0):
    t = seconds(dur)
    out = np.zeros(len(t))
    voices = [0.0] if not detune else [-detune, 0.0, detune]
    for d in voices:
        f = freq * (1 + d) * (1 + vibrato * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.3))
        ph = 2 * np.pi * np.cumsum(f) / SR
        if kind == "sine":
            w = np.sin(ph)
        elif kind == "saw":
            w = sum(np.sin(k * ph) / k for k in range(1, 16)) * 0.6
        elif kind == "square":
            w = sum(np.sin(k * ph) / k for k in range(1, 18, 2)) * 0.8
        else:  # triangle
            w = sum(((-1) ** ((k - 1) // 2)) * np.sin(k * ph) / k**2 for k in range(1, 12, 2)) * 0.9
        out += w
    return out / len(voices)


def bell(freq, dur=1.2, decay=0.5):
    t = seconds(dur)
    s = (
        np.sin(2 * np.pi * freq * t)
        + 0.5 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t / 0.25)
        + 0.25 * np.sin(2 * np.pi * freq * 5.4 * t) * np.exp(-t / 0.1)
    )
    return s * np.exp(-t / decay) * env(len(t), 0.002, 0.05)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def reverb(x, length=1.2, decay=0.35, mix=0.18):
    """Stereo room: exponentially decaying noise, a different tail per side."""
    t = seconds(length)
    out = np.empty_like(x)
    for ch in range(2):
        ir = rng.standard_normal(len(t)) * np.exp(-t / decay)
        ir = lowpass(ir, 6000)
        ir /= np.sqrt(np.sum(ir**2))
        out[:, ch] = fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - mix) + out * mix * 2.5


# peak sets the level; each file matches the loudness of the one it replaced.
def write(buf, path, peak=0.89, fade=0.0):
    n = len(buf)
    if fade:
        t = np.arange(n) / SR
        buf = buf * np.clip((n / SR - t) / fade, 0, 1)[:, None]
    buf = np.tanh(buf / np.max(np.abs(buf)) * 1.3) / np.tanh(1.3) * peak
    wav = path.with_suffix(".wav")
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())
    subprocess.run(["lame", "--silent", "-V", "4", str(wav), str(path)], check=True)
    wav.unlink()
    print(path.relative_to(ROOT), f"{n / SR:.1f}s")


# ---------------------------------------------------------------- verdicts


def correct():
    # A bright rising chime with a shimmer on top.
    buf = np.zeros((int(2.0 * SR), 2))
    for i, n in enumerate([72, 76, 79, 84]):
        add(buf, i * 0.075, bell(midi(n), 1.6, 0.45) * 0.22, pan=-0.3 + i * 0.2)
        add(buf, i * 0.075, osc(midi(n), 0.25, "square") * env(int(0.25 * SR), 0.003, 0.2) * 0.04)
    for n in [84, 88, 91]:
        add(buf, 0.3, bell(midi(n), 1.6, 0.6) * 0.16)
    sparkle = bandpass(noise(1.4), 6000, 12000) * np.exp(-seconds(1.4) / 0.35) * 0.05
    add(buf, 0.3, sparkle)
    write(reverb(buf, mix=0.22), ROOT / "apps/web/public/sounds/correct.mp3", peak=0.64)


def wrong():
    # Two low, sour buzzer blasts.
    buf = np.zeros((int(2.0 * SR), 2))
    for start, dur in [(0.0, 0.32), (0.42, 0.75)]:
        tone = osc(midi(40), dur, "square", detune=0.012) + 0.6 * osc(midi(41), dur, "saw")
        tone = lowpass(tone, 1800) * env(len(tone), 0.01, 0.06)
        add(buf, start, tone * 0.5)
    write(reverb(buf, mix=0.12), ROOT / "apps/web/public/sounds/wrong.mp3")


# ---------------------------------------------------------------- applause


def clap_bank(count=48):
    """Single hand claps: short filtered noise bursts, each a little different."""
    bank = []
    for _ in range(count):
        dur = 0.09
        t = seconds(dur)
        centre = rng.uniform(900, 2600)
        burst = bandpass(noise(dur), centre * 0.55, min(centre * 1.9, 9000)) * np.exp(-t / rng.uniform(0.006, 0.016))
        body = np.sin(2 * np.pi * rng.uniform(180, 320) * t) * np.exp(-t / 0.01) * 0.3
        bank.append((burst / np.max(np.abs(burst)) + body) * env(len(t), 0.0005, 0.02))
    return bank


def crowd(length, people, rate, swell, stop, level_spread=0.7):
    """people clapping at about rate claps per second; swell is the fade-in
    time and stop the window (start, end) in which each person stops."""
    buf = np.zeros((int(length * SR), 2))
    bank = clap_bank()
    for _ in range(people):
        pace = 1 / rng.uniform(rate * 0.8, rate * 1.2)
        start = rng.uniform(0, swell)
        end = rng.uniform(*stop)
        level = rng.uniform(1 - level_spread, 1.0) ** 2
        pan = rng.uniform(-0.9, 0.9)
        t = start
        while t < end:
            fade = min(1, (end - t) / 1.2)
            add(buf, t, bank[rng.integers(len(bank))] * level * fade * rng.uniform(0.7, 1.0), pan)
            t += pace * rng.uniform(0.85, 1.15)
    return buf


def applause():
    # A large audience: a quick swell, a long sustain, then people stop one by one.
    length = 17.0
    buf = crowd(length, people=90, rate=4.6, swell=1.0, stop=(9.0, 16.5))
    # The roar under the claps.
    wash = bandpass(noise(length), 700, 5000)
    shape = np.minimum(1, seconds(length) / 1.0) * np.clip((15.5 - seconds(length)) / 6.0, 0, 1)
    add(buf, 0, wash * shape * 0.012)
    write(reverb(buf, length=1.6, decay=0.5, mix=0.3), ROOT / "apps/web/public/sounds/applause.mp3", peak=0.57, fade=1.0)


def clapping():
    # A smaller, closer group clapping steadily.
    length = 14.5
    buf = crowd(length, people=24, rate=4.0, swell=0.6, stop=(10.5, 14.0), level_spread=0.5)
    write(reverb(buf, length=1.0, decay=0.3, mix=0.2), ROOT / "apps/web/public/sounds/clapping.mp3", peak=0.26, fade=0.8)


# ---------------------------------------------------------------- theme

BPM = 132
BEAT = 60 / BPM
BAR = 4 * BEAT


def kick(dur=0.4):
    t = seconds(dur)
    f = 48 + 120 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14)


def doum(dur=0.45):
    # Darbuka bass stroke: a pitched thump.
    t = seconds(dur)
    f = 95 + 40 * np.exp(-t / 0.02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) + 0.15 * lowpass(noise(dur), 800) * np.exp(-t / 0.02)


def tak(dur=0.15):
    # Darbuka rim stroke: bright and dry.
    t = seconds(dur)
    ring = np.sin(2 * np.pi * 620 * t) * np.exp(-t / 0.025)
    snap = bandpass(noise(dur), 2500, 9000) * np.exp(-t / 0.012)
    return ring * 0.5 + snap


def hat(dur=0.06):
    return bandpass(noise(dur), 7000, 15000) * np.exp(-seconds(dur) / 0.012)


def crash(dur=2.5):
    return bandpass(noise(dur), 4000, 14000) * np.exp(-seconds(dur) / 0.7)


def brass(freq, dur):
    """A synth-brass lead: detuned saws behind a filter that opens on attack."""
    raw = osc(freq, dur + 0.15, "saw", detune=0.004, vibrato=0.004)
    t = seconds(dur + 0.15)
    bright = lowpass(raw, 4500)
    dark = lowpass(raw, 1100)
    mix = np.exp(-t / 0.18)
    return (dark * (1 - mix) + bright * mix) * env(len(t), 0.025, 0.12)


def strings(freqs, dur):
    out = sum(osc(f, dur + 0.4, "saw", detune=0.006) for f in freqs)
    return lowpass(out, 2200) * env(int((dur + 0.4) * SR), 0.35, 0.4)


def bass(freq, dur):
    raw = osc(freq, dur, "saw") * 0.6 + osc(freq, dur, "tri")
    return lowpass(raw, 700) * env(len(raw), 0.005, 0.05)


# Harmonic minor in A gives the theme its eastern colour; the B section
# moves to the relative major.
A_CHORDS = [(45, [57, 60, 64]), (41, [57, 60, 65]), (43, [55, 59, 62]), (40, [56, 59, 64])]  # Am F G E
B_CHORDS = [(48, [55, 60, 64]), (43, [55, 59, 62]), (45, [57, 60, 64]), (40, [56, 59, 64])]  # C G Am E
A_MELODY = [
    [(0, 76, 1), (1, 81, 1), (2, 80, 0.5), (2.5, 77, 0.5), (3, 76, 1)],
    [(0, 77, 1.5), (1.5, 76, 0.5), (2, 74, 1), (3, 72, 1)],
    [(0, 74, 0.5), (0.5, 76, 0.5), (1, 77, 1), (2, 79, 1), (3, 77, 0.5), (3.5, 76, 0.5)],
    [(0, 76, 2), (2, 71, 1), (3, 80, 1)],
    [(0, 81, 1), (1, 84, 1), (2, 83, 0.5), (2.5, 81, 0.5), (3, 80, 1)],
    [(0, 81, 1.5), (1.5, 77, 0.5), (2, 76, 1), (3, 74, 1)],
    [(0, 74, 0.5), (0.5, 76, 0.5), (1, 77, 0.5), (1.5, 79, 0.5), (2, 80, 0.5), (2.5, 77, 0.5), (3, 74, 1)],
    [(0, 76, 0.5), (0.5, 80, 0.5), (1, 81, 3)],
]
B_MELODY = [
    [(0, 72, 0.5), (0.5, 76, 0.5), (1, 79, 1), (2, 84, 1), (3, 83, 0.5), (3.5, 81, 0.5)],
    [(0, 79, 1.5), (1.5, 77, 0.5), (2, 76, 1), (3, 74, 1)],
    [(0, 76, 0.5), (0.5, 77, 0.5), (1, 79, 0.5), (1.5, 81, 0.5), (2, 84, 1), (3, 83, 1)],
    [(0, 80, 2), (2, 83, 1), (3, 80, 1)],
]
# Maqsum on the darbuka, in eighths: doum tak . tak doum . tak .
MAQSUM = ["D", "T", None, "T", "D", None, "T", None]


def theme():
    sections = [("intro", 2), ("A", 8), ("B", 8), ("A", 8), ("break", 4), ("B", 8), ("A", 8), ("outro", 2)]
    bars = sum(n for _, n in sections)
    buf = np.zeros((int((bars * BAR + 3) * SR), 2))
    bar = 0
    for name, count in sections:
        for b in range(count):
            s = bar * BAR
            if name in ("intro", "outro"):
                # Fanfare: brass stabs on the chord, timpani-like kicks.
                for k, (off, n) in enumerate([(0, 69), (1.5, 72), (2, 76), (3, 81)] if b == 0 else [(0, 80), (2, 81)]):
                    for interval in (0, -4, -9):
                        add(buf, s + off * BEAT, brass(midi(n + interval), (1.5 if b else 1.0) * BEAT) * 0.05)
                    add(buf, s + off * BEAT, kick() * 0.5)
                if name == "outro" and b == count - 1:
                    add(buf, s + 2 * BEAT, crash(3) * 0.12)
            else:
                chords = A_CHORDS if name == "A" else B_CHORDS
                root, chord = chords[b % 4]
                add(buf, s, strings([midi(c) for c in chord], BAR) * 0.035, pan=-0.2)
                # Bass on eighths, darbuka maqsum, hats on the off-beats.
                for e in range(8):
                    t = s + e * BEAT / 2
                    if name != "break" or e % 2 == 0:
                        add(buf, t, bass(midi(root - 12 + (12 if e in (3, 7) else 0)), BEAT / 2 * 0.9) * 0.22)
                    hit = MAQSUM[e]
                    if hit == "D":
                        add(buf, t, doum() * 0.5)
                    elif hit == "T":
                        add(buf, t, tak() * 0.18, pan=0.25)
                    if e % 2 == 1:
                        add(buf, t, hat() * 0.06, pan=-0.35)
                if name != "break":
                    add(buf, s, kick() * 0.35)
                    add(buf, s + 2 * BEAT, kick() * 0.3)
                if b == 0:
                    add(buf, s, crash() * 0.1)
                melody = A_MELODY[b % 8] if name == "A" else B_MELODY[b % 4] if name == "B" else []
                for off, n, d in melody:
                    add(buf, s + off * BEAT, brass(midi(n), d * BEAT * 0.95) * 0.07, pan=0.1)
                    add(buf, s + off * BEAT, bell(midi(n + 12), 0.5, 0.3) * 0.025, pan=0.3)
                if name == "break":
                    # Darbuka fill over held strings, building back in.
                    for k in range(4 if b < 3 else 8):
                        add(buf, s + 2 * BEAT + k * BEAT / (2 if b < 3 else 4), tak() * 0.14, pan=0.25)
            bar += 1
    write(reverb(buf, length=1.8, decay=0.45, mix=0.2), ROOT / "apps/web/src/assets/background.mp3", fade=2.0)


if __name__ == "__main__":
    correct()
    wrong()
    applause()
    clapping()
    theme()
