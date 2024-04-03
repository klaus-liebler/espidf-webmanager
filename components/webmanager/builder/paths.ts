import { IDF_PATH } from "./gulpfile_config";



const path = require("node:path");



export const HTML_SPA_FILE = "app.html";
export const HTML_SPA_FILE_BROTLI = HTML_SPA_FILE + ".br";
export const SCSS_SPA_FILE = "app.scss";
export const TS_MAIN_FILE = "app.ts";



export const ROOT = "..";
//Sources
export const WEBUI_HTMLSCSS_PATH = path.join(ROOT, "webui_htmlscss");
export const WEBUI_LOGIC_PATH = path.join(ROOT, "webui_logic");
export const ROOT_CA_PEM_CRT = "rootCA.pem.crt";
export const ROOT_CA_PEM_PRVTKEY = "rootCA.pem.prvtkey";
export const HOST_CERT_PEM_CRT = "host.pem.crt";
export const HOST_CERT_PEM_PRVTKEY = "host.pem.prvtkey";
export const TESTSERVER_CERT_PEM_CRT = "testserver.pem.crt";
export const TESTSERVER_CERT_PEM_PRVTKEY = "testserver.pem.prvtkey";
export const TESTSERVER_PATH = path.join(ROOT, "testserver");

export const WEBUI_TSCONFIG_FILE = path.join(WEBUI_LOGIC_PATH, "tsconfig.json");
export const WEBUI_TYPESCRIPT_MAIN_FILE = path.join(WEBUI_LOGIC_PATH, TS_MAIN_FILE);
export const FLATBUFFERS_SCHEMA_FILE = path.join(ROOT, "flatbuffers", "app.fbs");
export const USERSETTINGS_FILE = path.join(ROOT, "usersettings", "definition", "usersettings.ts");

//intermediate and distribution
export const GENERATED_PATH = path.join(ROOT, "generated");
export const GENERATED_SENSACT_FBS = path.join(GENERATED_PATH, "sensact_fbs");
export const GENERATED_SENSACT_TS = path.join(GENERATED_PATH, "sensact_gen_ts");
export const GENERATED_FLATBUFFERS_TS = path.join(GENERATED_PATH, "flatbuffers_gen_ts");
export const GENERATED_FLATBUFFERS_CPP = path.join(GENERATED_PATH, "flatbuffers_gen_cpp");

export const GENERATED_USERSETTINGS = path.join(GENERATED_PATH, "usersettings_gen");
export const GENERATED_CERTIFICATES = path.join(ROOT, "certificates");
export const DIST_WEBUI_PATH = path.join(ROOT, "dist_webui");
export const DIST_WEBUI_RAW = path.join(DIST_WEBUI_PATH, "raw");
export const DIST_WEBUI_BUNDELED = path.join(DIST_WEBUI_PATH, "bundeled");
export const DIST_WEBUI_COMPRESSED = path.join(DIST_WEBUI_PATH, "compressed");
export const DEST_FLATBUFFERS_TYPESCRIPT_SERVER = path.join(TESTSERVER_PATH, "flatbuffers_gen");

export const WEBUI_GENERATED_PATH = path.join(WEBUI_LOGIC_PATH, "generated");
export const WEBUI_GENERATED_FLATBUFFERS_DIR = path.join(WEBUI_GENERATED_PATH, "flatbuffers");
export const WEBUI_GENERATED_USERSETTINGS_FILE = path.join(WEBUI_GENERATED_PATH, "usersettings_copied_during_build.ts");
export const WEBUI_GENERATED_SENSACT_DIR = path.join(WEBUI_GENERATED_PATH, "sensact");

//Location of esp idf tools
export const NVS_PART_GEN_TOOL=path.join(IDF_PATH, "components/nvs_flash/nvs_partition_generator/nvs_partition_gen.py");
export const NVS_PART_TOOL=path.join(IDF_PATH, "components/partition_table/parttool.py");