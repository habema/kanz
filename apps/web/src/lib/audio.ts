// Everything the main screen plays. Browsers only allow sound after a click on
// the page, so each player reports when it was blocked.
import type { Music } from '@kanz/api-client-react';
import { builtinSound, type GameSound } from '@kanz/game-core';
import { mediaUrl } from '@/lib/media';

// Replacements for the game sounds from the setup page (media.sounds).
let soundOverrides: Record<string, string> = {};
export function setSoundOverrides(sounds: Record<string, string> | undefined) {
  soundOverrides = sounds ?? {};
}
export const soundUrl = (name: GameSound) => soundOverrides[name] ?? mediaUrl(builtinSound(name));

// Resolves false when the browser blocks playback until the page is clicked.
const played = (playing: Promise<void>) =>
  playing.then(
    () => true,
    (error: unknown) => !(error instanceof DOMException && error.name === 'NotAllowedError'),
  );

function fadeOut(audio: HTMLMediaElement, ms: number) {
  const start = audio.volume;
  const began = performance.now();
  const step = () => {
    const left = ms > 0 ? 1 - (performance.now() - began) / ms : 0;
    if (left <= 0) {
      audio.pause();
      return;
    }
    audio.volume = start * left;
    requestAnimationFrame(step);
  };
  step();
}

// Short synthesized stings, so they need no file.
let cueContext: AudioContext | undefined;
export function unlockAudio() {
  bedBlocked = false;
  const AudioContextConstructor =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;
  cueContext ??= new AudioContextConstructor();
  void cueContext.resume();
}
export function playCue(kind: 'award' | 'reveal') {
  const context = cueContext;
  if (!context || context.state !== 'running') return;
  const now = context.currentTime + 0.02;
  const note = (
    frequency: number,
    offset: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sawtooth',
  ) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + offset;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  };
  if (kind === 'award') {
    // Short swung brass-like seventh-chord sting.
    [261.6, 329.6, 392, 466.2].forEach((f) => note(f, 0, 0.16, 0.018));
    [293.7, 370, 440, 523.3].forEach((f) => note(f, 0.23, 0.17, 0.018));
    [329.6, 392, 493.9, 587.3].forEach((f) => note(f, 0.4, 0.42, 0.022));
    note(196, 0, 0.23, 0.035);
    note(220, 0.23, 0.2, 0.035);
    note(261.6, 0.4, 0.36, 0.04);
  } else {
    note(523.3, 0, 0.12, 0.03, 'triangle');
    note(659.3, 0.1, 0.25, 0.03, 'triangle');
  }
}

// Every clip or video counts as foreground while it plays; the background
// music waits until they are all done.
const foreground = new Set<HTMLMediaElement>();
let quietSince = 0;
export function trackForeground<T extends HTMLMediaElement>(media: T) {
  const off = () => {
    if (foreground.delete(media) && foreground.size === 0) quietSince = performance.now();
  };
  media.addEventListener('playing', () => foreground.add(media));
  media.addEventListener('pause', off);
  media.addEventListener('ended', off);
  media.addEventListener('emptied', off);
  return media;
}

