import { div, span, signal, each, derived, effect, ref } from "sibujs";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose, Button,
  Separator,
  AlertTriangleIcon, WrenchIcon, CircleCheckIcon,
} from "sibujs-ui";
import { alignWarnings, blocks, appStore } from "../store";
import { fmtHex } from "../utils/format";
import { detectConflicts } from "../utils/conflicts";
import { VRAM_WORDS, WORDS_PER_ROW } from "../constants";
import type { AlignmentWarning, VramBlock } from "../types";

const [isOpen, setIsOpen] = signal(false);
const [filterBlockId, setFilterBlockId] = signal<string | null>(null);

export function openAlignmentDialog(blockId?: string) {
  setFilterBlockId(blockId ?? null);
  setIsOpen(true);
}

/**
 * Find the nearest aligned address for a block that doesn't overlap others.
 * Searches outward from the block's current position in both directions.
 * Returns the new startWord, or null if no valid position found.
 */
function findAlignedPosition(block: VramBlock, allBlocks: VramBlock[]): number | null {
  const align = getRequiredAlignment(block.category);
  if (align === 0) return null; // no alignment requirement

  const others = allBlocks.filter(b => b.id !== block.id);
  const alignWords = align / 2; // convert byte alignment to word alignment

  // Search outward from current position: try nearest boundaries first
  const currentAligned = Math.round(block.startWord / alignWords) * alignWords;
  const candidates: number[] = [currentAligned];

  // Generate candidates outward in both directions
  for (let offset = alignWords; offset < VRAM_WORDS; offset += alignWords) {
    const below = currentAligned - offset;
    const above = currentAligned + offset;
    if (below >= 0) candidates.push(below);
    if (above + block.sizeWords <= VRAM_WORDS) candidates.push(above);
    if (below < 0 && above + block.sizeWords > VRAM_WORDS) break;
  }

  // Also snap size to row boundaries
  const size = Math.max(WORDS_PER_ROW, Math.ceil(block.sizeWords / WORDS_PER_ROW) * WORDS_PER_ROW);

  for (const start of candidates) {
    if (start < 0 || start + size > VRAM_WORDS) continue;
    const candidate: VramBlock = { ...block, startWord: start, sizeWords: size };
    const conflicts = detectConflicts([...others, candidate])
      .some(c => c.blockAId === block.id || c.blockBId === block.id);
    if (!conflicts) return start;
  }

  return null;
}

function getRequiredAlignment(category: string): number {
  switch (category) {
    case "bg-tiles":   return 0x2000; // 8KB
    case "bg-map":     return 0x0800; // 2KB
    case "obj-tiles":  return 0x2000; // 8KB
    case "mode7-tiles": return 0x10000; // must be at 0
    default: return 0;
  }
}

function fixSingleBlock(blockId: string) {
  const block = blocks().find(b => b.id === blockId);
  if (!block) return;

  const newStart = findAlignedPosition(block, blocks());
  if (newStart !== null) {
    appStore.dispatch("updateBlock", { id: blockId, startWord: newStart });
  }
}

function fixAllWarnings() {
  // Process each warning - re-read warnings after each fix since they change
  const warnings = alignWarnings();
  for (const w of warnings) {
    const currentBlocks = blocks();
    const block = currentBlocks.find(b => b.id === w.blockId);
    if (!block) continue;

    const newStart = findAlignedPosition(block, currentBlocks);
    if (newStart !== null) {
      appStore.dispatch("updateBlock", { id: block.id, startWord: newStart });
    }
  }
}

