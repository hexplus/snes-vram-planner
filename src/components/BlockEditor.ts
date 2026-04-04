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
import { selectedId, appStore, blocks, conflicts, alignWarnings, activeMode, activeObsel, showBytes } from "../store";
import { BLOCK_COLORS, VRAM_WORDS, WORDS_PER_ROW, CATEGORY_META, MAP_SIZE_WORDS } from "../constants";
import type { MapSize, TransferMode } from "../types";
import { fmtHex, fmtKb, toConstantName, tileCount, bppForCategory } from "../utils/format";
import { generateId } from "../utils/id";
import { findFreePosition } from "../utils/placement";
import { getTemplatesForMode } from "../utils/templates";
import { getAlignmentStep } from "../utils/alignment";
import { blockHasConflict, blockHasWarning, detectConflicts } from "../utils/conflicts";
import { openAlignmentDialog } from "./AlignmentWarningDialog";
import type { BlockCategory, BlockColor, VramBlock } from "../types";

export function BlockEditor() {
  return div({
    class: "h-full",
    nodes: when(
      selectedId,
      () => BlockEditorForm(selectedId()!),
      () => EmptyState(),
    ),
  });
}

function EmptyState() {
  return Card({
    class: "h-full overflow-y-auto",
    nodes: div({
      class: "flex flex-col items-center text-muted-foreground text-sm gap-4 p-4",
      nodes: [
        div({ class: "flex flex-col items-center gap-2 pt-4", nodes: [
          div({ class: "text-3xl", nodes: "□" }),
          div({ nodes: "Select a block to edit" }),
          div({ class: "text-xs", nodes: "Or drag on the grid to create one" }),
        ]}),

        // Quick-add templates
        div({ class: "w-full flex flex-col gap-1.5", nodes: [
          div({ class: "text-xs font-medium text-foreground", nodes: "Quick Add" }),
          div({ class: "flex flex-wrap gap-1.5", nodes: () => {
            const templates = getTemplatesForMode(activeMode(), activeObsel());
            return templates.map(t => {
              const cat = CATEGORY_META[t.category];
              return Button({
                size: "sm", variant: "outline",
                class: "text-[10px] h-7",
                nodes: [
                  span({ class: `inline-block w-2 h-2 rounded-sm mr-1 ${cat.badge}` }),
                  t.label,
                ],
                on: { click: () => {
                  const align = getAlignmentStep(t.category);
                  const startWord = findFreePosition(blocks(), t.sizeWords, align);
                  appStore.dispatch("addBlock", {
                    id: generateId(),
                    label: t.label,
                    startWord,
                    sizeWords: t.sizeWords,
                    category: t.category,
                    color: t.color,
                    locked: false,
                    note: t.note,
                    bgLayer: t.bgLayer,
                  });
                }},
              });
            });
          }}),
        ]}),
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
  const conflictExplanations = derived(() =>
    conflicts()
      .filter(c => c.blockAId === blockId || c.blockBId === blockId)
      .map(c => c.explanation)
  );
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
          // Conflict explanations
          div({
            class: () => conflictExplanations().length > 0 ? "flex flex-col gap-1 mt-1" : "hidden",
            nodes: () => conflictExplanations().map(msg =>
              div({
                class: "text-[10px] px-1.5 py-1 rounded bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400",
                nodes: msg,
              })
            ),
          }),
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
                value: () => block()?.category ?? initialBlock.category,
                onValueChange: (v: string) => dispatchUpdate({ category: v as BlockCategory }),
                nodes: [
                  SelectTrigger({ nodes: SelectValue({ placeholder: "Category" }) }),
                  SelectContent({ nodes:
                    Object.entries(CATEGORY_META).map(([key, meta]) =>
                      SelectItem({ value: key, nodes:
                        div({ class: "flex items-center gap-2", nodes: [
                          span({ class: `inline-block w-2.5 h-2.5 rounded-sm ${meta.badge}` }),
                          span({ nodes: meta.label }),
                        ]}),
                      })
                    ),
                  }),
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

          // ── BG Layer assignment (bg-tiles/bg-map only) ──────────
          div({
            class: () => {
              const cat = block()?.category;
              return cat === "bg-tiles" || cat === "bg-map" ? "flex flex-col gap-1.5" : "hidden";
            },
            nodes: [
              Label({ nodes: "BG Layer" }),
              Select({
                value: () => String(block()?.bgLayer ?? initialBlock.bgLayer ?? 1),
                onValueChange: (v: string) => dispatchUpdate({ bgLayer: Number(v) as 1 | 2 | 3 | 4 }),
                nodes: [
                  SelectTrigger({ class: "h-8", nodes: SelectValue({}) }),
                  SelectContent({ nodes: () => {
                    const count = activeMode().bgCount;
                    return Array.from({ length: count }, (_, i) =>
                      SelectItem({ value: String(i + 1), nodes: `BG${i + 1} (${activeMode().bpp[i]}bpp)` })
                    );
                  }}),
                ],
              }),
            ],
          }),

          Separator({}),

          // ── Address info ─────────────────────────────────────────
          div({ class: "grid grid-cols-2 gap-2 text-xs font-mono", nodes: [
            div({ class: "flex flex-col gap-0.5", nodes: [
              span({ class: "text-muted-foreground text-[10px]", nodes: "Start" }),
              span({ nodes: () => { const b = block(); return b ? fmtHex(b.startWord, showBytes()) : ""; } }),
            ]}),
            div({ class: "flex flex-col gap-0.5", nodes: [
              span({ class: "text-muted-foreground text-[10px]", nodes: "End (exclusive)" }),
              span({ nodes: () => { const b = block(); return b ? fmtHex(b.startWord + b.sizeWords, showBytes()) : ""; } }),
            ]}),
            div({ class: "flex flex-col gap-0.5", nodes: [
              span({ class: "text-muted-foreground text-[10px]", nodes: "Size" }),
              span({ nodes: () => { const b = block(); return b ? `${b.sizeWords} words` : ""; } }),
            ]}),
            div({ class: "flex flex-col gap-0.5", nodes: [
              span({ class: "text-muted-foreground text-[10px]", nodes: "Bytes" }),
              span({ nodes: () => { const b = block(); return b ? fmtKb(b.sizeWords) : ""; } }),
            ]}),
            div({ class: "flex flex-col gap-0.5 col-span-2", nodes: [
              span({ class: "text-muted-foreground text-[10px]", nodes: "Tiles" }),
              span({ nodes: () => {
                const b = block();
                if (!b) return "";
                const bpp = bppForCategory(b.category, activeMode());
                if (bpp === null) return "N/A (not tile data)";
                const count = tileCount(b.sizeWords, bpp);
                return `${count} tiles (${bpp}bpp 8×8)`;
              }}),
            ]}),
          ]}),

          // Tile grid preview
          div({
            class: () => {
              const b = block();
              if (!b) return "hidden";
              const bpp = bppForCategory(b.category, activeMode());
              return bpp !== null ? "flex flex-col gap-1" : "hidden";
            },
            nodes: () => {
              const b = block();
              if (!b) return "";
              const bpp = bppForCategory(b.category, activeMode());
              if (bpp === null) return "";
              const count = tileCount(b.sizeWords, bpp);
              const cols = 16;
              const rows = Math.min(Math.ceil(count / cols), 8); // cap at 8 rows visually
              const shown = rows * cols;
              const cells = [];
              for (let i = 0; i < shown; i++) {
                cells.push(div({
                  class: `w-2.5 h-2.5 border border-border/40 ${i < count ? "bg-muted" : "bg-transparent"}`,
                }));
              }
              return [
                span({ class: "text-[10px] text-muted-foreground", nodes: `Tile slots (${cols}×${rows}${count > shown ? `, ${count - shown} more` : ""})` }),
                div({ class: "flex flex-wrap gap-px", nodes: cells }),
              ];
            },
          }),

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

          // ── Map Size (bg-map only) ─────────────────────────────────
          div({
            class: () => block()?.category === "bg-map" ? "flex flex-col gap-1.5" : "hidden",
            nodes: [
              Label({ nodes: "Map Size" }),
              Select({
                value: () => block()?.mapSize ?? initialBlock.mapSize ?? "32x32",
                onValueChange: (v: string) => {
                  const ms = v as MapSize;
                  dispatchUpdate({ mapSize: ms, sizeWords: MAP_SIZE_WORDS[ms] });
                },
                nodes: [
                  SelectTrigger({ nodes: SelectValue({}) }),
                  SelectContent({ nodes: [
                    SelectItem({ value: "32x32", nodes: "32×32 (1 screen, 2 KB)" }),
                    SelectItem({ value: "64x32", nodes: "64×32 (2 screens, 4 KB)" }),
                    SelectItem({ value: "32x64", nodes: "32×64 (2 screens, 4 KB)" }),
                    SelectItem({ value: "64x64", nodes: "64×64 (4 screens, 8 KB)" }),
                  ]}),
                ],
              }),
            ],
          }),

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

          // ── Transfer mode ──────────────────────────────────────────
          div({ class: "flex items-center justify-between", nodes: [
            div({ class: "flex flex-col", nodes: [
              Label({ nodes: "DMA Streamed" }),
              span({ class: "text-xs text-muted-foreground", nodes: "Updated every VBlank via DMA" }),
            ]}),
            Switch({
              defaultChecked: initialBlock.transfer === "streamed",
              onCheckedChange: (v: boolean) => dispatchUpdate({ transfer: (v ? "streamed" : "static") as TransferMode }),
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
                      return b ? `This will remove "${b.label}" (${fmtHex(b.startWord, showBytes())}) from the layout.` : "This will remove the block.";
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
