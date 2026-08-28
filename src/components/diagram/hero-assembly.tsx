/**
 * The hero: an orthographic assembly drawing of what actually happens to a file.
 *
 * This is the argument, not an illustration of it. The claim "your file never
 * leaves your device" is a statement about topology — which node the work
 * happens at — and a topology is best drawn. The route to the server is drawn
 * and then struck through in the revision pen, because the interesting thing
 * about this design is the path that was deleted.
 *
 * The linework plots itself in on load the way a pen plotter lays a sheet down,
 * left to right. Under `prefers-reduced-motion` the completed drawing is there
 * from the first frame — a half-plotted drawing is worse than a static one.
 */

const PLOT_STEPS = [
  { id: "device", delay: 0 },
  { id: "file-in", delay: 260 },
  { id: "engine", delay: 520 },
  { id: "file-out", delay: 900 },
  { id: "server", delay: 1180 },
  { id: "strike", delay: 1500 },
];

function delayOf(id: string) {
  return PLOT_STEPS.find((step) => step.id === id)?.delay ?? 0;
}

/** A plotted path: dashed to its own length, then drawn in. */
function Plot({
  d,
  length,
  step,
  stroke = "var(--color-construction-strong)",
  width = 1.5,
  fill = "none",
  dash,
}: {
  d: string;
  length: number;
  step: string;
  stroke?: string;
  width?: number;
  fill?: string;
  dash?: string;
}) {
  return (
    <path
      d={d}
      fill={fill}
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="square"
      data-plot=""
      style={
        {
          strokeDasharray: dash ?? length,
          "--plot-length": length,
          strokeDashoffset: dash ? 0 : length,
          animation: dash
            ? `annot-in 400ms ease ${delayOf(step)}ms both`
            : `plot-in 520ms cubic-bezier(0.4, 0, 0.2, 1) ${delayOf(step)}ms both`,
        } as React.CSSProperties
      }
    />
  );
}

function Annotation({
  x,
  y,
  step,
  children,
  anchor = "start",
  tone = "var(--color-graphite-faint)",
}: {
  x: number;
  y: number;
  step: string;
  children: string;
  anchor?: "start" | "middle" | "end";
  tone?: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={tone}
      className="font-mono"
      style={{
        fontSize: 9,
        letterSpacing: "0.14em",
        animation: `annot-in 400ms ease ${delayOf(step) + 220}ms both`,
      }}
    >
      {children}
    </text>
  );
}

export function HeroAssembly() {
  return (
    <svg
      viewBox="24 8 616 268"
      className="h-auto w-full"
      role="img"
      aria-label="Assembly diagram: a file enters your browser, is processed there, and is returned. The route to a server is drawn and struck out, because it is not used."
    >
      {/* The device. Everything real happens inside this outline. */}
      <Plot d="M44 34 H352 V202 H44 Z" length={952} step="device" width={1.75} />
      <Annotation x={52} y={26} step="device">
        YOUR DEVICE
      </Annotation>

      {/* The browser tab, drawn as a nested enclosure. */}
      <Plot
        d="M74 68 H322 V176 H74 Z"
        length={712}
        step="engine"
        stroke="var(--color-pen-new)"
        width={1.5}
      />
      <Plot d="M74 68 H140 V54 H208 V68" length={190} step="engine" stroke="var(--color-pen-new)" width={1.5} />
      <Annotation x={84} y={50} step="engine" tone="var(--color-pen-new)">
        BROWSER TAB
      </Annotation>

      {/* The engine node: where the work is done. */}
      <Plot
        d="M170 100 H262 V150 H170 Z"
        length={284}
        step="engine"
        stroke="var(--color-pen-new)"
        width={1.5}
      />
      <g style={{ animation: `annot-in 500ms ease ${delayOf("engine") + 300}ms both` }}>
        <rect x={170} y={100} width={92} height={50} fill="var(--color-pen-new)" opacity="0.08" />
      </g>
      <Annotation x={216} y={130} step="engine" anchor="middle" tone="var(--color-pen-new)">
        PROCESSING
      </Annotation>

      {/* The file in and out. */}
      <Plot d="M96 100 H140 V150 H96 Z" length={188} step="file-in" />
      <Plot d="M104 116 H132 M104 126 H132 M104 136 H124" length={84} step="file-in" width={1} dash="0" />
      <Annotation x={118} y={168} step="file-in" anchor="middle">
        FILE
      </Annotation>
      <Plot d="M144 125 H164" length={20} step="file-in" stroke="var(--color-pen-new)" />

      <Plot d="M292 100 H336 V150 H292 Z" length={188} step="file-out" />
      <Plot d="M300 116 H328 M300 126 H328 M300 136 H320" length={84} step="file-out" width={1} dash="0" />
      <Annotation x={314} y={168} step="file-out" anchor="middle">
        RESULT
      </Annotation>
      <Plot d="M268 125 H288" length={20} step="file-out" stroke="var(--color-pen-new)" />

      {/* Dimension line across the device: the whole journey, measured. */}
      <Plot d="M44 226 V236 M352 226 V236 M44 231 H352" length={330} step="file-out" width={1} />
      <Annotation x={198} y={250} step="file-out" anchor="middle">
        ENTIRE JOURNEY — 0 BYTES TRANSMITTED
      </Annotation>

      {/* The server that is not used. */}
      <Plot
        d="M452 88 H596 V162 H452 Z"
        length={436}
        step="server"
        stroke="var(--color-construction)"
        width={1.25}
        dash="6 4"
      />
      <Annotation x={524} y={80} step="server" anchor="middle">
        SOMEONE ELSE&rsquo;S SERVER
      </Annotation>
      <Plot
        d="M470 112 H578 M470 126 H578 M470 140 H548"
        length={280}
        step="server"
        stroke="var(--color-construction)"
        width={1}
        dash="4 4"
      />

      {/* The route that does not exist, drawn then struck out. */}
      <Plot
        d="M356 125 H448"
        length={92}
        step="server"
        stroke="var(--color-construction)"
        width={1.25}
        dash="6 4"
      />

      {/* The revision strike: the one place the second pen is used. */}
      <Plot d="M376 104 L428 146" length={67} step="strike" stroke="var(--color-pen-rev)" width={2} />
      <Plot d="M428 104 L376 146" length={67} step="strike" stroke="var(--color-pen-rev)" width={2} />
      <Annotation x={402} y={172} step="strike" anchor="middle" tone="var(--color-pen-rev)">
        NOT USED
      </Annotation>

      {/* Revision cloud tag, the way a drawing flags a change. */}
      <g style={{ animation: `annot-in 500ms ease ${delayOf("strike") + 260}ms both` }}>
        <path
          d="M470 196 h56 l10 12 -10 12 h-56 z"
          fill="none"
          stroke="var(--color-pen-rev)"
          strokeWidth="1.25"
        />
        <text
          x={480}
          y={212}
          fill="var(--color-pen-rev)"
          className="font-mono"
          style={{ fontSize: 9, letterSpacing: "0.12em" }}
        >
          REV. 00
        </text>
      </g>
      <Annotation x={470} y={236} step="strike">
        UPLOAD PATH DELETED
      </Annotation>
    </svg>
  );
}
