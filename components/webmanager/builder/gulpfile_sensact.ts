import { writeFileCreateDirLazy } from "./gulpfile_utils";
import path from "node:path";

import fs from "node:fs";
import * as gulp from "gulp";
import * as P from "./paths";
import { CONFIGURATION_TOOL_GENERATED_PATH, OPTION_SENSACT } from "./gulpfile_config";

export function fetchGeneratedFlatbufferSources(cb: gulp.TaskFunctionCallback) {

  if(OPTION_SENSACT){
    fs.cpSync(path.join(CONFIGURATION_TOOL_GENERATED_PATH, "common", "applicationIds.fbs.inc"), path.join(P.GENERATED_SENSACT_FBS, "applicationIds.fbs.inc"), { recursive: true });
    fs.cpSync(path.join(CONFIGURATION_TOOL_GENERATED_PATH, "common", "commandTypes.fbs.inc"), path.join(P.GENERATED_SENSACT_FBS, "commandTypes.fbs.inc"), { recursive: true });
  }else{
    fs.cpSync(path.join(P.FLATBUFFERS, "applicationIds.fbs.inc.empty"), path.join(P.GENERATED_SENSACT_FBS, "applicationIds.fbs.inc"), { recursive: true });
    fs.cpSync(path.join(P.FLATBUFFERS, "commandTypes.fbs.inc.empty"), path.join(P.GENERATED_SENSACT_FBS, "commandTypes.fbs.inc"), { recursive: true });
  }
  cb();
}

export function sendCommandImplementation_template(cb: gulp.TaskFunctionCallback) {
  var content = fs.readFileSync(P.TEMPLATE_SEND_COMMAND_IMPLEMENTATION).toString();
  if(OPTION_SENSACT){
    content = content.replace("//TEMPLATE_HERE", fs.readFileSync(path.join(CONFIGURATION_TOOL_GENERATED_PATH, "common", "sendCommandImplementation.ts.inc")).toString());
  }
  var dest = path.join(P.GENERATED_SENSACT_TS, "sendCommandImplementation.ts");
  writeFileCreateDirLazy(dest, content);
  fs.cpSync(dest, path.join(P.DEST_SENSACT_TYPESCRIPT_WEBUI, "sendCommandImplementation_copied_during_build.ts"),{recursive:true});
  cb();
}

export function sensactapps_template(cb: gulp.TaskFunctionCallback) {
  if(!OPTION_SENSACT) return cb();
  var content = fs.readFileSync(P.TEMPLATE_SENSACT_APPS).toString();
  if(OPTION_SENSACT){
    content = content.replace("//TEMPLATE_HERE", fs.readFileSync(path.join(CONFIGURATION_TOOL_GENERATED_PATH, "common", "sensactapps.ts.inc")).toString());
  }
  var dest = path.join(P.GENERATED_SENSACT_TS, "sensactapps.ts")
  writeFileCreateDirLazy(dest, content);
  fs.cpSync(dest, path.join(P.DEST_SENSACT_TYPESCRIPT_WEBUI, "sensactapps_copied_during_build.ts"), {recursive:true});
  cb();
}

