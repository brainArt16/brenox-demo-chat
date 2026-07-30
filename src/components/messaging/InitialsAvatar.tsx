import { initialsFromName } from "./map";

const SIZE_CLASS = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-12 w-12 text-sm",
} as const;

const PALETTE = [
  "bg-emerald-700 text-emerald-100",
  "bg-sky-700 text-sky-100",
  "bg-violet-700 text-violet-100",
  "bg-amber-700 text-amber-100",
  "bg-rose-700 text-rose-100",
  "bg-cyan-700 text-cyan-100",
  "bg-indigo-700 text-indigo-100",
  "bg-teal-700 text-teal-100",
];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

interface InitialsAvatarProps {
  name: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  ring?: boolean;
  title?: string;
}

export function InitialsAvatar({
  name,
  size = "md",
  className = "",
  ring = false,
  title,
}: InitialsAvatarProps) {
  const initials = initialsFromName(name);
  return (
    <span
      title={title ?? name}
      aria-hidden={title ? undefined : true}
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full font-semibold uppercase ${SIZE_CLASS[size]} ${colorFor(name)} ${
        ring ? "ring-2 ring-emerald-500" : ""
      } ${className}`}
    >
      {initials}
    </span>
  );
}
