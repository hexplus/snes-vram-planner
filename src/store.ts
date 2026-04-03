import { globalStore } from "sibujs/patterns";
import { persisted } from "sibujs/patterns";
import type { VramBlock, BlockCategory, Scene, ProjectData, ObselConfig } from "./types";
import { SNES_MODES, VRAM_WORDS, DEFAULT_OBSEL, OBJ_PAGE_WORDS, VBLANK_DMA_BYTES_NTSC } from "./constants";
import { detectConflicts, detectAlignmentWarnings, detectObselWarnings } from "./utils/conflicts";
import { generateId } from "./utils/id";

// ─── Helpers ────────────────────────────────────────────────────────

function createScene(name: string, modeId = 1): Scene {
  return {
    id: generateId(),
    name,
    blocks: [],
    activeModeId: modeId,
    obsel: { ...DEFAULT_OBSEL },
  };
}

function getScene(state: AppState): Scene {
  return state.scenes.find(s => s.id === state.activeSceneId)!;
}

function updateActiveScene(state: AppState, patch: Partial<Scene>): Scene[] {
  return state.scenes.map(s =>
    s.id === state.activeSceneId ? { ...s, ...patch } : s
  );
}

// ─── Snapshot & History ─────────────────────────────────────────────

/** Only document-level state that should be undoable */
interface AppSnapshot {
  scenes: Scene[];
  activeSceneId: string;
}

interface AppHistory {
  past: AppSnapshot[];
  future: AppSnapshot[];
}

function snapshot(state: AppState): AppSnapshot {
  return { scenes: state.scenes, activeSceneId: state.activeSceneId };
}

function withHistory(state: AppState, nextState: Partial<AppState>): AppState {
  const past = [...state.history.past, snapshot(state)].slice(-50);
  return { ...state, ...nextState, history: { past, future: [] } };
}

// ─── State Shape ────────────────────────────────────────────────────

interface AppState {
  [key: string]: unknown;
  scenes: Scene[];
  activeSceneId: string;
  selectedBlockId: string | null;
  showGrid: boolean;
  showAddresses: boolean;

  darkMode: boolean;
  zoom: number;
  filterCategory: BlockCategory | "all";
  compareSceneId: string | null;
  showBytes: boolean; // true = show byte addresses, false = word addresses
  history: AppHistory;
}

// ─── Persistence & Migration ────────────────────────────────────────

const [persistedProject, setPersistedProject] = persisted<ProjectData | null>("vram-planner-project", null);
const [persistedDarkMode, setPersistedDarkMode] = persisted<boolean>("vram-planner-dark", false);

function persist(state: AppState) {
  setPersistedProject({
    version: 2,
    scenes: state.scenes,
    activeSceneId: state.activeSceneId,
    darkMode: state.darkMode,
  });
}

function loadInitialState(): AppState {
  const defaultScene = createScene("Scene 1");

  // Try new format first
  const project = persistedProject();
  if (project && project.version === 2 && project.scenes?.length) {
    return {
      scenes: project.scenes.map(s => ({
        ...s,
        obsel: s.obsel ?? { ...DEFAULT_OBSEL },
      })),
      activeSceneId: project.activeSceneId,
      selectedBlockId: null,
      showGrid: true,
      showAddresses: true,

      darkMode: project.darkMode ?? persistedDarkMode(),
      zoom: 1.0,
      filterCategory: "all",
      compareSceneId: null,
      showBytes: true,
      history: { past: [], future: [] },
    };
  }

  // Try legacy format (plain VramBlock[] in old key)
  try {
    const raw = localStorage.getItem("vram-planner-blocks");
    if (raw) {
      const legacyBlocks = JSON.parse(raw) as VramBlock[];
      if (Array.isArray(legacyBlocks) && legacyBlocks.length) {
        const scene: Scene = {
          ...defaultScene,
          blocks: legacyBlocks,
        };
        localStorage.removeItem("vram-planner-blocks");
        return {
          scenes: [scene],
          activeSceneId: scene.id,
          selectedBlockId: null,
          showGrid: true,
          showAddresses: true,
    
          darkMode: persistedDarkMode(),
          zoom: 1.0,
          filterCategory: "all",
          compareSceneId: null,
          showBytes: true,
          history: { past: [], future: [] },
        };
      }
    }
  } catch { /* ignore parse errors */ }

  // Fresh start
  return {
    scenes: [defaultScene],
    activeSceneId: defaultScene.id,
    selectedBlockId: null,
    showGrid: true,
    showAddresses: true,
    showMinimap: true,
    darkMode: persistedDarkMode(),
    zoom: 1.0,
    filterCategory: "all",
    compareSceneId: null,
    showBytes: true,
    history: { past: [], future: [] },
  };
}

