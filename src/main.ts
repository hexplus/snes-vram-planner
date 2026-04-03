import "./app.css";
import { mount } from "sibujs";
import { App } from "./App";
import { hotkey } from "sibujs/ui";
import { appStore, selectedId, zoom, darkMode, scenes } from "./store";
import { decodeHashToScene } from "./utils/url";

const root = document.getElementById("app");
if (!root) {
  throw new Error('Root element with id "app" not found');
}

// Apply persisted dark mode on startup
if (darkMode()) {
  document.documentElement.classList.add("dark");
}

mount(App, root);

// Load scene from URL hash if present
if (window.location.hash) {
  const scene = decodeHashToScene(window.location.hash);
  if (scene) {
    appStore.dispatch("importBlocks", scene.blocks);
    appStore.dispatch("setMode", scene.activeModeId);
    if (scene.obsel) appStore.dispatch("setObsel", scene.obsel);
    window.location.hash = "";
  }
}

// ── Keyboard Shortcuts ────────────────────────────────────────────────

// Delete selected block
hotkey("Delete", () => {
  const id = selectedId();
  if (id) appStore.dispatch("removeBlock", id);
});

// Escape: deselect
hotkey("Escape", () => appStore.dispatch("selectBlock", null));

// Zoom with +/-
hotkey("+", () => appStore.dispatch("setZoom", zoom() + 0.25), { shift: true });
hotkey("-", () => appStore.dispatch("setZoom", zoom() - 0.25));

// Ctrl+Z / Ctrl+Y: undo/redo
hotkey("z", () => appStore.dispatch("undo"), { ctrl: true });
hotkey("y", () => appStore.dispatch("redo"), { ctrl: true });
// Also support Ctrl+Shift+Z for redo where standard
hotkey("z", () => appStore.dispatch("redo"), { ctrl: true, shift: true });

// Ctrl+1..9: switch to scene by index
for (let i = 1; i <= 9; i++) {
  hotkey(String(i), () => {
    const allScenes = scenes();
    if (i <= allScenes.length) {
      appStore.dispatch("switchScene", allScenes[i - 1].id);
    }
  }, { ctrl: true });
}
