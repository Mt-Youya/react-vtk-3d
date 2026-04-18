import { defineConfig } from "vite"
import { extname, resolve } from "path"
import react from "@vitejs/plugin-react"
import Inspect from "vite-plugin-inspect"
import AutoImport from "unplugin-auto-import/vite"
import tailwindcss from "@tailwindcss/vite"

const modelExts = [".gltf", ".glb", ".obj", "mtl", ".fbx", ".stl", ".vtp", ".vtk", ".ply", ".xyz"]
const cssExts = [".css", ".less", ".scss", "sass", ".stylus"]

export default defineConfig({
    plugins: [
        react({
            babel: {
                plugins: ["babel-plugin-react-compiler"],
            },
        }),
        Inspect({ build: true, outputDir: ".vite-inspect" }),
        AutoImport({
            include: [/\.[jt]sx?$/],
            imports: ["react", "react-router-dom"],
            dts: "src/types/auto-imports.d.ts",
        }),
        tailwindcss()
    ],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
    server: {
        open: true,
        port: 8080,
        proxy: {
            "/api": {
                target: "http://localhost:9009",
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: "dist",
        assetsDir: "assets",
        chunkSizeWarningLimit: 1500,
        rollupOptions: {
            output: {
                chunkFileNames: "assets/js/[name]-[hash].js",
                entryFileNames: "assets/js/[name].[hash].js",
                compact: true,
                manualChunks: {
                    react: ["react", "react-dom", "react-router-dom"],
                    "base-ui": ["@base-ui/react"],
                    lucide: ["lucide-react"],
                    tailwindcss: ["tailwindcss-animate", "tailwind-merge", "clsx", "class-variance-authority"],
                    gsap: ["gsap", "@gsap/react"],
                    vtk: ["@kitware/vtk.js"],
                },
                assetFileNames: (chunkInfo) => {
                    const ext = extname(chunkInfo.name ?? "")

                    if (cssExts.includes(ext)) {
                        return `assets/css/[name].[hash].[ext]`
                    }

                    if (modelExts.includes(ext)) {
                        return `assets/model/[name].[hash].[ext]`
                    }

                    return `assets/images/[name].[hash].[ext]`
                },
            },
        },
        minify: true,
        cssCodeSplit: true,
        assetsInlineLimit: 1024 * 5,
        emptyOutDir: true,
    },
})
