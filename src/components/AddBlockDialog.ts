import { div, span, signal, derived, batch } from "sibujs";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogClose,
  Button, Input, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, Label, Badge,
  PlusIcon,
} from "sibujs-ui";
import { appStore, blocks } from "../store";
import { generateId } from "../utils/id";
import { fmtHex } from "../utils/format";
import { detectConflicts } from "../utils/conflicts";
import { VRAM_WORDS, WORDS_PER_ROW } from "../constants";
import type { BlockCategory, BlockColor, VramBlock } from "../types";

/**
 * Find the first free position in VRAM that can fit `size` words
 * without overlapping any existing blocks. Returns a row-aligned start (256-word boundary).
 */
function findFreePosition(existingBlocks: VramBlock[], size: number): number {
  if (existingBlocks.length === 0) return 0;

  const sorted = [...existingBlocks].sort((a, b) => a.startWord - b.startWord);

  // Check gap before first block
  if (sorted[0].startWord >= size) return 0;

  // Check gaps between blocks
  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].startWord + sorted[i].sizeWords;
    const gapEnd = sorted[i + 1].startWord;
    const aligned = Math.ceil(gapStart / WORDS_PER_ROW) * WORDS_PER_ROW;
    if (aligned + size <= gapEnd) return aligned;
  }

  // Check gap after last block
  const lastEnd = sorted[sorted.length - 1].startWord + sorted[sorted.length - 1].sizeWords;
  const aligned = Math.ceil(lastEnd / WORDS_PER_ROW) * WORDS_PER_ROW;
  if (aligned + size <= VRAM_WORDS) return aligned;

  return 0;
}

