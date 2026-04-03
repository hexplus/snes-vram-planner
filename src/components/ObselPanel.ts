import { div, span } from "sibujs";
import {
  Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Label, Separator,
} from "sibujs-ui";
import { appStore, activeObsel, objPage0Range, objPage1Range, obselWarnings } from "../store";
import { VRAM_WORDS, OBJ_PAGE_WORDS, OBJ_SIZE_OPTIONS } from "../constants";
import { obselRegValue } from "../utils/registers";
import { fmtHex } from "../utils/format";
import type { ObselGap, ObjSizeSelect } from "../types";

const fmtByteHex = (wordAddr: number) => fmtHex(wordAddr);

const NAME_BASES = Array.from({ length: 8 }, (_, i) => i * 4096);

const GAP_OPTIONS: { value: ObselGap; label: string }[] = [
  { value: 0x1000, label: "8KB (+$2000)" },
  { value: 0x2000, label: "16KB (+$4000)" },
  { value: 0x4000, label: "32KB (+$8000)" },
];

export function ObselPanel() {
  return div({ class: "px-4 py-3 flex flex-col gap-3", nodes: [

    // Header
    div({ class: "flex items-center gap-2", nodes: [
      span({ class: "text-sm font-medium", nodes: "OBJ Pages (OBSEL)" }),
      Badge({
        variant: "outline",
        class: "font-mono text-[10px]",
        nodes: () => {
          const o = activeObsel();
          const reg = obselRegValue(o.nameBaseWord, o.gap, o.objSize ?? 0);
          return `$${reg.toString(16).toUpperCase().padStart(2, "0")}`;
        },
      }),
    ]}),

    // Name Base selector
    div({ class: "flex flex-col gap-1.5", nodes: [
      Label({ class: "text-xs", nodes: "Name Base (bits 0-2)" }),
      Select({
        defaultValue: String(activeObsel().nameBaseWord),
        onValueChange: (v: string) => {
          const o = activeObsel();
          appStore.dispatch("setObsel", { ...o, nameBaseWord: Number(v) });
        },
        nodes: [
          SelectTrigger({ class: "h-8 text-xs font-mono", nodes: SelectValue({}) }),
          SelectContent({ nodes: NAME_BASES.map(base =>
            SelectItem({
              value: String(base),
              nodes: `${fmtByteHex(base)} (word ${base})`,
            })
          )}),
        ],
      }),
    ]}),

    // Gap selector
    div({ class: "flex flex-col gap-1.5", nodes: [
      Label({ class: "text-xs", nodes: "Name Select / gap (bits 3-4)" }),
      Select({
        defaultValue: String(activeObsel().gap),
        onValueChange: (v: string) => {
          const o = activeObsel();
          appStore.dispatch("setObsel", { ...o, gap: Number(v) as ObselGap });
        },
        nodes: [
          SelectTrigger({ class: "h-8 text-xs font-mono", nodes: SelectValue({}) }),
          SelectContent({ nodes: GAP_OPTIONS.map(opt =>
            SelectItem({ value: String(opt.value), nodes: opt.label })
          )}),
        ],
      }),
    ]}),

    // Sprite size selector
    div({ class: "flex flex-col gap-1.5", nodes: [
      Label({ class: "text-xs", nodes: "Sprite Size (bits 5-7)" }),
      Select({
        defaultValue: String(activeObsel().objSize ?? 0),
        onValueChange: (v: string) => {
          const o = activeObsel();
          appStore.dispatch("setObsel", { ...o, objSize: Number(v) as ObjSizeSelect });
        },
        nodes: [
          SelectTrigger({ class: "h-8 text-xs font-mono", nodes: SelectValue({}) }),
          SelectContent({ nodes: OBJ_SIZE_OPTIONS.map(opt =>
            SelectItem({ value: String(opt.value), nodes: `${opt.small} / ${opt.large}` })
          )}),
        ],
      }),
    ]}),

    Separator({}),

    // Computed page ranges
    div({ class: "grid grid-cols-2 gap-2 text-[10px] font-mono", nodes: [
      div({ class: "flex flex-col gap-0.5", nodes: [
        span({ class: "text-muted-foreground", nodes: "Page 0" }),
        span({ nodes: () => {
          const r = objPage0Range();
          return `${fmtByteHex(r.startWord)}–${fmtByteHex(r.endWord)}`;
        }}),
      ]}),
      div({ class: "flex flex-col gap-0.5", nodes: [
        span({ class: "text-muted-foreground", nodes: "Page 1" }),
        span({
          class: () => objPage1Range().endWord > VRAM_WORDS ? "text-red-500" : "",
          nodes: () => {
            const r = objPage1Range();
            const suffix = r.endWord > VRAM_WORDS ? " (overflow!)" : "";
            return `${fmtByteHex(r.startWord)}–${fmtByteHex(r.endWord)}${suffix}`;
          },
        }),
      ]}),
      div({ class: "flex flex-col gap-0.5", nodes: [
        span({ class: "text-muted-foreground", nodes: "Page size" }),
        span({ nodes: `${OBJ_PAGE_WORDS * 2 / 1024} KB (${OBJ_PAGE_WORDS} words)` }),
      ]}),
      div({ class: "flex flex-col gap-0.5", nodes: [
        span({ class: "text-muted-foreground", nodes: "Register" }),
        span({ nodes: () => {
          const o = activeObsel();
          const reg = obselRegValue(o.nameBaseWord, o.gap, o.objSize ?? 0);
          return `OBSEL = $${reg.toString(16).toUpperCase().padStart(2, "0")}`;
        }}),
      ]}),
      div({ class: "flex flex-col gap-0.5 col-span-2", nodes: [
        span({ class: "text-muted-foreground", nodes: "Sprite sizes" }),
        span({ nodes: () => {
          const sizeIdx = activeObsel().objSize ?? 0;
          const opt = OBJ_SIZE_OPTIONS[sizeIdx];
          return opt ? `Small: ${opt.small}, Large: ${opt.large}` : "";
        }}),
      ]}),
    ]}),

    // OBSEL warnings
    div({
      class: () => obselWarnings().length > 0 ? "flex flex-col gap-1" : "hidden",
      nodes: () => obselWarnings().map(w =>
        div({
          class: "text-[10px] px-1.5 py-1 rounded " + (
            w.type === "page-overflow"
              ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
              : w.type === "obj-outside-page"
              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
              : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
          ),
          nodes: w.message,
        })
      ),
    }),

  ]});
}
