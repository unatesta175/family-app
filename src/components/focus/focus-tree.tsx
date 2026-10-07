import type { FocusSpecies } from "@/lib/focus";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

/** Leaf colours per species: darker back, main, light highlight. */
const PALETTE: Record<FocusSpecies, { a: string; b: string; c: string; trunk: string; blossom?: string }> = {
  oak: { a: "#2f7d3a", b: "#3fa34d", c: "#7ed17f", trunk: "#7a5230" },
  pine: { a: "#14573f", b: "#1d7a58", c: "#3fae85", trunk: "#6b4a2d" },
  sakura: { a: "#e58bb0", b: "#f3a9c6", c: "#ffd6e6", trunk: "#6d4a3c", blossom: "#ffffff" },
  maple: { a: "#c2410c", b: "#ea6a1a", c: "#fbbf24", trunk: "#7a4a2a" },
};
const WITHERED: { a: string; b: string; c: string; trunk: string; blossom?: string } = { a: "#8a7f68", b: "#a79c82", c: "#c2b99f", trunk: "#5b4a3a" };

/**
 * A tree drawn in flat 2D shapes (SVG), growing with `progress` (0 to 1): a sprout, a sapling, then a
 * full crown. `withered` greys it out with bare, drooping branches. It is cheap to draw, so a garden
 * of hundreds of them is fine; turn `animate` off for those.
 */
export function FocusTree({
  progress,
  species,
  withered = false,
  animate = true,
  className,
}: {
  progress: number;
  species: FocusSpecies;
  withered?: boolean;
  animate?: boolean;
  className?: string;
}) {
  const p = clamp01(progress);
  const col = withered ? WITHERED : PALETTE[species];
  const sprout = p < 0.14;
  const g = easeOut(clamp01((p - 0.14) / 0.86));
  const hk = lerp(0.22, 1, g); // trunk height (of 40)
  const tw = lerp(0.55, 1.15, g); // trunk width
  const crown = withered ? lerp(0.0, 0.5, g) : lerp(0.28, 1, g);
  const cy = 104 - 40 * hk - 3;
  const tr = animate ? "transform 1s linear" : undefined;

  return (
    <svg viewBox="0 0 100 120" className={className} role="img" aria-label={withered ? "Withered tree" : "Tree"}>
      <ellipse cx="50" cy="105" rx={lerp(10, 26, g)} ry="3.2" fill="#000" opacity="0.14" />

      {sprout ? (
        <g style={{ transform: "translate(50px, 104px)" }}>
          <path d={withered ? "M0 0 C-1 -6 3 -10 6 -13" : "M0 0 L0 -14"} stroke={withered ? WITHERED.trunk : "#5aa84f"} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          {!withered && (
            <>
              <ellipse cx="-5" cy="-15" rx="6" ry="3.4" fill={col.b} transform="rotate(-28 -5 -15)" />
              <ellipse cx="5" cy="-17" rx="6" ry="3.4" fill={col.c} transform="rotate(28 5 -17)" />
            </>
          )}
        </g>
      ) : (
        <>
          {/* trunk: a tapered column that stretches up as the tree grows */}
          <g style={{ transform: `translate(50px, 104px) scale(${tw}, ${hk})`, transition: tr }}>
            <path d="M-4.2 0 L-2.6 -40 L2.6 -40 L4.2 0 Z" fill={col.trunk} />
            {withered && <path d="M0 -26 L-9 -34 M0 -20 L9 -29" stroke={col.trunk} strokeWidth="1.6" strokeLinecap="round" fill="none" />}
          </g>

          {/* crown */}
          <g style={{ transform: `translate(50px, ${cy}px) scale(${crown})`, transition: tr }}>
            {species === "pine" && !withered ? (
              <>
                <polygon points="0,-34 -22,-4 22,-4" fill={col.a} />
                <polygon points="0,-44 -17,-18 17,-18" fill={col.b} />
                <polygon points="0,-52 -12,-32 12,-32" fill={col.c} />
              </>
            ) : withered ? (
              <g opacity="0.95">
                <circle cx="-8" cy="-2" r="9" fill={col.a} />
                <circle cx="9" cy="2" r="7" fill={col.b} />
                <circle cx="0" cy="-12" r="7" fill={col.c} />
              </g>
            ) : (
              <>
                <circle cx="-15" cy="4" r="16" fill={col.a} />
                <circle cx="15" cy="4" r="16" fill={col.a} />
                <circle cx="0" cy="-6" r="21" fill={col.b} />
                <circle cx="-7" cy="-16" r="11" fill={col.c} opacity="0.85" />
                {col.blossom && (
                  <>
                    <circle cx="-12" cy="-4" r="2.2" fill={col.blossom} />
                    <circle cx="10" cy="-10" r="2.2" fill={col.blossom} />
                    <circle cx="4" cy="6" r="2.2" fill={col.blossom} />
                    <circle cx="-3" cy="-18" r="2" fill={col.blossom} />
                  </>
                )}
              </>
            )}
          </g>
        </>
      )}

      {withered && (
        <g fill={col.b}>
          <ellipse cx="34" cy="106" rx="3.4" ry="1.5" transform="rotate(-20 34 106)" />
          <ellipse cx="66" cy="107" rx="3.4" ry="1.5" transform="rotate(25 66 107)" />
          <ellipse cx="55" cy="109" rx="3" ry="1.3" />
        </g>
      )}
    </svg>
  );
}
