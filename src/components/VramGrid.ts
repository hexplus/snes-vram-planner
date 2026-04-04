import {
  div, span, signal, derived, ref, each
} from "sibujs";
import { resize } from "sibujs/browser";
import { cn, Badge, LockIcon, ZapIcon, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "sibujs-ui";
import {
  blocks, conflicts, alignWarnings, showGrid, showAddresses, zoom,
  selectedId, filterCat, appStore, objPage0Range, objPage1Range, activeMode,
  compareScene, obselWarnings, showBytes
} from "../store";
import { blockHasConflict, blockHasWarning, detectConflicts } from "../utils/conflicts";
import { fmtHex, tileCount, bppForCategory } from "../utils/format";
import { WORDS_PER_ROW, TOTAL_ROWS, ROW_HEIGHT_PX, BLOCK_COLORS, VRAM_WORDS, CATEGORY_META } from "../constants";
import { generateId } from "../utils/id";
import { getAlignmentStep } from "../utils/alignment";
import type { VramBlock } from "../types";


export function VramGrid() {
  const containerRef = ref<HTMLElement | null>(null);
  const { width: containerWidth } = resize(containerRef);

  const gridHeight = TOTAL_ROWS * ROW_HEIGHT_PX; // 128 * 24 = 3072px

  // Pixels per VRAM word — based on container width and zoom
  const pixelsPerWord = derived(() => {
    const w = containerWidth() || 800;
    return (w / WORDS_PER_ROW) * zoom();
  });

  // ── Row background lines ──────────────────────────────────────────
  // Render lightweight row dividers + address labels at key boundaries
  function RowLines() {
    const rows: Element[] = [];
    for (let i = 0; i < TOTAL_ROWS; i++) {
      const rowStartWord = i * WORDS_PER_ROW;
      const isMajor = i % 8 === 0; // every 8 rows = 4KB boundary

      // Alternate 8-row groups with subtle background tint
      const groupIndex = Math.floor(i / 8);
      const isOddGroup = groupIndex % 2 === 1;

      const rowLine = div({
        class: () => cn(
          "absolute left-0 right-0 border-b pointer-events-none",
          showGrid()
            ? isMajor
              ? "border-border"
              : "border-border/40"
            : "border-transparent",
          isOddGroup && "bg-muted/30",
        ),
        style: {
          top: `${i * ROW_HEIGHT_PX}px`,
          height: `${ROW_HEIGHT_PX}px`,
        },
      });

      // Address labels only on major boundaries (every 4KB = 8 rows)
      if (isMajor) {
        const addrLabel = span({
          class: () => cn(
            "absolute left-1 text-[9px] font-mono text-muted-foreground/70 pointer-events-none z-10 leading-none",
            !showAddresses() && "hidden"
          ),
          style: { top: `${i * ROW_HEIGHT_PX + 2}px` },
          nodes: () => fmtHex(rowStartWord, showBytes()),
        });
        rows.push(addrLabel);
      }

      rows.push(rowLine);
    }
    return rows;
  }

  // ── Drag-to-create selection state ────────────────────────────────
  const [selStartRow, setSelStartRow] = signal(-1);
  const [selEndRow, setSelEndRow] = signal(-1);
  const [isSelecting, setIsSelecting] = signal(false);

  // Computed selection range (always normalized so start <= end)
  const selRange = derived(() => {
    const a = selStartRow(), b = selEndRow();
    if (a < 0 || b < 0) return null;
    const minRow = Math.min(a, b);
    const maxRow = Math.max(a, b);
    return {
      startWord: minRow * WORDS_PER_ROW,
      sizeWords: (maxRow - minRow + 1) * WORDS_PER_ROW,
    };
  });

  function rowFromMouseEvent(me: MouseEvent): number {
    const gridEl = containerRef.current;
    if (!gridEl) return 0;
    const rect = gridEl.getBoundingClientRect();
    const yInGrid = me.clientY - rect.top + gridEl.scrollTop;
    return Math.max(0, Math.min(Math.floor(yInGrid / ROW_HEIGHT_PX), TOTAL_ROWS - 1));
  }

  function onGridMouseDown(e: Event) {
    const me = e as MouseEvent;
    if (me.button !== 0) return;
    if ((me.target as HTMLElement).closest("[data-block-chip]")) return;

    const startRow = rowFromMouseEvent(me);
    const startX = me.clientX;
    const startY = me.clientY;
    let dragging = false;

    setSelStartRow(startRow);
    setSelEndRow(startRow);

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        dragging = true;
        setIsSelecting(true);
      }
      setSelEndRow(rowFromMouseEvent(ev));
    };

    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      if (!dragging) {
        // No drag — treat as a click to deselect
        setSelStartRow(-1);
        setSelEndRow(-1);
        appStore.dispatch("selectBlock", null);
      } else {
        // Drag finished — create a block from the selection
        setSelEndRow(rowFromMouseEvent(ev));
        const range = selRange();
        if (range && range.sizeWords > 0) {
          const startWord = Math.max(0, Math.min(range.startWord, VRAM_WORDS - WORDS_PER_ROW));
          const sizeWords = Math.min(range.sizeWords, VRAM_WORDS - startWord);

          const candidate: VramBlock = {
            id: "__candidate__", label: "", startWord, sizeWords,
            category: "bg-tiles", color: "gray", locked: false, note: "",
          };
          const wouldConflict = detectConflicts([...blocks(), candidate])
            .some(c => c.blockAId === "__candidate__" || c.blockBId === "__candidate__");

          if (!wouldConflict) {
            appStore.dispatch("addBlock", {
              id: generateId(),
              label: "New Block",
              startWord,
              sizeWords,
              category: "bg-tiles" as const,
              color: "gray" as const,
              locked: false,
              note: "",
            });
          }
        }
      }

      setIsSelecting(false);
      setSelStartRow(-1);
      setSelEndRow(-1);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  // ── Filtered blocks ───────────────────────────────────────────────
  const filteredBlocks = derived(() =>
    blocks().filter(b => filterCat() === "all" || b.category === filterCat())
  );

  // ── Main grid container ───────────────────────────────────────────
  return div({
    ref: containerRef,
    class: "relative w-full overflow-x-hidden overflow-y-auto font-mono",
    style: { height: "100%" },
    on: {
      mousedown: onGridMouseDown,
    },
    nodes: div({
      class: "relative w-full",
      style: { height: `${gridHeight}px`, minHeight: `${gridHeight}px` },
      nodes: [
        // Row lines and address labels
        ...RowLines(),

        // OBJ page overlays
        ObjPageOverlay(pixelsPerWord, objPage0Range, "OBJ Page 0"),
        ObjPageOverlay(pixelsPerWord, objPage1Range, "OBJ Page 1"),

        // Selection preview overlay
        div({
          class: () => cn(
            "absolute pointer-events-none z-15 rounded border-2 border-dashed border-primary/70 bg-primary/10",
            !isSelecting() && "hidden",
          ),
          style: {
            top: () => {
              const r = selRange();
              if (!r) return "0px";
              const startRow = Math.floor(r.startWord / WORDS_PER_ROW);
              return `${startRow * ROW_HEIGHT_PX}px`;
            },
            left: "0px",
            width: () => `${WORDS_PER_ROW * pixelsPerWord()}px`,
            height: () => {
              const r = selRange();
              if (!r) return "0px";
              const rows = r.sizeWords / WORDS_PER_ROW;
              return `${rows * ROW_HEIGHT_PX}px`;
            },
          },
          nodes: span({
            class: "absolute top-1 left-2 text-[10px] font-mono text-primary font-medium",
            nodes: () => {
              const r = selRange();
              if (!r) return "";
              const endWord = r.startWord + r.sizeWords;
              const kb = (r.sizeWords * 2 / 1024).toFixed(1);
              return `${fmtHex(r.startWord, showBytes())}–${fmtHex(endWord, showBytes())}  (${kb} KB)`;
            },
          }),
        }),

        // Render block chips absolutely positioned within the grid
        each(
          filteredBlocks,
          (block) => BlockChip(block().id, pixelsPerWord),
          { key: b => b.id }
        ),

        // Compare scene ghost blocks
        div({
          class: () => compareScene() ? "" : "hidden",
          nodes: () => {
            const scene = compareScene();
            if (!scene) return "";
            return scene.blocks.map(b => GhostChip(b.startWord, b.sizeWords, b.label, pixelsPerWord));
          },
        }),
      ],
    }),
  });
}