const REGISTER_INFO: Record<string, { register: string; bits: string; formula: string; explanation: string }> = {
  "bg-tiles": {
    register: "BG12NBA ($210B) / BG34NBA ($210C)",
    bits: "4-bit field per BG layer",
    formula: "Register value = byte_address >> 13  (or byte_address / $2000)",
    explanation:
      "The SNES PPU uses registers BG12NBA and BG34NBA to set where each background's " +
      "character (tile) data starts in VRAM. Each BG gets a 4-bit field, and each unit " +
      "represents 8KB ($2000 bytes). So the tile base address MUST be a multiple of $2000. " +
      "If your tile data isn't aligned to an 8KB boundary, the PPU will read from the wrong " +
      "address and you'll see corrupted or scrambled tiles on screen.",
  },
  "bg-map": {
    register: "BGxSC ($2107-$210A)",
    bits: "Bits 2-6 of the register",
    formula: "Register value = (byte_address >> 8) & $FC",
    explanation:
      "Each background layer's screen (tilemap) base address is set via BGxSC registers. " +
      "The address is encoded in bits 2-6, with a granularity of 2KB ($0800 bytes). " +
      "If your tilemap doesn't start at a $0800 boundary, the PPU will read the wrong " +
      "memory region for the tilemap, causing the entire background to display garbage tiles.",
  },
  "obj-tiles": {
    register: "OBSEL ($2101)",
    bits: "Bits 0-2 (name base), Bits 3-4 (name select)",
    formula: "Name base = (byte_address >> 13) & $07",
    explanation:
      "The OBJ (sprite) character base address is configured via the OBSEL register. " +
      "The name base field uses 3 bits with 8KB granularity, so OBJ tile data must start " +
      "at a multiple of $2000. Misalignment means the PPU reads sprite graphics from the " +
      "wrong VRAM location - all sprites will appear as random pixel noise.",
  },
  "mode7-tiles": {
    register: "N/A - hardware-fixed",
    bits: "N/A",
    formula: "Mode 7 tile data is always at $0000",
    explanation:
      "In Mode 7, the PPU uses a fixed VRAM layout: tile character data occupies the " +
      "even bytes of the first 32KB, and the tilemap occupies the odd bytes. This layout " +
      "is hardwired - there is no register to change it. Mode 7 tile data MUST start at " +
      "VRAM address $0000. Any other position is physically impossible for the hardware to read.",
  },
};

function WarningDetail(warning: AlignmentWarning) {
  const block = derived(() => blocks().find(b => b.id === warning.blockId));
  const category = derived(() => block()?.category ?? "bg-tiles");
  const info = derived(() => REGISTER_INFO[category()] ?? REGISTER_INFO["bg-tiles"]);

  const nearestValid = derived(() => {
    const b = block();
    if (!b) return null;
    return findAlignedPosition(b, blocks());
  });

  return div({
    class: "flex flex-col gap-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20",
    nodes: [
      div({ class: "flex items-start justify-between gap-2", nodes: [
        div({ class: "flex items-start gap-2 min-w-0", nodes: [
          AlertTriangleIcon({ class: "size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" }),
          div({ class: "flex flex-col gap-1 min-w-0", nodes: [
            span({ class: "font-medium text-sm", nodes: () => block()?.label ?? "Unknown block" }),
            span({ class: "text-xs font-mono text-muted-foreground", nodes: () =>
              `At ${fmtHex(warning.actualByte / 2)}  -  required: $${warning.requiredAlign.toString(16).toUpperCase()} alignment`
            }),
          ]}),
        ]}),
        // Per-block fix button
        Button({
          size: "sm",
          variant: "outline",
          class: "shrink-0",
          nodes: [WrenchIcon({ class: "size-3 mr-1" }), "Fix"],
          on: {
            click: () => fixSingleBlock(warning.blockId),
          },
        }),
      ]}),

      div({ class: "text-sm text-amber-800 dark:text-amber-200", nodes: warning.message }),

      div({ class: "flex flex-col gap-1.5 text-xs bg-background/60 rounded p-2 font-mono", nodes: [
        div({ class: "flex gap-2", nodes: [
          span({ class: "text-muted-foreground min-w-[70px]", nodes: "Register:" }),
          span({ nodes: () => info().register }),
        ]}),
        div({ class: "flex gap-2", nodes: [
          span({ class: "text-muted-foreground min-w-[70px]", nodes: "Encoding:" }),
          span({ nodes: () => info().bits }),
        ]}),
        div({ class: "flex gap-2", nodes: [
          span({ class: "text-muted-foreground min-w-[70px]", nodes: "Formula:" }),
          span({ nodes: () => info().formula }),
        ]}),
      ]}),

      div({ class: "text-xs text-muted-foreground leading-relaxed", nodes: () => info().explanation }),

      div({ class: "text-xs font-mono text-amber-700 dark:text-amber-300", nodes: () => {
        const pos = nearestValid();
        return pos !== null
          ? `Will move to ${fmtHex(pos)} (nearest valid boundary)`
          : "No valid position found without overlapping other blocks";
      }}),
    ],
  });
}

