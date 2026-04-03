import {
  div, span, signal, derived, ref, each
} from "sibujs";
import { resize } from "sibujs/browser";
import { cn } from "sibujs-ui";
import {
  blocks, conflicts, alignWarnings, showGrid, showAddresses, zoom,
  selectedId, filterCat, appStore
} from "../store";
import { blockHasConflict, blockHasWarning, detectConflicts } from "../utils/conflicts";
import { fmtHex } from "../utils/format";
import { WORDS_PER_ROW, TOTAL_ROWS, ROW_HEIGHT_PX, BLOCK_COLORS, VRAM_WORDS } from "../constants";
import { generateId } from "../utils/id";
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
          nodes: fmtHex(rowStartWord),
        });
        rows.push(addrLabel);
      }

      rows.push(rowLine);
    }
    return rows;
  }

  // ── Click handler for the grid background ─────────────────────────
  function onGridClick(e: Event) {
    const me = e as MouseEvent;
    // Ignore clicks on block chips
    if ((me.target as HTMLElement).closest("[data-block-chip]")) return;
    appStore.dispatch("selectBlock", null);
  }

  function onGridDblClick(e: Event) {
    const me = e as MouseEvent;
    if ((me.target as HTMLElement).closest("[data-block-chip]")) return;

    const gridEl = containerRef.current;
    if (!gridEl) return;
    const rect = gridEl.getBoundingClientRect();
    const scrollTop = gridEl.scrollTop;

    const yInGrid = me.clientY - rect.top + scrollTop;
    const xInGrid = me.clientX - rect.left;

    const row = Math.floor(yInGrid / ROW_HEIGHT_PX);
    const ppw = pixelsPerWord();
    const col = ppw > 0 ? Math.floor(xInGrid / ppw) : 0;
    const wordAddr = row * WORDS_PER_ROW + Math.max(0, Math.min(col, WORDS_PER_ROW - 1));

    // Snap to 256-word (row) boundaries for clean placement
    const snapped = Math.floor(wordAddr / WORDS_PER_ROW) * WORDS_PER_ROW;

    // Check if this position is free
    const candidate: VramBlock = {
      id: "__candidate__", label: "", startWord: snapped, sizeWords: 256,
      category: "bg-tiles", color: "gray", locked: false, note: "",
    };
    const wouldConflict = detectConflicts([...blocks(), candidate])
      .some(c => c.blockAId === "__candidate__" || c.blockBId === "__candidate__");

    if (wouldConflict) return; // Don't add over existing blocks

    appStore.dispatch("addBlock", {
      id: generateId(),
      label: "New Block",
      startWord: Math.min(snapped, VRAM_WORDS - 256),
      sizeWords: 256,
      category: "bg-tiles" as const,
      color: "gray" as const,
      locked: false,
      note: "",
    });
  }

  // ── Filtered blocks ───────────────────────────────────────────────
  const filteredBlocks = derived(() =>
    blocks().filter(b => filterCat() === "all" || b.category === filterCat())
  );

  // ── Main grid container ───────────────────────────────────────────
  const grid = div({
    ref: containerRef,
    class: "relative w-full overflow-x-hidden overflow-y-auto font-mono",
    style: { height: "100%" },
    on: {
      click: onGridClick,
      dblclick: onGridDblClick,
    },
  }) as HTMLElement;

  // Inner container with fixed height for scrolling
  const inner = div({
    class: "relative w-full",
    style: { height: `${gridHeight}px`, minHeight: `${gridHeight}px` },
  });

  // Add row lines
  const rowLines = RowLines();
  for (const el of rowLines) {
    inner.appendChild(el as Node);
  }

  // Render block chips absolutely positioned within the grid
  const blockChips = each(
    filteredBlocks,
    (block) => BlockChip(block.id, pixelsPerWord),
    { key: b => b.id }
  );
  inner.appendChild(blockChips as Node);

  grid.appendChild(inner as Node);
  return grid;
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

      const deltaY = ev.clientY - dragStartMouseY();
      const deltaRows = Math.round(deltaY / ROW_HEIGHT_PX);
      const newWord = dragOriginalWord() + deltaRows * WORDS_PER_ROW;
      const clamped = Math.max(0, Math.min(newWord, VRAM_WORDS - b.sizeWords));
      const snapped = Math.round(clamped / WORDS_PER_ROW) * WORDS_PER_ROW;

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

  const chip = div({
    "data-block-chip": "true",
    class: () => {
      const c = colors();
      return cn(
        "absolute rounded text-[10px] font-medium px-1.5 py-0.5 overflow-hidden whitespace-nowrap z-20",
        "flex items-start",
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
    nodes: () => {
      const b = block();
      if (!b) return "";
      const geo = geometry();
      // Show more info when block is tall enough
      if (geo.height > 30) {
        return `${b.label}  ${fmtHex(b.startWord)}–${fmtHex(b.startWord + b.sizeWords)}`;
      }
      return b.label;
    },
    on: {
      click: (e: Event) => {
        e.stopPropagation();
        appStore.dispatch("selectBlock", blockId);
      },
      dblclick: (e: Event) => {
        e.stopPropagation();
        // Double-click selects for editing
        appStore.dispatch("selectBlock", blockId);
      },
      mousedown: onMouseDown,
    },
  }) as HTMLElement;

  // Conflict/warning badge
  const badge = div({
    class: () => cn(
      "absolute top-1 right-1 w-2 h-2 rounded-full",
      hasConflict() ? "bg-red-500" : hasWarning() ? "bg-amber-500" : "hidden"
    ),
  });
  chip.appendChild(badge as Node);

  // Resize handle (bottom edge)
  const resizeHandle = div({
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

        const onMouseMove = (ev: MouseEvent) => {
          const deltaY = ev.clientY - startMouseY;
          const deltaRows = Math.round(deltaY / ROW_HEIGHT_PX);
          const newSize = originalSize + deltaRows * WORDS_PER_ROW;
          const clamped = Math.max(WORDS_PER_ROW, Math.min(newSize, VRAM_WORDS - b.startWord));
          // Snap to row boundaries
          const snapped = Math.round(clamped / WORDS_PER_ROW) * WORDS_PER_ROW;

          // Check for conflicts
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
  });
  chip.appendChild(resizeHandle as Node);

  return chip;
}
