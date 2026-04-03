import { div, span } from "sibujs";
import {
  Badge, Separator, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "sibujs-ui";
import { activeMode } from "../store";

export function ModeInfo() {
  return div({ class: "px-4 py-3 flex flex-col gap-2", nodes: [
    div({ class: "flex items-center gap-2", nodes: [
      span({ class: "text-sm font-medium", nodes: () => `${activeMode().label} Constraints` }),
      Badge({ variant: "secondary", nodes: () => `${activeMode().bgCount} BG` }),
    ]}),
    span({ class: "text-xs text-muted-foreground", nodes: () => activeMode().description }),
    Table({
      class: "text-xs",
      nodes: [
        TableHeader({ nodes: TableRow({ nodes: [
          TableHead({ nodes: "Layer" }),
          TableHead({ nodes: "BPP" }),
          TableHead({ nodes: "Tile size" }),
          TableHead({ nodes: "Tiles in 8KB" }),
        ]})}),
        TableBody({ nodes: () => activeMode().bpp.map((bpp, i) => {
          const tilesIn8K = Math.floor(8192 / (bpp * 8));
          return TableRow({ nodes: [
            TableCell({ nodes: `BG${i + 1}` }),
            TableCell({ nodes: `${bpp}bpp` }),
            TableCell({ nodes: `${activeMode().tileSize[i]}×${activeMode().tileSize[i]}` }),
            TableCell({ class: "font-mono", nodes: String(tilesIn8K) }),
          ]});
        })}),
      ],
    }),
    Separator({}),

    // Enhancement chip notes
    div({ class: "flex flex-col gap-1 text-[10px] text-muted-foreground", nodes: [
      span({ class: "font-medium text-foreground text-xs", nodes: "Enhancement Chips" }),
      div({ nodes: "SA-1: Maps SNES VRAM normally. SA-1 CPU can DMA to VRAM during its own processing time, increasing effective bandwidth." }),
      div({ nodes: "SuperFX: Uses its own 64KB bitmap framebuffer (not VRAM). The frame is copied to BG via DMA during VBlank." }),
      div({ nodes: "S-DD1/SPC7110: Decompress ROM data to WRAM, then DMA to VRAM. No direct VRAM changes." }),
    ]}),
  ]});
}
