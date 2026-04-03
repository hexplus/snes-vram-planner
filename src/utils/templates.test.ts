import { describe, it, expect } from "vitest";
import { getTemplatesForMode } from "./templates";
import { SNES_MODES, DEFAULT_OBSEL } from "../constants";

describe("getTemplatesForMode", () => {
  it("generates templates for Mode 1 (3 BGs + OBJ)", () => {
    const templates = getTemplatesForMode(SNES_MODES[1], DEFAULT_OBSEL);
    const labels = templates.map(t => t.label);
    expect(labels).toContain("BG1 Tiles");
    expect(labels).toContain("BG2 Tiles");
    expect(labels).toContain("BG3 Tiles");
    expect(labels).toContain("BG1 Map");
    expect(labels).toContain("OBJ Tiles");
  });

  it("generates templates for Mode 0 (4 BGs)", () => {
    const templates = getTemplatesForMode(SNES_MODES[0], DEFAULT_OBSEL);
    const tileLabels = templates.filter(t => t.category === "bg-tiles").map(t => t.label);
    expect(tileLabels).toHaveLength(4);
    expect(tileLabels).toContain("BG4 Tiles");
  });

  it("generates Mode 7 template", () => {
    const templates = getTemplatesForMode(SNES_MODES[7], DEFAULT_OBSEL);
    expect(templates.some(t => t.category === "mode7-tiles")).toBe(true);
  });

  it("includes OBJ tiles for modes with OBJ support", () => {
    for (const mode of SNES_MODES) {
      const templates = getTemplatesForMode(mode, DEFAULT_OBSEL);
      if (mode.objSupported) {
        expect(templates.some(t => t.category === "obj-tiles")).toBe(true);
      }
    }
  });

  it("all templates have valid categories and colors", () => {
    for (const mode of SNES_MODES) {
      const templates = getTemplatesForMode(mode, DEFAULT_OBSEL);
      for (const t of templates) {
        expect(t.sizeWords).toBeGreaterThan(0);
        expect(t.label.length).toBeGreaterThan(0);
        expect(t.color.length).toBeGreaterThan(0);
      }
    }
  });
});
