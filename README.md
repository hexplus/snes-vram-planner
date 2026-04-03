# SNES VRAM Planner

Visual VRAM layout planner for the Super Nintendo. Plan and arrange BG tiles, tilemaps, OBJ tiles, and Mode 7 data across the SNES's 64 KB VRAM with a drag-and-drop grid editor. Supports all 8 PPU modes, multi-scene workflows, full OBSEL modeling, live register output, and export to multiple assembler formats.

## Features

### VRAM Grid
- Interactive 128x256 word grid representing the full 64 KB VRAM
- Drag-and-drop block placement with alignment-aware snapping (8 KB for tiles, 2 KB for maps)
- Click and drag on empty space to create blocks with a live size preview
- Resize blocks from the bottom edge, snapped to PPU alignment boundaries
- Category badges, lock icons, and DMA streamed indicators on every block
- Conflict/warning dot tooltips with detailed explanations on hover
- Byte/word address toggle for the entire UI

### PPU Modes & Registers
- All 8 SNES PPU background modes (Mode 0 through Mode 7)
- Explicit BG layer assignment per block for accurate register computation
- Live PPU register output panel: BGxSC, BG12NBA, BG34NBA, OBSEL with bitfield breakdown
- Copy registers to clipboard as assembler constants
- Enhancement chip notes (SA-1, SuperFX, S-DD1/SPC7110)

### OBSEL / OBJ Sprites
- Full OBSEL register configuration: name base, name select gap, and sprite sizes (bits 0-7)
- OBJ tile page overlays (Page 0 and Page 1) shown on the grid
- Warnings for OBJ blocks placed outside OBSEL pages and page overflow
- OAM budget display (tile count and 128-sprite hardware limit)

### Scenes
- Multiple scenes (title screen, gameplay, menus) each with independent blocks, mode, and OBSEL
- Scene tabs with rename, duplicate, and delete
- Cross-scene comparison: overlay another scene's blocks as ghost outlines
- Switch scenes with Ctrl+1 through Ctrl+9

### Block Editor
- Category, color, BG layer, map size (32x32 through 64x64), lock, and DMA streamed toggles
- Tile count calculator and tile slot preview grid
- Conflict explanations describing what data corruption will occur
- Alignment warnings with one-click fix
- Template quick-add buttons based on the active PPU mode

### CGRAM Palette
- Palette allocation visualization for the active mode
- Color bar showing BG and OBJ palette ranges
- Mode-specific notes (direct color, palette sharing)

### DMA Budget
- Track static vs streamed blocks
- VBlank DMA budget bar (2,273 bytes NTSC) in the stats bar

### Export & Import
- ASM export in ca65, asar, and WLA-DX syntax with PPU register constants and OBSEL values
- Scene JSON and full project JSON export
- Import from project JSON, single scene JSON, or legacy block arrays
- Built-in presets for Mode 0, Mode 1, and Mode 7 layouts
- URL sharing: encode the current scene in the URL hash and copy to clipboard

### General
- Undo/redo (Ctrl+Z / Ctrl+Y)
- Dark mode
- Persistent layouts via localStorage with automatic migration from older formats
- Overlap conflict detection with human-readable explanations
- PPU alignment warnings (BGxNBA, BGxSC, OBSEL, Mode 7)

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
| +/- | Zoom in/out |
| Ctrl+1-9 | Switch to scene by index |

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
