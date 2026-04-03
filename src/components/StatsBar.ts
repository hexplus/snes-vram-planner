import { div, span, derived } from "sibujs";
import { Progress, Separator } from "sibujs-ui";
import { blocks, usagePercent, conflicts, alignWarnings } from "../store";
import { openAlignmentDialog } from "./AlignmentWarningDialog";
import { fmtKb } from "../utils/format";
import type { BlockCategory } from "../types";

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
    ],
  });
}
