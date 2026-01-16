import * as React from "react";
import { clsx } from "clsx";

type ArchitectureDiagramSvgProps = {
  className?: string;
  compact?: boolean;
};

const COLORS = {
  background: "#0b1220",
  grid: "rgba(148, 163, 184, 0.08)",
  nodeFill: "#111827",
  nodeStroke: "rgba(148, 163, 184, 0.35)",
  title: "#f8fafc",
  text: "#e2e8f0",
  muted: "#94a3b8",
  accent: "#38bdf8",
  accentSoft: "rgba(56, 189, 248, 0.25)",
  protection: "#22d3ee",
  archive: "#a78bfa",
  legend: "#cbd5f5",
};

const LAYOUT = {
  desktop: {
    width: 1200,
    height: 675,
    nodeWidth: 260,
    nodeHeight: 78,
    nodeRadius: 14,
    columns: {
      left: 70,
      middle: 455,
      right: 840,
    },
    rows: {
      left: [160, 270],
      middle: [215],
      right: [120, 220, 320, 420],
    },
    bottom: {
      y: 515,
      height: 120,
    },
  },
  mobile: {
    width: 720,
    height: 540,
    nodeWidth: 250,
    nodeHeight: 74,
    nodeRadius: 14,
    columns: {
      left: 60,
      middle: 370,
    },
    rows: {
      left: [120, 210, 300],
      middle: [120, 210, 300],
      bottom: [400, 480],
    },
  },
};

const iconStroke: React.SVGProps<SVGGElement> = {
  stroke: COLORS.text,
  strokeWidth: 1.6,
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const DiagramDefs = ({ idPrefix }: { idPrefix: string }) => (
  <defs>
    <pattern
      id={`${idPrefix}-grid`}
      width="40"
      height="40"
      patternUnits="userSpaceOnUse"
    >
      <path d="M 40 0 L 0 0 0 40" stroke={COLORS.grid} strokeWidth="1" />
    </pattern>
    <linearGradient id={`${idPrefix}-stroke`} x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stopColor="rgba(148, 163, 184, 0.6)" />
      <stop offset="100%" stopColor="rgba(148, 163, 184, 0.12)" />
    </linearGradient>
    <filter id={`${idPrefix}-shadow`} x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgba(15, 23, 42, 0.45)" />
    </filter>
    <marker
      id={`${idPrefix}-arrow`}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="10"
      markerHeight="10"
      orient="auto"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" fill={COLORS.text} />
    </marker>
  </defs>
);

const NodeShell = ({
  x,
  y,
  width,
  height,
  radius,
  idPrefix,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  idPrefix: string;
  children: React.ReactNode;
}) => (
  <g transform={`translate(${x} ${y})`} filter={`url(#${idPrefix}-shadow)`}>
    <rect
      width={width}
      height={height}
      rx={radius}
      fill={COLORS.nodeFill}
      stroke={`url(#${idPrefix}-stroke)`}
      strokeWidth="1.2"
    />
    {children}
  </g>
);

const TitleBlock = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <g>
    <text x="0" y="22" fontSize="15" fontWeight="600" fill={COLORS.text}>
      {title}
    </text>
    {subtitle ? (
      <text x="0" y="42" fontSize="12" fill={COLORS.muted}>
        {subtitle}
      </text>
    ) : null}
  </g>
);

const iconSize = 26;

const IconEpic = () => (
  <g transform={`translate(0 0)`} {...iconStroke}>
    <rect width={iconSize} height={iconSize} rx="6" />
    <path d="M 13 7 L 13 19" />
    <path d="M 7 13 L 19 13" />
  </g>
);

const IconVm = () => (
  <g transform={`translate(0 0)`} {...iconStroke}>
    <rect x="3" y="3" width="16" height="16" rx="4" />
    <rect x="9" y="9" width="16" height="16" rx="4" />
  </g>
);

const IconStorage = () => (
  <g transform={`translate(0 0)`} {...iconStroke}>
    <ellipse cx="13" cy="6" rx="10" ry="4" />
    <path d="M 3 6 L 3 18" />
    <path d="M 23 6 L 23 18" />
    <path d="M 3 18 C 3 22 23 22 23 18" />
  </g>
);

const IconImage = () => (
  <g transform={`translate(0 0)`} {...iconStroke}>
    <rect width="26" height="20" rx="4" y="3" />
    <circle cx="8" cy="10" r="2" />
    <path d="M 5 20 L 12 13 L 18 19 L 22 15" />
  </g>
);

