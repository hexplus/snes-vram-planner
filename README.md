# SNES VRAM Planner

Visual VRAM layout planner for the Super Nintendo. Plan and arrange BG tiles, tilemaps, OBJ tiles, and Mode 7 data across the SNES's 64 KB VRAM with a drag-and-drop grid editor. Supports all 8 PPU modes, conflict/alignment detection, undo/redo, and ASM/JSON export.

## Features

- Interactive 128x256 word grid representing the full 64 KB VRAM
- All 8 SNES PPU background modes (Mode 0 through Mode 7)
- Drag-and-drop block placement and resizing
- Overlap conflict and PPU alignment warnings
- Undo/redo support
- Export layouts as `.asm` or `.json`
- Import from JSON and built-in presets
- Dark mode
- Persistent layouts via localStorage

## Getting Started

```bash
npm install
npm run dev
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
