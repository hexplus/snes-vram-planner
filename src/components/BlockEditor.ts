import {
  div, span, signal, derived, when
} from "sibujs";
import {
  Card, CardHeader, CardTitle, CardContent, CardFooter,
  Button, Input, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, Badge, Switch, Textarea,
  Slider, Separator, Label,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
  TrashIcon, CopyIcon,
} from "sibujs-ui";
import { selectedId, appStore, blocks, conflicts, alignWarnings } from "../store";
import { BLOCK_COLORS, VRAM_WORDS, WORDS_PER_ROW } from "../constants";
import { fmtHex, fmtKb, toConstantName } from "../utils/format";
import { generateId } from "../utils/id";
import { blockHasConflict, blockHasWarning, detectConflicts } from "../utils/conflicts";
import { openAlignmentDialog } from "./AlignmentWarningDialog";
import type { BlockCategory, BlockColor, VramBlock } from "../types";

export function BlockEditor() {
  return div({
    class: "h-full",
    nodes: when(
      () => selectedId() !== null,
      () => BlockEditorForm(selectedId()!),
      () => EmptyState(),
    ),
  });
}

function EmptyState() {
  return Card({
    class: "h-full",
    nodes: div({
      class: "flex flex-col items-center justify-center h-40 text-muted-foreground text-sm gap-2",
      nodes: [
        div({ class: "text-3xl", nodes: "□" }),
        div({ nodes: "Select a block to edit" }),
        div({ class: "text-xs", nodes: "Double-click a block in the grid" }),
      ],
    }),
  });
}

