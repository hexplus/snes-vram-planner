import type { BlockCategory } from "../types";
import { WORDS_PER_ROW } from "../constants";

/** Returns alignment step in words for a given block category */
export function getAlignmentStep(category: BlockCategory): number {
  switch (category) {
    case "bg-tiles":    return 4096;  // 8KB
    case "bg-map":      return 1024;  // 2KB  (technically 1024 words = $800 bytes)
    case "obj-tiles":   return 4096;  // 8KB
    case "mode7-tiles": return 32768; // entire VRAM
    case "hdma":        return WORDS_PER_ROW; // row-aligned
    default:            return WORDS_PER_ROW;
  }
}