// Background music: loops with a fade at both ends, fades out when other
// audio starts and back in once it has been quiet for a moment. The admin
// turns it on/off and sets its volume.
const BED_EDGE_S = 2.5;
const BED_IN_MS = 1800;
const BED_OUT_MS = 500;
const BED_GRACE_MS = 700;
const BED_TICK_MS = 50;
let bed: HTMLAudioElement | undefined;
let bedTimer: number | undefined;
let bedMusic: Music = { on: false, volume: 0 };
let bedGain = 0;
let bedStarting = false;
let bedBlocked = false;
let bedOnBlocked = () => {};
export function setBackgroundMusic(music: Music, track: string, onBlocked: () => void) {
  bedMusic = music;
  bedOnBlocked = onBlocked;
  bedTimer ??= window.setInterval(tickBed, BED_TICK_MS);
  if (bed?.src.endsWith(track)) return;
  if (bed) {
    bed.pause();
    bed.src = track;
    return;
  }
  bed = new Audio(track);
  bed.preload = 'auto';
}
function tickBed() {
  const audio = bed;
  if (!audio) return;
  const want = bedMusic.on && foreground.size === 0 && performance.now() - quietSince > BED_GRACE_MS;
  bedGain = want ? Math.min(1, bedGain + BED_TICK_MS / BED_IN_MS) : Math.max(0, bedGain - BED_TICK_MS / BED_OUT_MS);
  if (want && audio.paused && !bedStarting && !bedBlocked) {
    // After the track ends, play() starts it again from the top.
    bedStarting = true;
    void played(audio.play()).then((ok) => {
      bedStarting = false;
      if (!ok) {
        bedBlocked = true;
        bedOnBlocked();
      }
    });
  }
  if (!want && bedGain === 0 && !audio.paused) audio.pause();
  const t = audio.currentTime;
  const edge = Math.min(1, t / BED_EDGE_S, Number.isFinite(audio.duration) ? (audio.duration - t) / BED_EDGE_S : 1);
  audio.volume = Math.min(1, Math.max(0, bedMusic.volume * bedGain * edge));
}

// The music under a كنز or كشكول celebration shown as a picture. It fades out
// when the admin ends the celebration.
let introMusic: HTMLAudioElement | undefined;
export function playIntroMusic(kind: 'kanz' | 'kashkool') {
  stopIntroMusic(0);
  introMusic = trackForeground(new Audio(soundUrl(kind)));
  return played(introMusic.play());
}
export function stopIntroMusic(fadeMs = 900) {
  if (introMusic) fadeOut(introMusic, fadeMs);
  introMusic = undefined;
}

// A plain question opens with a sting, then the suspense loop runs until the
// answer is shown or the tile closes.
let sting: HTMLAudioElement | undefined;
let suspense: HTMLAudioElement | undefined;
export function playQuestionSting() {
  sting = trackForeground(new Audio(soundUrl('question-open')));
  return played(sting.play());
}
export function setSuspense(on: boolean) {
  if (!on) {
    if (suspense) fadeOut(suspense, 700);
    suspense = undefined;
    return;
  }
  if (suspense) return;
  const audio = trackForeground(new Audio(soundUrl('suspense')));
  audio.loop = true;
  suspense = audio;
  const start = () => {
    if (suspense === audio && audio.paused) void audio.play().catch(() => {});
  };
  const intro = sting;
  if (intro && !intro.paused) {
    intro.addEventListener('ended', start, { once: true });
    intro.addEventListener('pause', start, { once: true });
  } else start();
}

// One clip at a time (soundboard presses, answer verdicts, reveal sounds); a
// new one replaces it, and undefined just stops it. The suspense loop steps
// aside for the clip and comes back after it.
let clip: HTMLAudioElement | undefined;
let heldSuspense: HTMLAudioElement | undefined;
export function playClip(url: string | undefined) {
  clip?.pause();
  clip = undefined;
  if (!url) return Promise.resolve(true);
  const audio = trackForeground(new Audio(url));
  clip = audio;
  const loop = suspense;
  if (loop && (!loop.paused || heldSuspense === loop)) {
    loop.pause();
    heldSuspense = loop;
    const resume = () => {
      if (clip !== audio || suspense !== loop) return;
      heldSuspense = undefined;
      void loop.play().catch(() => {});
    };
    // A clip that fails to load never ends, so its error resumes the loop too.
    audio.addEventListener('ended', resume, { once: true });
    audio.addEventListener('error', resume, { once: true });
  }
  return played(audio.play());
}

// Silences everything, e.g. when the main screen goes away.
export function stopAllAudio() {
  window.clearInterval(bedTimer);
  bedTimer = undefined;
  bed?.pause();
  stopIntroMusic(0);
  setSuspense(false);
  sting?.pause();
  void playClip(undefined);
}
