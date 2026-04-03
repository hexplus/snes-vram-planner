import { describe, it, expect } from "vitest";
import { obselRegValue, computePpuRegisters, formatRegistersAsAsm } from "./registers";
import { SNES_MODES } from "../constants";
import type { VramBlock, ObselConfig } from "../types";

function makeBlock(overrides: Partial<VramBlock>): VramBlock {
  return {
    id: "t", label: "Test", startWord: 0, sizeWords: 256,
    category: "bg-tiles", color: "blue", locked: false, note: "",
    ...overrides,
  };
}

const defaultObsel: ObselConfig = { nameBaseWord: 0x4000, gap: 0x1000 };

describe("obselRegValue", () => {
  it("returns 0 for base 0 gap 8KB size 0", () => {
    expect(obselRegValue(0, 0x1000, 0)).toBe(0);
  });

  it("encodes name base correctly", () => {
    // nameBaseWord 4096 = byte $2000 -> field = 1
    expect(obselRegValue(4096, 0x1000, 0)).toBe(1);
  });

  it("encodes gap correctly", () => {
    // gap 0x2000 = nameSelect 1 -> bits 3-4 = 0x08
    expect(obselRegValue(0, 0x2000, 0)).toBe(0x08);
  });

  it("encodes sprite size correctly", () => {
    // objSize 3 -> bits 5-7 = 0x60
    expect(obselRegValue(0, 0x1000, 3)).toBe(0x60);
  });

  it("combines all fields", () => {
    // base 1, gap 1, size 1 = 0x20 | 0x08 | 0x01 = 0x29
    expect(obselRegValue(4096, 0x2000, 1)).toBe(0x29);
  });
});

describe("computePpuRegisters", () => {
  it("returns zeroes for empty blocks", () => {
    const regs = computePpuRegisters([], SNES_MODES[1], defaultObsel);
    expect(regs.bg1sc).toBe(0);
    expect(regs.bg12nba).toBe(0);
  });

  it("computes BG12NBA from tile blocks", () => {
    const blocks = [
      makeBlock({ id: "a", startWord: 0, category: "bg-tiles" }),       // byte $0000 -> nba 0
      makeBlock({ id: "b", startWord: 4096, category: "bg-tiles" }),    // byte $2000 -> nba 2
    ];
    const regs = computePpuRegisters(blocks, SNES_MODES[1], defaultObsel);
    expect(regs.bg12nba).toBe(0x20); // BG2 in high nibble = 2, BG1 in low = 0
  });

  it("computes BGxSC from map blocks", () => {
    // startWord 12288 = byte $6000 -> sc base = ($6000 >> 8) & 0xFC = 0x60
    const blocks = [makeBlock({ id: "m", startWord: 12288, category: "bg-map" })];
    const regs = computePpuRegisters(blocks, SNES_MODES[1], defaultObsel);
    expect(regs.bg1sc).toBe(0x60);
  });
});

describe("formatRegistersAsAsm", () => {
  it("produces valid ASM output", () => {
    const regs = computePpuRegisters([], SNES_MODES[1], defaultObsel);
    const asm = formatRegistersAsAsm(regs, SNES_MODES[1]);
    expect(asm).toContain("BG1SC");
    expect(asm).toContain("BG12NBA");
    expect(asm).toContain("OBSEL");
    expect(asm).toContain("$210B");
  });
});
