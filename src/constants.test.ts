import { describe, it, expect } from "vitest";
import { VRAM_WORDS, VRAM_BYTES, WORDS_PER_ROW, TOTAL_ROWS, SNES_MODES, BLOCK_COLORS, TILE_SIZES_WORDS } from "./constants";

describe("VRAM constants", () => {
  it("VRAM is 64KB = 32768 words", () => {
    expect(VRAM_WORDS).toBe(32768);
    expect(VRAM_BYTES).toBe(65536);
    expect(VRAM_WORDS * 2).toBe(VRAM_BYTES);
  });

  it("grid has 128 rows of 256 words each", () => {
    expect(WORDS_PER_ROW).toBe(256);
    expect(TOTAL_ROWS).toBe(128);
    expect(WORDS_PER_ROW * TOTAL_ROWS).toBe(VRAM_WORDS);
  });
});

describe("SNES_MODES", () => {
  it("has 8 modes (0-7)", () => {
    expect(SNES_MODES).toHaveLength(8);
    expect(SNES_MODES[0].id).toBe(0);
    expect(SNES_MODES[7].id).toBe(7);
  });

  it("Mode 0 has 4 BGs at 2bpp", () => {
    const mode0 = SNES_MODES[0];
    expect(mode0.bgCount).toBe(4);
    expect(mode0.bpp).toEqual([2, 2, 2, 2]);
  });

  it("Mode 1 has 3 BGs (4bpp, 4bpp, 2bpp)", () => {
    const mode1 = SNES_MODES[1];
    expect(mode1.bgCount).toBe(3);
    expect(mode1.bpp).toEqual([4, 4, 2]);
  });

  it("Mode 7 has 1 BG at 8bpp", () => {
    const mode7 = SNES_MODES[7];
    expect(mode7.bgCount).toBe(1);
    expect(mode7.bpp).toEqual([8]);
  });

  it("all modes support OBJ", () => {
    SNES_MODES.forEach(mode => {
      expect(mode.objSupported).toBe(true);
    });
  });

  it("bpp array length matches bgCount", () => {
    SNES_MODES.forEach(mode => {
      expect(mode.bpp.length).toBe(mode.bgCount);
      expect(mode.tileSize.length).toBe(mode.bgCount);
    });
  });
});

describe("BLOCK_COLORS", () => {
  it("has 8 color entries", () => {
    expect(Object.keys(BLOCK_COLORS)).toHaveLength(8);
  });

  it("each color has bg, text, and border classes", () => {
    Object.values(BLOCK_COLORS).forEach(color => {
      expect(color.bg).toBeTruthy();
      expect(color.text).toBeTruthy();
      expect(color.border).toBeTruthy();
    });
  });
});

describe("TILE_SIZES_WORDS", () => {
  it("2bpp 8x8 tile = 8 words (16 bytes)", () => {
    expect(TILE_SIZES_WORDS["2bpp-8x8"]).toBe(8);
  });

  it("4bpp 8x8 tile = 16 words (32 bytes)", () => {
    expect(TILE_SIZES_WORDS["4bpp-8x8"]).toBe(16);
  });

  it("8bpp 8x8 tile = 32 words (64 bytes)", () => {
    expect(TILE_SIZES_WORDS["8bpp-8x8"]).toBe(32);
  });

  it("32x32 tilemap = 1024 words (2048 bytes)", () => {
    expect(TILE_SIZES_WORDS["tilemap-32x32"]).toBe(1024);
  });
});
