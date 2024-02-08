const debug = true;


const esp32HostnamePrefix = "esp32host_";



/*
install typescript globally
install gulp-cli globally
execute "gulp" in ESP_IDF console (that points to the right python environment)

Um Sensact in der WebUI zu aktivieren/deaktivieren:
- webui_logic/app.ts ->passend ein- und auskommentieren in der startup()-Methode
- builder/gulpfile_config.ts ->OPTION_SENSACT o.ä passend setzen
- flatbuffers/app.fbs -> includes passen ein- und auskommentieren und im "union Message" ebenfalls passend ein- und auskommentieren
- Hinweis: Keine Veränderungen im HTML/SCSS-Bereich - dort bleibt derzeit immer alles "drin"

Build is complex
1.) Only once!: Call gulp rootCA (creates a root certificate+private key rootCA.pem.crt+rootCA.pem.privkey in this directory)
2.) Only once!: Install rootCA certificate in Windows
  - right click on file rootCA.cert.crt
  - choose "Install Certificate"
  - choose Local Computer
  - Select "Alle Zertifikate in folgendem Speicher speichern"
  - Click "Durchsuchen"
  - Select "Vertrauenswürdige Stammzertifizierungsstellen"
3.) Edit settings above in this file ("hostname" is relevant for correct creation of host certificate for esp32)
4.) Edit usersettings/usersettings.ts
5.) Call gulp (among various other things, the rootCA certificate and its private key are read in and used to create/sign a host certificate)
6.) Build esp-idf project

*/

const DEFAULT_COUNTRY = 'Germany';
const DEFAULT_STATE = 'NRW';
const DEFAULT_LOCALITY = 'Greven';

const path = require("node:path");
import fs from "node:fs";
import { exec } from "node:child_process";
import * as os from 'node:os';

import * as gulp from "gulp";
import * as rollup from "rollup"
import rollupTypescript from '@rollup/plugin-typescript';
import * as brotli from 'brotli'
import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';


import { CodeBuilder, EscapeToVariableName } from "../usersettings/usersettings_base";

import { inlineSource } from 'inline-source';
import * as sass from "sass";
import * as htmlMinifier from "html-minifier";
import * as cert from "./certificates"
import { getMac } from "./esp32/esp32";
import * as part from "./esp32/partition_parser"
import { DIST_WEBUI_PATH, GENERATED_PATH, DEST_FLATBUFFERS_TYPESCRIPT_SERVER, DEST_FLATBUFFERS_TYPESCRIPT_WEBUI, DEST_USERSETTINGS_PATH, GENERATED_USERSETTINGS, NVS_PART_GEN_TOOL, USERSETTINGS_PATH, GENERATED_FLATBUFFERS_CPP, FLATBUFFERS_SCHEMA_PATH, GENERATED_FLATBUFFERS_TS, WEBUI_TYPESCRIPT_MAIN_FILE_PATH, WEBUI_TSCONFIG_PATH, DIST_WEBUI_RAW, WEBUI_HTMLSCSS_PATH, SCSS_SPA_FILE, HTML_SPA_FILE, DIST_WEBUI_BUNDELED, DIST_WEBUI_COMPRESSED, HTML_SPA_FILE_BROTLI, GENERATED_CERTIFICATES, ROOT_CA_PEM_CRT, ROOT_CA_PEM_PRVTKEY, HOST_CERT_PEM_CRT, HOST_CERT_PEM_PRVTKEY, TESTSERVER_CERT_PEM_CRT, TESTSERVER_CERT_PEM_PRVTKEY, NVS_PART_TOOL } from "./paths";
import * as snsct from "./gulpfile_sensact"
import { MyCodeBuilderImpl, writeFileCreateDirLazy } from "./gulpfile_utils";
import { usersettings_createPartition, usersettings_distribute_ts, usersettings_generate_cpp_code } from "./gulpfile_usersettings";
import { COM_PORT } from "./gulpfile_config";



//Helpers




function clean(cb: gulp.TaskFunctionCallback) {
  [DIST_WEBUI_PATH, GENERATED_PATH, DEST_FLATBUFFERS_TYPESCRIPT_SERVER, DEST_FLATBUFFERS_TYPESCRIPT_WEBUI, DEST_USERSETTINGS_PATH].forEach((path) => {
    fs.rmSync(path, { recursive: true, force: true });
  });
  cb();
}




function flatbuffers_generate_c(cb: gulp.TaskFunctionCallback) {
  exec(`flatc -c --gen-all -o ${GENERATED_FLATBUFFERS_CPP} ${FLATBUFFERS_SCHEMA_PATH}`, (err, stdout, stderr) => {
    cb(err);
  });
}

function flatbuffers_generate_ts(cb: gulp.TaskFunctionCallback) {
  exec(`flatc -T --gen-all --ts-no-import-ext -o ${GENERATED_FLATBUFFERS_TS} ${FLATBUFFERS_SCHEMA_PATH}`, (err, stdout, stderr) => {
    cb(err);
  });
}

function flatbuffers_distribute_ts(cb: gulp.TaskFunctionCallback) {
  fs.cpSync(GENERATED_FLATBUFFERS_TS, DEST_FLATBUFFERS_TYPESCRIPT_WEBUI, { recursive: true });
  fs.cpSync(GENERATED_FLATBUFFERS_TS, DEST_FLATBUFFERS_TYPESCRIPT_SERVER, { recursive: true });
  cb();
}



