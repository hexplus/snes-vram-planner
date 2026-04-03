import type { SnesMode, BlockCategory, BlockColor, BgLayer, ObselConfig } from "../types";
import { OBJ_PAGE_WORDS } from "../constants";

export interface BlockTemplate {
  label: string;
  category: BlockCategory;
  sizeWords: number;
  color: BlockColor;
  note: string;
  bgLayer?: BgLayer;
}

export function getTemplatesForMode(mode: SnesMode, _obsel: ObselConfig): BlockTemplate[] {
  const templates: BlockTemplate[] = [];

  for (let i = 0; i < mode.bgCount; i++) {
    const bpp = mode.bpp[i];
    const tilesIn8K = Math.floor(8192 / (bpp * 8));
    const colors: BlockColor[] = ["blue", "teal", "green", "coral"];
    templates.push({
      label: `BG${i + 1} Tiles`,
      category: "bg-tiles",
      sizeWords: 4096,
      color: colors[i] ?? "gray",
      note: `${bpp}bpp, ${tilesIn8K} tiles (8×8)`,
      bgLayer: (i + 1) as BgLayer,
    });
  }

  for (let i = 0; i < mode.bgCount; i++) {
    templates.push({
      label: `BG${i + 1} Map`,
      category: "bg-map",
      sizeWords: 1024,
      color: "amber",
      note: "32×32 screen",
      bgLayer: (i + 1) as BgLayer,
    });
  }

  if (mode.objSupported) {
    templates.push({
      label: "OBJ Tiles",
      category: "obj-tiles",
      sizeWords: OBJ_PAGE_WORDS,
      color: "purple",
      note: "4bpp, 256 tiles (1 page)",
    });
  }

  if (mode.id === 7) {
    templates.push({
      label: "Mode 7 Tiles",
      category: "mode7-tiles",
      sizeWords: 32768,
      color: "coral",
      note: "Full 64KB Mode 7",
    });
  }

  return templates;
}
