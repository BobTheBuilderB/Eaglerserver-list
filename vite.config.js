import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/<your-repo-name>/", // change this to your repo name
  plugins: [react()],
});
