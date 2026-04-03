import type { VramBlock, Conflict, AlignmentWarning } from "../types";

export function detectConflicts(blocks: VramBlock[]): Conflict[] {
  const result: Conflict[] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      const aEnd = a.startWord + a.sizeWords;
      const bEnd = b.startWord + b.sizeWords;
      const overlapStart = Math.max(a.startWord, b.startWord);
      const overlapEnd   = Math.min(aEnd, bEnd);
      if (overlapStart < overlapEnd) {
        result.push({ blockAId: a.id, blockBId: b.id, overlapStart, overlapEnd });
      }
    }
  }
  return result;
}

export function blockHasConflict(id: string, conflicts: Conflict[]): boolean {
  return conflicts.some(c => c.blockAId === id || c.blockBId === id);
}

/**
 * Check SNES PPU alignment requirements for VRAM blocks.
 * - bg-tiles: BGxNBA requires 8KB ($2000 byte) alignment
 * - bg-map: BGxSC requires 2KB ($0800 byte) alignment
 * - obj-tiles: OBSEL requires 8KB ($2000 byte) alignment
 * - mode7-tiles: must start at $0000
 */
export function detectAlignmentWarnings(blocks: VramBlock[]): AlignmentWarning[] {
  const warnings: AlignmentWarning[] = [];

  for (const b of blocks) {
    const byteAddr = b.startWord * 2;

    if (b.category === "bg-tiles") {
      if ((byteAddr & 0x1FFF) !== 0) {
        warnings.push({
          blockId: b.id,
          message: `"${b.label}" is not 8KB-aligned — BGxNBA requires $2000 boundaries`,
          requiredAlign: 0x2000,
          actualByte: byteAddr,
        });
      }
    } else if (b.category === "bg-map") {
      if ((byteAddr & 0x07FF) !== 0) {
        warnings.push({
          blockId: b.id,
          message: `"${b.label}" is not 2KB-aligned — BGxSC requires $0800 boundaries`,
          requiredAlign: 0x0800,
          actualByte: byteAddr,
        });
      }
    } else if (b.category === "obj-tiles") {
      if ((byteAddr & 0x1FFF) !== 0) {
        warnings.push({
          blockId: b.id,
          message: `"${b.label}" is not 8KB-aligned — OBSEL requires $2000 boundaries`,
          requiredAlign: 0x2000,
          actualByte: byteAddr,
        });
      }
    } else if (b.category === "mode7-tiles") {
      if (byteAddr !== 0) {
        warnings.push({
          blockId: b.id,
          message: `"${b.label}" must start at $0000 — Mode 7 tile data is fixed at VRAM base`,
          requiredAlign: 0x10000, // entire VRAM
          actualByte: byteAddr,
        });
      }
    }
  }

  return warnings;
}

export function blockHasWarning(id: string, warnings: AlignmentWarning[]): boolean {
  return warnings.some(w => w.blockId === id);
}