export function AlignmentWarningDialog() {
  const visibleWarnings = derived(() => {
    const id = filterBlockId();
    const all = alignWarnings();
    return id ? all.filter(w => w.blockId === id) : all;
  });

  // We need to programmatically click the DialogTrigger to open.
  // The ref points to the trigger wrapper so we can call .click() on it.
  const triggerRef = ref<HTMLElement | null>(null);

  effect(() => {
    if (isOpen()) {
      // Use setTimeout to ensure the effect doesn't run synchronously
      // during another signal update cycle
      setTimeout(() => {
        const el = triggerRef.current;
        if (el) el.click();
        setIsOpen(false);
      }, 0);
    }
  });

  return Dialog({
    onOpenChange: () => {},
    nodes: [
      DialogTrigger({
        ref: triggerRef,
        style: { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" },
        nodes: "open",
      }),

      DialogContent({
        showCloseButton: true,
        class: "max-w-lg max-h-[80vh] overflow-y-auto",
        nodes: [
          DialogHeader({ nodes: [
            DialogTitle({ nodes: div({ class: "flex items-center gap-2", nodes: [
              AlertTriangleIcon({ class: "size-5 text-amber-600" }),
              "VRAM Alignment Warnings",
            ]}) }),
            DialogDescription({ nodes:
              "These blocks are not aligned to the boundaries required by the SNES PPU hardware registers. " +
              "Misaligned blocks will cause graphical corruption at runtime."
            }),
          ]}),

          div({ class: "flex flex-col gap-3 py-2", nodes: [
            // All fixed state
            div({
              class: () => visibleWarnings().length === 0 ? "" : "hidden",
              nodes: div({
                class: "flex flex-col items-center gap-2 text-sm text-muted-foreground text-center py-6",
                nodes: [
                  CircleCheckIcon({ class: "size-8 text-green-500" }),
                  "All blocks are properly aligned.",
                ],
              }),
            }),

            // Warning list
            each(
              visibleWarnings,
              (warning) => WarningDetail(warning),
              { key: w => w.blockId },
            ),

            // Summary + Fix All
            div({
              class: () => visibleWarnings().length > 0 ? "" : "hidden",
              nodes: () => {
                const count = visibleWarnings().length;
                return div({ class: "flex flex-col gap-2 pt-2", nodes: [
                  Separator({}),
                  div({ class: "text-[11px] text-muted-foreground leading-relaxed", nodes: [
                    span({ class: "font-medium", nodes: `${count} warning${count > 1 ? "s" : ""} total. ` }),
                    "Blocks will be moved to the nearest valid boundary that doesn't overlap other blocks.",
                  ]}),
                ]});
              },
            }),
          ]}),

          DialogFooter({ class: "flex justify-between gap-2", nodes: [
            // Fix All button (only when there are warnings)
            div({
              class: () => visibleWarnings().length > 0 ? "" : "hidden",
              nodes: Button({
                variant: "default",
                nodes: [WrenchIcon({ class: "size-3 mr-1" }), "Fix All"],
                on: { click: fixAllWarnings },
              }),
            }),
            DialogClose({
              nodes: Button({ variant: "outline", nodes: "Close" }),
            }),
          ]}),
        ],
      }),
    ],
  });
}