function typescriptCompile(cb: gulp.TaskFunctionCallback) {
  return rollup
  .rollup({
    input: WEBUI_TYPESCRIPT_MAIN_FILE_PATH,
    plugins: [
      rollupTypescript({ tsconfig: WEBUI_TSCONFIG_PATH }),
      nodeResolve()
    ]
  })
  .then(bundle => {
    return bundle.write({
      file: DIST_WEBUI_RAW + '/app.js',
      format: 'iife',
      name: 'MyApp',
      sourcemap: debug ? "inline" : false,
      plugins: [terser()]
    });
  });
}

function scssTranspile(cb: gulp.TaskFunctionCallback) {
  var result = sass.compile(path.join(WEBUI_HTMLSCSS_PATH, SCSS_SPA_FILE), { style: "compressed" });
  writeFileCreateDirLazy(path.join(DIST_WEBUI_RAW, "app.css"), result.css, cb);
}

const htmlMinifyOptions = {
  includeAutoGeneratedTags: true,
  removeAttributeQuotes: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  sortClassName: true,
  useShortDoctype: true,
  collapseWhitespace: true
};

function htmlInline(cb: any) {
  inlineSource(path.join(WEBUI_HTMLSCSS_PATH, HTML_SPA_FILE), {
    compress: false,//needs to be false, as (2023-11-17), I get an SyntaxError: Unexpected token: punc (.)
    rootpath: DIST_WEBUI_RAW
  }).then((html) => { writeFileCreateDirLazy(path.join(DIST_WEBUI_BUNDELED, HTML_SPA_FILE), html, cb) });
}
function htmlMinify(cb: any) {
  let html = htmlMinifier.minify(fs.readFileSync(path.join(DIST_WEBUI_BUNDELED, HTML_SPA_FILE)).toString(), htmlMinifyOptions);
  writeFileCreateDirLazy(path.join(DIST_WEBUI_COMPRESSED, HTML_SPA_FILE), html, cb);
}

function htmlBrotli(cb: any) {
  let compressed = brotli.compress(fs.readFileSync(path.join(DIST_WEBUI_COMPRESSED, HTML_SPA_FILE)));
  writeFileCreateDirLazy(path.join(DIST_WEBUI_COMPRESSED, HTML_SPA_FILE_BROTLI), compressed, cb);
}

exports.build = gulp.series(
  clean,
  usersettings_generate_cpp_code,
  usersettings_distribute_ts,
  usersettings_createPartition,
  snsct.fetchGeneratedFlatbufferSources,
  snsct.sendCommandImplementation_template,
  snsct.sensactapps_template,
  flatbuffers_generate_c,
  flatbuffers_generate_ts,
  flatbuffers_distribute_ts,
  scssTranspile,
  typescriptCompile,
  htmlInline,
  htmlMinify,
  htmlBrotli
  );
  
  exports.clean = clean;
  exports.rootCA = (cb: gulp.TaskFunctionCallback) => {
    let CA = cert.CreateRootCA();
    writeFileCreateDirLazy(path.join(GENERATED_CERTIFICATES, ROOT_CA_PEM_CRT), CA.certificate);
    writeFileCreateDirLazy(path.join(GENERATED_CERTIFICATES, ROOT_CA_PEM_PRVTKEY), CA.privateKey, cb);
  }
  
  exports.certificates = (cb: gulp.TaskFunctionCallback) => {
    const hostname = fs.readFileSync("hostname.txt").toString();//esp32host_2df5c8
    const this_pc_name = os.hostname();
    let caCertPath = path.join(GENERATED_CERTIFICATES, ROOT_CA_PEM_CRT);
    let caPrivkeyPath = path.join(GENERATED_CERTIFICATES, ROOT_CA_PEM_PRVTKEY);
    let hostCert = cert.CreateCert(hostname, caCertPath, caPrivkeyPath);
    writeFileCreateDirLazy(path.join(GENERATED_CERTIFICATES, HOST_CERT_PEM_CRT), hostCert.certificate);
    writeFileCreateDirLazy(path.join(GENERATED_CERTIFICATES, HOST_CERT_PEM_PRVTKEY), hostCert.privateKey, cb);
    let testserverCert = cert.CreateCert(this_pc_name, caCertPath, caPrivkeyPath);
    writeFileCreateDirLazy(path.join(GENERATED_CERTIFICATES, TESTSERVER_CERT_PEM_CRT), testserverCert.certificate);
    writeFileCreateDirLazy(path.join(GENERATED_CERTIFICATES, TESTSERVER_CERT_PEM_PRVTKEY), testserverCert.privateKey, cb);
  }
  
  exports.getmac = async (cb: gulp.TaskFunctionCallback) => {
    return getMac(COM_PORT, esp32HostnamePrefix);
  }
  
  exports.parsepart = async (cb: gulp.TaskFunctionCallback) => {
    const partitionfile = fs.readFileSync("./partition-table.bin");
    
    var res= part.parse(partitionfile);
    res.forEach(v=>{
      console.log(v.toString());
    })
    cb();
  }
  

  exports.default = exports.build
  