import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import {viteSingleFile} from "./vite_plugin/vite-plugin-singlefile"


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(),  viteSingleFile()],
  build:{
    minify:true,
    cssCodeSplit:false,
  },
  server:{
    proxy:{
      "/webmanager_ws":{
        target:"ws://localhost:3000",
        ws:true,
      }
    }
  }
})
