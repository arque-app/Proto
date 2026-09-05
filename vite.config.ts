import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fmlDevProxy } from "./vite/devProxy.ts";

export default defineConfig({
  plugins: [react(), tailwindcss(), fmlDevProxy()],
});
