import type { SnesMode, BlockCategory } from "./types";

// Category metadata: short tag, display label, and badge color classes
export const CATEGORY_META: Record<BlockCategory, { tag: string; label: string; badge: string }> = {
  "bg-tiles":    { tag: "BG-CHR", label: "BG Tiles",         badge: "bg-blue-600 text-white border-blue-700" },
  "bg-map":      { tag: "BG-MAP", label: "BG Tilemap",       badge: "bg-emerald-600 text-white border-emerald-700" },
  "obj-tiles":   { tag: "OBJ",    label: "OBJ Tiles",        badge: "bg-purple-600 text-white border-purple-700" },
  "mode7-tiles": { tag: "M7",     label: "Mode 7 Tiles",     badge: "bg-rose-600 text-white border-rose-700" },
  "color-math":  { tag: "CMATH",  label: "Color Math",       badge: "bg-amber-600 text-white border-amber-700" },
  "hdma":        { tag: "HDMA",   label: "HDMA Table",       badge: "bg-cyan-600 text-white border-cyan-700" },
  "free":        { tag: "FREE",   label: "Free / Unassigned", badge: "bg-gray-500 text-white border-gray-600" },
};

// VRAM is 64KB = 32768 words (each word = 2 bytes)
export const VRAM_WORDS = 32768;
export const VRAM_BYTES = 65536;

// Grid UI: 1 row = 256 words, so there are 128 rows
export const WORDS_PER_ROW = 256;
export const TOTAL_ROWS    = VRAM_WORDS / WORDS_PER_ROW; // 128

// Pixel height of each row in the grid
export const ROW_HEIGHT_PX = 24;

// All eight SNES PPU modes
export const SNES_MODES: SnesMode[] = [
  { id: 0, label: "Mode 0", description: "4 BGs × 2bpp — 4 palettes each",
    bgCount: 4, bpp: [2,2,2,2], tileSize: [8,8,8,8], objSupported: true },
  { id: 1, label: "Mode 1", description: "BG1/BG2 4bpp + BG3 2bpp (most common)",
    bgCount: 3, bpp: [4,4,2], tileSize: [8,8,8], objSupported: true },
  { id: 2, label: "Mode 2", description: "2 BGs 4bpp + offset-per-tile",
    bgCount: 2, bpp: [4,4], tileSize: [8,8], objSupported: true },
  { id: 3, label: "Mode 3", description: "BG1 8bpp (direct color) + BG2 4bpp",
    bgCount: 2, bpp: [8,4], tileSize: [8,8], objSupported: true },
  { id: 4, label: "Mode 4", description: "BG1 8bpp + BG2 2bpp + offset-per-tile",
    bgCount: 2, bpp: [8,2], tileSize: [8,8], objSupported: true },
  { id: 5, label: "Mode 5", description: "BG1 4bpp + BG2 2bpp, 512-wide",
    bgCount: 2, bpp: [4,2], tileSize: [8,8], objSupported: true },
  { id: 6, label: "Mode 6", description: "BG1 4bpp, 512-wide + offset-per-tile",
    bgCount: 1, bpp: [4], tileSize: [8], objSupported: true },
  { id: 7, label: "Mode 7", description: "1 BG 8bpp rotation/scaling",
    bgCount: 1, bpp: [8], tileSize: [8], objSupported: true },
];

// Color assignments for BlockColor values (Tailwind bg classes)
export const BLOCK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: "bg-blue-200 dark:bg-blue-800",   text: "text-blue-900 dark:text-blue-100",   border: "border-blue-400" },
  teal:   { bg: "bg-teal-200 dark:bg-teal-800",   text: "text-teal-900 dark:text-teal-100",   border: "border-teal-400" },
  amber:  { bg: "bg-amber-200 dark:bg-amber-800", text: "text-amber-900 dark:text-amber-100", border: "border-amber-400" },
  coral:  { bg: "bg-red-200 dark:bg-red-800",     text: "text-red-900 dark:text-red-100",     border: "border-red-400" },
  purple: { bg: "bg-purple-200 dark:bg-purple-800", text: "text-purple-900 dark:text-purple-100", border: "border-purple-400" },
  green:  { bg: "bg-green-200 dark:bg-green-800", text: "text-green-900 dark:text-green-100", border: "border-green-400" },
  red:    { bg: "bg-red-300 dark:bg-red-700",     text: "text-red-950 dark:text-red-50",      border: "border-red-500" },
  gray:   { bg: "bg-gray-200 dark:bg-gray-700",   text: "text-gray-900 dark:text-gray-100",   border: "border-gray-400" },
};

// Default OBSEL config: OBJ page 0 at $8000 (word 16384), page 1 at $A000 (gap=8KB)
export const DEFAULT_OBSEL = { nameBaseWord: 0x4000, gap: 0x1000 as const }; // 16384 words, 4096 word gap

// OBJ page size is always 8KB = 4096 words (256 tiles at 4bpp, or 512 at 2bpp)
export const OBJ_PAGE_WORDS = 4096;

// OBSEL sprite size configurations (bits 5-7)
// Each entry: [small size, large size]
import type { ObjSizeSelect } from "./types";
export const OBJ_SIZE_OPTIONS: { value: ObjSizeSelect; small: string; large: string }[] = [
  { value: 0, small: "8×8",  large: "16×16" },
  { value: 1, small: "8×8",  large: "32×32" },
  { value: 2, small: "8×8",  large: "64×64" },
  { value: 3, small: "16×16", large: "32×32" },
  { value: 4, small: "16×16", large: "64×64" },
  { value: 5, small: "32×32", large: "64×64" },
];

// BG tilemap sizes: screen count × 1024 words per 32×32 screen
import type { MapSize } from "./types";
export const MAP_SIZE_WORDS: Record<MapSize, number> = {
  "32x32": 1024, "64x32": 2048, "32x64": 2048, "64x64": 4096,
};
export const MAP_SIZE_SC_BITS: Record<MapSize, number> = {
  "32x32": 0, "64x32": 1, "32x64": 2, "64x64": 3,
};

// VBlank DMA budget (bytes transferable per VBlank)
export const VBLANK_DMA_BYTES_NTSC = 2273;
export const VBLANK_DMA_BYTES_PAL = 2656;

// Size in words of common SNES data structures
export const TILE_SIZES_WORDS = {
  "2bpp-8x8":  8,   // one 8×8 tile at 2bpp = 16 bytes = 8 words
  "4bpp-8x8":  16,  // one 8×8 tile at 4bpp = 32 bytes = 16 words
  "8bpp-8x8":  32,  // one 8×8 tile at 8bpp = 64 bytes = 32 words
  "tilemap-32x32": 1024, // 32×32 tilemap = 2048 bytes = 1024 words
};
