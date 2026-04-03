import type { Scene } from "../types";
import { DEFAULT_OBSEL } from "../constants";
import { generateId } from "./id";

export function encodeSceneToHash(scene: Scene): string {
  const compact = {
    n: scene.name,
    m: scene.activeModeId,
    o: scene.obsel,
    b: scene.blocks.map(b => ({
      l: b.label,
      s: b.startWord,
      z: b.sizeWords,
      c: b.category,
      k: b.color,
      lk: b.locked || undefined,
      ms: b.mapSize || undefined,
      tr: b.transfer || undefined,
      nt: b.note || undefined,
    })),
  };
  return btoa(JSON.stringify(compact));
}

export function decodeHashToScene(hash: string): Scene | null {
  try {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw) return null;
    const compact = JSON.parse(atob(raw));
    if (!compact.b || !Array.isArray(compact.b)) return null;

    return {
      id: generateId(),
      name: compact.n ?? "Shared Layout",
      activeModeId: compact.m ?? 1,
      obsel: compact.o ?? { ...DEFAULT_OBSEL },
      blocks: compact.b.map((b: Record<string, unknown>) => ({
        id: generateId(),
        label: b.l as string ?? "Block",
        startWord: b.s as number ?? 0,
        sizeWords: b.z as number ?? 256,
        category: b.c as string ?? "bg-tiles",
        color: b.k as string ?? "gray",
        locked: !!b.lk,
        note: (b.nt as string) ?? "",
        mapSize: b.ms as string | undefined,
        transfer: b.tr as string | undefined,
      })),
    } as Scene;
  } catch {
    return null;
  }
}
