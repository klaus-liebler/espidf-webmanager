import { templateSpecial, createWriteStreamCreateDirLazy, writeFileCreateDirLazy } from "./gulpfile_utils";
const path = require("node:path");

import fs from "node:fs";
import * as gulp from "gulp";
import * as P from "./paths";
import { CONFIGURATION_TOOL_GENERATED_PATH as SENSACT_CONFIGURATION_TOOL_GENERATED_PATH, OPTION_SENSACT } from "./gulpfile_config";

export function fetchGeneratedFlatbufferCppSources(cb: gulp.TaskFunctionCallback) {

  if(!OPTION_SENSACT) return cb();
  fs.cpSync(path.join(SENSACT_CONFIGURATION_TOOL_GENERATED_PATH, "common", "applicationIds.fbs.inc"), path.join(P.GENERATED_SENSACT_FBS, "applicationIds.fbs.inc"), { recursive: true });
  fs.cpSync(path.join(SENSACT_CONFIGURATION_TOOL_GENERATED_PATH, "common", "commandTypes.fbs.inc"), path.join(P.GENERATED_SENSACT_FBS, "commandTypes.fbs.inc"), { recursive: true });
  cb();
}

export function sendCommandImplementation_template(cb: gulp.TaskFunctionCallback) {
  if(!OPTION_SENSACT) return cb();
  var content = fs.readFileSync("../webui_logic/option_sensact/templates/sendCommandImplementation.template.ts").toString();
  content = content.replace("//TEMPLATE_HERE", fs.readFileSync(path.join(SENSACT_CONFIGURATION_TOOL_GENERATED_PATH, "common", "sendCommandImplementation.ts.inc")).toString());
  writeFileCreateDirLazy(path.join(P.GENERATED_SENSACT_TS, "sendCommandImplementation.ts"), content);
  writeFileCreateDirLazy("../webui_logic/generated/option_sensact/sendCommandImplementation_copied_during_build.ts", content);
  cb();
  
}

export function sensactapps_template(cb: gulp.TaskFunctionCallback) {
  if(!OPTION_SENSACT) return cb();
  var content = fs.readFileSync("../webui_logic/option_sensact/templates/sensactapps.template.ts").toString();
  content = content.replace("//TEMPLATE_HERE", fs.readFileSync(path.join(SENSACT_CONFIGURATION_TOOL_GENERATED_PATH,"common","sensactapps.ts.inc")).toString());
  writeFileCreateDirLazy(path.join(P.GENERATED_SENSACT_TS, "sensactapps.ts"), content);
  writeFileCreateDirLazy("../webui_logic/generated/option_sensact/sensactapps_copied_during_build.ts", content);
  cb();
}

