/// <reference types="vitest" />
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
