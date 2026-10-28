import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://byggflyt-no.vercel.app",
  output: "static",
  trailingSlash: "always",
  build: {
    inlineStylesheets: "never"
  },
  vite: {
    build: {
      sourcemap: false
    }
  }
});
