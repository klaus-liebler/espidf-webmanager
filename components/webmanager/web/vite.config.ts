import { defineConfig } from 'vite'
import {viteSingleFile} from "./vite_plugin/vite-plugin-singlefile"
import fs from "node:fs"


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteSingleFile()],
  build:{
    minify:true,
    cssCodeSplit:false,
  },
  server:{
    open:"https://protzklotz:5173",
    https:{
      key: fs.readFileSync('../certificates/testserver.pem.prvtkey'),
      cert: fs.readFileSync('../certificates/testserver.pem.crt'),
    },
    proxy:{
      "/webmanager_ws":{
        target:"ws://localhost:3000",
        ws:true,
      }
    }
  }
})