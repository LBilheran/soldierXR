import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import glsl from 'vite-plugin-glsl';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    base: process.env.NODE_ENV === 'production' ? '/soldierXR/' : '',
    clearScreen: false,
    optimizeDeps: {
        esbuildOptions: {
            supported: {
                'top-level-await': true
            }
        }
    },
    esbuild: {
        supported: {
            'top-level-await': true
        }
    },
    build: {
        sourcemap: true,
        chunkSizeWarningLimit: 1024
    },
    server: {
        open: true,
        allowedHosts: ['.trycloudflare.com', '.ngrok-free.app']
    },
    plugins: [
        viteStaticCopy({
            targets: [
                { src: 'node_modules/three/examples/jsm/libs/ammo.wasm.js', dest: 'jsm/libs/' },
                { src: 'node_modules/three/examples/jsm/libs/ammo.wasm.wasm', dest: 'jsm/libs/' },
                { src: 'node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.js', dest: 'jsm/libs/draco/gltf' },
                { src: 'node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.wasm', dest: 'jsm/libs/draco/gltf/' },
                { src: 'node_modules/three/examples/jsm/libs/draco/gltf/draco_encoder.js', dest: 'jsm/libs/draco/gltf/' },
                { src: 'node_modules/three/examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js', dest: 'jsm/libs/draco/gltf/' }
            ]
        }),
        glsl(),
        VitePWA({
            registerType: "autoUpdate",
            manifest: {
              name: "SodlierXR",
              description: "Defend your base against Robot !",
              theme_color: "#ffffff",
              background_color: "#000000",
              display: "standalone",
              icons: [
                {
                  src: "assets/images/robot-144.png",
                  sizes: "144x144",
                  type: "image/png",
                },
              ]
            },
            workbox: {
              globPatterns: ["**/*.{js,css,html,png,svg}"],
            }
        })
    ]
})

