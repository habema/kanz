import { useEffect, useRef, useState, type ReactNode } from 'react';
import { uploadMedia, type Media } from '@kanz/api-client-react';
import type { GameConfig } from '@kanz/game-core';
import { Play, Square, Upload, X } from 'lucide-react';
import { input, outlineButton } from '@/components/ui';

// Widgets shared by the setup sections. Each section edits the draft through
// update(); nothing reaches the screens until the page saves.

type Update = (patch: Partial<GameConfig>) => void;
// locked: a game is running, so recorded plays pin the team list and each
// tile's position.
export type SectionProps = { draft: GameConfig; update: Update; locked?: boolean };

export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// React keys for a list whose entries have no ids, so focus and inputs stay
// with their row when rows move. Call move/remove/add alongside the same
// change to the list; if its length changes any other way (an import or a
// restore), fresh keys are drawn.
let lastKey = 0;
const freshKeys = (length: number) => Array.from({ length }, () => ++lastKey);
export function useRowKeys(length: number) {
  const [keys, setKeys] = useState(() => freshKeys(length));
  if (keys.length !== length) setKeys(freshKeys(length));
  return {
    keys,
    move: (from: number, to: number) =>
      setKeys((k) => {
        const next = [...k];
        next.splice(to, 0, ...next.splice(from, 1));
        return next;
      }),
    remove: (index: number) => setKeys((k) => k.filter((_, i) => i !== index)),
    add: () => setKeys((k) => [...k, ++lastKey]),
  };
}

// Merges a patch into the draft's media, dropping cleared keys.
export function useMedia({ draft, update }: SectionProps) {
  return (patch: Partial<Media>) => {
    const next: Media = { ...draft.media, ...patch };
    for (const key of Object.keys(next) as (keyof Media)[]) if (next[key] === undefined) delete next[key];
    update({ media: next });
  };
}

// Runs an upload (or several), tracking whether it is busy or failed.
export function useUpload() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await task();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return { busy, failed, run };
}

export async function uploadFile(file: File) {
  const { url } = await uploadMedia(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } });
  return url;
}

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  // Revoking right away can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="border border-[#f2c75d]/45 bg-[#f2c75d]/10 px-3 py-2 text-xs leading-6 text-[#f2c75d]">{children}</p>
  );
}

// One preview at a time; pressing the playing one stops it.
let previewing: { audio: HTMLAudioElement; stop: () => void } | undefined;
export const stopPreview = () => previewing?.stop();
export function PreviewButton({ url }: { url?: string }) {
  const [playing, setPlaying] = useState(false);
  const mine = useRef<HTMLAudioElement | null>(null);
  useEffect(
    () => () => {
      if (previewing && previewing.audio === mine.current) previewing.stop();
    },
    [],
  );
  const toggle = () => {
    const wasMine = previewing?.audio === mine.current && playing;
    previewing?.stop();
    if (wasMine || !url) return;
    const audio = new Audio(url);
    mine.current = audio;
    const stop = () => {
      audio.pause();
      setPlaying(false);
      if (previewing?.audio === audio) previewing = undefined;
    };
    audio.addEventListener('ended', stop);
    previewing = { audio, stop };
    setPlaying(true);
    void audio.play().catch(stop);
  };
  return (
    <IconButton title={playing ? 'إيقاف' : 'استماع'} disabled={!url} onClick={toggle}>
      {playing ? <Square size={12} /> : <Play size={14} />}
    </IconButton>
  );
}

// A replaceable file, previewed (the upload, else the built-in file, which
// comes back when the upload is removed). thumb: false when the file is
// previewed elsewhere.
export function MediaRow({
  label,
  hint,
  accept,
  url,
  preview,
  kind,
  thumb = true,
  testId,
  onChange,
}: {
  label: string;
  hint?: string;
  accept: string;
  url?: string;
  preview?: string;
  kind: 'image' | 'video' | 'audio';
  thumb?: boolean;
  testId?: string;
  onChange: (url: string | undefined) => void;
}) {
  const { busy, failed, run } = useUpload();
  const shown = url ?? preview;
  const pick = ([file]: File[]) => run(async () => onChange(await uploadFile(file)));
  return (
    <div
      className="flex flex-wrap items-center gap-3 border-b border-white/[.06] pb-3 last:border-0 last:pb-0"
      data-testid={testId}
    >
      <div className="min-w-[10rem] flex-1">
        <p className="text-sm font-bold">{label}</p>
        {hint && <p className="text-[11px] leading-5 text-ink-40">{hint}</p>}
        {failed && <p className="text-[11px] text-[#ffadc2]">تعذّر الرفع. جرّب ملفاً آخر.</p>}
      </div>
      {shown && thumb && kind === 'image' && (
        <a href={shown} target="_blank" rel="noreferrer" title="عرض بالحجم الكامل">
          <img src={shown} alt="" className="h-14 max-w-[9rem] object-contain" />
        </a>
      )}
      {shown && thumb && kind === 'video' && (
        <video
          key={shown}
          src={shown}
          preload="metadata"
          controls
          playsInline
          className="h-28 max-w-[13rem] bg-black"
        />
      )}
      {kind === 'audio' && <PreviewButton url={shown} />}
      <FilePick accept={accept} onFiles={(files) => void pick(files)} disabled={busy}>
        <Upload size={14} /> {busy ? 'يُرفع…' : url ? 'تغيير' : 'رفع'}
      </FilePick>
      {url && (
        <button type="button" onClick={() => onChange(undefined)} className={outlineButton}>
          <X size={14} /> إزالة
        </button>
      )}
    </div>
  );
}

export function NumberField({
  label,
  value,
  min,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1 text-xs font-bold text-ink-55">
      {label}
      <input
        type="number"
        min={min}
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
        className={`${input} tabular-nums`}
        dir="ltr"
      />
    </label>
  );
}

export function IconButton({
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-9 w-9 shrink-0 place-items-center border disabled:opacity-25 ${active ? 'border-[#f2c75d] bg-[#f2c75d]/20 text-[#f2c75d]' : 'border-white/15 text-ink-60 hover:text-white'}`}
    >
      {children}
    </button>
  );
}

export function FilePick({
  accept,
  onFile,
  onFiles,
  multiple,
  disabled,
  testId,
  children,
}: {
  accept: string;
  onFile?: (file: File) => void;
  onFiles?: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`${outlineButton} cursor-pointer ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      {children}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        data-testid={testId}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (!files.length) return;
          onFile?.(files[0]);
          onFiles?.(files);
        }}
      />
    </label>
  );
}
