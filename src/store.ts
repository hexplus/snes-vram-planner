import { globalStore } from "sibujs/patterns";
import { persisted } from "sibujs/patterns";
import type { VramBlock, BlockCategory } from "./types";
import { SNES_MODES, VRAM_WORDS } from "./constants";
import { detectConflicts, detectAlignmentWarnings } from "./utils/conflicts";

/** Only document-level state that should be undoable */
interface AppSnapshot {
  blocks: VramBlock[];
  activeModeId: number;
}

interface AppHistory {
  past: AppSnapshot[];
  future: AppSnapshot[];
}

interface AppState {
  [key: string]: unknown;
  blocks: VramBlock[];
  selectedBlockId: string | null;
  activeModeId: number;
  showGrid: boolean;
  showAddresses: boolean;
  showMinimap: boolean;
  darkMode: boolean;
  zoom: number;          // 1.0 = default, 0.5–2.0 range
  filterCategory: BlockCategory | "all";
  history: AppHistory;
}

const initialState: AppState = {
  blocks: [],
  selectedBlockId: null,
  activeModeId: 1,       // Mode 1 is the most common starting point
  showGrid: true,
  showAddresses: true,
  showMinimap: true,
  darkMode: false,
  zoom: 1.0,
  filterCategory: "all",
  history: { past: [], future: [] },
};

// Persist layout across page reloads using localStorage
const [persistedBlocks, setPersistedBlocks] = persisted<VramBlock[]>("vram-planner-blocks", []);
const [persistedDarkMode, setPersistedDarkMode] = persisted<boolean>("vram-planner-dark", false);

function snapshot(state: AppState): AppSnapshot {
  return {
    blocks: state.blocks,
    activeModeId: state.activeModeId,
  };
}

function withHistory(state: AppState, nextState: Partial<AppState>): AppState {
  const past = [...state.history.past, snapshot(state)].slice(-100);
  return {
    ...state,
    ...nextState,
    history: { past, future: [] },
  };
}

export const appStore = globalStore({
  state: { ...initialState, blocks: persistedBlocks(), darkMode: persistedDarkMode() },
  actions: {
    addBlock: (state, payload) => {
      const block = payload as VramBlock;
      const updated = [...state.blocks, block];
      setPersistedBlocks(updated);
      return withHistory(state, { blocks: updated, selectedBlockId: block.id });
    },
    updateBlock: (state, payload) => {
      const patch = payload as Partial<VramBlock> & { id: string };
      const updated = state.blocks.map(b => b.id === patch.id ? { ...b, ...patch } : b);
      setPersistedBlocks(updated);
      return withHistory(state, { blocks: updated });
    },
    removeBlock: (state, payload) => {
      const id = payload as string;
      const updated = state.blocks.filter(b => b.id !== id);
      setPersistedBlocks(updated);
      return withHistory(state, {
        blocks: updated,
        selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
      });
    },
    selectBlock: (state, payload) => ({ ...state, selectedBlockId: payload as string | null }),
    setMode: (state, payload) => withHistory(state, { activeModeId: payload as number }),
    toggleGrid: (state) => ({ ...state, showGrid: !state.showGrid }),
    toggleAddresses: (state) => ({ ...state, showAddresses: !state.showAddresses }),
    toggleMinimap: (state) => ({ ...state, showMinimap: !state.showMinimap }),
    toggleDarkMode: (state) => {
      const next = !state.darkMode;
      setPersistedDarkMode(next);
      return { ...state, darkMode: next };
    },
    setZoom: (state, payload) => ({ ...state, zoom: Math.min(2, Math.max(0.5, payload as number)) }),
    setFilterCategory: (state, payload) => ({ ...state, filterCategory: payload as BlockCategory | "all" }),
    clearAll: (state) => {
      setPersistedBlocks([]);
      return withHistory(state, { blocks: [] as VramBlock[], selectedBlockId: null });
    },
    importBlocks: (state, payload) => {
      const newBlocks = payload as VramBlock[];
      setPersistedBlocks(newBlocks);
      return withHistory(state, { blocks: newBlocks, selectedBlockId: null });
    },
    undo: (state) => {
      const { past, future } = state.history;
      if (!past.length) return state;
      const previous = past[past.length - 1];
      setPersistedBlocks(previous.blocks);
      return {
        ...state,
        blocks: previous.blocks,
        activeModeId: previous.activeModeId,
        history: {
          past: past.slice(0, -1),
          future: [snapshot(state), ...future].slice(0, 100),
        },
      };
    },
    redo: (state) => {
      const { past, future } = state.history;
      if (!future.length) return state;
      const next = future[0];
      setPersistedBlocks(next.blocks);
      return {
        ...state,
        blocks: next.blocks,
        activeModeId: next.activeModeId,
        history: {
          past: [...past, snapshot(state)].slice(-100),
          future: future.slice(1),
        },
      };
    },
  },
});

// ─── Reactive Selectors ──────────────────────────────────────────────

export const blocks        = appStore.select(s => s.blocks);
export const selectedId    = appStore.select(s => s.selectedBlockId);
export const activeModeId  = appStore.select(s => s.activeModeId);
export const activeMode    = appStore.select(s => SNES_MODES.find(m => m.id === s.activeModeId)!);
export const showGrid      = appStore.select(s => s.showGrid);
export const showAddresses = appStore.select(s => s.showAddresses);
export const showMinimap   = appStore.select(s => s.showMinimap);
export const darkMode      = appStore.select(s => s.darkMode);
export const zoom          = appStore.select(s => s.zoom);
export const filterCat     = appStore.select(s => s.filterCategory);

// Derived: conflict list (recomputes whenever blocks change)
export const conflicts     = appStore.select(s => detectConflicts(s.blocks));

// Derived: alignment warnings (PPU register requirements)
export const alignWarnings = appStore.select(s => detectAlignmentWarnings(s.blocks));

// Derived: total VRAM used in words
export const totalUsed     = appStore.select(s =>
  s.blocks.reduce((sum, b) => sum + b.sizeWords, 0)
);

// Derived: % VRAM used
export const usagePercent  = appStore.select(s =>
  Math.min(100, (s.blocks.reduce((sum, b) => sum + b.sizeWords, 0) / VRAM_WORDS) * 100)
);

// Derived: selected block object or null
export const selectedBlock = appStore.select(s =>
  s.blocks.find(b => b.id === s.selectedBlockId) ?? null
);

export const canUndo = appStore.select(s => (s.history?.past?.length ?? 0) > 0);
export const canRedo = appStore.select(s => (s.history?.future?.length ?? 0) > 0);
