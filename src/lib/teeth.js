// FDI / ISO 3950 tooth catalogue.
// Permanent teeth use quadrants 1-4 (11-18, 21-28, 31-38, 41-48).
// Primary ("baby") teeth use quadrants 5-8 (51-55, 61-65, 71-75, 81-85)
// and have no premolars or third molars.

const QUADRANT_NAMES = {
    1: "Upper Right",
    2: "Upper Left",
    3: "Lower Left",
    4: "Lower Right",
    5: "Upper Right",
    6: "Upper Left",
    7: "Lower Left",
    8: "Lower Right",
};

const PERMANENT_POSITIONS = [
    "Central Incisor",
    "Lateral Incisor",
    "Canine",
    "First Premolar",
    "Second Premolar",
    "First Molar",
    "Second Molar",
    "Third Molar",
];

const PRIMARY_POSITIONS = [
    "Central Incisor",
    "Lateral Incisor",
    "Canine",
    "First Molar",
    "Second Molar",
];

/** Permanent FDI codes in quadrant order: 11-18, 21-28, 31-38, 41-48. */
export const PERMANENT_TEETH = [1, 2, 3, 4].flatMap((quadrant) => PERMANENT_POSITIONS.map((_, i) => quadrant * 10 + i + 1));

/** Primary FDI codes in quadrant order: 51-55, 61-65, 71-75, 81-85. */
export const PRIMARY_TEETH = [5, 6, 7, 8].flatMap((quadrant) => PRIMARY_POSITIONS.map((_, i) => quadrant * 10 + i + 1));

const VALID_TOOTH_NUMBERS = new Set([...PERMANENT_TEETH, ...PRIMARY_TEETH]);
const PRIMARY_TOOTH_NUMBERS = new Set(PRIMARY_TEETH);

export function isValidToothNumber(toothNumber) {
    return VALID_TOOTH_NUMBERS.has(toothNumber);
}

export function isPrimaryTooth(toothNumber) {
    return PRIMARY_TOOTH_NUMBERS.has(toothNumber);
}

/** Human-readable FDI name, e.g. 18 -> "Upper Right Third Molar". */
export function toothName(toothNumber) {
    const quadrant = Math.floor(toothNumber / 10);
    const position = toothNumber % 10;
    const positions = quadrant >= 5 ? PRIMARY_POSITIONS : PERMANENT_POSITIONS;
    const name = positions[position - 1];
    return name ? `${QUADRANT_NAMES[quadrant]} ${name}` : "Unknown tooth";
}

/** Select/label text, e.g. "18 — Upper Right Third Molar". */
export function toothOptionLabel(toothNumber) {
    return `${toothNumber} — ${toothName(toothNumber)}`;
}
