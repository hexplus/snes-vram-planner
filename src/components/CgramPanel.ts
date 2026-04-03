import { div, span } from "sibujs";
import { Badge, Separator } from "sibujs-ui";
import { activeMode } from "../store";
import type { SnesMode, CgramRange } from "../types";

/**
 * Compute CGRAM layout for a given SNES mode.
 * CGRAM is 256 colors (512 bytes). Allocation depends on the mode.
 * BG palettes use colors 0-127, OBJ palettes use colors 128-255.
 */
function getCgramLayout(mode: SnesMode): CgramRange[] {
  const ranges: CgramRange[] = [];

  if (mode.id === 7) {
    // Mode 7: no palette subdivision, BG1 uses direct color or 256-color palette
    ranges.push({ label: "BG1 (256 colors)", startIndex: 0, count: 256, layer: "BG1", bpp: 8 });
    return ranges;
  }

  // BG layers: colors 0-127
  for (let i = 0; i < mode.bgCount; i++) {
    const bpp = mode.bpp[i];
    const colorsPerPalette = 1 << bpp; // 4, 16, or 256
    const paletteCount = bpp === 2 ? 8 : bpp === 4 ? 8 : 1;
    const totalColors = colorsPerPalette * paletteCount;

    // In reality all BG layers share the same 256-color CGRAM space,
    // but palettes are assigned by index range per BPP:
    // 2bpp: 4 colors × 8 palettes = 32 colors per layer but they overlap
    // 4bpp: 16 colors × 8 palettes = 128 colors
    // For visualization, show the palette range each layer can access
    if (bpp <= 4) {
      ranges.push({
        label: `BG${i + 1} (${paletteCount}×${colorsPerPalette}col)`,
        startIndex: 0,
        count: Math.min(totalColors, 128),
        layer: `BG${i + 1}`,
        bpp,
      });
    } else {
      ranges.push({
        label: `BG${i + 1} (${totalColors} colors)`,
        startIndex: 0,
        count: Math.min(totalColors, 256),
        layer: `BG${i + 1}`,
        bpp,
      });
    }
  }

  // OBJ always uses colors 128-255 (8 palettes × 16 colors at 4bpp)
  if (mode.objSupported) {
    ranges.push({
      label: "OBJ (8×16col)",
      startIndex: 128,
      count: 128,
      layer: "OBJ",
      bpp: 4,
    });
  }

  return ranges;
}

const LAYER_COLORS: Record<string, string> = {
  BG1: "bg-blue-500", BG2: "bg-teal-500", BG3: "bg-green-500", BG4: "bg-amber-500", OBJ: "bg-purple-500",
};

export function CgramPanel() {
  return div({ class: "px-4 py-3 flex flex-col gap-3", nodes: [
    div({ class: "flex items-center gap-2", nodes: [
      span({ class: "text-sm font-medium", nodes: "CGRAM Palette" }),
      Badge({ variant: "outline", class: "text-[10px]", nodes: "256 colors" }),
    ]}),
    span({ class: "text-[10px] text-muted-foreground", nodes: "Color palette allocation for the active PPU mode" }),

    Separator({}),

    // Visual bar: 256 slots
    div({ class: "flex flex-col gap-2", nodes: () => {
      const layout = getCgramLayout(activeMode());

      return [
        // Color bar visualization
        div({ class: "h-6 w-full rounded overflow-hidden flex border", nodes:
          layout.map(r => {
            const widthPct = (r.count / 256) * 100;
            const bgColor = LAYER_COLORS[r.layer] ?? "bg-gray-400";
            return div({
              class: `${bgColor} opacity-70 h-full`,
              style: { width: `${widthPct}%` },
            });
          }),
        }),

        // Legend
        ...layout.map(r =>
          div({ class: "flex items-center justify-between text-xs", nodes: [
            div({ class: "flex items-center gap-2", nodes: [
              div({ class: `w-3 h-3 rounded-sm ${LAYER_COLORS[r.layer] ?? "bg-gray-400"} opacity-70` }),
              span({ class: "font-medium", nodes: r.label }),
            ]}),
            span({ class: "font-mono text-muted-foreground text-[10px]", nodes:
              `${r.startIndex}–${r.startIndex + r.count - 1} (${r.bpp}bpp)`,
            }),
          ]})
        ),
      ];
    }}),

    Separator({}),

    // Mode-specific notes
    div({ class: "text-[10px] text-muted-foreground flex flex-col gap-1", nodes: () => {
      const mode = activeMode();
      const notes = [];

      if (mode.id === 3) {
        notes.push(div({ nodes: "BG1 uses direct color mode — palette is bypassed, RGB values are encoded directly in tilemap entries." }));
      }
      if (mode.id === 7) {
        notes.push(div({ nodes: "Mode 7 can use direct color (CGADSUB bit) or the full 256-color palette." }));
      }

      notes.push(div({ nodes: "Color 0 in each palette is always transparent." }));

      if (mode.bgCount > 0 && mode.bpp[0] <= 4) {
        notes.push(div({ nodes: "BG layers share colors 0–127. OBJ sprites use colors 128–255." }));
      }

      return notes;
    }}),
  ]});
}
