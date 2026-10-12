/**
 * Subtle overlay matching the Belanje reference app's card surface: two soft blurred light
 * blobs (top-right, bottom-left) plus a faint diagonal hairline pattern. Pure CSS/SVG, no
 * images. Absolutely positioned — the parent card must be `position: relative` and clip
 * overflow (it already is, via `rounded-2xl`/`rounded-3xl` + `overflow-hidden` on the card).
 */
export function CardTexture() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div
        className="absolute -right-6 -top-10 h-40 w-40 rounded-full opacity-25 blur-2xl"
        style={{ background: "radial-gradient(circle, currentColor 0%, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full opacity-[0.12] blur-2xl"
        style={{ background: "radial-gradient(circle, currentColor 0%, transparent 70%)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, currentColor 0px, currentColor 1px, transparent 1px, transparent 14px)",
        }}
      />
    </div>
  );
}