const IconAi = () => (
  <g transform={`translate(0 0)`} {...iconStroke}>
    <circle cx="8" cy="8" r="3" />
    <circle cx="18" cy="8" r="3" />
    <circle cx="13" cy="18" r="3" />
    <path d="M 8 11 L 12 16" />
    <path d="M 18 11 L 14 16" />
    <path d="M 11 8 L 15 8" />
  </g>
);

const IconShield = () => (
  <g transform={`translate(0 0)`} {...iconStroke}>
    <path d="M 13 2 L 23 6 V 13 C 23 18 18 22 13 24 C 8 22 3 18 3 13 V 6 Z" />
    <path d="M 13 10 V 16" />
    <circle cx="13" cy="18" r="1.5" />
  </g>
);

const IconLock = () => (
  <g transform={`translate(0 0)`} {...iconStroke}>
    <rect x="5" y="12" width="16" height="10" rx="3" />
    <path d="M 9 12 V 8 C 9 5 17 5 17 8 V 12" />
    <circle cx="13" cy="17" r="1.8" />
  </g>
);

const NodeContent = ({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}) => (
  <g>
    <g transform="translate(18 20)">{icon}</g>
    <g transform="translate(60 24)">
      <TitleBlock title={title} subtitle={subtitle} />
    </g>
  </g>
);