function BlockEditorForm(blockId: string) {
  // Reactive lookup for this specific block
  const block = derived(() => blocks().find(b => b.id === blockId) ?? null);

  const initialBlock = block();
  if (!initialBlock) return EmptyState();

  const [_label, setLabel] = signal(initialBlock.label);
  const [_note, setNote]   = signal(initialBlock.note);

  const dispatchUpdate = (patch: Record<string, unknown>) =>
    appStore.dispatch("updateBlock", { id: blockId, ...patch });

  const hasConflict = derived(() => blockHasConflict(blockId, conflicts()));
  const hasWarning = derived(() => blockHasWarning(blockId, alignWarnings()));
  const warningMsg = derived(() => {
    const w = alignWarnings().find(w => w.blockId === blockId);
    return w?.message ?? null;
  });

  return Card({
    class: "flex flex-col gap-0 overflow-y-auto",
    nodes: [
      CardHeader({
        class: "pb-3",
        nodes: [
          div({ class: "flex items-center justify-between gap-2", nodes: [
            CardTitle({ nodes: "Block Properties" }),
            Badge({
              variant: "outline",
              nodes: () => {
                const b = block();
                return b ? toConstantName(b.label) : "";
              },
              class: "font-mono text-[10px] truncate max-w-[120px]",
            }),
          ]}),
          // Status badges
          div({ class: "flex gap-1 mt-2", nodes: [
            div({
              class: () => hasConflict() ? "" : "hidden",
              nodes: () => hasConflict()
                ? Badge({ variant: "destructive", class: "text-[10px]", nodes: "Overlap" })
                : "",
            }),
            div({
              class: () => hasWarning() ? "cursor-pointer" : "hidden",
              on: { click: () => { if (hasWarning()) openAlignmentDialog(blockId); } },
              nodes: () => hasWarning()
                ? Badge({ variant: "secondary", class: "text-[10px] text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900", nodes: "Misaligned" })
                : "",
            }),
          ]}),
        ],
      }),

      CardContent({
        class: "flex flex-col gap-4",
        nodes: [

          // ── Label ──────────────────────────────────────────────────
          div({ class: "flex flex-col gap-1.5", nodes: [
            Label({ for: "block-label", nodes: "Label" }),
            Input({
              id: "block-label",
              defaultValue: initialBlock.label,
              placeholder: "e.g. BG1 Tiles",
              on: { input: (e: Event) => {
                const v = (e.target as HTMLInputElement).value;
                setLabel(v);
                dispatchUpdate({ label: v });
              }},
            }),
          ]}),

          // ── Category + Color ───────────────────────────────────────
          div({ class: "grid grid-cols-2 gap-3", nodes: [
            div({ class: "flex flex-col gap-1.5", nodes: [
              Label({ nodes: "Category" }),
              Select({
                defaultValue: initialBlock.category,
                onValueChange: (v: string) => dispatchUpdate({ category: v as BlockCategory }),
                nodes: [
                  SelectTrigger({ nodes: SelectValue({ placeholder: "Category" }) }),
                  SelectContent({ nodes: [
                    SelectItem({ value: "bg-tiles",    nodes: "BG Tiles" }),
                    SelectItem({ value: "bg-map",      nodes: "BG Tilemap" }),
                    SelectItem({ value: "obj-tiles",   nodes: "OBJ Tiles" }),
                    SelectItem({ value: "mode7-tiles", nodes: "Mode 7 Tiles" }),
                    SelectItem({ value: "color-math",  nodes: "Color Math" }),
                    SelectItem({ value: "free",        nodes: "Free / Unassigned" }),
                  ]}),
                ],
              }),
            ]}),
            div({ class: "flex flex-col gap-1.5", nodes: [
              Label({ nodes: "Color" }),
              div({ class: "flex flex-wrap gap-1.5", nodes:
                Object.entries(BLOCK_COLORS).map(([colorKey, cls]) =>
                  div({
                    class: () => {
                      const b = block();
                      return `w-5 h-5 rounded cursor-pointer border-2 ${cls.bg} ${
                        b?.color === colorKey ? "border-primary scale-110" : "border-transparent"
                      }`;
                    },
                    on: { click: () => dispatchUpdate({ color: colorKey as BlockColor }) },
                  })
                ),
              }),
            ]}),
          ]}),

          Separator({}),

          // ── Address info ─────────────────────────────────────────
          div({ class: "grid grid-cols-2 gap-2 text-xs font-mono", nodes: [
            div({ class: "flex flex-col gap-0.5", nodes: [
              span({ class: "text-muted-foreground text-[10px]", nodes: "Start" }),
              span({ nodes: () => { const b = block(); return b ? fmtHex(b.startWord) : ""; } }),
            ]}),
            div({ class: "flex flex-col gap-0.5", nodes: [
              span({ class: "text-muted-foreground text-[10px]", nodes: "End (exclusive)" }),
              span({ nodes: () => { const b = block(); return b ? fmtHex(b.startWord + b.sizeWords) : ""; } }),
            ]}),
            div({ class: "flex flex-col gap-0.5", nodes: [
              span({ class: "text-muted-foreground text-[10px]", nodes: "Size" }),
              span({ nodes: () => { const b = block(); return b ? `${b.sizeWords} words` : ""; } }),
            ]}),
            div({ class: "flex flex-col gap-0.5", nodes: [
              span({ class: "text-muted-foreground text-[10px]", nodes: "Bytes" }),
              span({ nodes: () => { const b = block(); return b ? fmtKb(b.sizeWords) : ""; } }),
            ]}),
          ]}),

          // Alignment warning detail
          div({
            class: () => warningMsg() ? "text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-1.5 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40" : "hidden",
            on: { click: () => { if (warningMsg()) openAlignmentDialog(blockId); } },
            nodes: () => warningMsg() ? `${warningMsg()} (click for details)` : "",
          }),

          Separator({}),

          // ── Start Address slider ─────────────────────────────────
          div({ class: "flex flex-col gap-1.5", nodes: [
            Label({ nodes: "Start Address" }),
            Slider({
              defaultValue: [initialBlock.startWord],
              min: 0,
              max: VRAM_WORDS - WORDS_PER_ROW,
              step: WORDS_PER_ROW,
              onValueChange: (v: number[]) => {
                const newStart = v[0];
                const b = block();
                if (!b) return;
                const candidate: VramBlock = { ...b, startWord: newStart };
                const others = blocks().filter(x => x.id !== blockId);
                const wouldConflict = detectConflicts([...others, candidate])
                  .some(c => c.blockAId === blockId || c.blockBId === blockId);
                if (!wouldConflict) {
                  dispatchUpdate({ startWord: newStart });
                }
              },
            }),
          ]}),

          // ── Size slider ──────────────────────────────────────────
          div({ class: "flex flex-col gap-1.5", nodes: [
            Label({ nodes: "Size" }),
            Slider({
              defaultValue: [initialBlock.sizeWords],
              min: WORDS_PER_ROW,
              max: VRAM_WORDS - initialBlock.startWord,
              step: WORDS_PER_ROW,
              onValueChange: (v: number[]) => {
                const newSize = v[0];
                const b = block();
                if (!b) return;
                const candidate: VramBlock = { ...b, sizeWords: newSize };
                const others = blocks().filter(x => x.id !== blockId);
                const wouldConflict = detectConflicts([...others, candidate])
                  .some(c => c.blockAId === blockId || c.blockBId === blockId);
                if (!wouldConflict) {
                  dispatchUpdate({ sizeWords: newSize });
                }
              },
            }),
          ]}),

          Separator({}),

          // ── Lock toggle ────────────────────────────────────────────
          div({ class: "flex items-center justify-between", nodes: [
            div({ class: "flex flex-col", nodes: [
              Label({ nodes: "Lock block" }),
              span({ class: "text-xs text-muted-foreground", nodes: "Prevent drag and resize" }),
            ]}),
            Switch({
              defaultChecked: initialBlock.locked,
              onCheckedChange: (v: boolean) => dispatchUpdate({ locked: v }),
            }),
          ]}),

          // ── Notes ─────────────────────────────────────────────────
          div({ class: "flex flex-col gap-1.5", nodes: [
            Label({ nodes: "Notes" }),
            Textarea({
              placeholder: "Optional notes for this block...",
              defaultValue: initialBlock.note,
              rows: 2,
              on: { input: (e: Event) => {
                const v = (e.target as HTMLTextAreaElement).value;
                setNote(v);
                dispatchUpdate({ note: v });
              }},
            }),
          ]}),

        ],
      }),

      CardFooter({
        class: "flex gap-2 mt-4",
        nodes: [
          Button({
            variant: "outline", size: "sm",
            nodes: [CopyIcon({ class: "size-3 mr-1" }), "Duplicate"],
            on: { click: () => {
              const b = block();
              if (!b) return;
              const newStart = b.startWord + b.sizeWords;
              const snapped = Math.ceil(newStart / WORDS_PER_ROW) * WORDS_PER_ROW;
              appStore.dispatch("addBlock", {
                ...b,
                id: generateId(),
                label: `${b.label} (copy)`,
                startWord: Math.min(snapped, VRAM_WORDS - b.sizeWords),
              });
            }},
          }),
          AlertDialog({
            nodes: [
              AlertDialogTrigger({
                nodes: Button({ variant: "destructive", size: "sm", nodes: [TrashIcon({ class: "size-3 mr-1" }), "Delete"] }),
              }),
              AlertDialogContent({
                nodes: [
                  AlertDialogHeader({ nodes: [
                    AlertDialogTitle({ nodes: "Delete block?" }),
                    AlertDialogDescription({ nodes: () => {
                      const b = block();
                      return b ? `This will remove "${b.label}" (${fmtHex(b.startWord)}) from the layout.` : "This will remove the block.";
                    }}),
                  ]}),
                  AlertDialogFooter({ nodes: [
                    AlertDialogCancel({ nodes: "Cancel" }),
                    AlertDialogAction({
                      variant: "destructive",
                      nodes: "Delete",
                      on: { click: () => appStore.dispatch("removeBlock", blockId) },
                    }),
                  ]}),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