export function AddBlockDialog() {
  const [label, setLabel]       = signal("New Block");
  const [category, setCategory] = signal<BlockCategory>("bg-tiles");
  const [color, setColor]       = signal<BlockColor>("blue");
  const [startWord, setStart]   = signal(0);
  const [sizeWords, setSize]    = signal(256);
  const [error, setError]       = signal<string | null>(null);

  // Reset form to sensible defaults when dialog opens
  function resetForm() {
    setLabel("New Block");
    setCategory("bg-tiles");
    setColor("blue");
    setError(null);
    const size = 256;
    setSize(size);
    setStart(findFreePosition(blocks(), size));
  }

  const previewConflict = derived(() => {
    const preview: VramBlock = {
      id: "__preview__",
      label: label(),
      startWord: startWord(),
      sizeWords: sizeWords(),
      category: category(),
      color: color(),
      locked: false,
      note: "",
    };
    return detectConflicts([...blocks(), preview])
      .filter(c => c.blockAId === "__preview__" || c.blockBId === "__preview__");
  });

  const endWord = derived(() => startWord() + sizeWords());

  function handleAdd() {
    batch(() => {
      setError(null);
      if (!label().trim()) { setError("Label is required"); return; }
      if (endWord() > VRAM_WORDS) { setError("Block exceeds VRAM boundary ($FFFF)"); return; }
      if (previewConflict().length > 0) { setError("Block overlaps an existing reservation"); return; }

      appStore.dispatch("addBlock", {
        id: generateId(),
        label: label().trim(),
        startWord: startWord(),
        sizeWords: sizeWords(),
        category: category(),
        color: color(),
        locked: false,
        note: "",
      });
    });
  }

  return Dialog({
    onOpenChange: (open: boolean) => {
      if (open) resetForm();
    },
    nodes: [
      DialogTrigger({
        nodes: Button({ nodes: [PlusIcon({ class: "size-4 mr-1" }), "Add Block"] }),
      }),
      DialogContent({
        nodes: [
          DialogHeader({ nodes: [
            DialogTitle({ nodes: "Add VRAM Block" }),
            DialogDescription({ nodes: "Reserve a region of VRAM for a specific purpose." }),
          ]}),

          div({ class: "grid gap-4 py-4", nodes: [

            div({ class: "flex flex-col gap-1.5", nodes: [
              Label({ nodes: "Label" }),
              Input({
                value: (() => label()) as unknown as string,
                on: { input: (e: Event) => setLabel((e.target as HTMLInputElement).value) },
              }),
            ]}),

            div({ class: "grid grid-cols-2 gap-4", nodes: [
              div({ class: "flex flex-col gap-1.5", nodes: [
                Label({ nodes: "Start (words)" }),
                Input({
                  type: "number", min: "0", max: "32512", step: "256",
                  value: (() => String(startWord())) as unknown as string,
                  on: { input: (e: Event) => setStart(Math.round(Number((e.target as HTMLInputElement).value) / WORDS_PER_ROW) * WORDS_PER_ROW) },
                }),
                span({ class: "text-xs font-mono text-muted-foreground", nodes: () => fmtHex(startWord()) }),
              ]}),
              div({ class: "flex flex-col gap-1.5", nodes: [
                Label({ nodes: "Size (words)" }),
                Input({
                  type: "number", min: "256", max: "32768", step: "256",
                  value: (() => String(sizeWords())) as unknown as string,
                  on: {
                    input: (e: Event) => {
                      const newSize = Math.max(WORDS_PER_ROW, Math.round(Number((e.target as HTMLInputElement).value) / WORDS_PER_ROW) * WORDS_PER_ROW);
                      setSize(newSize);
                    },
                  },
                }),
                span({ class: "text-xs font-mono text-muted-foreground",
                  nodes: () => `End: ${fmtHex(endWord())} | ${(sizeWords()*2/1024).toFixed(2)} KB` }),
              ]}),
            ]}),

            div({ class: "grid grid-cols-2 gap-4", nodes: [
              div({ class: "flex flex-col gap-1.5", nodes: [
                Label({ nodes: "Category" }),
                Select({
                  value: (() => category()) as unknown as string,
                  onValueChange: (v: string) => setCategory(v as BlockCategory),
                  nodes: [
                    SelectTrigger({ nodes: SelectValue({ placeholder: "Category" }) }),
                    SelectContent({ nodes: [
                      SelectItem({ value: "bg-tiles",    nodes: "BG Tiles" }),
                      SelectItem({ value: "bg-map",      nodes: "BG Tilemap" }),
                      SelectItem({ value: "obj-tiles",   nodes: "OBJ Tiles" }),
                      SelectItem({ value: "mode7-tiles", nodes: "Mode 7 Tiles" }),
                      SelectItem({ value: "free",        nodes: "Free Space" }),
                    ]}),
                  ],
                }),
              ]}),
              div({ class: "flex flex-col gap-1.5", nodes: [
                Label({ nodes: "Color" }),
                Select({
                  value: (() => color()) as unknown as string,
                  onValueChange: (v: string) => setColor(v as BlockColor),
                  nodes: [
                    SelectTrigger({ nodes: SelectValue({ placeholder: "Color" }) }),
                    SelectContent({ nodes: [
                      SelectItem({ value: "blue",   nodes: "Blue" }),
                      SelectItem({ value: "teal",   nodes: "Teal" }),
                      SelectItem({ value: "amber",  nodes: "Amber" }),
                      SelectItem({ value: "coral",  nodes: "Coral" }),
                      SelectItem({ value: "purple", nodes: "Purple" }),
                      SelectItem({ value: "green",  nodes: "Green" }),
                      SelectItem({ value: "red",    nodes: "Red" }),
                      SelectItem({ value: "gray",   nodes: "Gray" }),
                    ]}),
                  ],
                }),
              ]}),
            ]}),

            // Error display
            div({
              class: () => error() !== null ? "" : "hidden",
              nodes: () => error() !== null
                ? Badge({ variant: "destructive", nodes: error()! })
                : "",
            }),

            // Conflict warning (only shown when no error and conflict exists)
            div({
              class: () => previewConflict().length > 0 && error() === null ? "" : "hidden",
              nodes: () => previewConflict().length > 0
                ? Badge({ variant: "destructive", nodes: "Warning: overlaps an existing block" })
                : "",
            }),
          ]}),

          DialogFooter({ nodes: [
            DialogClose({ nodes: Button({ variant: "outline", nodes: "Cancel" }) }),
            Button({ nodes: "Add Block", on: { click: handleAdd } }),
          ]}),
        ],
      }),
    ],
  });
}
