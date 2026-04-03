import { describe, it, expect } from "vitest";
import { getAlignmentStep } from "./alignment";

describe("getAlignmentStep", () => {
  it("returns 4096 for bg-tiles (8KB)", () => {
    expect(getAlignmentStep("bg-tiles")).toBe(4096);
  });

  it("returns 1024 for bg-map (2KB)", () => {
    expect(getAlignmentStep("bg-map")).toBe(1024);
  });

  it("returns 4096 for obj-tiles (8KB)", () => {
    expect(getAlignmentStep("obj-tiles")).toBe(4096);
  });

  it("returns 32768 for mode7-tiles (full VRAM)", () => {
    expect(getAlignmentStep("mode7-tiles")).toBe(32768);
  });

  it("returns 256 (row) for free blocks", () => {
    expect(getAlignmentStep("free")).toBe(256);
  });

  it("returns 256 (row) for color-math", () => {
    expect(getAlignmentStep("color-math")).toBe(256);
  });
});