const Legend = ({ idPrefix, x, y }: { idPrefix: string; x: number; y: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <text x="0" y="0" fontSize="12" fill={COLORS.legend} fontWeight="600">
      Legend
    </text>
    <g transform="translate(0 12)">
      <line
        x1="0"
        y1="10"
        x2="26"
        y2="10"
        stroke={COLORS.text}
        strokeWidth="1.6"
        markerEnd={`url(#${idPrefix}-arrow)`}
      />
      <text x="34" y="14" fontSize="11" fill={COLORS.muted}>
        Primary data path
      </text>
    </g>
    <g transform="translate(0 34)">
      <line
        x1="0"
        y1="10"
        x2="26"
        y2="10"
        stroke={COLORS.protection}
        strokeWidth="1.6"
        strokeDasharray="6 4"
        markerEnd={`url(#${idPrefix}-arrow)`}
      />
      <text x="34" y="14" fontSize="11" fill={COLORS.muted}>
        Protection / recovery
      </text>
    </g>
    <g transform="translate(0 56)">
      <line
        x1="0"
        y1="10"
        x2="26"
        y2="10"
        stroke={COLORS.archive}
        strokeWidth="1.6"
        strokeDasharray="1 6"
        markerEnd={`url(#${idPrefix}-arrow)`}
      />
      <text x="34" y="14" fontSize="11" fill={COLORS.muted}>
        Archive / retention
      </text>
    </g>
  </g>
);

export const ArchitectureDiagramSvg = ({ className, compact }: ArchitectureDiagramSvgProps) => {
  const desktopOnly = compact ? "hidden" : "hidden md:block";
  const mobileOnly = compact ? "block" : "block md:hidden";

  // Snapshot test note: capture both desktop + mobile SVG outputs if visual regression tests are added.
  return (
    <div
      className={clsx(
        "relative w-full overflow-hidden rounded-2xl bg-slate-950/70",
        "aspect-[4/3] md:aspect-[16/9]",
        className,
      )}
    >
      <svg
        className={desktopOnly}
        viewBox={`0 0 ${LAYOUT.desktop.width} ${LAYOUT.desktop.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby="architecture-diagram-title-desktop architecture-diagram-desc-desktop"
      >
        <DiagramDefs idPrefix="desktop" />
        <rect
          width={LAYOUT.desktop.width}
          height={LAYOUT.desktop.height}
          fill={COLORS.background}
        />
        <rect
          width={LAYOUT.desktop.width}
          height={LAYOUT.desktop.height}
          fill={`url(#desktop-grid)`}
          opacity="0.5"
        />
        <title id="architecture-diagram-title-desktop">
          Epic + PACS Modernized Architecture
        </title>
        <desc id="architecture-diagram-desc-desktop">
          Clinical apps feed tier-zero FlashArray storage, imaging workloads flow through
          FlashBlade performance and archive tiers, and Rubrik provides cyber recovery with
          immutable vaulting.
        </desc>

        <text x="56" y="58" fontSize="22" fontWeight="700" fill={COLORS.title}>
          Epic + PACS Modernized Architecture
        </text>
        <text x="56" y="84" fontSize="13" fill={COLORS.muted}>
          Healthcare Data Center Refresh (Epic + PACS)
        </text>

        <text x="70" y="132" fontSize="12" fill={COLORS.muted} letterSpacing="0.08em">
          CLINICAL APPS
        </text>
        <text x="455" y="132" fontSize="12" fill={COLORS.muted} letterSpacing="0.08em">
          PRIMARY STORAGE
        </text>
        <text x="840" y="92" fontSize="12" fill={COLORS.muted} letterSpacing="0.08em">
          IMAGING + AI
        </text>

        <NodeShell
          x={LAYOUT.desktop.columns.left}
          y={LAYOUT.desktop.rows.left[0]}
          width={LAYOUT.desktop.nodeWidth}
          height={LAYOUT.desktop.nodeHeight}
          radius={LAYOUT.desktop.nodeRadius}
          idPrefix="desktop"
        >
          <NodeContent title="Epic (EHR)" subtitle="Clinical workflows" icon={<IconEpic />} />
        </NodeShell>

        <NodeShell
          x={LAYOUT.desktop.columns.left}
          y={LAYOUT.desktop.rows.left[1]}
          width={LAYOUT.desktop.nodeWidth}
          height={LAYOUT.desktop.nodeHeight}
          radius={LAYOUT.desktop.nodeRadius}
          idPrefix="desktop"
        >
          <NodeContent title="VMware" subtitle="App + VM tier" icon={<IconVm />} />
        </NodeShell>

        <NodeShell
          x={LAYOUT.desktop.columns.middle}
          y={LAYOUT.desktop.rows.middle[0]}
          width={LAYOUT.desktop.nodeWidth}
          height={LAYOUT.desktop.nodeHeight}
          radius={LAYOUT.desktop.nodeRadius}
          idPrefix="desktop"
        >
          <NodeContent
            title="FlashArray"
            subtitle="Tier-0 block"
            icon={<IconStorage />}
          />
        </NodeShell>

        <NodeShell
          x={LAYOUT.desktop.columns.right}
          y={LAYOUT.desktop.rows.right[0]}
          width={LAYOUT.desktop.nodeWidth}
          height={LAYOUT.desktop.nodeHeight}
          radius={LAYOUT.desktop.nodeRadius}
          idPrefix="desktop"
        >
          <NodeContent title="PACS / VNA" subtitle="Imaging ingest" icon={<IconImage />} />
        </NodeShell>

        <NodeShell
          x={LAYOUT.desktop.columns.right}
          y={LAYOUT.desktop.rows.right[1]}
          width={LAYOUT.desktop.nodeWidth}
          height={LAYOUT.desktop.nodeHeight}
          radius={LAYOUT.desktop.nodeRadius}
          idPrefix="desktop"
        >
          <NodeContent
            title="AI Imaging Pipeline"
            subtitle="Training • inference • analytics"
            icon={<IconAi />}
          />
        </NodeShell>

        <NodeShell
          x={LAYOUT.desktop.columns.right}
          y={LAYOUT.desktop.rows.right[2]}
          width={LAYOUT.desktop.nodeWidth}
          height={LAYOUT.desktop.nodeHeight}
          radius={LAYOUT.desktop.nodeRadius}
          idPrefix="desktop"
        >
          <NodeContent
            title="FlashBlade//S"
            subtitle="Performance tier"
            icon={<IconStorage />}
          />
        </NodeShell>

        <NodeShell
          x={LAYOUT.desktop.columns.right}
          y={LAYOUT.desktop.rows.right[3]}
          width={LAYOUT.desktop.nodeWidth}
          height={LAYOUT.desktop.nodeHeight}
          radius={LAYOUT.desktop.nodeRadius}
          idPrefix="desktop"
        >
          <NodeContent
            title="FlashBlade//E"
            subtitle="Capacity archive"
            icon={<IconStorage />}
          />
        </NodeShell>

        <g transform={`translate(70 ${LAYOUT.desktop.bottom.y})`}>
          <rect
            width="1060"
            height={LAYOUT.desktop.bottom.height}
            rx="18"
            fill="rgba(15, 23, 42, 0.7)"
            stroke={COLORS.nodeStroke}
          />
          <text x="24" y="34" fontSize="12" fill={COLORS.muted} letterSpacing="0.08em">
            DATA PROTECTION & CYBER RECOVERY
          </text>
          <NodeShell
            x={24}
            y={50}
            width={260}
            height={64}
            radius={12}
            idPrefix="desktop"
          >
            <NodeContent
              title="Rubrik NAS Cloud Direct"
              subtitle="Policy-based protection"
              icon={<IconShield />}
            />
          </NodeShell>
          <NodeShell
            x={332}
            y={50}
            width={300}
            height={64}
            radius={12}
            idPrefix="desktop"
          >
            <NodeContent
              title="Immutable Recovery + Archive"
              subtitle="Immutable • anomaly detection • audit logs • encryption"
              icon={<IconLock />}
            />
          </NodeShell>
        </g>

        <path
          d={`M ${LAYOUT.desktop.columns.left + LAYOUT.desktop.nodeWidth} ${LAYOUT.desktop.rows.left[0] + 40} L ${LAYOUT.desktop.columns.middle} ${LAYOUT.desktop.rows.middle[0] + 20}`}
          stroke={COLORS.text}
          strokeWidth="1.6"
          fill="none"
          markerEnd="url(#desktop-arrow)"
        />
        <path
          d={`M ${LAYOUT.desktop.columns.left + LAYOUT.desktop.nodeWidth} ${LAYOUT.desktop.rows.left[1] + 40} L ${LAYOUT.desktop.columns.middle} ${LAYOUT.desktop.rows.middle[0] + 60}`}
          stroke={COLORS.text}
          strokeWidth="1.6"
          fill="none"
          markerEnd="url(#desktop-arrow)"
        />
        <path
          d={`M ${LAYOUT.desktop.columns.right - 40} ${LAYOUT.desktop.rows.right[0] + 40} L ${LAYOUT.desktop.columns.right} ${LAYOUT.desktop.rows.right[2] + 12}`}
          stroke={COLORS.text}
          strokeWidth="1.6"
          fill="none"
          markerEnd="url(#desktop-arrow)"
        />
        <path
          d={`M ${LAYOUT.desktop.columns.right - 10} ${LAYOUT.desktop.rows.right[1] + 40} L ${LAYOUT.desktop.columns.right} ${LAYOUT.desktop.rows.right[2] + 50}`}
          stroke={COLORS.text}
          strokeWidth="1.6"
          fill="none"
          markerStart="url(#desktop-arrow)"
          markerEnd="url(#desktop-arrow)"
        />
        <path
          d={`M ${LAYOUT.desktop.columns.right + LAYOUT.desktop.nodeWidth / 2} ${LAYOUT.desktop.rows.right[2] + 78} L ${LAYOUT.desktop.columns.right + LAYOUT.desktop.nodeWidth / 2} ${LAYOUT.desktop.rows.right[3]}`}
          stroke={COLORS.archive}
          strokeWidth="1.6"
          strokeDasharray="1 6"
          fill="none"
          markerEnd="url(#desktop-arrow)"
        />
        <path
          d={`M ${LAYOUT.desktop.columns.middle + LAYOUT.desktop.nodeWidth / 2} ${LAYOUT.desktop.rows.middle[0] + 78} L 320 ${LAYOUT.desktop.bottom.y + 50}`}
          stroke={COLORS.protection}
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          markerEnd="url(#desktop-arrow)"
        />
        <path
          d={`M ${LAYOUT.desktop.columns.right + 30} ${LAYOUT.desktop.rows.right[2] + 78} L 220 ${LAYOUT.desktop.bottom.y + 60}`}
          stroke={COLORS.protection}
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          markerEnd="url(#desktop-arrow)"
        />
        <path
          d={`M ${LAYOUT.desktop.columns.right + 30} ${LAYOUT.desktop.rows.right[3] + 78} L 240 ${LAYOUT.desktop.bottom.y + 80}`}
          stroke={COLORS.protection}
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          markerEnd="url(#desktop-arrow)"
        />
        <path
          d={`M 380 ${LAYOUT.desktop.bottom.y + 82} L 450 ${LAYOUT.desktop.bottom.y + 82}`}
          stroke={COLORS.protection}
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          markerEnd="url(#desktop-arrow)"
        />

        <Legend idPrefix="desktop" x={900} y={560} />
      </svg>

      <svg
        className={mobileOnly}
        viewBox={`0 0 ${LAYOUT.mobile.width} ${LAYOUT.mobile.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby="architecture-diagram-title-mobile architecture-diagram-desc-mobile"
      >
        <DiagramDefs idPrefix="mobile" />
        <rect
          width={LAYOUT.mobile.width}
          height={LAYOUT.mobile.height}
          fill={COLORS.background}
        />
        <rect
          width={LAYOUT.mobile.width}
          height={LAYOUT.mobile.height}
          fill={`url(#mobile-grid)`}
          opacity="0.5"
        />
        <title id="architecture-diagram-title-mobile">Epic + PACS Modernized Architecture</title>
        <desc id="architecture-diagram-desc-mobile">
          Compact view showing clinical apps, primary storage, imaging tiers, and Rubrik cyber
          recovery protection.
        </desc>

        <text x="40" y="46" fontSize="20" fontWeight="700" fill={COLORS.title}>
          Epic + PACS Modernized Architecture
        </text>
        <text x="40" y="68" fontSize="12" fill={COLORS.muted}>
          Healthcare Data Center Refresh
        </text>

        <text x="60" y="98" fontSize="11" fill={COLORS.muted} letterSpacing="0.08em">
          CLINICAL APPS + PRIMARY STORAGE
        </text>

        <NodeShell
          x={LAYOUT.mobile.columns.left}
          y={LAYOUT.mobile.rows.left[0]}
          width={LAYOUT.mobile.nodeWidth}
          height={LAYOUT.mobile.nodeHeight}
          radius={LAYOUT.mobile.nodeRadius}
          idPrefix="mobile"
        >
          <NodeContent title="Epic (EHR)" subtitle="Clinical workflows" icon={<IconEpic />} />
        </NodeShell>
        <NodeShell
          x={LAYOUT.mobile.columns.left}
          y={LAYOUT.mobile.rows.left[1]}
          width={LAYOUT.mobile.nodeWidth}
          height={LAYOUT.mobile.nodeHeight}
          radius={LAYOUT.mobile.nodeRadius}
          idPrefix="mobile"
        >
          <NodeContent title="VMware" subtitle="App + VM tier" icon={<IconVm />} />
        </NodeShell>
        <NodeShell
          x={LAYOUT.mobile.columns.left}
          y={LAYOUT.mobile.rows.left[2]}
          width={LAYOUT.mobile.nodeWidth}
          height={LAYOUT.mobile.nodeHeight}
          radius={LAYOUT.mobile.nodeRadius}
          idPrefix="mobile"
        >
          <NodeContent
            title="FlashArray"
            subtitle="Tier-0 block"
            icon={<IconStorage />}
          />
        </NodeShell>

        <text x="370" y="98" fontSize="11" fill={COLORS.muted} letterSpacing="0.08em">
          IMAGING + AI
        </text>

        <NodeShell
          x={LAYOUT.mobile.columns.middle}
          y={LAYOUT.mobile.rows.middle[0]}
          width={LAYOUT.mobile.nodeWidth}
          height={LAYOUT.mobile.nodeHeight}
          radius={LAYOUT.mobile.nodeRadius}
          idPrefix="mobile"
        >
          <NodeContent title="PACS / VNA" subtitle="Imaging ingest" icon={<IconImage />} />
        </NodeShell>
        <NodeShell
          x={LAYOUT.mobile.columns.middle}
          y={LAYOUT.mobile.rows.middle[1]}
          width={LAYOUT.mobile.nodeWidth}
          height={LAYOUT.mobile.nodeHeight}
          radius={LAYOUT.mobile.nodeRadius}
          idPrefix="mobile"
        >
          <NodeContent
            title="AI Imaging Pipeline"
            subtitle="Training • inference"
            icon={<IconAi />}
          />
        </NodeShell>
        <NodeShell
          x={LAYOUT.mobile.columns.middle}
          y={LAYOUT.mobile.rows.middle[2]}
          width={LAYOUT.mobile.nodeWidth}
          height={LAYOUT.mobile.nodeHeight}
          radius={LAYOUT.mobile.nodeRadius}
          idPrefix="mobile"
        >
          <NodeContent
            title="FlashBlade//S"
            subtitle="Performance tier"
            icon={<IconStorage />}
          />
        </NodeShell>

        <NodeShell
          x={LAYOUT.mobile.columns.middle}
          y={LAYOUT.mobile.rows.middle[2] + 90}
          width={LAYOUT.mobile.nodeWidth}
          height={LAYOUT.mobile.nodeHeight}
          radius={LAYOUT.mobile.nodeRadius}
          idPrefix="mobile"
        >
          <NodeContent
            title="FlashBlade//E"
            subtitle="Archive tier"
            icon={<IconStorage />}
          />
        </NodeShell>

        <text x="60" y="382" fontSize="11" fill={COLORS.muted} letterSpacing="0.08em">
          DATA PROTECTION & CYBER RECOVERY
        </text>

        <NodeShell
          x={60}
          y={LAYOUT.mobile.rows.bottom[0]}
          width={LAYOUT.mobile.nodeWidth}
          height={60}
          radius={12}
          idPrefix="mobile"
        >
          <NodeContent
            title="Rubrik NAS Cloud Direct"
            subtitle="Policy-based protection"
            icon={<IconShield />}
          />
        </NodeShell>
        <NodeShell
          x={LAYOUT.mobile.columns.middle}
          y={LAYOUT.mobile.rows.bottom[0]}
          width={LAYOUT.mobile.nodeWidth}
          height={60}
          radius={12}
          idPrefix="mobile"
        >
          <NodeContent
            title="Immutable Recovery"
            subtitle="Immutable • anomaly detection"
            icon={<IconLock />}
          />
        </NodeShell>

        <path
          d={`M ${LAYOUT.mobile.columns.left + LAYOUT.mobile.nodeWidth} ${LAYOUT.mobile.rows.left[0] + 36} L ${LAYOUT.mobile.columns.left + LAYOUT.mobile.nodeWidth} ${LAYOUT.mobile.rows.left[2] + 20}`}
          stroke={COLORS.text}
          strokeWidth="1.6"
          fill="none"
          markerEnd="url(#mobile-arrow)"
        />
        <path
          d={`M ${LAYOUT.mobile.columns.left + LAYOUT.mobile.nodeWidth} ${LAYOUT.mobile.rows.left[2] + 36} L ${LAYOUT.mobile.columns.middle} ${LAYOUT.mobile.rows.middle[2] + 36}`}
          stroke={COLORS.text}
          strokeWidth="1.6"
          fill="none"
          markerEnd="url(#mobile-arrow)"
        />
        <path
          d={`M ${LAYOUT.mobile.columns.middle + LAYOUT.mobile.nodeWidth / 2} ${LAYOUT.mobile.rows.middle[2] + 72} L ${LAYOUT.mobile.columns.middle + LAYOUT.mobile.nodeWidth / 2} ${LAYOUT.mobile.rows.middle[2] + 90}`}
          stroke={COLORS.archive}
          strokeWidth="1.6"
          strokeDasharray="1 6"
          fill="none"
          markerEnd="url(#mobile-arrow)"
        />
        <path
          d={`M ${LAYOUT.mobile.columns.middle + LAYOUT.mobile.nodeWidth / 2} ${LAYOUT.mobile.rows.middle[2] + 150} L ${LAYOUT.mobile.columns.middle + LAYOUT.mobile.nodeWidth / 2} ${LAYOUT.mobile.rows.bottom[0]}`}
          stroke={COLORS.protection}
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          markerEnd="url(#mobile-arrow)"
        />
        <path
          d={`M ${LAYOUT.mobile.columns.left + LAYOUT.mobile.nodeWidth / 2} ${LAYOUT.mobile.rows.left[2] + 72} L ${LAYOUT.mobile.columns.left + LAYOUT.mobile.nodeWidth / 2} ${LAYOUT.mobile.rows.bottom[0]}`}
          stroke={COLORS.protection}
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          markerEnd="url(#mobile-arrow)"
        />
        <path
          d={`M ${LAYOUT.mobile.columns.left + LAYOUT.mobile.nodeWidth} ${LAYOUT.mobile.rows.bottom[0] + 30} L ${LAYOUT.mobile.columns.middle} ${LAYOUT.mobile.rows.bottom[0] + 30}`}
          stroke={COLORS.protection}
          strokeWidth="1.6"
          strokeDasharray="6 4"
          fill="none"
          markerEnd="url(#mobile-arrow)"
        />

        <Legend idPrefix="mobile" x={420} y={452} />
      </svg>
    </div>
  );
};
