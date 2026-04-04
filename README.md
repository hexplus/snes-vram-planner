# SNES VRAM Planner

Visual VRAM layout planner for the Super Nintendo. Plan and arrange BG tiles, tilemaps, OBJ tiles, and Mode 7 data across the SNES's 64 KB VRAM with a drag-and-drop grid editor. Supports all 8 PPU modes, multi-scene workflows, full OBSEL modeling, live register output, and export to multiple assembler formats.

## Features

### Toolbar
- PPU mode selector (Mode 0 through Mode 7)
- Add Block dialog with category, color, start address, and size fields
- Grid lines, address labels, and byte/word address toggles
- Zoom controls (+/-)
- Dark mode toggle (sun/moon icon)
- Preset layouts (Mode 0, Mode 1, Mode 7)
- Import JSON and Export (ca65, asar, WLA-DX, scene JSON, project JSON)
- Share button: encode the current scene in the URL hash and copy to clipboard
- Clear All with confirmation dialog
- Live status badges: conflict count, alignment warnings, OBSEL warnings, VRAM usage %, and KB used

### VRAM Grid
- Interactive 128×256 word grid representing the full 64 KB VRAM
- Drag-and-drop block placement with alignment-aware snapping (8 KB for tiles, 2 KB for maps)
- Click and drag on empty space to create blocks with a live size preview
- Resize blocks from the bottom edge, snapped to PPU alignment boundaries
- Category badges, lock icons, and DMA streamed indicators on every block
- Conflict/warning dot tooltips with detailed explanations on hover
- OBJ Page 0 and Page 1 overlays shown on the grid
- Ghost block outlines when comparing scenes

### PPU Modes & Registers
- All 8 SNES PPU background modes (Mode 0 through Mode 7)
- Explicit BG layer assignment per block (BG1–BG4) for accurate register computation
- Live PPU register output panel: BGxSC, BG12NBA, BG34NBA, OBSEL with bitfield breakdown and formulas
- Copy registers to clipboard as assembler constants
- Enhancement chip notes (SA-1, SuperFX, S-DD1/SPC7110)

### OBSEL / OBJ Sprites
- Full OBSEL register configuration: name base, name select gap, and sprite sizes (bits 0–7)
- OBJ tile page overlays (Page 0 and Page 1) shown on the grid
- Color-coded warnings for OBJ blocks placed outside OBSEL pages and page overflow
- OAM budget display (tile count and 128-sprite hardware limit)

### Scenes
- Multiple scenes (title screen, gameplay, menus) each with independent blocks, mode, and OBSEL
- Scene tabs with rename, duplicate, and delete (with confirmation)
- Cross-scene comparison: Compare dropdown in the scene bar to overlay another scene's blocks as ghost outlines
- Switch scenes with Ctrl+1 through Ctrl+9

### Block Editor
- Category selector and color picker swatches (8 colors)
- BG layer assignment (BG1–BG4, shown for bg-tiles and bg-map categories)
- Map size selector (32×32 through 64×64) with automatic block size adjustment
- Start address and size sliders with real-time conflict detection
- Lock toggle to prevent drag and resize
- DMA streamed toggle (marks blocks updated every VBlank via DMA)
- Notes field for optional comments per block (included in ASM exports)
- Duplicate and Delete buttons (delete with confirmation dialog)
- Tile count calculator and tile slot preview grid
- Inline conflict explanations with red highlight describing what data corruption will occur
- Clickable alignment warning badge that opens the alignment dialog
- Quick-add template buttons based on the active PPU mode (shown when no block is selected)

### Alignment Warning Dialog
- Detailed per-block alignment warnings with PPU register name, encoding bits, and address formula
- Explanation of what happens when data is misaligned
- Per-block Fix button and Fix All button to move blocks to nearest valid aligned position
- Shows nearest valid boundary before applying

### CGRAM Palette
- Palette allocation visualization for the active mode
- Color bar showing BG and OBJ palette ranges
- Mode-specific notes (direct color, palette sharing)

### Stats Bar
- Per-category VRAM usage breakdown (BG Tiles, BG Maps, OBJ Tiles, Mode 7, Free)
- VBlank DMA budget bar (2,273 bytes NTSC) for streamed blocks
- OAM tile count and sprite limit display

### Export & Import
- ASM export in ca65, asar, and WLA-DX syntax with PPU register constants, OBSEL values, and block notes as comments
- Scene JSON and full project JSON export
- Import from project JSON, single scene JSON, or legacy block arrays
- Built-in presets for Mode 0, Mode 1, and Mode 7 layouts
- URL sharing: encode the current scene in the URL hash and copy to clipboard

### General
- Undo/redo (Ctrl+Z / Ctrl+Y)
- Dark mode toggle in the toolbar
- Persistent layouts via localStorage with automatic migration from older formats
- Overlap conflict detection with human-readable explanations
- PPU alignment warnings (BGxNBA, BGxSC, OBSEL, Mode 7)

## Tech Stack

Built with [SibuJS](https://sibujs.dev) — a minimalist, function-based frontend framework with fine-grained reactivity, no virtual DOM, no compiler, no JSX. UI components from [sibujs-ui](https://sibujs.dev) (shadcn/ui-inspired). Styled with Tailwind CSS.

## Getting Started

```bash
npm install
npm run dev
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Delete | Delete selected block |
| Escape | Deselect block |
| Shift+ + | Zoom in |
| - | Zoom out |
| Ctrl+1–9 | Switch to scene by index |

## Build

```bash
npm run build    # Type-check + production build (outputs to dist/)
npm run lint     # ESLint
```

## Disclaimer

This tool is provided as-is for educational and development aid purposes. It may contain bugs or inaccuracies. VRAM layouts should always be verified against official SNES hardware documentation and tested on real hardware or an accurate emulator before use in production.

## License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
