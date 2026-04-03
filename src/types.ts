// A single VRAM reservation block placed by the developer
export interface VramBlock {
  id: string;           // stable UUID, used as reactive list key
  label: string;        // human-readable name, e.g. "BG1 Tiles"
  startWord: number;    // start address in WORD units (0–32767). 1 word = 2 bytes.
  sizeWords: number;    // size in words. Min 1, max depends on free space.
  category: BlockCategory;
  color: BlockColor;    // one of 8 fixed palette entries
  locked: boolean;      // when true, drag/resize is disabled
  note: string;         // optional developer note
}

// Categories map to SNES PPU concepts
export type BlockCategory =
  | "bg-tiles"       // Background character data
  | "bg-map"         // Background tilemap (screen data)
  | "obj-tiles"      // OBJ / sprite character data
  | "mode7-tiles"    // Mode 7 tile data (must start at 0x0000)
  | "color-math"     // Reserved area for CGRAM-adjacent tricks
  | "free";          // Unlabelled free space marker

// Fixed palette of 8 visually distinct colors
export type BlockColor =
  | "blue" | "teal" | "amber" | "coral"
  | "purple" | "green" | "red" | "gray";

// SNES graphics modes with their BG constraints
export interface SnesMode {
  id: number;               // 0–7
  label: string;            // "Mode 0", "Mode 7", etc.
  description: string;      // one-line summary for the UI
  bgCount: number;          // how many background layers exist
  bpp: number[];            // bits-per-pixel per BG layer, e.g. [4,4] for Mode 1
  tileSize: number[];       // tile size per BG layer in pixels, 8 or 16
  objSupported: boolean;    // all modes support OBJ except special cases
}

// A conflict between two overlapping blocks
export interface Conflict {
  blockAId: string;
  blockBId: string;
  overlapStart: number;    // word address where overlap begins
  overlapEnd: number;      // word address where overlap ends (exclusive)
}

// VRAM alignment warning for a block
export interface AlignmentWarning {
  blockId: string;
  message: string;       // human-readable warning
  requiredAlign: number; // required byte alignment
  actualByte: number;    // actual byte address
}

// What gets exported as assembly constants
export interface AsmExport {
  blockId: string;
  constantName: string;    // e.g. "VRAM_BG1_TILES"
  startByte: number;       // startWord * 2
  startWord: number;
  sizeTiles: number;       // sizeWords / tilesPerWord for the category
  comment: string;
}
