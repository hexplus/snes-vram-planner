import { toast } from "sibujs-ui";
import { appStore } from "../store";
import type { VramBlock } from "../types";

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

export function importFromJson(jsonText: string) {
  try {
    const parsed   = JSON.parse(jsonText);
    const validated = validateBlocks(parsed);
    appStore.dispatch("importBlocks", validated);
    toast.success(`Imported ${validated.length} block${validated.length > 1 ? "s" : ""}`);
  } catch (err) {
    toast.error(`Import failed: ${(err as Error).message}`);
  }
}
