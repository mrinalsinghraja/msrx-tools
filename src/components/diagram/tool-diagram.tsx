import { ARCHETYPE_CAPTION, archetypeOf, type Archetype } from "@/lib/diagram";
import type { ToolSpec } from "@/lib/tools/types";

/**
 * The per-tool drawing.
 *
 * Nine archetypes rather than eighty-eight illustrations, chosen from what the
 * registry already knows about each tool. Drawn in the sheet's own language:
 * hairline construction lines, solid work in the new-work pen, dimension ticks,
 * and lettering in the annotation face.
 *
 * Everything is `currentColor` and theme tokens, so the drawing inverts with
 * the sheet in dark mode without a second copy.
 */

const SHEET = "var(--color-construction-strong)";
const PEN = "var(--color-pen-new)";
const REV = "var(--color-pen-rev)";

/** A page: the unit every file diagram is built from. */
function Page({
  x,
  y,
  w = 34,
  h = 44,
  fill = "var(--color-sheet)",
  stroke = SHEET,
  dashed = false,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  fill?: string;
  stroke?: string;
  dashed?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={fill}
        stroke={stroke}
        strokeWidth="1.25"
        strokeDasharray={dashed ? "4 3" : undefined}
      />
      {/* The folded corner that reads as "sheet" at any size. */}
      <path d={`M${x + w - 9} ${y} L${x + w} ${y + 9} L${x + w - 9} ${y + 9} Z`} fill={stroke} opacity="0.35" />
    </g>
  );
}

/** Ruled lines standing in for content on a page. */
function Ruling({ x, y, w, rows = 3 }: { x: number; y: number; w: number; rows?: number }) {
  return (
    <g stroke={SHEET} strokeWidth="1" opacity="0.5">
      {Array.from({ length: rows }, (_, i) => (
        <line key={i} x1={x} y1={y + i * 6} x2={x + w} y2={y + i * 6} />
      ))}
    </g>
  );
}

/** A leader arrow, drawn the way a drawing draws one. */
function Arrow({ x1, y1, x2, y2, stroke = PEN }: { x1: number; y1: number; x2: number; y2: number; stroke?: string }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 5;
  const left = { x: x2 - head * Math.cos(angle - 0.42), y: y2 - head * Math.sin(angle - 0.42) };
  const right = { x: x2 - head * Math.cos(angle + 0.42), y: y2 - head * Math.sin(angle + 0.42) };
  return (
    <g stroke={stroke} strokeWidth="1.5" fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={`M${left.x} ${left.y} L${x2} ${y2} L${right.x} ${right.y}`} fill={stroke} stroke="none" />
    </g>
  );
}

/** A dimension line with terminator ticks, for stating a real quantity. */
function Dimension({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g>
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} stroke={SHEET} strokeWidth="1" />
      <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} stroke={SHEET} strokeWidth="1" />
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={SHEET} strokeWidth="1" />
      <text
        x={(x1 + x2) / 2}
        y={y - 7}
        textAnchor="middle"
        className="fill-graphite-faint font-mono"
        style={{ fontSize: 8, letterSpacing: "0.1em" }}
      >
        {label}
      </text>
    </g>
  );
}

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <figure className="flex flex-col">
      {/*
        Plain sheet, not poché. The hatch belongs to the workspace — the material
        the section cuts through — and putting linework on top of it makes both
        harder to read. A drawing goes on clean film.
      */}
      <div className="flex items-center justify-center border border-construction bg-sheet px-4 py-6">
        <svg viewBox="0 0 240 100" className="h-32 w-full" role="img" aria-label={label}>
          {children}
        </svg>
      </div>
      <figcaption className="annot border-x border-b border-construction bg-film px-3 py-2">
        {label}
      </figcaption>
    </figure>
  );
}