// ─── Store ──────────────────────────────────────────────────────────

export const appStore = globalStore({
  state: loadInitialState(),
  actions: {
    // ── Block actions (scoped to active scene) ────────────────────
    addBlock: (state, payload) => {
      const block = payload as VramBlock;
      const scene = getScene(state);
      const scenes = updateActiveScene(state, { blocks: [...scene.blocks, block] });
      const next = withHistory(state, { scenes, selectedBlockId: block.id });
      persist(next);
      return next;
    },
    updateBlock: (state, payload) => {
      const patch = payload as Partial<VramBlock> & { id: string };
      const scene = getScene(state);
      const blocks = scene.blocks.map(b => b.id === patch.id ? { ...b, ...patch } : b);
      const scenes = updateActiveScene(state, { blocks });
      const next = withHistory(state, { scenes });
      persist(next);
      return next;
    },
    removeBlock: (state, payload) => {
      const id = payload as string;
      const scene = getScene(state);
      const blocks = scene.blocks.filter(b => b.id !== id);
      const scenes = updateActiveScene(state, { blocks });
      const next = withHistory(state, {
        scenes,
        selectedBlockId: state.selectedBlockId === id ? null : state.selectedBlockId,
      });
      persist(next);
      return next;
    },
    clearAll: (state) => {
      const scenes = updateActiveScene(state, { blocks: [] });
      const next = withHistory(state, { scenes, selectedBlockId: null });
      persist(next);
      return next;
    },
    importBlocks: (state, payload) => {
      const newBlocks = payload as VramBlock[];
      const scenes = updateActiveScene(state, { blocks: newBlocks });
      const next = withHistory(state, { scenes, selectedBlockId: null });
      persist(next);
      return next;
    },

    // ── Mode ──────────────────────────────────────────────────────
    setMode: (state, payload) => {
      const scenes = updateActiveScene(state, { activeModeId: payload as number });
      const next = withHistory(state, { scenes });
      persist(next);
      return next;
    },

    // ── OBSEL ─────────────────────────────────────────────────────
    setObsel: (state, payload) => {
      const scenes = updateActiveScene(state, { obsel: payload as ObselConfig });
      const next = withHistory(state, { scenes });
      persist(next);
      return next;
    },

    // ── Scene management ──────────────────────────────────────────
    addScene: (state, payload) => {
      const name = (payload as string | undefined) ?? `Scene ${state.scenes.length + 1}`;
      const scene = createScene(name);
      const scenes = [...state.scenes, scene];
      const next = withHistory(state, { scenes, activeSceneId: scene.id, selectedBlockId: null });
      persist(next);
      return next;
    },
    renameScene: (state, payload) => {
      const { id, name } = payload as { id: string; name: string };
      const scenes = state.scenes.map(s => s.id === id ? { ...s, name } : s);
      const next = withHistory(state, { scenes });
      persist(next);
      return next;
    },
    removeScene: (state, payload) => {
      const id = payload as string;
      if (state.scenes.length <= 1) return state;
      const scenes = state.scenes.filter(s => s.id !== id);
      const activeSceneId = state.activeSceneId === id ? scenes[0].id : state.activeSceneId;
      const next = withHistory(state, { scenes, activeSceneId, selectedBlockId: null });
      persist(next);
      return next;
    },
    duplicateScene: (state, payload) => {
      const id = payload as string;
      const source = state.scenes.find(s => s.id === id);
      if (!source) return state;
      const newScene: Scene = {
        ...source,
        id: generateId(),
        name: `${source.name} (copy)`,
        blocks: source.blocks.map(b => ({ ...b, id: generateId() })),
      };
      const idx = state.scenes.findIndex(s => s.id === id);
      const scenes = [...state.scenes.slice(0, idx + 1), newScene, ...state.scenes.slice(idx + 1)];
      const next = withHistory(state, { scenes, activeSceneId: newScene.id, selectedBlockId: null });
      persist(next);
      return next;
    },
    switchScene: (state, payload) => {
      const id = payload as string;
      if (id === state.activeSceneId) return state;
      return { ...state, activeSceneId: id, selectedBlockId: null };
    },

    // ── UI state (not undoable) ───────────────────────────────────
    selectBlock: (state, payload) => ({ ...state, selectedBlockId: payload as string | null }),
    toggleGrid: (state) => ({ ...state, showGrid: !state.showGrid }),
    toggleAddresses: (state) => ({ ...state, showAddresses: !state.showAddresses }),

    toggleDarkMode: (state) => {
      const next = !state.darkMode;
      setPersistedDarkMode(next);
      const s = { ...state, darkMode: next };
      persist(s);
      return s;
    },
    setZoom: (state, payload) => ({ ...state, zoom: Math.min(2, Math.max(0.5, payload as number)) }),
    setFilterCategory: (state, payload) => ({ ...state, filterCategory: payload as BlockCategory | "all" }),
    setCompareScene: (state, payload) => ({ ...state, compareSceneId: payload as string | null }),
    toggleAddressMode: (state) => ({ ...state, showBytes: !state.showBytes }),

    // ── Undo / Redo ───────────────────────────────────────────────
    undo: (state) => {
      const { past, future } = state.history;
      if (!past.length) return state;
      const previous = past[past.length - 1];
      const next = {
        ...state,
        scenes: previous.scenes,
        activeSceneId: previous.activeSceneId,
        history: { past: past.slice(0, -1), future: [snapshot(state), ...future].slice(0, 50) },
      };
      persist(next);
      return next;
    },
    redo: (state) => {
      const { past, future } = state.history;
      if (!future.length) return state;
      const target = future[0];
      const next = {
        ...state,
        scenes: target.scenes,
        activeSceneId: target.activeSceneId,
        history: { past: [...past, snapshot(state)].slice(-50), future: future.slice(1) },
      };
      persist(next);
      return next;
    },
  },
});

