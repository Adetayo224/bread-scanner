import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const CameraSwapIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 8h3l2-2h4l2 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 1-1.7" />
    <path d="M9 14a3 3 0 0 0 5 2M15 12a3 3 0 0 0-5-2" />
    <path d="M14 16l1 1M10 10l-1-1" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12l5 5 11-12" />
  </svg>
);

export const MuteIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9v6h4l5 4V5L8 9H4Z" />
    <path d="M17 9l4 6M21 9l-4 6" />
  </svg>
);

export const SpeakerIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9v6h4l5 4V5L8 9H4Z" />
    <path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" />
  </svg>
);

export const RotateDeviceIcon = (p: IconProps) => (
  <svg {...base({ size: 48, ...p })}>
    <rect x="4" y="7" width="16" height="10" rx="2" />
    <path d="M12 4v1M12 19v1" />
    <path d="M2 12a10 10 0 0 1 3-3M22 12a10 10 0 0 0-3-3" />
  </svg>
);

export const BreadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 13c0-3 3-5 8-5s8 2 8 5c0 1.5-1 2.5-2 2.5v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2c-1 0-2-1-2-2.5Z" />
    <path d="M8 12v3M12 11v4M16 12v3" />
  </svg>
);

export const PayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M3 10h18M7 15h3" />
  </svg>
);

export const VoidIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8" />
    <path d="M8 12h8" />
  </svg>
);
