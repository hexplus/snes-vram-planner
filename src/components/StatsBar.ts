import { div, span, derived } from "sibujs";
import { Progress, Separator } from "sibujs-ui";
import { blocks, usagePercent, conflicts, alignWarnings, dmaBudgetUsed, dmaBudgetPercent } from "../store";
import { openAlignmentDialog } from "./AlignmentWarningDialog";
import { fmtKb, tileCount } from "../utils/format";
import { VBLANK_DMA_BYTES_NTSC } from "../constants";
import type { BlockCategory } from "../types";

// OAM holds 128 sprites. Each 4bpp 8x8 tile = 16 words. Max OBJ VRAM = 2 pages × 4096 words = 512 tiles.
const OAM_MAX_SPRITES = 128;

const CATEGORIES: { id: BlockCategory; label: string }[] = [
  { id: "bg-tiles",    label: "BG Tiles" },
  { id: "bg-map",      label: "BG Map" },
  { id: "obj-tiles",   label: "OBJ Tiles" },
  { id: "mode7-tiles", label: "Mode 7" },
  { id: "free",        label: "Free" },
];

export function StatsBar() {
  const byCategory = (cat: BlockCategory) =>
    derived(() => blocks().filter(b => b.category === cat).reduce((s, b) => s + b.sizeWords * 2, 0));

  return div({
    class: "flex flex-wrap items-center gap-4 px-4 py-2 border-t text-xs bg-muted/30",
    nodes: [
      // Fill bar
      div({ class: "flex items-center gap-2 min-w-40", nodes: [
        span({ class: "text-muted-foreground whitespace-nowrap", nodes: "VRAM" }),
        Progress({ value: usagePercent, max: 100, class: "h-2 flex-1" }),
        span({ class: "font-mono whitespace-nowrap", nodes: () => `${usagePercent().toFixed(1)}%` }),
      ]}),

      Separator({ orientation: "vertical", class: "h-4" }),

      // Per-category breakdown
      ...CATEGORIES.map(cat =>
        div({ class: "flex items-center gap-1", nodes: [
          span({ class: "text-muted-foreground", nodes: `${cat.label}:` }),
          span({ class: "font-mono", nodes: () => fmtKb(byCategory(cat.id)() / 2) }),
        ]})
      ),

      Separator({ orientation: "vertical", class: "h-4" }),

      // Block count
      div({ class: "flex items-center gap-1 text-muted-foreground", nodes: [
        span({ class: "font-mono", nodes: () => `${blocks().length}` }),
        span({ nodes: () => `block${blocks().length !== 1 ? "s" : ""}` }),
      ]}),

      Separator({ orientation: "vertical", class: "h-4" }),

      // Conflict summary
      div({
        class: () => `flex items-center gap-1 ${conflicts().length > 0 ? "text-destructive" : "text-muted-foreground"}`,
        nodes: [
          span({ nodes: () => conflicts().length > 0
            ? `${conflicts().length} overlap${conflicts().length > 1 ? "s" : ""}`
            : "No overlaps"
          }),
        ],
      }),

      // Alignment warning summary (clickable)
      div({
        class: () => `flex items-center gap-1 ${alignWarnings().length > 0 ? "text-amber-600 dark:text-amber-400 cursor-pointer hover:underline" : "text-muted-foreground"}`,
        on: { click: () => { if (alignWarnings().length > 0) openAlignmentDialog(); } },
        nodes: [
          span({ nodes: () => alignWarnings().length > 0
            ? `${alignWarnings().length} alignment warning${alignWarnings().length > 1 ? "s" : ""}`
            : "Aligned"
          }),
        ],
      }),

      Separator({ orientation: "vertical", class: "h-4" }),

      // DMA budget
      div({
        class: () => `flex items-center gap-2 ${dmaBudgetPercent() > 100 ? "text-red-500" : dmaBudgetUsed() > 0 ? "text-foreground" : "text-muted-foreground"}`,
        nodes: [
          span({ class: "whitespace-nowrap", nodes: "DMA" }),
          Progress({ value: dmaBudgetPercent, max: 100, class: "h-2 w-16" }),
          span({ class: "font-mono whitespace-nowrap", nodes: () => `${dmaBudgetUsed()}/${VBLANK_DMA_BYTES_NTSC}B` }),
        ],
      }),

      Separator({ orientation: "vertical", class: "h-4" }),

      // OAM budget
      div({
        class: "flex items-center gap-1 text-muted-foreground",
        nodes: [
          span({ class: "whitespace-nowrap", nodes: "OBJ:" }),
          span({ class: "font-mono whitespace-nowrap", nodes: () => {
            const objBlocks = blocks().filter(b => b.category === "obj-tiles");
            const totalTiles = objBlocks.reduce((s, b) => s + tileCount(b.sizeWords, 4), 0);
            return `${totalTiles} tiles, ${OAM_MAX_SPRITES} sprites max`;
          }}),
        ],
      }),
    ],
  });
}
