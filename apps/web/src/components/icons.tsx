import type { SVGProps } from "react";

/* ─────────────────────────────────────────────────────────────
   Monoline icon set — 24×24, currentColor, 1.7 stroke.
   Drawn in-house so the UI has a single, calm visual language
   instead of emoji glyphs or a heavy icon dependency.
   ───────────────────────────────────────────────────────────── */
type P = SVGProps<SVGSVGElement>;
const Svg = ({ children, ...p }: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...p}
  >
    {children}
  </svg>
);

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.6V21h14V9.6" />
    <path d="M9.5 21v-6h5v6" />
  </Svg>
);

export const IconBag = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 8h15l-1.2 12.2a1.8 1.8 0 0 1-1.8 1.6H7.5a1.8 1.8 0 0 1-1.8-1.6L4.5 8Z" />
    <path d="M8.5 10.5V6.5a3.5 3.5 0 0 1 7 0v4" />
  </Svg>
);

export const IconClipboard = (p: P) => (
  <Svg {...p}>
    <path d="M9 4.5h6a1.5 1.5 0 0 1 1.5 1.5v14A1.5 1.5 0 0 1 15 21.5H9A1.5 1.5 0 0 1 7.5 20V6A1.5 1.5 0 0 1 9 4.5Z" />
    <path d="M9 3h6v3H9z" />
    <path d="M10 11h4M10 15h4" />
  </Svg>
);

export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M8 16.5V12M12.5 16.5V8M17 16.5v-6" />
  </Svg>
);

export const IconUser = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
  </Svg>
);

export const IconTrace = (p: P) => (
  <Svg {...p}>
    <circle cx="5.5" cy="6" r="2.2" />
    <circle cx="18.5" cy="18" r="2.2" />
    <path d="M5.5 8.2v4.3a3 3 0 0 0 3 3h5" />
    <path d="M13 13.5 15.5 16l-2.5 2.5" />
  </Svg>
);

export const IconWrench = (p: P) => (
  <Svg {...p}>
    <path d="M14.5 6.5a3.5 3.5 0 1 0 3.4 4.4l-2.2 2.2 1.4 1.4-1.6 1.6-1.4-1.4-6.7 6.7-2.8-2.8 6.7-6.7-1.4-1.4L11.5 9l1.4-1.4 2.2 2.2Z" />
  </Svg>
);

export const IconScale = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v16" />
    <path d="M6 8h12" />
    <path d="M6 8 3.5 14h5L6 8Z" />
    <path d="M18 8 15.5 14h5L18 8Z" />
    <path d="M8.5 20h7" />
  </Svg>
);

export const IconFlame = (p: P) => (
  <Svg {...p}>
    <path d="M12 3s5 4.2 5 9a5 5 0 0 1-10 0c0-1.6.7-3 1.6-4.2.3 1.2 1 2 1.9 2.3C10.9 8 11.4 5.4 12 3Z" />
  </Svg>
);

export const IconBox = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.2 20 7v10l-8 3.8L4 17V7l8-3.8Z" />
    <path d="M4 7l8 3.8L20 7" />
    <path d="M12 10.8V20.8" />
  </Svg>
);

export const IconReceipt = (p: P) => (
  <Svg {...p}>
    <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3v-17Z" />
    <path d="M9 8h6M9 12h6" />
  </Svg>
);

export const IconBolt = (p: P) => (
  <Svg {...p}>
    <path d="M13.5 3 6 13.5h4.5L10 21l7.5-10.5H13L13.5 3Z" />
  </Svg>
);

export const IconLeaf = (p: P) => (
  <Svg {...p}>
    <path d="M4 20c0-8 5-13 16-13 0 9-5 13-11 13H4Z" />
    <path d="M4 20c3-4 6-6 10-7.5" />
  </Svg>
);

export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h13" />
    <path d="M13 6.5 18.5 12 13 17.5" />
  </Svg>
);

export const IconChevronRight = (p: P) => (
  <Svg {...p}>
    <path d="M9.5 6 15.5 12l-6 6" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5 10 17.5 19 7" />
  </Svg>
);

export const IconAlert = (p: P) => (
  <Svg {...p}>
    <path d="M12 4.5 21 19.5H3L12 4.5Z" />
    <path d="M12 10v4M12 16.8v.2" />
  </Svg>
);

export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconSpark = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5 13.7 9l5.3 1.8-5.3 1.9L12 20l-1.7-5.3L5 12.8 10.3 11 12 3.5Z" />
  </Svg>
);

export const IconGrid = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.4" />
    <rect x="13" y="4" width="7" height="7" rx="1.4" />
    <rect x="4" y="13" width="7" height="7" rx="1.4" />
    <rect x="13" y="13" width="7" height="7" rx="1.4" />
  </Svg>
);
