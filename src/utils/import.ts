import { toast } from "sibujs-ui";
import { appStore } from "../store";
import type { VramBlock, ProjectData, Scene } from "../types";
import { DEFAULT_OBSEL } from "../constants";

function validateBlocks(raw: unknown): VramBlock[] {
  if (!Array.isArray(raw)) throw new Error("Expected a JSON array");
  return raw.map((item, i) => {
    if (typeof item !== "object" || item === null) throw new Error(`Item ${i}: not an object`);
    const b = item as Record<string, unknown>;
    if (typeof b.id        !== "string")  throw new Error(`Item ${i}: missing id`);
    if (typeof b.label     !== "string")  throw new Error(`Item ${i}: missing label`);
    if (typeof b.startWord !== "number")  throw new Error(`Item ${i}: startWord must be a number`);
    if (typeof b.sizeWords !== "number")  throw new Error(`Item ${i}: sizeWords must be a number`);
    return b as unknown as VramBlock;
  });
}

function isProjectData(data: unknown): data is ProjectData {
  return typeof data === "object" && data !== null &&
    (data as Record<string, unknown>).version === 2 &&
    Array.isArray((data as Record<string, unknown>).scenes);
}

function isScene(data: unknown): data is Scene {
  return typeof data === "object" && data !== null &&
    typeof (data as Record<string, unknown>).name === "string" &&
    Array.isArray((data as Record<string, unknown>).blocks);
}

export function importFromJson(jsonText: string) {
  try {
    const parsed = JSON.parse(jsonText);

    // Full project import (v2)
    if (isProjectData(parsed)) {
      for (const scene of parsed.scenes) {
        scene.obsel = scene.obsel ?? { ...DEFAULT_OBSEL };
        appStore.dispatch("addScene", scene.name);
        appStore.dispatch("importBlocks", scene.blocks);
        if (scene.activeModeId != null) {
          appStore.dispatch("setMode", scene.activeModeId);
        }
        if (scene.obsel) {
          appStore.dispatch("setObsel", scene.obsel);
        }
      }
      toast.success(`Imported project with ${parsed.scenes.length} scene${parsed.scenes.length > 1 ? "s" : ""}`);
      return;
    }

    // Single scene import
    if (isScene(parsed)) {
      appStore.dispatch("importBlocks", parsed.blocks);
      if (parsed.activeModeId != null) {
        appStore.dispatch("setMode", parsed.activeModeId);
      }
      if (parsed.obsel) {
        appStore.dispatch("setObsel", parsed.obsel);
      }
      toast.success(`Imported scene "${parsed.name}" with ${parsed.blocks.length} block${parsed.blocks.length > 1 ? "s" : ""}`);
      return;
    }

    // Legacy: plain block array
    const validated = validateBlocks(parsed);
    appStore.dispatch("importBlocks", validated);
    toast.success(`Imported ${validated.length} block${validated.length > 1 ? "s" : ""}`);
  } catch (err) {
    toast.error(`Import failed: ${(err as Error).message}`);
  }
}