// ── Block Chip ────────────────────────────────────────────────────────
// Rendered absolutely within the grid. Spans multiple rows for large blocks.

function BlockChip(
  blockId: string,
  pixelsPerWord: () => number,
) {
  const block = derived(() => blocks().find(b => b.id === blockId));
  const isSelected  = derived(() => selectedId() === blockId);
  const hasConflict = derived(() => blockHasConflict(blockId, conflicts()));
  const hasWarning  = derived(() => blockHasWarning(blockId, alignWarnings()));

  const tooltipText = derived(() => {
    const lines: string[] = [];
    // Conflict explanations
    for (const c of conflicts()) {
      if (c.blockAId === blockId || c.blockBId === blockId) lines.push(c.explanation);
    }
    // Alignment warnings
    for (const w of alignWarnings()) {
      if (w.blockId === blockId) lines.push(w.message);
    }
    // OBSEL warnings
    for (const w of obselWarnings()) {
      if (w.blockId === blockId) lines.push(w.message);
    }
    return lines.join("\n");
  });

  const colors = derived(() => {
    const b = block();
    return b ? (BLOCK_COLORS[b.color] ?? BLOCK_COLORS.gray) : BLOCK_COLORS.gray;
  });

  // Geometry: block rendered as a rectangle spanning its full row range.
  // For a block starting at word W with size S:
  //   startRow = floor(W / WORDS_PER_ROW)
  //   endRow   = ceil((W + S) / WORDS_PER_ROW)
  //   top = startRow * ROW_HEIGHT_PX
  //   height = (endRow - startRow) * ROW_HEIGHT_PX
  //   left = 0 (full width across rows) if block spans >1 row or starts at col 0
  //   For sub-row blocks: left = (W % WORDS_PER_ROW) * ppw, width = S * ppw
  const geometry = derived(() => {
    const b = block();
    if (!b) return { top: 0, left: 0, width: 0, height: 0 };

    const ppw = pixelsPerWord();
    const startRow = Math.floor(b.startWord / WORDS_PER_ROW);
    const endWord = b.startWord + b.sizeWords;
    const endRow = Math.ceil(endWord / WORDS_PER_ROW);
    const rowSpan = endRow - startRow;
    const colStart = b.startWord % WORDS_PER_ROW;
    const colEnd = endWord % WORDS_PER_ROW;

    if (rowSpan === 1) {
      // Block fits within a single row
      return {
        top: startRow * ROW_HEIGHT_PX + 2,
        left: colStart * ppw,
        width: Math.max(8, b.sizeWords * ppw),
        height: ROW_HEIGHT_PX - 4,
      };
    } else if (colStart === 0 && colEnd === 0) {
      // Block starts at row boundary and ends at row boundary — clean rectangle
      return {
        top: startRow * ROW_HEIGHT_PX + 1,
        left: 0,
        width: WORDS_PER_ROW * ppw,
        height: rowSpan * ROW_HEIGHT_PX - 2,
      };
    } else {
      // Block straddles row boundaries — render as full-width spanning all its rows
      // with slight left indent to show the actual start position
      return {
        top: startRow * ROW_HEIGHT_PX + 1,
        left: 0,
        width: WORDS_PER_ROW * ppw,
        height: rowSpan * ROW_HEIGHT_PX - 2,
      };
    }
  });

  // Drag state
  const [isDragging, setIsDragging] = signal(false);
  const [dragStartMouseY, setDragStartMouseY] = signal(0);
  const [dragOriginalWord, setDragOriginalWord] = signal(0);

  // Drag threshold: only start dragging after 4px of movement.
  // A click (press+release without moving) selects the block for editing.
  function onMouseDown(e: Event) {
    const me = e as MouseEvent;
    const b = block();
    if (!b || b.locked) return;
    me.preventDefault();

    const startX = me.clientX;
    const startY = me.clientY;
    let dragging = false;

    setDragStartMouseY(startY);
    setDragOriginalWord(b.startWord);

    const onMouseMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      // Start dragging only after a 4px movement threshold
      if (!dragging) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        dragging = true;
        setIsDragging(true);
      }

      const alignStep = getAlignmentStep(b.category);
      const deltaY = ev.clientY - dragStartMouseY();
      const deltaRows = Math.round(deltaY / ROW_HEIGHT_PX);
      const newWord = dragOriginalWord() + deltaRows * WORDS_PER_ROW;
      const clamped = Math.max(0, Math.min(newWord, VRAM_WORDS - b.sizeWords));
      const snapped = Math.round(clamped / alignStep) * alignStep;

      const candidate: VramBlock = { ...b, startWord: snapped };
      const others = blocks().filter(x => x.id !== blockId);
      const wouldConflict = detectConflicts([...others, candidate])
        .some(c => c.blockAId === blockId || c.blockBId === blockId);

      if (!wouldConflict) {
        appStore.dispatch("updateBlock", { id: blockId, startWord: snapped });
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      if (!dragging) {
        // No drag happened — treat as a click to select for editing
        appStore.dispatch("selectBlock", blockId);
      }
      setIsDragging(false);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  return div({
    "data-block-chip": "true",
    class: () => {
      const c = colors();
      return cn(
        "absolute rounded text-[10px] font-medium px-1.5 py-0.5 overflow-hidden z-20",
        "flex items-start gap-1",
        c.bg,
        c.text,
        `border ${c.border}`,
        isSelected() && "ring-2 ring-offset-1 ring-primary z-30",
        hasConflict() && "ring-2 ring-red-500 animate-pulse",
        hasWarning() && !hasConflict() && "ring-2 ring-amber-500",
        block()?.locked ? "opacity-60 cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
        isDragging() && "opacity-80 z-40",
      );
    },
    style: {
      top:    () => `${geometry().top}px`,
      left:   () => `${geometry().left}px`,
      width:  () => `${geometry().width}px`,
      height: () => `${geometry().height}px`,
    },
    nodes: [
      // Reactive label content
      div({ class: "flex items-start gap-1 overflow-hidden", nodes: () => {
        const b = block();
        if (!b) return "";
        const cat = CATEGORY_META[b.category];
        const geo = geometry();
        const badge = Badge({
          variant: "outline",
          class: `text-[8px] px-1 py-0 h-3.5 leading-none font-mono shrink-0 ${cat.badge}`,
          nodes: cat.tag,
        });
        const bpp = bppForCategory(b.category, activeMode());
        const tiles = bpp ? tileCount(b.sizeWords, bpp) : null;
        const tileSuffix = tiles !== null ? `  ${tiles} tiles` : "";
        if (geo.height > 30) {
          return [badge, span({ class: "truncate", nodes: `${b.label}  ${fmtHex(b.startWord, showBytes())}–${fmtHex(b.startWord + b.sizeWords, showBytes())}${tileSuffix}` })];
        }
        return [badge, span({ class: "truncate", nodes: b.label })];
      }}),

      // Status indicators (top-right)
      div({
        class: "absolute top-0.5 right-0.5 flex items-center gap-0.5",
        nodes: [
          div({
            class: () => block()?.transfer === "streamed" ? "text-yellow-500" : "hidden",
            nodes: ZapIcon({ class: "size-3" }),
          }),
          div({
            class: () => block()?.locked ? "" : "hidden",
            nodes: LockIcon({ class: "size-3 opacity-60" }),
          }),
          TooltipProvider({ nodes:
            Tooltip({ nodes: [
              TooltipTrigger({ nodes:
                div({
                  class: () => cn(
                    "w-2 h-2 rounded-full",
                    hasConflict() ? "bg-red-500" : hasWarning() ? "bg-amber-500" : "hidden"
                  ),
                }),
              }),
              TooltipContent({
                side: "left",
                class: "max-w-64 text-[10px] whitespace-pre-wrap",
                nodes: () => tooltipText(),
              }),
            ]}),
          }),
        ],
      }),

      // Resize handle (bottom edge)
      div({
        class: () => cn(
          "absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-white/30",
          block()?.locked && "hidden"
        ),
        on: {
          mousedown: (e: Event) => {
            const me = e as MouseEvent;
            me.stopPropagation();
            me.preventDefault();
            const b = block();
            if (!b || b.locked) return;

            const startMouseY = me.clientY;
            const originalSize = b.sizeWords;

            const resizeAlignStep = Math.max(WORDS_PER_ROW, getAlignmentStep(b.category));
            const onMouseMove = (ev: MouseEvent) => {
              const deltaY = ev.clientY - startMouseY;
              const deltaRows = Math.round(deltaY / ROW_HEIGHT_PX);
              const newSize = originalSize + deltaRows * WORDS_PER_ROW;
              const clamped = Math.max(resizeAlignStep, Math.min(newSize, VRAM_WORDS - b.startWord));
              const snapped = Math.round(clamped / resizeAlignStep) * resizeAlignStep;

              const candidate: VramBlock = { ...b, sizeWords: snapped };
              const others = blocks().filter(x => x.id !== blockId);
              const wouldConflict = detectConflicts([...others, candidate])
                .some(c => c.blockAId === blockId || c.blockBId === blockId);

              if (!wouldConflict) {
                appStore.dispatch("updateBlock", { id: blockId, sizeWords: snapped });
              }
            };

            const onMouseUp = () => {
              document.removeEventListener("mousemove", onMouseMove);
              document.removeEventListener("mouseup", onMouseUp);
            };

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          },
        },
      }),
    ],
    on: {
      click: (e: Event) => {
        e.stopPropagation();
        appStore.dispatch("selectBlock", blockId);
      },
      dblclick: (e: Event) => {
        e.stopPropagation();
        appStore.dispatch("selectBlock", blockId);
      },
      mousedown: onMouseDown,
    },
  });
}

// ── OBJ Page Overlay ──────────────────────────────────────────────────
// Shows the OBSEL-configured OBJ tile page regions as subtle overlays

function ObjPageOverlay(
  pixelsPerWord: () => number,
  range: () => { startWord: number; endWord: number },
  label: string,
) {
  return div({
    class: "absolute pointer-events-none z-10 border border-dashed border-orange-400/60 bg-orange-500/8 dark:bg-orange-400/8 rounded-sm overflow-hidden",
    style: {
      top: () => {
        const r = range();
        const startRow = Math.floor(r.startWord / WORDS_PER_ROW);
        return `${startRow * ROW_HEIGHT_PX}px`;
      },
      left: "0px",
      width: () => `${WORDS_PER_ROW * pixelsPerWord()}px`,
      height: () => {
        const r = range();
        const startRow = Math.floor(r.startWord / WORDS_PER_ROW);
        const endRow = Math.ceil(Math.min(r.endWord, VRAM_WORDS) / WORDS_PER_ROW);
        return `${(endRow - startRow) * ROW_HEIGHT_PX}px`;
      },
    },
    nodes: span({
      class: "absolute top-0.5 right-1 text-[8px] font-mono text-orange-500/70 dark:text-orange-400/70",
      nodes: label,
    }),
  });
}

// ── Ghost Chip (compare scene overlay) ────────────────────────────────

function GhostChip(startWord: number, sizeWords: number, label: string, pixelsPerWord: () => number) {
  const startRow = Math.floor(startWord / WORDS_PER_ROW);
  const endRow = Math.ceil((startWord + sizeWords) / WORDS_PER_ROW);
  const rows = endRow - startRow;

  return div({
    class: "absolute rounded border-2 border-dashed border-violet-500/50 bg-violet-500/10 pointer-events-none z-5 flex items-start px-1.5 py-0.5 text-[9px] text-violet-600 dark:text-violet-300 font-mono overflow-hidden",
    style: {
      top: `${startRow * ROW_HEIGHT_PX + 1}px`,
      left: "0px",
      width: () => `${WORDS_PER_ROW * pixelsPerWord()}px`,
      height: `${rows * ROW_HEIGHT_PX - 2}px`,
    },
    nodes: label,
  });
}
