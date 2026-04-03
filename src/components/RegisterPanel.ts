import { div, span } from "sibujs";
import { Button, Badge, Separator, ClipboardCopyIcon } from "sibujs-ui";
import { toast } from "sibujs-ui";
import { activeMode, activeObsel, blocks } from "../store";
import { computePpuRegisters, formatRegistersAsAsm } from "../utils/registers";

function hex(v: number, pad = 2): string {
  return "$" + v.toString(16).toUpperCase().padStart(pad, "0");
}

function RegRow(label: string, addr: string, value: () => number) {
  return div({ class: "flex items-center justify-between py-1", nodes: [
    div({ class: "flex items-center gap-2", nodes: [
      span({ class: "font-medium text-xs", nodes: label }),
      span({ class: "text-[10px] text-muted-foreground font-mono", nodes: addr }),
    ]}),
    Badge({ variant: "secondary", class: "font-mono text-xs", nodes: () => hex(value()) }),
  ]});
}

export function RegisterPanel() {
  const regs = () => computePpuRegisters(blocks(), activeMode(), activeObsel());

  return div({ class: "px-4 py-3 flex flex-col gap-2", nodes: [
    div({ class: "flex items-center justify-between", nodes: [
      span({ class: "text-sm font-medium", nodes: "PPU Registers" }),
      Button({
        size: "sm", variant: "outline",
        class: "h-7 text-xs",
        nodes: [ClipboardCopyIcon({ class: "size-3 mr-1" }), "Copy ASM"],
        on: { click: () => {
          const asm = formatRegistersAsAsm(regs(), activeMode());
          navigator.clipboard.writeText(asm);
          toast.success("Registers copied to clipboard");
        }},
      }),
    ]}),

    span({ class: "text-[10px] text-muted-foreground", nodes: "Derived from current block layout" }),

    Separator({}),

    // BG Screen registers
    div({ class: "flex flex-col", nodes: () => {
      const mode = activeMode();
      const r = regs();
      const rows = [];
      const bgscVals = [r.bg1sc, r.bg2sc, r.bg3sc, r.bg4sc];
      for (let i = 0; i < mode.bgCount; i++) {
        const idx = i;
        rows.push(RegRow(`BG${i + 1}SC`, `$210${7 + i}`, () => bgscVals[idx]));
      }
      return rows;
    }}),

    Separator({}),

    // NBA registers
    RegRow("BG12NBA", "$210B", () => regs().bg12nba),
    div({
      class: () => activeMode().bgCount > 2 ? "" : "hidden",
      nodes: RegRow("BG34NBA", "$210C", () => regs().bg34nba),
    }),

    Separator({}),

    // OBSEL
    RegRow("OBSEL", "$2101", () => regs().obsel),

    Separator({}),

    // Bitfield breakdown
    div({ class: "text-[10px] font-mono text-muted-foreground flex flex-col gap-1 mt-1", nodes: () => {
      const r = regs();
      const mode = activeMode();
      const lines = [];

      for (let i = 0; i < mode.bgCount; i++) {
        const sc = [r.bg1sc, r.bg2sc, r.bg3sc, r.bg4sc][i];
        const base = (sc & 0xFC) << 8;
        const size = sc & 0x03;
        const sizeLabels = ["32×32", "64×32", "32×64", "64×64"];
        lines.push(div({ nodes: `BG${i + 1}: map@${hex(base, 4)} ${sizeLabels[size]}` }));
      }

      const bg1chr = (r.bg12nba & 0x0F) << 12;
      const bg2chr = (r.bg12nba >> 4) << 12;
      lines.push(div({ nodes: `BG1 chr@${hex(bg1chr, 4)}, BG2 chr@${hex(bg2chr, 4)}` }));

      if (mode.bgCount > 2) {
        const bg3chr = (r.bg34nba & 0x0F) << 12;
        const bg4chr = (r.bg34nba >> 4) << 12;
        lines.push(div({ nodes: `BG3 chr@${hex(bg3chr, 4)}${mode.bgCount > 3 ? `, BG4 chr@${hex(bg4chr, 4)}` : ""}` }));
      }

      return lines;
    }}),
  ]});
}
