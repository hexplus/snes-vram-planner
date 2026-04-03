// Format a word address as a hex string. Default is byte address ($1A00).
// When byteMode=false, shows word address.
export const fmtHex = (words: number, byteMode = true): string =>
  byteMode
    ? `$${(words * 2).toString(16).toUpperCase().padStart(4, "0")}`
    : `$${words.toString(16).toUpperCase().padStart(4, "0")}w`;

// Format word count as KB: 4096 words = 8.00 KB
export const fmtKb = (words: number): string =>
  `${((words * 2) / 1024).toFixed(2)} KB`;

// Calculate tile count for a block given its size and bits-per-pixel
// One 8x8 tile = bpp * 8 bytes = bpp * 4 words
export const tileCount = (sizeWords: number, bpp: number): number =>
  Math.floor(sizeWords / (bpp * 4));

// Get BPP for a category given the active mode
import type { BlockCategory, SnesMode } from "../types";
export function bppForCategory(category: BlockCategory, mode: SnesMode, bgIndex = 0): number | null {
  if (category === "bg-tiles") return mode.bpp[bgIndex] ?? mode.bpp[0];
  if (category === "obj-tiles") return 4; // OBJ always 4bpp on SNES
  if (category === "mode7-tiles") return 8;
  return null; // bg-map, free, color-math have no tile data
}

// Generate ASM constant name from block label
export const toConstantName = (label: string): string =>
  "VRAM_" + label.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
