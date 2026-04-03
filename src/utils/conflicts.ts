import type { VramBlock, Conflict, AlignmentWarning, ObselConfig, ObselWarning, BlockCategory } from "../types";
import { OBJ_PAGE_WORDS, VRAM_WORDS } from "../constants";

function fmtH(words: number): string {
  return "$" + (words * 2).toString(16).toUpperCase().padStart(4, "0");
}

const CAT_NAMES: Record<BlockCategory, string> = {
  "bg-tiles": "tile graphics", "bg-map": "tilemap data", "obj-tiles": "sprite tiles",
  "mode7-tiles": "Mode 7 data", "color-math": "color math data", "hdma": "HDMA table data", "free": "free space",
};

function explainConflict(a: VramBlock, b: VramBlock, overlapStart: number, overlapEnd: number): string {
  const bytes = (overlapEnd - overlapStart) * 2;
  const range = `${fmtH(overlapStart)}–${fmtH(overlapEnd)}`;
  const aDesc = CAT_NAMES[a.category];
  const bDesc = CAT_NAMES[b.category];

  if (a.category === b.category) {
    return `"${a.label}" and "${b.label}" share ${bytes} bytes of ${aDesc} space at ${range} — whichever is loaded last will overwrite the other.`;
  }
  return `"${a.label}" (${aDesc}) and "${b.label}" (${bDesc}) overlap by ${bytes} bytes at ${range} — the PPU will read corrupted data for both.`;
}

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
        result.push({
          blockAId: a.id, blockBId: b.id, overlapStart, overlapEnd,
          explanation: explainConflict(a, b, overlapStart, overlapEnd),
        });
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

// ─── OBSEL Warnings ─────────────────────────────────────────────────

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Detect OBSEL-related warnings:
 * - OBJ blocks placed outside either OBSEL page
 * - Page 1 exceeding VRAM boundary
 */
export function detectObselWarnings(blocks: VramBlock[], obsel: ObselConfig): ObselWarning[] {
  const warnings: ObselWarning[] = [];

  const p0Start = obsel.nameBaseWord;
  const p0End = p0Start + OBJ_PAGE_WORDS;
  const p1Start = obsel.nameBaseWord + obsel.gap;
  const p1End = p1Start + OBJ_PAGE_WORDS;

  // Check page overflow
  if (p1End > VRAM_WORDS) {
    warnings.push({
      type: "page-overflow",
      message: `OBJ Page 1 extends beyond VRAM (ends at $${(p1End * 2).toString(16).toUpperCase()}, max $10000)`,
    });
  }
  if (p0End > VRAM_WORDS) {
    warnings.push({
      type: "page-overflow",
      message: `OBJ Page 0 extends beyond VRAM (ends at $${(p0End * 2).toString(16).toUpperCase()}, max $10000)`,
    });
  }

  for (const b of blocks) {
    const bEnd = b.startWord + b.sizeWords;

    if (b.category === "obj-tiles") {
      // OBJ block must be fully within page 0 or page 1
      const inPage0 = b.startWord >= p0Start && bEnd <= p0End;
      const inPage1 = b.startWord >= p1Start && bEnd <= p1End;
      if (!inPage0 && !inPage1) {
        warnings.push({
          type: "obj-outside-page",
          blockId: b.id,
          message: `"${b.label}" is not within either OBJ page (Page 0: $${(p0Start * 2).toString(16).toUpperCase()}–$${(p0End * 2).toString(16).toUpperCase()}, Page 1: $${(p1Start * 2).toString(16).toUpperCase()}–$${(p1End * 2).toString(16).toUpperCase()})`,
        });
      }
    } else {
      // Non-OBJ block overlapping an OBSEL page (informational)
      const hitsPage0 = rangesOverlap(b.startWord, bEnd, p0Start, p0End);
      const hitsPage1 = rangesOverlap(b.startWord, bEnd, p1Start, p1End);
      if (hitsPage0 || hitsPage1) {
        const pages = [hitsPage0 && "Page 0", hitsPage1 && "Page 1"].filter(Boolean).join(" & ");
        warnings.push({
          type: "non-obj-in-page",
          blockId: b.id,
          message: `"${b.label}" overlaps OBJ ${pages} — shared VRAM may cause tile corruption`,
        });
      }
    }
  }

  return warnings;
}
