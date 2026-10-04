import type { ReactNode } from 'react';
import type { Branding, GameTeam, Media } from '@kanz/api-client-react';
import { CircleHelp } from 'lucide-react';
import { useDocumentTitle } from '@/lib/game';

// Small pieces shared by every page.

export const outlineButton =
  'flex items-center gap-2 border border-white/15 px-3 py-2 text-xs font-bold text-ink-70 hover:border-white/40 hover:text-white disabled:opacity-30';
// Size it with padding and text classes at the call site.
export const goldButton =
  'flex items-center justify-center gap-2 bg-[#e9bb4f] font-black text-[#14151c] hover:bg-[#f5cf73] disabled:opacity-35';
// Set its own text colour: inside a <label> it would inherit the muted label colour.
export const input =
  'border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#e9bb4f]';

export function Loading({ text = 'جارٍ التحميل…' }: { text?: string }) {
  return <p className="p-10 text-center text-sm text-ink-45">{text}</p>;
}

export function ServerError() {
  return (
    <p role="alert" className="p-10 text-center text-sm text-[#ffadc2]">
      تعذّر الاتصال بالخادم… تتم إعادة المحاولة.
    </p>
  );
}

export function ErrorLine({ text }: { text: string }) {
  return (
    <div role="alert" className="mt-4 border border-[#e96791]/35 bg-[#e96791]/10 px-4 py-3 text-sm text-[#ffadc2]">
      {text}
    </div>
  );
}

// A team's colour as a small dot beside its name, sized to the text. The
// double ring keeps black and white dots visible on any background.
export function TeamDot({ color, className = '' }: { color: string; className?: string }) {
  return <span aria-hidden className={`team-dot ${className}`} style={{ background: color }} />;
}

export function TeamDotFor({ teams, id, className }: { teams: GameTeam[]; id: number; className?: string }) {
  const color = teams.find((t) => t.id === id)?.color;
  return color ? <TeamDot color={color} className={className} /> : null;
}

// A row of buttons with one selected: tabs (role="tab") or a choice.
type Option<T> = { value: T; label: ReactNode; title?: string; disabled?: boolean; testId?: string };
export function Segmented<T extends string>({
  label,
  value,
  options,
  onSelect,
  tabs,
  disabled,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onSelect: (value: T) => void;
  tabs?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap border border-white/15" role={tabs ? 'tablist' : 'group'} aria-label={label}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role={tabs ? 'tab' : undefined}
            aria-selected={tabs ? active : undefined}
            aria-pressed={tabs ? undefined : active}
            title={o.title}
            disabled={disabled || o.disabled}
            onClick={() => onSelect(o.value)}
            data-testid={o.testId}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold disabled:opacity-30 ${active ? 'bg-[#e9bb4f] text-[#14151c]' : 'text-ink-60 hover:text-white'}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// The configured logo, or the board's question-mark badge when there is none.
export function Logo({ media, className = '' }: { media?: Media; className?: string }) {
  if (media?.logo) return <img src={media.logo} alt="" className={`w-auto object-contain ${className}`} />;
  return (
    <span
      aria-hidden
      className={`grid aspect-square place-items-center border-2 border-[#f2c75d] bg-[#e9bb4f] text-[#14151c] shadow-[inset_2px_2px_#ffe9a0,inset_-2px_-2px_#986e16] ${className}`}
    >
      <CircleHelp className="h-[60%] w-[60%]" />
    </span>
  );
}

// Header for the control pages (admin, MC and setup).
export function ControlHeader({
  title,
  branding,
  children,
}: {
  title: string;
  branding?: Branding;
  children?: ReactNode;
}) {
  useDocumentTitle(branding, title);
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#11131bf2] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1450px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Logo media={branding?.media} className="h-8" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold tracking-[.2em] text-[#e96791]">{branding?.title ?? ''}</p>
            <p className="text-lg font-black leading-tight">{title}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
