import "./app.css";
import { mount } from "sibujs";
import { App } from "./App";
import { hotkey } from "sibujs/ui";
import { appStore, selectedId, zoom, darkMode } from "./store";

const root = document.getElementById("app");
if (!root) {
  throw new Error('Root element with id "app" not found');
}

// Apply persisted dark mode on startup
if (darkMode()) {
  document.documentElement.classList.add("dark");
}

mount(App, root);

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
