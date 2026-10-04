import { useRef, useState } from 'react';
import { GAME_SOUNDS, builtinSound, soundboardOf, type CelebrationMode, type SoundboardEntry } from '@kanz/game-core';
import {
  ArrowDown,
  ArrowUp,
  Gem,
  Image,
  Music2,
  PartyPopper,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  Upload,
  Video,
  Volume2,
} from 'lucide-react';
import { ErrorLine, Segmented, input, outlineButton } from '@/components/ui';
import { mediaUrl, resolveMedia, type Celebration } from '@/lib/media';
import {
  FilePick,
  IconButton,
  MediaRow,
  PreviewButton,
  newId,
  stopPreview,
  uploadFile,
  useMedia,
  useUpload,
  type SectionProps,
} from './shared';

export function BrandingSection(props: SectionProps) {
  return (
    <section className="panel-bevel grid gap-4 p-5 sm:grid-cols-2">
      <h2 className="text-lg font-black sm:col-span-2">الاسم والشعار</h2>
      <BrandingFields {...props} />
    </section>
  );
}

// Name, subtitle and logo, placed by the parent's grid.
export function BrandingFields(props: SectionProps & { large?: boolean }) {
  const { draft, update, large } = props;
  const setMedia = useMedia(props);
  return (
    <>
      <label className="grid gap-1 text-xs font-bold text-ink-55">
        اسم المسابقة
        <input
          value={draft.title}
          maxLength={80}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="مثلاً: مسابقة الشركة السنوية"
          data-testid="input-title"
          className={`${input} ${large ? 'py-3 text-lg font-black' : ''}`}
        />
      </label>
      <label className="grid gap-1 text-xs font-bold text-ink-55">
        وصف قصير (يظهر أسفل اللوحة، اختياري)
        <input
          value={draft.subtitle ?? ''}
          maxLength={80}
          onChange={(e) => update({ subtitle: e.target.value || undefined })}
          placeholder="مثلاً: الحفل السنوي ٢٠٢٦"
          className={input}
        />
      </label>
      <div className={large ? '' : 'sm:col-span-2'}>
        <MediaRow
          label="الشعار"
          hint="اختياري، ويُفضَّل بخلفية شفافة."
          accept="image/*"
          url={draft.media.logo}
          kind="image"
          onChange={(logo) => setMedia({ logo })}
        />
      </div>
    </>
  );
}

export function CelebrationsSection(props: SectionProps) {
  return (
    <section className="panel-bevel grid gap-5 p-5">
      <div>
        <h2 className="text-lg font-black">الاحتفال</h2>
        <p className="mt-1 text-xs leading-6 text-ink-50">يُعرض عند فتح كنز أو كشكول حتى تنهيه من الإدارة.</p>
      </div>
      <CelebrationCard {...props} kind="kanz" />
      <CelebrationCard {...props} kind="kashkool" />
    </section>
  );
}

