import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(process.cwd(), "pages-src"),
  base: process.env.PAGES_BASE ?? "/BioTrust-AI/",
  publicDir: resolve(process.cwd(), "public"),
  plugins: [react()],
  define: {
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(process.env.NEXT_PUBLIC_API_URL ?? ""),
  },
  build: {
    outDir: resolve(process.cwd(), "pages-dist"),
    emptyOutDir: true,
  },
});
