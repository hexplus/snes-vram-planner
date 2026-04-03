import { describe, it, expect } from "vitest";
import type { VramBlock } from "../types";

const VRAM_WORDS = 32768;
const WORDS_PER_ROW = 256;

// Mirrors findFreePosition from AddBlockDialog.ts (row-aligned)
function findFreePosition(existingBlocks: VramBlock[], size: number): number {
  if (existingBlocks.length === 0) return 0;
  const sorted = [...existingBlocks].sort((a, b) => a.startWord - b.startWord);
  if (sorted[0].startWord >= size) return 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].startWord + sorted[i].sizeWords;
    const gapEnd = sorted[i + 1].startWord;
    const aligned = Math.ceil(gapStart / WORDS_PER_ROW) * WORDS_PER_ROW;
    if (aligned + size <= gapEnd) return aligned;
  }
  const lastEnd = sorted[sorted.length - 1].startWord + sorted[sorted.length - 1].sizeWords;
  const aligned = Math.ceil(lastEnd / WORDS_PER_ROW) * WORDS_PER_ROW;
  if (aligned + size <= VRAM_WORDS) return aligned;
  return 0;
}

function makeBlock(overrides: Partial<VramBlock> = {}): VramBlock {
  return {
    id: "test", label: "Test", startWord: 0, sizeWords: 256,
    category: "bg-tiles", color: "blue", locked: false, note: "",
    ...overrides,
  };
}

describe("findFreePosition", () => {
  it("returns 0 for empty blocks", () => {
    expect(findFreePosition([], 256)).toBe(0);
  });

  it("finds gap before first block", () => {
    const blocks = [makeBlock({ startWord: 512, sizeWords: 256 })];
    expect(findFreePosition(blocks, 256)).toBe(0);
  });

  it("finds gap after first block when position 0 is taken", () => {
    const blocks = [makeBlock({ startWord: 0, sizeWords: 2048 })];
    expect(findFreePosition(blocks, 256)).toBe(2048);
  });

  it("finds gap between two blocks (row-aligned)", () => {
    const blocks = [
      makeBlock({ id: "a", startWord: 0, sizeWords: 1024 }),
      makeBlock({ id: "b", startWord: 2048, sizeWords: 1024 }),
    ];
    // Gap from 1024 to 2048. Already row-aligned at 1024
    expect(findFreePosition(blocks, 256)).toBe(1024);
  });

  it("skips gaps that are too small", () => {
    const blocks = [
      makeBlock({ id: "a", startWord: 0, sizeWords: 1024 }),
      makeBlock({ id: "b", startWord: 1024, sizeWords: 1024 }), // no gap
      makeBlock({ id: "c", startWord: 4096, sizeWords: 1024 }),
    ];
    // No gap between a and b. Gap b→c starts at 2048, fits 256
    expect(findFreePosition(blocks, 256)).toBe(2048);
  });

  it("uses gap after last block", () => {
    const blocks = [
      makeBlock({ id: "a", startWord: 0, sizeWords: 256 }),
      makeBlock({ id: "b", startWord: 256, sizeWords: 256 }),
    ];
    // After last block at 512, aligned to 256 = 512
    expect(findFreePosition(blocks, 256)).toBe(512);
  });

  it("returns 0 as fallback when VRAM is full", () => {
    const blocks = [makeBlock({ startWord: 0, sizeWords: 32768 })];
    expect(findFreePosition(blocks, 256)).toBe(0);
  });

  it("aligns to row boundaries (256 words)", () => {
    // Block ends at word 100, next row boundary is 256
    const blocks = [makeBlock({ startWord: 0, sizeWords: 100 })];
    expect(findFreePosition(blocks, 256)).toBe(256);
  });

  it("handles unsorted input", () => {
    const blocks = [
      makeBlock({ id: "b", startWord: 2048, sizeWords: 256 }),
      makeBlock({ id: "a", startWord: 0, sizeWords: 256 }),
    ];
    // Sorted: [0-256, 2048-2304]. Gap at 256, row-aligned
    expect(findFreePosition(blocks, 256)).toBe(256);
  });

  it("works with the Mode 1 preset", () => {
    const preset = [
      { id: "p1", startWord: 0,     sizeWords: 4096 },
      { id: "p2", startWord: 4096,  sizeWords: 4096 },
      { id: "p3", startWord: 8192,  sizeWords: 1024 },
      { id: "p4", startWord: 12288, sizeWords: 1024 },
      { id: "p5", startWord: 13312, sizeWords: 1024 },
      { id: "p6", startWord: 14336, sizeWords: 1024 },
      { id: "p7", startWord: 16384, sizeWords: 8192 },
    ].map(b => makeBlock(b));

    const pos = findFreePosition(preset, 256);
    // Gap after p3 (8192+1024=9216) to p4 (12288). Aligned at 9216
    expect(pos).toBe(9216);
    // Verify no overlap
    expect(preset.every(b =>
      pos + 256 <= b.startWord || pos >= b.startWord + b.sizeWords
    )).toBe(true);
  });
});
