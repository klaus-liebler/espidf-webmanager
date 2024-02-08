import { templateSpecial, createWriteStreamCreateDirLazy, writeFileCreateDirLazy } from "./gulpfile_utils";
const path = require("node:path");

import fs from "node:fs";
import * as gulp from "gulp";
import * as P from "./paths";
import { CONFIGURATION_TOOL_GENERATED_PATH, OPTION_SENSACT } from "./gulpfile_config";

export function fetchGeneratedFlatbufferSources(cb: gulp.TaskFunctionCallback) {

  if(!OPTION_SENSACT) return cb();
  fs.cpSync(path.join(CONFIGURATION_TOOL_GENERATED_PATH, "common", "applicationIds.fbs.inc"), path.join(P.GENERATED_SENSACT_FBS, "applicationIds.fbs.inc"), { recursive: true });
  fs.cpSync(path.join(CONFIGURATION_TOOL_GENERATED_PATH, "common", "commandTypes.fbs.inc"), path.join(P.GENERATED_SENSACT_FBS, "commandTypes.fbs.inc"), { recursive: true });
  cb();
}

export function sendCommandImplementation_template(cb: gulp.TaskFunctionCallback) {
  if(!OPTION_SENSACT) return cb();
  var content = fs.readFileSync("../webui_logic/templates/sendCommandImplementation.template.ts").toString();
  content = content.replace("//TEMPLATE_HERE", fs.readFileSync(path.join(CONFIGURATION_TOOL_GENERATED_PATH, "common", "sendCommandImplementation.ts.inc")).toString());
  writeFileCreateDirLazy(path.join(P.GENERATED_SENSACT_TS, "sendCommandImplementation.ts"), content);
  fs.copyFile(path.join(P.GENERATED_SENSACT_TS, "sendCommandImplementation.ts"), path.join(P.WEBUI_LOGIC_PATH, "sendCommandImplementation_copied_during_build.ts"), cb);
}

export function sensactapps_template(cb: gulp.TaskFunctionCallback) {
  if(!OPTION_SENSACT) return cb();
  var content = fs.readFileSync("../webui_logic/templates/sensactapps.template.ts").toString();
  content = content.replace("//TEMPLATE_HERE", fs.readFileSync(path.join(CONFIGURATION_TOOL_GENERATED_PATH,"common","sensactapps.ts.inc")).toString());
  writeFileCreateDirLazy(path.join(P.GENERATED_SENSACT_TS, "sensactapps.ts"), content);
  fs.copyFile(path.join(P.GENERATED_SENSACT_TS, "sensactapps.ts"), path.join(P.WEBUI_LOGIC_PATH, "sensactapps_copied_during_build.ts"), cb);
}

