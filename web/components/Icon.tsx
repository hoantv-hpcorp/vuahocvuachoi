import type { CSSProperties, ReactNode } from "react";

export type IconName =
  | "book"
  | "clock"
  | "check-circle"
  | "edit"
  | "chevron-left"
  | "chevron-right"
  | "user"
  | "trash"
  | "help"
  | "bulb"
  | "sparkle"
  | "plus";

const paths: Record<IconName, ReactNode> = {
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  "check-circle": (
    <>
      <path d="M9 11l3 3 8-8" />
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  "chevron-left": <path d="M15 18l-6-6 6-6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </>
  ),
  trash: <path d="M3 6h18M8 6V4h8v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.7-2.5 2.2-2.5 3.7" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z" />
    </>
  ),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

type IconProps = {
  name: IconName;
  small?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Icon({ name, small, className, style }: IconProps) {
  return (
    <svg
      className={`ic${small ? " sm" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
