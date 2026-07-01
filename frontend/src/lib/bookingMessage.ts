// Builds the suggested first-contact message a client sends an artist, from
// their budget and piece preferences. Extracted from ClientProfile so the
// wording rules are testable.

export type RequestMessageInput = {
  budgetMin: number;
  budgetMax: number;
  /** Normalized piece-type value ("none" or a label). */
  pieceType?: string;
  /** Normalized placement value ("none" or a label). */
  placement?: string;
  size?: string;
  hasReferences?: boolean;
};

const SIZE_PHRASE: Record<string, string> = {
  tiny: "a tiny piece",
  small: "a small piece",
  medium: "a medium-sized piece",
  large: "a large piece",
  xl: "a large piece",
  xxl: "a large piece",
};

const isNamed = (v?: string) => !!v && v !== "none";
const article = (w: string) => (/^[aeiou]/i.test(w.trim()) ? "an" : "a");

export function buildRequestMessage(input: RequestMessageInput): string {
  const { budgetMin, budgetMax, pieceType, placement, size, hasReferences } = input;

  const parts = ["Hi! I'm interested in getting a tattoo."];
  if (hasReferences) {
    parts.push("I've attached a few references that show the style and vibe I'm going for.");
  }
  parts.push(`My budget is around $${budgetMin}–$${budgetMax}.`);
  if (isNamed(pieceType)) {
    parts.push(`I'm interested in ${article(pieceType!)} ${pieceType!.toLowerCase()}.`);
  }
  if (isNamed(placement)) {
    parts.push(`I'd like it on my ${placement!.toLowerCase()}.`);
  }
  if (size && SIZE_PHRASE[size]) {
    parts.push(`I'm thinking ${SIZE_PHRASE[size]}.`);
  }
  parts.push("Let me know if you're available and interested!");
  return parts.join(" ");
}