function CelebrationCard({ kind, ...props }: SectionProps & { kind: 'kanz' | 'kashkool' }) {
  const media = props.draft.media;
  const setMedia = useMedia(props);
  const kanz = kind === 'kanz';
  const resolved = resolveMedia(media)[kind];
  const modeKey = kanz ? 'kanzMode' : 'kashkoolMode';
  const mode: CelebrationMode = media[modeKey] ?? 'image';
  const image = kanz ? media.kanzImage : media.kashkoolImage;
  const video = kanz ? media.kanzVideo : media.kashkoolVideo;
  // The picture's music is the game sound of the same name.
  const music = media.sounds?.[kind];
  const setMusic = (url: string | undefined) => {
    const sounds = { ...(media.sounds ?? {}) };
    if (url) sounds[kind] = url;
    else delete sounds[kind];
    setMedia({ sounds: Object.keys(sounds).length ? sounds : undefined });
  };
  const videoMode = resolved.mode === 'video';
  return (
    <div className={`border p-4 ${kanz ? 'border-[#f2c75d]/35' : 'border-[#ff7aa8]/35'}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className={`flex items-center gap-2 font-black ${kanz ? 'text-[#f2c75d]' : 'text-[#ff9dbd]'}`}>
          {kanz ? <Gem size={16} /> : <PartyPopper size={16} />} {kanz ? 'الكنز' : 'الكشكول'}
        </h3>
        <Segmented<CelebrationMode>
          label={`طريقة عرض ${kanz ? 'الكنز' : 'الكشكول'}`}
          value={mode}
          onSelect={(value) => setMedia({ [modeKey]: value })}
          options={[
            {
              value: 'image',
              label: (
                <>
                  <Image size={14} /> صورة وموسيقى
                </>
              ),
              testId: `button-${kind}-mode-image`,
            },
            {
              value: 'video',
              label: (
                <>
                  <Video size={14} /> فيديو
                </>
              ),
              testId: `button-${kind}-mode-video`,
            },
          ]}
        />
      </div>
      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CelebrationStage kind={kind} celebration={resolved} />
        <div className="grid gap-3">
          {mode === 'video' && (
            <MediaRow
              label="الفيديو"
              hint={videoMode ? 'بصوته، ثم تظهر الصورة.' : 'ارفع فيديو؛ حتى ذلك تُعرض الصورة والموسيقى.'}
              accept="video/mp4,video/webm"
              url={video}
              kind="video"
              thumb={false}
              testId={`${kind}-video`}
              onChange={(url) => setMedia(kanz ? { kanzVideo: url } : { kashkoolVideo: url })}
            />
          )}
          <MediaRow
            label="الصورة"
            hint={videoMode ? 'بعد انتهاء الفيديو.' : undefined}
            accept="image/*"
            url={image}
            preview={resolved.image}
            kind="image"
            thumb={videoMode}
            testId={`${kind}-image`}
            onChange={(url) => setMedia(kanz ? { kanzImage: url } : { kashkoolImage: url })}
          />
          {!videoMode && (
            <MediaRow
              label="الموسيقى"
              accept="audio/*"
              url={music}
              preview={music ?? mediaUrl(builtinSound(kind))}
              kind="audio"
              testId={`${kind}-music`}
              onChange={setMusic}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// A small version of what the main screen shows: the picture, or the video
// (pressed to play with its sound), over the celebration's rays.
function CelebrationStage({ kind, celebration }: { kind: 'kanz' | 'kashkool'; celebration: Celebration }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const video = celebration.mode === 'video' ? celebration.video : undefined;
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    stopPreview();
    void el.play().catch(() => setPlaying(false));
  };
  const events = { onPlay: () => setPlaying(true), onPause: () => setPlaying(false), onEnded: () => setPlaying(false) };
  return (
    <div
      className="relative grid aspect-video place-items-center overflow-hidden border border-white/10 bg-[#0b0c12]"
      data-testid={`${kind}-stage`}
    >
      <div className={`rays ${kind === 'kanz' ? 'rays-kanz' : 'rays-kashkool'}`} />
      {video ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'إيقاف الفيديو' : 'تشغيل الفيديو'}
          className="relative w-[72%] rounded-[8px] bg-gradient-to-br from-[#ffe36e] to-[#ffb300] p-1 shadow-[0_12px_40px_#000c]"
        >
          <video
            key={video}
            ref={ref}
            src={video}
            playsInline
            preload="metadata"
            {...events}
            className="block aspect-video w-full rounded-[5px] bg-black object-contain"
          />
          <span
            className={`absolute inset-0 grid place-items-center transition-opacity ${playing ? 'opacity-0 hover:opacity-100' : ''}`}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-black/65 text-white">
              {playing ? <Square size={16} /> : <Play size={20} />}
            </span>
          </span>
        </button>
      ) : (
        <img
          src={celebration.image}
          alt=""
          className="relative max-h-[80%] max-w-[80%] object-contain drop-shadow-[0_10px_30px_#000]"
        />
      )}
    </div>
  );
}

export function SoundsSection(props: SectionProps) {
  const { draft, update } = props;
  const setMedia = useMedia(props);
  const board = soundboardOf(draft);
  const custom = draft.soundboard !== undefined;
  const { busy, failed, run } = useUpload();
  const setBoard = (soundboard: SoundboardEntry[]) => update({ soundboard });
  const setEntry = (i: number, patch: Partial<SoundboardEntry>) =>
    setBoard(board.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const moveEntry = (i: number, to: number) => {
    const list = [...board];
    const [item] = list.splice(i, 1);
    list.splice(to, 0, item);
    setBoard(list);
  };
  const addFiles = (files: File[]) =>
    run(async () => {
      const added: SoundboardEntry[] = [];
      for (const file of files)
        added.push({
          id: newId('s'),
          label: file.name.replace(/\.[^.]+$/, '').slice(0, 40),
          url: await uploadFile(file),
        });
      setBoard([...board, ...added]);
    });
  const setSound = (name: string, url: string | undefined) => {
    const sounds = { ...(draft.media.sounds ?? {}) };
    if (url) sounds[name] = url;
    else delete sounds[name];
    setMedia({ sounds: Object.keys(sounds).length ? sounds : undefined });
  };
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-6">
      <section className="panel-bevel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black">
              <Volume2 size={18} className="text-[#9d8cff]" /> لوحة المؤثرات
            </h2>
            <p className="mt-1 text-xs leading-6 text-ink-50">أزرار في الإدارة تُشغَّل على الشاشة الرئيسية.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <FilePick
              accept="audio/*"
              multiple
              onFiles={(files) => void addFiles(files)}
              disabled={busy}
              testId="input-add-sound"
            >
              <Plus size={14} /> {busy ? 'يُرفع…' : 'إضافة أصوات'}
            </FilePick>
            {custom && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('إرجاع الأزرار كما جاءت مع التطبيق؟')) update({ soundboard: undefined });
                }}
                className={outlineButton}
              >
                <RotateCcw size={14} /> إعادة تعيين
              </button>
            )}
          </div>
        </div>
        {failed && <ErrorLine text="تعذّر رفع بعض الملفات. استخدم MP3 أو WAV أو OGG أو M4A." />}
        <div className="mt-4 grid gap-2">
          {board.map((entry, i) => (
            <SoundRow
              key={entry.id}
              entry={entry}
              index={i}
              last={i === board.length - 1}
              onChange={(patch) => setEntry(i, patch)}
              onMove={(to) => moveEntry(i, to)}
              onRemove={() => setBoard(board.filter((_, j) => j !== i))}
            />
          ))}
          {board.length === 0 && <p className="py-4 text-center text-sm text-ink-40">لا أزرار.</p>}
        </div>
      </section>

      <section className="panel-bevel grid gap-3 p-5">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Music2 size={18} className="text-[#f2c75d]" /> أصوات اللعبة
        </h2>
        <p className="-mt-1 text-xs leading-6 text-ink-50">تُشغَّل تلقائياً. ارفع ملفاً لاستبدال أي منها.</p>
        <MediaRow
          label="موسيقى الخلفية"
          hint="تُشغَّل وتُوقف من الإدارة."
          accept="audio/*"
          url={draft.media.music}
          preview={resolveMedia(draft.media).music}
          kind="audio"
          onChange={(music) => setMedia({ music })}
        />
        {GAME_SOUNDS.map((s) => (
          <MediaRow
            key={s.name}
            label={s.label}
            accept="audio/*"
            url={draft.media.sounds?.[s.name]}
            preview={draft.media.sounds?.[s.name] ?? mediaUrl(builtinSound(s.name))}
            kind="audio"
            onChange={(url) => setSound(s.name, url)}
          />
        ))}
      </section>
    </div>
  );
}

function SoundRow({
  entry,
  index,
  last,
  onChange,
  onMove,
  onRemove,
}: {
  entry: SoundboardEntry;
  index: number;
  last: boolean;
  onChange: (patch: Partial<SoundboardEntry>) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const { busy, failed, run } = useUpload();
  return (
    <div
      className="flex flex-wrap items-center gap-2 border-b border-white/[.06] pb-2 last:border-0"
      data-testid={`sound-${index}`}
    >
      <PreviewButton url={mediaUrl(entry.url)} />
      <input
        value={entry.label}
        maxLength={40}
        onChange={(e) => onChange({ label: e.target.value })}
        aria-label={`اسم الزر ${index + 1}`}
        className={`${input} min-w-0 flex-1`}
      />
      <FilePick
        accept="audio/*"
        disabled={busy}
        onFiles={([file]) => run(async () => onChange({ url: await uploadFile(file) }))}
      >
        <Upload size={14} /> {busy ? 'يُرفع…' : 'تغيير الملف'}
      </FilePick>
      <IconButton title="قبل" disabled={index === 0} onClick={() => onMove(index - 1)}>
        <ArrowUp size={14} />
      </IconButton>
      <IconButton title="بعد" disabled={last} onClick={() => onMove(index + 1)}>
        <ArrowDown size={14} />
      </IconButton>
      <IconButton title="حذف الزر" onClick={onRemove}>
        <Trash2 size={14} />
      </IconButton>
      {failed && <p className="w-full text-[11px] text-[#ffadc2]">تعذّر الرفع. استخدم MP3 أو WAV أو OGG أو M4A.</p>}
    </div>
  );
}
