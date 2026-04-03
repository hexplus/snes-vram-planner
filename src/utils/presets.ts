import type { VramBlock } from "../types";

// Presets use row-aligned addresses (multiples of 256 words = 512 bytes)
// and respect SNES PPU alignment requirements:
//   BGxNBA: 8KB ($2000 = 4096 words) alignment for tile data
//   BGxSC:  2KB ($0800 = 1024 words) alignment for tilemaps
//   OBSEL:  8KB ($2000 = 4096 words) alignment for OBJ tiles

export const PRESETS: Record<string, VramBlock[]> = {
  "Mode 1 — Standard": [
    // Tile data at 8KB-aligned positions
    { id: "p1", label: "BG1 Tiles", startWord: 0,     sizeWords: 4096, category: "bg-tiles",  color: "blue",   locked: false, note: "4bpp, 256 tiles (8x8)" },
    { id: "p2", label: "BG2 Tiles", startWord: 4096,  sizeWords: 4096, category: "bg-tiles",  color: "teal",   locked: false, note: "4bpp, 256 tiles (8x8)" },
    { id: "p3", label: "BG3 Tiles", startWord: 8192,  sizeWords: 1024, category: "bg-tiles",  color: "green",  locked: false, note: "2bpp, 128 tiles (8x8)" },
    // Tilemaps at 2KB-aligned positions
    { id: "p4", label: "BG1 Map",   startWord: 12288, sizeWords: 1024, category: "bg-map",    color: "amber",  locked: false, note: "32x32 screen" },
    { id: "p5", label: "BG2 Map",   startWord: 13312, sizeWords: 1024, category: "bg-map",    color: "amber",  locked: false, note: "32x32 screen" },
    { id: "p6", label: "BG3 Map",   startWord: 14336, sizeWords: 1024, category: "bg-map",    color: "amber",  locked: false, note: "32x32 screen" },
    // OBJ tiles at 8KB-aligned position
    { id: "p7", label: "OBJ Tiles", startWord: 16384, sizeWords: 8192, category: "obj-tiles", color: "purple", locked: false, note: "4bpp, 512 tiles" },
  ],
  "Mode 0 — 4 Backgrounds": [
    { id: "m0-1", label: "BG1 Tiles", startWord: 0,     sizeWords: 4096, category: "bg-tiles", color: "blue",   locked: false, note: "2bpp, 512 tiles" },
    { id: "m0-2", label: "BG2 Tiles", startWord: 4096,  sizeWords: 4096, category: "bg-tiles", color: "teal",   locked: false, note: "2bpp, 512 tiles" },
    { id: "m0-3", label: "BG3 Tiles", startWord: 8192,  sizeWords: 4096, category: "bg-tiles", color: "green",  locked: false, note: "2bpp, 512 tiles" },
    { id: "m0-4", label: "BG4 Tiles", startWord: 12288, sizeWords: 4096, category: "bg-tiles", color: "coral",  locked: false, note: "2bpp, 512 tiles" },
    { id: "m0-5", label: "BG1 Map",   startWord: 16384, sizeWords: 1024, category: "bg-map",   color: "amber",  locked: false, note: "32x32 screen" },
    { id: "m0-6", label: "BG2 Map",   startWord: 17408, sizeWords: 1024, category: "bg-map",   color: "amber",  locked: false, note: "32x32 screen" },
    { id: "m0-7", label: "BG3 Map",   startWord: 18432, sizeWords: 1024, category: "bg-map",   color: "amber",  locked: false, note: "32x32 screen" },
    { id: "m0-8", label: "BG4 Map",   startWord: 19456, sizeWords: 1024, category: "bg-map",   color: "amber",  locked: false, note: "32x32 screen" },
    { id: "m0-9", label: "OBJ Tiles", startWord: 24576, sizeWords: 8192, category: "obj-tiles", color: "purple", locked: false, note: "4bpp, 512 tiles" },
  ],
  "Mode 7 — Full Rotation": [
    { id: "m7-1", label: "Mode7 Tiles", startWord: 0, sizeWords: 32768, category: "mode7-tiles", color: "coral", locked: false, note: "Full 64KB for Mode 7" },
  ],
};
