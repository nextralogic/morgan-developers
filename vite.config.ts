import { defineConfig, type Plugin, type Rollup } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { pageChunksComment } from "./netlify/lib/page-chunks.ts";

/**
 * Writes the JS files each lazy page needs, beyond what the main bundle
 * already loads, into index.html for the seo edge function to preload.
 */
function pageChunks(): Plugin {
  let base = "/";
  return {
    name: "page-chunks",
    apply: "build",
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html;
        const bundle = ctx.bundle;
        const chunks = Object.values(bundle).filter((item): item is Rollup.OutputChunk => item.type === "chunk");

        const collect = (fileName: string, files: Set<string>) => {
          const chunk = bundle[fileName];
          if (files.has(fileName) || chunk?.type !== "chunk") return;
          files.add(fileName);
          chunk.imports.forEach((name) => collect(name, files));
        };

        const loaded = new Set<string>();
        chunks.filter((chunk) => chunk.isEntry).forEach((chunk) => collect(chunk.fileName, loaded));

        const pages: Record<string, string[]> = {};
        for (const chunk of chunks) {
          const page = chunk.isDynamicEntry && chunk.facadeModuleId?.match(/\/src\/pages\/(\w+)\.tsx$/)?.[1];
          if (!page) continue;
          const files = new Set<string>();
          collect(chunk.fileName, files);
          pages[page] = [...files].filter((file) => !loaded.has(file)).map((file) => `${base}${file}`);
        }
        return html.replace("</head>", () => `  ${pageChunksComment(pages)}\n  </head>`);
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), pageChunks()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
