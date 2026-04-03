import { div, span } from "sibujs";
import {
  Collapsible, CollapsibleTrigger, CollapsibleContent,
  Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  ChevronDownIcon,
} from "sibujs-ui";
import { activeMode } from "../store";

export function ModeInfo() {
  return Collapsible({
    defaultOpen: true,
    nodes: [
      CollapsibleTrigger({
        nodes: div({ class: "flex items-center justify-between w-full px-4 py-2 text-sm font-medium", nodes: [
          div({ class: "flex items-center gap-2", nodes: [
            span({ nodes: () => `${activeMode().label} Constraints` }),
            Badge({ variant: "secondary", nodes: () => `${activeMode().bgCount} BG` }),
          ]}),
          ChevronDownIcon({ class: "size-4" }),
        ]}),
      }),
      CollapsibleContent({
        nodes: div({ class: "px-4 pb-3", nodes: [
          span({ class: "text-xs text-muted-foreground", nodes: () => activeMode().description }),
          Table({
            class: "mt-2 text-xs",
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
        ]}),
      }),
    ],
  });
}
