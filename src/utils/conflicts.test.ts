import { describe, it, expect } from "vitest";
import { detectConflicts, blockHasConflict, detectAlignmentWarnings, blockHasWarning } from "./conflicts";
import type { VramBlock } from "../types";

function makeBlock(overrides: Partial<VramBlock> = {}): VramBlock {
  return {
    id: "test-1",
    label: "Test Block",
    startWord: 0,
    sizeWords: 256,
    category: "bg-tiles",
    color: "blue",
    locked: false,
    note: "",
    ...overrides,
  };
}

describe("detectConflicts", () => {
  it("returns empty array for no blocks", () => {
    expect(detectConflicts([])).toEqual([]);
  });

  it("returns empty array for a single block", () => {
    expect(detectConflicts([makeBlock()])).toEqual([]);
  });

  it("returns empty array for non-overlapping blocks", () => {
    const a = makeBlock({ id: "a", startWord: 0, sizeWords: 100 });
    const b = makeBlock({ id: "b", startWord: 100, sizeWords: 100 });
    expect(detectConflicts([a, b])).toEqual([]);
  });

  it("detects overlapping blocks", () => {
    const a = makeBlock({ id: "a", startWord: 0, sizeWords: 200 });
    const b = makeBlock({ id: "b", startWord: 100, sizeWords: 200 });
    const conflicts = detectConflicts([a, b]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      blockAId: "a",
      blockBId: "b",
      overlapStart: 100,
      overlapEnd: 200,
    });
  });

  it("detects full containment as a conflict", () => {
    const outer = makeBlock({ id: "outer", startWord: 0, sizeWords: 500 });
    const inner = makeBlock({ id: "inner", startWord: 100, sizeWords: 50 });
    const conflicts = detectConflicts([outer, inner]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapStart).toBe(100);
    expect(conflicts[0].overlapEnd).toBe(150);
  });

  it("detects multiple overlaps among 3 blocks", () => {
    const a = makeBlock({ id: "a", startWord: 0, sizeWords: 200 });
    const b = makeBlock({ id: "b", startWord: 100, sizeWords: 200 });
    const c = makeBlock({ id: "c", startWord: 250, sizeWords: 100 });
    const conflicts = detectConflicts([a, b, c]);
    // a overlaps b, b overlaps c
    expect(conflicts).toHaveLength(2);
  });

  it("adjacent blocks do not conflict (exclusive end)", () => {
    const a = makeBlock({ id: "a", startWord: 0, sizeWords: 100 });
    const b = makeBlock({ id: "b", startWord: 100, sizeWords: 100 });
    expect(detectConflicts([a, b])).toEqual([]);
  });
});

describe("blockHasConflict", () => {
  it("returns true when block is involved in a conflict", () => {
    const conflicts = [{ blockAId: "a", blockBId: "b", overlapStart: 100, overlapEnd: 200 }];
    expect(blockHasConflict("a", conflicts)).toBe(true);
    expect(blockHasConflict("b", conflicts)).toBe(true);
  });

  it("returns false when block is not involved", () => {
    const conflicts = [{ blockAId: "a", blockBId: "b", overlapStart: 100, overlapEnd: 200 }];
    expect(blockHasConflict("c", conflicts)).toBe(false);
  });

  it("returns false with empty conflict list", () => {
    expect(blockHasConflict("a", [])).toBe(false);
  });
});

describe("detectAlignmentWarnings", () => {
  it("returns no warnings for empty blocks", () => {
    expect(detectAlignmentWarnings([])).toEqual([]);
  });

  it("returns no warnings for properly aligned bg-tiles at 8KB boundary", () => {
    // startWord 0 = byte $0000 (8KB aligned)
    const block = makeBlock({ category: "bg-tiles", startWord: 0 });
    expect(detectAlignmentWarnings([block])).toEqual([]);
  });

  it("returns no warnings for bg-tiles at $2000 (8KB)", () => {
    // startWord 4096 = byte $2000 (8KB aligned)
    const block = makeBlock({ category: "bg-tiles", startWord: 4096 });
    expect(detectAlignmentWarnings([block])).toEqual([]);
  });

  it("warns for bg-tiles not on 8KB boundary", () => {
    // startWord 100 = byte $00C8 (not 8KB aligned)
    const block = makeBlock({ id: "misaligned", category: "bg-tiles", startWord: 100 });
    const warnings = detectAlignmentWarnings([block]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].blockId).toBe("misaligned");
    expect(warnings[0].message).toContain("8KB-aligned");
    expect(warnings[0].requiredAlign).toBe(0x2000);
  });

  it("returns no warnings for bg-map at 2KB boundary", () => {
    // startWord 1024 = byte $0800 (2KB aligned)
    const block = makeBlock({ category: "bg-map", startWord: 1024 });
    expect(detectAlignmentWarnings([block])).toEqual([]);
  });

  it("warns for bg-map not on 2KB boundary", () => {
    // startWord 500 = byte $03E8 (not 2KB aligned)
    const block = makeBlock({ id: "bad-map", category: "bg-map", startWord: 500 });
    const warnings = detectAlignmentWarnings([block]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("2KB-aligned");
    expect(warnings[0].requiredAlign).toBe(0x0800);
  });

  it("returns no warnings for obj-tiles at 8KB boundary", () => {
    // startWord 16384 = byte $8000 (8KB aligned)
    const block = makeBlock({ category: "obj-tiles", startWord: 16384 });
    expect(detectAlignmentWarnings([block])).toEqual([]);
  });

  it("warns for obj-tiles not on 8KB boundary", () => {
    const block = makeBlock({ id: "bad-obj", category: "obj-tiles", startWord: 1000 });
    const warnings = detectAlignmentWarnings([block]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("8KB-aligned");
  });

  it("returns no warnings for mode7-tiles at $0000", () => {
    const block = makeBlock({ category: "mode7-tiles", startWord: 0 });
    expect(detectAlignmentWarnings([block])).toEqual([]);
  });

  it("warns for mode7-tiles not at $0000", () => {
    const block = makeBlock({ id: "bad-m7", category: "mode7-tiles", startWord: 100 });
    const warnings = detectAlignmentWarnings([block]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("$0000");
  });

  it("returns no warnings for free/color-math categories regardless of alignment", () => {
    const blocks = [
      makeBlock({ id: "f1", category: "free", startWord: 123 }),
      makeBlock({ id: "f2", category: "color-math", startWord: 456 }),
    ];
    expect(detectAlignmentWarnings(blocks)).toEqual([]);
  });

  it("detects multiple warnings across different blocks", () => {
    const blocks = [
      makeBlock({ id: "a", category: "bg-tiles", startWord: 100 }), // misaligned
      makeBlock({ id: "b", category: "bg-map", startWord: 500 }),    // misaligned
      makeBlock({ id: "c", category: "bg-tiles", startWord: 4096 }), // aligned
    ];
    const warnings = detectAlignmentWarnings(blocks);
    expect(warnings).toHaveLength(2);
  });
});

describe("blockHasWarning", () => {
  it("returns true when block has a warning", () => {
    const warnings = [{ blockId: "a", message: "test", requiredAlign: 0x2000, actualByte: 0x100 }];
    expect(blockHasWarning("a", warnings)).toBe(true);
  });

  it("returns false when block has no warning", () => {
    const warnings = [{ blockId: "a", message: "test", requiredAlign: 0x2000, actualByte: 0x100 }];
    expect(blockHasWarning("b", warnings)).toBe(false);
  });
});
