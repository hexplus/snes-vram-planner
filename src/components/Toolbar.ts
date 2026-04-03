import { div, span, signal } from "sibujs";
import {
  Button, Select, SelectTrigger, SelectContent, SelectItem,
  Separator, Badge, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
  Dialog, DialogTrigger, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter, DialogClose,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
  Textarea,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Grid2x2Icon, HashIcon, MoonIcon, SunIcon, DownloadIcon, Trash2Icon,
  ZoomInIcon, ZoomOutIcon, UploadIcon, LayoutTemplateIcon,
} from "sibujs-ui";
import { appStore, activeMode, showGrid, showAddresses, darkMode, zoom,
         usagePercent, conflicts, alignWarnings, totalUsed, blocks, canUndo, canRedo } from "../store";
import { SNES_MODES } from "../constants";
import { exportAsAsm, exportAsJson } from "../utils/export";
import { importFromJson } from "../utils/import";
import { PRESETS } from "../utils/presets";
import { AddBlockDialog } from "./AddBlockDialog";
import { openAlignmentDialog } from "./AlignmentWarningDialog";

export function Toolbar() {
  function downloadFile(content: string, filename: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    a.download = filename;
    a.click();
  }

  const [importText, setImportText] = signal("");

  return TooltipProvider({
    nodes: div({
      class: "flex flex-wrap items-center gap-2 p-2 border-b bg-background sticky top-0 z-50",
      nodes: [

        // ── App title ───────────────────────────────────────────────
        div({ class: "font-bold text-sm mr-2", nodes: "SNES VRAM Planner" }),

        // ── Undo/Redo ───────────────────────────────────────────────
        Tooltip({ nodes: [
          TooltipTrigger({ nodes: Button({
            size: "icon-sm",
            variant: "ghost",
            class: () => canUndo() ? "" : "opacity-50 cursor-not-allowed",
            nodes: "↶",
            on: { click: () => { if (canUndo()) appStore.dispatch("undo"); } },
          })}),
          TooltipContent({ side: "bottom", nodes: "Undo (Ctrl+Z)" }),
        ]}),
        Tooltip({ nodes: [
          TooltipTrigger({ nodes: Button({
            size: "icon-sm",
            variant: "ghost",
            class: () => canRedo() ? "" : "opacity-50 cursor-not-allowed",
            nodes: "↷",
            on: { click: () => { if (canRedo()) appStore.dispatch("redo"); } },
          })}),
          TooltipContent({ side: "bottom", nodes: "Redo (Ctrl+Y / Ctrl+Shift+Z)" }),
        ]}),

        // ── Mode selector ───────────────────────────────────────────
        div({ class: "flex items-center gap-1.5", nodes: [
          span({ class: "text-xs text-muted-foreground", nodes: "Mode:" }),
          Select({
            defaultValue: String(activeMode().id),
            onValueChange: (v: string) => appStore.dispatch("setMode", Number(v)),
            nodes: [
              SelectTrigger({ class: "w-56", nodes:
                span({ class: "flex items-center gap-2 truncate", nodes: () => [
                  span({ class: "font-medium", nodes: activeMode().label }),
                  span({ class: "text-[10px] font-mono text-muted-foreground", nodes: `${activeMode().bgCount}BG ${activeMode().bpp.join("/")}bpp` }),
                ]}),
              }),
              SelectContent({ nodes: SNES_MODES.map(m =>
                SelectItem({ value: String(m.id), nodes:
                  div({ class: "flex flex-col", nodes: [
                    div({ class: "flex items-center gap-2", nodes: [
                      span({ class: "font-medium", nodes: m.label }),
                      span({ class: "text-[10px] font-mono text-muted-foreground", nodes: `${m.bgCount}BG ${m.bpp.join("/")}bpp` }),
                    ]}),
                    span({ class: "text-[10px] text-muted-foreground", nodes: m.description }),
                  ]}),
                })
              )}),
            ],
          }),
        ]}),

        Separator({ orientation: "vertical", class: "h-6" }),

        // ── Add block ───────────────────────────────────────────────
        AddBlockDialog(),

        Separator({ orientation: "vertical", class: "h-6" }),

        // ── View toggles ────────────────────────────────────────────
        div({ class: "flex items-center gap-0.5", nodes: [
          Tooltip({ nodes: [
            TooltipTrigger({ nodes: Button({
              size: "icon-sm",
              variant: "ghost",
              class: () => showGrid()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "",
              nodes: Grid2x2Icon({ class: "size-4" }),
              on: { click: () => appStore.dispatch("toggleGrid") },
            })}),
            TooltipContent({ side: "bottom", nodes: "Toggle grid lines" }),
          ]}),
          Tooltip({ nodes: [
            TooltipTrigger({ nodes: Button({
              size: "icon-sm",
              variant: "ghost",
              class: () => showAddresses()
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "",
              nodes: HashIcon({ class: "size-4" }),
              on: { click: () => appStore.dispatch("toggleAddresses") },
            })}),
            TooltipContent({ side: "bottom", nodes: "Toggle address labels" }),
          ]}),
        ]}),

        Separator({ orientation: "vertical", class: "h-6" }),

        // ── Zoom controls ───────────────────────────────────────────
        div({ class: "flex items-center gap-1", nodes: [
          Button({ size: "icon-sm", variant: "ghost",
            nodes: ZoomOutIcon({ class: "size-4" }),
            on: { click: () => appStore.dispatch("setZoom", zoom() - 0.25) },
          }),
          span({ class: "text-xs w-10 text-center", nodes: () => `${Math.round(zoom() * 100)}%` }),
          Button({ size: "icon-sm", variant: "ghost",
            nodes: ZoomInIcon({ class: "size-4" }),
            on: { click: () => appStore.dispatch("setZoom", zoom() + 0.25) },
          }),
        ]}),

        Separator({ orientation: "vertical", class: "h-6" }),

        // ── Dark mode ───────────────────────────────────────────────
        Button({
          size: "icon-sm", variant: "ghost",
          nodes: () => darkMode() ? SunIcon({ class: "size-4" }) : MoonIcon({ class: "size-4" }),
          on: { click: () => {
            appStore.dispatch("toggleDarkMode");
            // After dispatch, darkMode() has the NEW value
            document.documentElement.classList.toggle("dark", darkMode());
          }},
        }),

        Separator({ orientation: "vertical", class: "h-6" }),

        // ── Load Preset ─────────────────────────────────────────────
        DropdownMenu({
          nodes: [
            DropdownMenuTrigger({
              nodes: Button({ variant: "outline", size: "sm", nodes: [LayoutTemplateIcon({ class: "size-3 mr-1" }), "Presets"] }),
            }),
            DropdownMenuContent({
              nodes: Object.entries(PRESETS).map(([name, presetBlocks]) =>
                DropdownMenuItem({
                  nodes: name,
                  onSelect: () => appStore.dispatch("importBlocks", presetBlocks),
                })
              ),
            }),
          ],
        }),

        // ── Import JSON ─────────────────────────────────────────────
        Dialog({
          nodes: [
            DialogTrigger({
              nodes: Button({ variant: "outline", size: "sm", nodes: [UploadIcon({ class: "size-3 mr-1" }), "Import"] }),
            }),
            DialogContent({
              nodes: [
                DialogHeader({ nodes: [
                  DialogTitle({ nodes: "Import JSON" }),
                  DialogDescription({ nodes: "Paste a JSON array of VramBlock objects." }),
                ]}),
                div({ class: "py-4", nodes: [
                  Textarea({
                    placeholder: '[{"id":"...","label":"...","startWord":0,"sizeWords":256,...}]',
                    rows: 6,
                    value: (() => importText()) as unknown as string,
                    on: { input: (e: Event) => setImportText((e.target as HTMLTextAreaElement).value) },
                  }),
                ]}),
                DialogFooter({ nodes: [
                  DialogClose({ nodes: Button({ variant: "outline", nodes: "Cancel" }) }),
                  DialogClose({
                    nodes: Button({
                      nodes: "Import",
                      on: { click: () => importFromJson(importText()) },
                    }),
                  }),
                ]}),
              ],
            }),
          ],
        }),

        // ── Export ──────────────────────────────────────────────────
        Select({
          onValueChange: (v: string) => {
            if (v === "asm")  downloadFile(exportAsAsm(blocks(), activeMode().label), "vram_layout.asm");
            if (v === "json") downloadFile(exportAsJson(blocks()), "vram_layout.json");
          },
          nodes: [
            SelectTrigger({ class: "w-28", nodes: [DownloadIcon({ class: "size-4 mr-1" }), "Export"] }),
            SelectContent({ nodes: [
              SelectItem({ value: "asm",  nodes: "Export .asm" }),
              SelectItem({ value: "json", nodes: "Export JSON" }),
            ]}),
          ],
        }),

        // ── Clear all ───────────────────────────────────────────────
        AlertDialog({
          nodes: [
            AlertDialogTrigger({
              nodes: Button({ size: "sm", variant: "outline", nodes: [Trash2Icon({ class: "size-3 mr-1" }), "Clear"] }),
            }),
            AlertDialogContent({
              nodes: [
                AlertDialogHeader({ nodes: [
                  AlertDialogTitle({ nodes: "Clear all blocks?" }),
                  AlertDialogDescription({ nodes: "This will remove all VRAM blocks from the layout. This action cannot be undone." }),
                ]}),
                AlertDialogFooter({ nodes: [
                  AlertDialogCancel({ nodes: "Cancel" }),
                  AlertDialogAction({
                    variant: "destructive",
                    nodes: "Clear All",
                    on: { click: () => appStore.dispatch("clearAll") },
                  }),
                ]}),
              ],
            }),
          ],
        }),

        // ── Stats (right side) ──────────────────────────────────────
        div({ class: "ml-auto flex items-center gap-2", nodes: [
          Badge({
            variant: (() => conflicts().length > 0 ? "destructive" : "outline") as unknown as "destructive" | "outline",
            nodes: () => conflicts().length > 0
              ? `${conflicts().length} conflict${conflicts().length > 1 ? "s" : ""}`
              : "No conflicts",
          }),
          Badge({
            variant: (() => alignWarnings().length > 0 ? "secondary" : "outline") as unknown as "secondary" | "outline",
            class: () => alignWarnings().length > 0 ? "text-amber-600 border-amber-400 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900" : "",
            nodes: () => alignWarnings().length > 0
              ? `${alignWarnings().length} alignment`
              : "Aligned",
            on: { click: () => { if (alignWarnings().length > 0) openAlignmentDialog(); } },
          }),
          Badge({
            variant: "secondary",
            nodes: () => `${usagePercent().toFixed(1)}% used`,
          }),
          Badge({
            variant: "outline",
            class: "font-mono",
            nodes: () => `${(totalUsed() * 2 / 1024).toFixed(1)} KB / 64 KB`,
          }),
        ]}),

      ],
    }),
  });
}
