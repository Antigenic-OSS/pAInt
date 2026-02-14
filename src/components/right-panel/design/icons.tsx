import React from "react";

export function FlexRowIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2 7h10M9 4l3 3-3 3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FlexColIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7 2v10M4 9l3 3 3-3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GridIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x={2} y={2} width={4} height={4} rx={0.5} stroke="currentColor" strokeWidth={1.2} />
      <rect x={8} y={2} width={4} height={4} rx={0.5} stroke="currentColor" strokeWidth={1.2} />
      <rect x={2} y={8} width={4} height={4} rx={0.5} stroke="currentColor" strokeWidth={1.2} />
      <rect x={8} y={8} width={4} height={4} rx={0.5} stroke="currentColor" strokeWidth={1.2} />
    </svg>
  );
}

export function BlockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x={2} y={3} width={10} height={8} rx={1} fill="currentColor" />
    </svg>
  );
}

export function InlineIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x={1.5} y={3} width={4.5} height={8} rx={0.5} stroke="currentColor" strokeWidth={1.2} />
      <rect x={8} y={3} width={4.5} height={8} rx={0.5} stroke="currentColor" strokeWidth={1.2} />
    </svg>
  );
}

export function AlignLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2 3h8M2 7h5M2 11h8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function AlignCenterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 3h8M4.5 7h5M3 11h8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function AlignRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 3h8M7 7h5M4 11h8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function AlignJustifyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2 3h10M2 7h10M2 11h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function AlignTopIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2 2h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M7 5v7M4.5 7.5L7 5l2.5 2.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AlignMiddleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7 1.5v4M5 3.5L7 1.5l2 2M7 12.5v-4M5 10.5l2 2 2-2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7h8" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

export function AlignBottomIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2 12h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M7 9V2M4.5 6.5L7 9l2.5-2.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StaticIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7 2L5 6h4L7 2Z" fill="currentColor" />
      <path d="M7 6v5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={7} cy={12} r={0.75} fill="currentColor" />
    </svg>
  );
}

export function RelativeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x={2} y={2} width={8} height={8} rx={0.5} stroke="currentColor" strokeWidth={1.2} strokeDasharray="2 1.5" />
      <path d="M10 8l2.5 2.5M10.5 10.5h2v-2" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AbsoluteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx={7} cy={7} r={5} stroke="currentColor" strokeWidth={1.2} />
      <circle cx={7} cy={7} r={1} fill="currentColor" />
      <path d="M7 2v2M7 10v2M2 7h2M10 7h2" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

export function FixedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x={4} y={2} width={6} height={7} rx={1} stroke="currentColor" strokeWidth={1.2} />
      <path d="M7 9v3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={7} cy={5.5} r={1.25} stroke="currentColor" strokeWidth={1} />
    </svg>
  );
}

export function StickyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx={7} cy={3.5} r={2} stroke="currentColor" strokeWidth={1.2} />
      <path d="M7 5.5v5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M4.5 12l2.5-1.5L9.5 12" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 8.5l2-2a2.12 2.12 0 0 1 3 3l-2 2a2.12 2.12 0 0 1-3 0" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M8 5.5l-2 2a2.12 2.12 0 0 1-3-3l2-2a2.12 2.12 0 0 1 3 0" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
    </svg>
  );
}

export function UnlinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 8.5l.5-.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M8 5.5l-.5.5" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M8 8.5a2.12 2.12 0 0 1-3 0l-1-1a2.12 2.12 0 0 1 3-3" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M6 5.5a2.12 2.12 0 0 1 3 0l1 1a2.12 2.12 0 0 1-3 3" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" />
      <path d="M2 12L12 2" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function MinusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2 7h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2.5 4h9M5 4V2.5h4V4" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 4l.5 8h6l.5-8" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 6.5v3M8.5 6.5v3" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

export function CornerRadiusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2 12V6a4 4 0 0 1 4-4h6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export function ClipContentIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth={0.8} strokeLinecap="round" />
      <rect x={2} y={4} width={10} height={6} rx={0.5} stroke="currentColor" strokeWidth={1.2} />
      <path d="M5 1L5 4M9 1L9 4M5 10L5 13M9 10L9 13" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

export function BorderBoxIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x={1.5} y={1.5} width={11} height={11} rx={0.5} stroke="currentColor" strokeWidth={1.2} />
      <rect x={4} y={4} width={6} height={6} rx={0.25} stroke="currentColor" strokeWidth={0.8} strokeDasharray="1.5 1" />
    </svg>
  );
}

export function ReverseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 4.5h7.5M8.5 2.5l2 2-2 2" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 9.5H3.5M5.5 11.5l-2-2 2-2" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VisibilityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M1 7s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4Z" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" />
      <circle cx={7} cy={7} r={1.75} stroke="currentColor" strokeWidth={1.2} />
    </svg>
  );
}

export function ExpandIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2 5V2h3M9 2h3v3M12 9v3h-3M5 12H2V9" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InsetIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x={2} y={2} width={10} height={10} rx={0.5} stroke="currentColor" strokeWidth={1.2} />
      <path d="M9 5L7 7l2 2" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
