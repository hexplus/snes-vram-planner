// A single VRAM reservation block placed by the developer
export type MapSize = "32x32" | "64x32" | "32x64" | "64x64";
export type TransferMode = "static" | "streamed";
export type BgLayer = 1 | 2 | 3 | 4;

export interface VramBlock {
  id: string;           // stable UUID, used as reactive list key
  label: string;        // human-readable name, e.g. "BG1 Tiles"
  startWord: number;    // start address in WORD units (0–32767). 1 word = 2 bytes.
  sizeWords: number;    // size in words. Min 1, max depends on free space.
  category: BlockCategory;
  color: BlockColor;    // one of 8 fixed palette entries
  locked: boolean;      // when true, drag/resize is disabled
  note: string;         // optional developer note
  mapSize?: MapSize;    // only for bg-map: tilemap dimensions
  transfer?: TransferMode; // static (loaded once) or streamed (DMA each frame)
  bgLayer?: BgLayer;    // which BG layer this block is for (bg-tiles/bg-map only)
}

// Categories map to SNES PPU concepts
export type BlockCategory =
  | "bg-tiles"       // Background character data
  | "bg-map"         // Background tilemap (screen data)
  | "obj-tiles"      // OBJ / sprite character data
  | "mode7-tiles"    // Mode 7 tile data (must start at 0x0000)
  | "color-math"     // Reserved area for CGRAM-adjacent tricks
  | "hdma"           // HDMA indirect table data
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
  explanation: string;     // human-readable description of what goes wrong
}

// VRAM alignment warning for a block
export interface AlignmentWarning {
  blockId: string;
  message: string;       // human-readable warning
  requiredAlign: number; // required byte alignment
  actualByte: number;    // actual byte address
}

// OBSEL register ($2101) configuration for OBJ tile pages
export type ObselGap = 0x1000 | 0x2000 | 0x4000; // word gap: 4096, 8192, 16384 words (8KB, 16KB, 32KB)

export type ObjSizeSelect = 0 | 1 | 2 | 3 | 4 | 5; // OBSEL bits 5-7

export interface ObselConfig {
  nameBaseWord: number;  // OBJ name base in word units, must be multiple of 4096 (8KB-aligned)
  gap: ObselGap;         // word gap between page 0 and page 1
  objSize?: ObjSizeSelect; // sprite size select (bits 5-7 of OBSEL)
}

// A scene represents one VRAM layout (e.g. title screen, gameplay, menu)
export interface Scene {
  id: string;
  name: string;
  blocks: VramBlock[];
  activeModeId: number;
  obsel: ObselConfig;
}

// Persisted project envelope
export interface ProjectData {
  version: 2;
  scenes: Scene[];
  activeSceneId: string;
  darkMode: boolean;
}

// OBSEL-related warning
export interface ObselWarning {
  type: "obj-outside-page" | "non-obj-in-page" | "page-overflow";
  blockId?: string;
  message: string;
}

// CGRAM palette allocation
export interface CgramRange {
  label: string;       // e.g. "BG1 Palettes 0-7"
  startIndex: number;  // 0-255 color index
  count: number;       // number of colors
  layer: string;       // "BG1", "OBJ", etc.
  bpp: number;
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