// ─── Reactive Selectors ─────────────────────────────────────────────

// Scene selectors
export const scenes        = appStore.select(s => s.scenes);
export const activeSceneId = appStore.select(s => s.activeSceneId);
export const activeScene   = appStore.select(s => s.scenes.find(sc => sc.id === s.activeSceneId)!);

// Active-scene-scoped selectors
export const blocks        = appStore.select(s => getScene(s).blocks);
export const activeModeId  = appStore.select(s => getScene(s).activeModeId);
export const activeMode    = appStore.select(s => SNES_MODES.find(m => m.id === getScene(s).activeModeId)!);
export const activeObsel   = appStore.select(s => getScene(s).obsel);

// OBJ page ranges derived from OBSEL
export const objPage0Range = appStore.select(s => {
  const o = getScene(s).obsel;
  return { startWord: o.nameBaseWord, endWord: o.nameBaseWord + OBJ_PAGE_WORDS };
});
export const objPage1Range = appStore.select(s => {
  const o = getScene(s).obsel;
  const start = o.nameBaseWord + o.gap;
  return { startWord: start, endWord: start + OBJ_PAGE_WORDS };
});

// UI state
export const selectedId    = appStore.select(s => s.selectedBlockId);
export const showGrid      = appStore.select(s => s.showGrid);
export const showAddresses = appStore.select(s => s.showAddresses);

export const darkMode      = appStore.select(s => s.darkMode);
export const zoom          = appStore.select(s => s.zoom);
export const filterCat     = appStore.select(s => s.filterCategory);
export const showBytes     = appStore.select(s => s.showBytes);
export const compareSceneId = appStore.select(s => s.compareSceneId);
export const compareScene   = appStore.select(s => s.compareSceneId ? s.scenes.find(sc => sc.id === s.compareSceneId) ?? null : null);

// Derived: conflict list
export const conflicts     = appStore.select(s => detectConflicts(getScene(s).blocks));

// Derived: alignment warnings
export const alignWarnings = appStore.select(s => detectAlignmentWarnings(getScene(s).blocks));

// Derived: OBSEL warnings
export const obselWarnings = appStore.select(s => {
  const scene = getScene(s);
  return detectObselWarnings(scene.blocks, scene.obsel);
});

// Derived: total VRAM used in words
export const totalUsed     = appStore.select(s =>
  getScene(s).blocks.reduce((sum, b) => sum + b.sizeWords, 0)
);

// Derived: % VRAM used
export const usagePercent  = appStore.select(s =>
  Math.min(100, (getScene(s).blocks.reduce((sum, b) => sum + b.sizeWords, 0) / VRAM_WORDS) * 100)
);

// Derived: selected block object or null
export const selectedBlock = appStore.select(s =>
  getScene(s).blocks.find(b => b.id === s.selectedBlockId) ?? null
);

// Derived: DMA budget
export const dmaBudgetUsed = appStore.select(s =>
  getScene(s).blocks.filter(b => b.transfer === "streamed").reduce((sum, b) => sum + b.sizeWords * 2, 0)
);
export const dmaBudgetPercent = appStore.select(s => {
  const used = getScene(s).blocks.filter(b => b.transfer === "streamed").reduce((sum, b) => sum + b.sizeWords * 2, 0);
  return Math.min(100, (used / VBLANK_DMA_BYTES_NTSC) * 100);
});

export const canUndo = appStore.select(s => (s.history?.past?.length ?? 0) > 0);
export const canRedo = appStore.select(s => (s.history?.future?.length ?? 0) > 0);
