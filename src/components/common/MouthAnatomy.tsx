/**
 * Mouth anatomy overlay for the {@link OralCavityChart}.
 *
 * This module owns the SVG path geometry and JSX used to layer clinically
 * suggestive anatomical details (lip rim, palatal rugae, gum highlights,
 * tongue, frenum attachments, depth vignette) ON TOP of the base oral
 * cavity illustration. Everything is clipped to the inner mouth opening so
 * nothing overlaps the teeth from the outside.
 */

// Mouth outline paths (from the original illustration geometry).

/** Outer lip silhouette — defines the visible boundary of the mouth. */
export const LIP_OUTLINE =
  "M347.42,201.45c0,107.13-43.94,183.74-145.07,183.74c-94.65,0-145.07-76.62-145.07-183.74 c0-89.74,35.14-169.09,96.85-188.74c13.38-4.26,32.47-1.27,48.57-1.27c16.5,0,35.76-3.18,49.11,0.59 C317.7,30.67,347.42,110.7,347.42,201.45z";

/** Inner mouth opening — the hole inside the lips; also used as a clip path. */
export const MOUTH_OPENING =
  "M332.68,196.83c0,97.39-46.37,163.56-128.25,163.56c-85.09,0-134.47-65.31-134.47-162.71 S113.8,27.45,204.43,30.67C299.84,34.06,332.68,99.44,332.68,196.83z";

/**
 * Inline mouth anatomy details — layered on top of the base oral cavity
 * illustration. Only subtle enhancements: lip rim, tongue, palatal rugae,
 * gum highlights, and depth vignette. All clipped to the inner mouth so
 * nothing overlaps the teeth from the outside.
 */
export function MouthAnatomy() {
  return (
    <>
      <defs>
        {/* Lip rim gradient (the ring of tissue between lips and mouth) */}
        <linearGradient id="lipRim" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#D86858" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#C2584C" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#D86858" stopOpacity="0.7" />
        </linearGradient>
        {/* Tongue gradient */}
        <radialGradient id="tongueGrad" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#E88884" />
          <stop offset="55%" stopColor="#CC6460" />
          <stop offset="100%" stopColor="#9C4844" />
        </radialGradient>
        {/* Subtle inner vignette for depth */}
        <radialGradient id="innerShadow" cx="50%" cy="50%" r="55%">
          <stop offset="65%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.3" />
        </radialGradient>
        {/* Clip to the inner mouth opening */}
        <clipPath id="mouthClip">
          <path d={MOUTH_OPENING} />
        </clipPath>
      </defs>

      {/* ===== Lip rim (the ring between outer lip and inner mouth) ===== */}
      {/* Uses evenodd fill rule: outer outline minus inner opening = ring.
          This frames the mouth WITHOUT covering the teeth. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d={`${LIP_OUTLINE} ${MOUTH_OPENING}`}
        fill="url(#lipRim)"
      />

      {/* ===== Details clipped to the inner mouth ===== */}
      <g clipPath="url(#mouthClip)">
        {/* Palatal rugae (ridges on the roof of the mouth) — top area only */}
        <g
          stroke="#7C2E2A"
          strokeWidth={1.2}
          opacity={0.25}
          fill="none"
          strokeLinecap="round"
        >
          <path d="M155,52 Q157,72 155,90" />
          <path d="M170,48 Q172,70 170,93" />
          <path d="M185,46 Q187,69 185,95" />
          <path d="M200,45 Q202,69 200,97" />
          <path d="M215,45 Q213,69 215,97" />
          <path d="M230,46 Q228,70 230,95" />
          <path d="M245,48 Q243,71 245,93" />
          <path d="M258,52 Q256,73 258,90" />
        </g>

        {/* Upper gum highlight (glossy ridge along the upper arch) */}
        <path
          d="M120,118 Q130,72 204,60 Q280,72 290,118"
          fill="none"
          stroke="#F4B0A8"
          strokeWidth={3.5}
          opacity={0.25}
          strokeLinecap="round"
        />

        {/* Lower gum highlight */}
        <path
          d="M120,282 Q130,328 204,340 Q280,328 290,282"
          fill="none"
          stroke="#F4B0A8"
          strokeWidth={3.5}
          opacity={0.25}
          strokeLinecap="round"
        />

        {/* Tongue (floor of mouth) — lower center only */}
        <ellipse
          cx={204}
          cy={335}
          rx={72}
          ry={28}
          fill="url(#tongueGrad)"
          opacity={0.75}
        />
        {/* Tongue central groove */}
        <path
          d="M172,330 Q204,340 236,330"
          fill="none"
          stroke="#883838"
          strokeWidth={1.5}
          opacity={0.4}
          strokeLinecap="round"
        />

        {/* Frenum attachments (subtle tissue lines) */}
        <path
          d="M204,108 L204,128"
          fill="none"
          stroke="#A84440"
          strokeWidth={1.2}
          opacity={0.35}
        />
        <path
          d="M204,292 L204,272"
          fill="none"
          stroke="#A84440"
          strokeWidth={1.2}
          opacity={0.35}
        />

        {/* Subtle inner vignette (depth at edges only) */}
        <ellipse
          cx={204}
          cy={200}
          rx={130}
          ry={165}
          fill="url(#innerShadow)"
        />
      </g>

      {/* Lip shine (subtle, on the outer lip area only) */}
      <path
        d="M170,28 Q204,20 238,28"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        opacity={0.18}
        strokeLinecap="round"
      />
      <ellipse
        cx={204}
        cy={345}
        rx={48}
        ry={6}
        fill="#FFFFFF"
        opacity={0.1}
      />
    </>
  );
}
