import { describe, it, expect } from "vitest";
import { fmtHex, fmtKb, toConstantName } from "./format";

describe("fmtHex", () => {
  it("formats 0 correctly", () => {
    expect(fmtHex(0)).toBe("$0000");
  });

  it("formats word address to byte hex with $ prefix", () => {
    // 256 words * 2 = 512 bytes = $0200
    expect(fmtHex(256)).toBe("$0200");
  });

  it("formats max VRAM address", () => {
    // 32768 words * 2 = 65536 = $10000
    expect(fmtHex(32768)).toBe("$10000");
  });

  it("formats mid-range address", () => {
    // 4096 words * 2 = 8192 = $2000
    expect(fmtHex(4096)).toBe("$2000");
  });

  it("formats $1A00 correctly", () => {
    // $1A00 = 6656 bytes / 2 = 3328 words
    expect(fmtHex(3328)).toBe("$1A00");
  });
});

describe("fmtKb", () => {
  it("formats 0 words", () => {
    expect(fmtKb(0)).toBe("0.00 KB");
  });

  it("formats 4096 words (8 KB)", () => {
    // 4096 * 2 / 1024 = 8 KB
    expect(fmtKb(4096)).toBe("8.00 KB");
  });

  it("formats 512 words (1 KB)", () => {
    expect(fmtKb(512)).toBe("1.00 KB");
  });

  it("formats 32768 words (64 KB)", () => {
    expect(fmtKb(32768)).toBe("64.00 KB");
  });
});

describe("toConstantName", () => {
  it("converts simple label", () => {
    expect(toConstantName("BG1 Tiles")).toBe("VRAM_BG1_TILES");
  });

  it("handles already uppercase", () => {
    expect(toConstantName("OBJ")).toBe("VRAM_OBJ");
  });

  it("strips special characters", () => {
    expect(toConstantName("mode7-tiles!")).toBe("VRAM_MODE7_TILES");
  });

  it("handles spaces and dashes", () => {
    expect(toConstantName("bg map - 32x32")).toBe("VRAM_BG_MAP_32X32");
  });

  it("removes leading/trailing underscores", () => {
    expect(toConstantName("-test-")).toBe("VRAM_TEST");
  });
});
