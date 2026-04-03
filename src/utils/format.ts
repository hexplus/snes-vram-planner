// Format a word address as a 65816-style hex string: $1A00
export const fmtHex = (words: number): string =>
  `$${(words * 2).toString(16).toUpperCase().padStart(4, "0")}`;

// Format word count as KB: 4096 words = 8.00 KB
export const fmtKb = (words: number): string =>
  `${((words * 2) / 1024).toFixed(2)} KB`;

// Generate ASM constant name from block label
export const toConstantName = (label: string): string =>
  "VRAM_" + label.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
