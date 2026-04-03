import { describe, it, expect } from "vitest";
import { findFreePosition } from "./placement";
import type { VramBlock } from "../types";

function makeBlock(startWord: number, sizeWords: number): VramBlock {
  return {
    id: "x", label: "", startWord, sizeWords,
    category: "bg-tiles", color: "blue", locked: false, note: "",
  };
}

describe("findFreePosition", () => {
  it("returns 0 for empty blocks", () => {
    expect(findFreePosition([], 256)).toBe(0);
  });

  it("returns 0 if space before first block", () => {
    expect(findFreePosition([makeBlock(1024, 256)], 256)).toBe(0);
  });

  it("finds gap between blocks", () => {
    const blocks = [makeBlock(0, 256), makeBlock(1024, 256)];
    expect(findFreePosition(blocks, 256)).toBe(256);
  });

  it("places after last block if no gaps", () => {
    const blocks = [makeBlock(0, 256), makeBlock(256, 256)];
    expect(findFreePosition(blocks, 256)).toBe(512);
  });

  it("respects alignment step", () => {
    const blocks = [makeBlock(0, 100)];
    // With 4096-word alignment, next position should be 4096
    expect(findFreePosition(blocks, 256, 4096)).toBe(4096);
  });

  it("returns 0 if nothing fits", () => {
    const blocks = [makeBlock(0, 32768)];
    expect(findFreePosition(blocks, 256)).toBe(0);
  });
});