const DRAWINGS: Record<Archetype, React.ReactNode> = {
  converge: (
    <>
      <Page x={16} y={8} w={30} h={38} />
      <Page x={16} y={30} w={30} h={38} />
      <Page x={16} y={52} w={30} h={38} />
      <Arrow x1={54} y1={48} x2={92} y2={48} />
      <Page x={100} y={24} w={38} h={48} />
      <Ruling x={108} y={38} w={22} rows={4} />
      <Dimension x1={100} x2={138} y={82} label="1 FILE" />
      <Arrow x1={146} y1={48} x2={184} y2={48} stroke={SHEET} />
      <text x={192} y={51} className="fill-pen-new font-mono" style={{ fontSize: 9, letterSpacing: "0.1em" }}>
        OUT
      </text>
    </>
  ),
  diverge: (
    <>
      <Page x={20} y={24} w={38} h={48} />
      <Ruling x={28} y={38} w={22} rows={4} />
      {/* The section line: where the sheet is cut. */}
      <line x1={39} y1={14} x2={39} y2={82} stroke={REV} strokeWidth="1.25" strokeDasharray="7 3 2 3" />
      <Arrow x1={66} y1={48} x2={100} y2={26} />
      <Arrow x1={66} y1={48} x2={100} y2={48} />
      <Arrow x1={66} y1={48} x2={100} y2={70} />
      <Page x={108} y={8} w={28} h={34} />
      <Page x={108} y={30} w={28} h={34} />
      <Page x={108} y={52} w={28} h={34} />
      <Dimension x1={108} x2={136} y={92} label="N FILES" />
    </>
  ),
  reduce: (
    <>
      <Page x={22} y={16} w={44} h={62} />
      <Ruling x={30} y={32} w={28} rows={6} />
      <Dimension x1={22} x2={66} y={90} label="BEFORE" />
      <Arrow x1={78} y1={47} x2={112} y2={47} />
      <Page x={124} y={30} w={30} h={34} />
      <Ruling x={130} y={40} w={18} rows={3} />
      <Dimension x1={124} x2={154} y={90} label="AFTER" />
      {/* Inward arrows: the compression itself. */}
      <Arrow x1={176} y1={30} x2={190} y2={44} stroke={SHEET} />
      <Arrow x1={210} y1={64} x2={196} y2={50} stroke={SHEET} />
    </>
  ),
  subtract: (
    <>
      <Page x={30} y={16} w={44} h={62} />
      <Ruling x={38} y={30} w={28} rows={5} />
      {/* The material being removed, hatched and struck in the revision pen. */}
      <rect x={38} y={40} width={28} height={12} fill={REV} opacity="0.14" />
      <line x1={36} y1={52} x2={68} y2={38} stroke={REV} strokeWidth="1.5" />
      <Arrow x1={86} y1={47} x2={120} y2={47} />
      <Page x={132} y={16} w={44} h={62} />
      <Ruling x={140} y={30} w={28} rows={3} />
      <text x={196} y={50} className="fill-pen-rev font-mono" style={{ fontSize: 8, letterSpacing: "0.1em" }}>
        REMOVED
      </text>
    </>
  ),
  apply: (
    <>
      <Page x={34} y={16} w={44} h={62} />
      <Ruling x={42} y={30} w={28} rows={5} />
      <Arrow x1={90} y1={47} x2={124} y2={47} />
      <Page x={136} y={16} w={44} h={62} />
      <Ruling x={144} y={30} w={28} rows={5} />
      {/* The added layer, drawn over the sheet rather than in it. */}
      <rect x={144} y={38} width={28} height={16} fill={PEN} opacity="0.16" stroke={PEN} strokeWidth="1" />
      <line x1={180} y1={30} x2={200} y2={30} stroke={PEN} strokeWidth="1" />
      <text x={202} y={33} className="fill-pen-new font-mono" style={{ fontSize: 8, letterSpacing: "0.1em" }}>
        LAYER
      </text>
    </>
  ),
  transform: (
    <>
      <Page x={34} y={20} w={40} h={54} />
      <Ruling x={42} y={34} w={24} rows={4} />
      {/* The rotation arc: the operation itself, drawn as a movement. */}
      <path d="M92 60 A22 22 0 1 1 114 38" fill="none" stroke={PEN} strokeWidth="1.5" strokeDasharray="3 3" />
      <Arrow x1={110} y1={42} x2={118} y2={34} />
      <Page x={140} y={26} w={54} h={42} />
      <Ruling x={148} y={38} w={38} rows={3} />
      <Dimension x1={140} x2={194} y={80} label="RESHAPED" />
    </>
  ),
  compare: (
    <>
      <Page x={16} y={18} w={40} h={58} />
      <Ruling x={24} y={32} w={24} rows={5} />
      <Page x={72} y={18} w={40} h={58} />
      <Ruling x={80} y={32} w={24} rows={5} />
      {/* The datum line the two are measured against. */}
      <line x1={64} y1={8} x2={64} y2={88} stroke={SHEET} strokeWidth="1" strokeDasharray="7 3 2 3" />
      <Arrow x1={124} y1={47} x2={156} y2={47} />
      <rect x={166} y={26} width={52} height={42} fill="var(--color-sheet)" stroke={SHEET} strokeWidth="1.25" />
      <line x1={172} y1={38} x2={200} y2={38} stroke="var(--color-good)" strokeWidth="1.75" />
      <line x1={172} y1={46} x2={212} y2={46} stroke={REV} strokeWidth="1.75" />
      <line x1={172} y1={54} x2={196} y2={54} stroke="var(--color-good)" strokeWidth="1.75" />
    </>
  ),
  stream: (
    <>
      <rect x={16} y={22} width={72} height={52} fill="var(--color-sheet)" stroke={SHEET} strokeWidth="1.25" />
      <Ruling x={24} y={34} w={56} rows={5} />
      <Arrow x1={98} y1={48} x2={142} y2={48} />
      <text x={120} y={40} textAnchor="middle" className="fill-graphite-faint font-mono" style={{ fontSize: 8, letterSpacing: "0.1em" }}>
        PARSE
      </text>
      <rect x={152} y={22} width={72} height={52} fill="var(--color-sheet)" stroke={PEN} strokeWidth="1.25" />
      <g stroke={PEN} strokeWidth="1" opacity="0.65">
        <line x1={160} y1={34} x2={200} y2={34} />
        <line x1={166} y1={42} x2={210} y2={42} />
        <line x1={166} y1={50} x2={204} y2={50} />
        <line x1={160} y1={58} x2={192} y2={58} />
      </g>
    </>
  ),
  emit: (
    <>
      <rect x={22} y={22} width={62} height={52} fill="var(--color-sheet)" stroke={SHEET} strokeWidth="1.25" />
      {/* Control stack: the settings that drive the output. */}
      <g stroke={SHEET} strokeWidth="1.25">
        <line x1={32} y1={36} x2={74} y2={36} />
        <circle cx={48} cy={36} r={3.5} fill={PEN} stroke="none" />
        <line x1={32} y1={48} x2={74} y2={48} />
        <circle cx={62} cy={48} r={3.5} fill={PEN} stroke="none" />
        <line x1={32} y1={60} x2={74} y2={60} />
        <circle cx={38} cy={60} r={3.5} fill={PEN} stroke="none" />
      </g>
      <Arrow x1={94} y1={48} x2={132} y2={48} />
      <rect x={142} y={30} width={82} height={36} fill="var(--color-sheet)" stroke={PEN} strokeWidth="1.25" />
      <g stroke={PEN} strokeWidth="1.5" opacity="0.75">
        <line x1={150} y1={42} x2={216} y2={42} />
        <line x1={150} y1={54} x2={198} y2={54} />
      </g>
    </>
  ),
};

export function ToolDiagram({ tool }: { tool: ToolSpec }) {
  const archetype = archetypeOf(tool);
  return <Frame label={ARCHETYPE_CAPTION[archetype]}>{DRAWINGS[archetype]}</Frame>;
}
