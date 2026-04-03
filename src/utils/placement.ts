import type { VramBlock } from "../types";
import { VRAM_WORDS, WORDS_PER_ROW } from "../constants";

/**
 * Find the first free position in VRAM that can fit `size` words
 * without overlapping any existing blocks. Returns a row-aligned start.
 */
export function findFreePosition(existingBlocks: VramBlock[], size: number, alignStep = WORDS_PER_ROW): number {
  if (existingBlocks.length === 0) return 0;

  const sorted = [...existingBlocks].sort((a, b) => a.startWord - b.startWord);

  // Check gap before first block
  if (sorted[0].startWord >= size) return 0;

  // Check gaps between blocks
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].startWord + sorted[i].sizeWords;
    const gapEnd = sorted[i + 1].startWord;
    const aligned = Math.ceil(gapStart / alignStep) * alignStep;
    if (aligned + size <= gapEnd) return aligned;
  }

  // Check gap after last block
  const lastEnd = sorted[sorted.length - 1].startWord + sorted[sorted.length - 1].sizeWords;
  const aligned = Math.ceil(lastEnd / alignStep) * alignStep;
  if (aligned + size <= VRAM_WORDS) return aligned;

  return 0;
}
