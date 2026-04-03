import { describe, it, expect } from "vitest";
import { encodeSceneToHash, decodeHashToScene } from "./url";
import type { Scene } from "../types";

const testScene: Scene = {
  id: "test-scene",
  name: "Test Scene",
  activeModeId: 1,
  obsel: { nameBaseWord: 0x4000, gap: 0x1000 },
  blocks: [
    { id: "b1", label: "BG1 Tiles", startWord: 0, sizeWords: 4096, category: "bg-tiles", color: "blue", locked: false, note: "test" },
  ],
};

describe("encodeSceneToHash", () => {
  it("returns a non-empty base64 string", () => {
    const hash = encodeSceneToHash(testScene);
    expect(hash.length).toBeGreaterThan(0);
    // Should be valid base64
    expect(() => atob(hash)).not.toThrow();
  });
});

describe("decodeHashToScene", () => {
  it("round-trips a scene", () => {
    const hash = encodeSceneToHash(testScene);
    const decoded = decodeHashToScene(hash);
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe("Test Scene");
    expect(decoded!.activeModeId).toBe(1);
    expect(decoded!.blocks).toHaveLength(1);
    expect(decoded!.blocks[0].label).toBe("BG1 Tiles");
    expect(decoded!.blocks[0].startWord).toBe(0);
    expect(decoded!.blocks[0].sizeWords).toBe(4096);
  });

  it("handles # prefix", () => {
    const hash = "#" + encodeSceneToHash(testScene);
    const decoded = decodeHashToScene(hash);
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe("Test Scene");
  });

  it("returns null for empty hash", () => {
    expect(decodeHashToScene("")).toBeNull();
    expect(decodeHashToScene("#")).toBeNull();
  });

  it("returns null for invalid base64", () => {
    expect(decodeHashToScene("not-valid-!!!")).toBeNull();
  });

  it("preserves locked and note fields", () => {
    const scene: Scene = {
      ...testScene,
      blocks: [{ ...testScene.blocks[0], locked: true, note: "important" }],
    };
    const decoded = decodeHashToScene(encodeSceneToHash(scene));
    expect(decoded!.blocks[0].locked).toBe(true);
    expect(decoded!.blocks[0].note).toBe("important");
  });
});
