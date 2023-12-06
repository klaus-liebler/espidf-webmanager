


import { exec } from "child_process";
import gulp from "gulp";
import path from "path";
import { EscapeToVariableName } from "../usersettings/usersettings_base";
import { MyCodeBuilderImpl, writeFileCreateDirLazy } from "./gulpfile_utils";
import { GENERATED_USERSETTINGS, NVS_PART_GEN_TOOL, USERSETTINGS_PATH, DEST_USERSETTINGS_PATH } from "./paths";
import UserSettings from "../usersettings/usersettings";
import fs from "node:fs";
import { COM_PORT, USERSETTINGS_PARTITION_NAME, USERSETTINGS_PARTITION_SIZE_KILOBYTES } from "./gulpfile_config";

//Code Generation
const theusersettings = UserSettings.Build();
export function usersettings_generate_cpp_code(cb: gulp.TaskFunctionCallback) {
  console.log(`User settings has ${theusersettings.length} groups`);
  var codeBuilder = new MyCodeBuilderImpl("key,type,encoding,value");

  theusersettings.forEach((cg, i, a) => {
    codeBuilder.AppendLine(`${cg.Key},namespace,,`);
    cg.items.forEach((ci, j, cia) => {
      ci.RenderNvsPartitionGenerator(codeBuilder);
    });
  });
  writeFileCreateDirLazy(path.join(GENERATED_USERSETTINGS, "usersettings_partition.csv"), codeBuilder.Code, cb);

  codeBuilder.Clear();
  theusersettings.forEach((cg, i, a) => {
    cg.items.forEach((ci, j, cia) => {
      codeBuilder.AppendLine(`constexpr const char ${EscapeToVariableName(cg.Key)}_${EscapeToVariableName(ci.Key)}_KEY[]="${ci.Key}";`)
    });
    cg.RenderCPPConfig(codeBuilder);
    cg.items.forEach((ci, j, cia) => {
      ci.RenderCPPConfig(codeBuilder, cg);
    });
    codeBuilder.AppendLine("}};");
  });
  codeBuilder.AppendLine(`constexpr std::array<const GroupCfg*, ${theusersettings.length}> groups = {`);
  theusersettings.forEach((cg, i, a) => {
    codeBuilder.AppendLine(`\t&${EscapeToVariableName(cg.Key)},`);
  });
  codeBuilder.AppendLine(`};`)
  codeBuilder.AppendLine(``);
  codeBuilder.AppendLine(`namespace settings{`);
  theusersettings.forEach((cg, i, a) => {
    cg.items.forEach((ci, j, cia) => {
      ci.RenderCPPAccessor(codeBuilder, cg);  
    });

  });
  codeBuilder.AppendLine(`}`)
  writeFileCreateDirLazy(path.join(GENERATED_USERSETTINGS, "usersettings_config.inc"), codeBuilder.Code, cb);
}

export function usersettings_createPartition(cb:gulp.TaskFunctionCallback){
  exec(`py "${NVS_PART_GEN_TOOL}" generate "${path.join(GENERATED_USERSETTINGS, "usersettings_partition.csv")}" "${path.join(GENERATED_USERSETTINGS, "usersettings_partition.bin")}" ${USERSETTINGS_PARTITION_SIZE_KILOBYTES*1024}`, (err, stdout, stderr) => {
    console.log(stdout);
    cb(err);
  });
}


//this is necessary to copy the usersettings in the context of the browser client project. There, the usersettings_base.ts is totally different from the one used in the build process
export function usersettings_distribute_ts(cb: gulp.TaskFunctionCallback) {
  fs.copyFile(USERSETTINGS_PATH, DEST_USERSETTINGS_PATH, cb);
}

exports.flashusersettings = (cb: gulp.TaskFunctionCallback)=>{
  exec(`py ${NVS_PART_GEN_TOOL} --port "${COM_PORT}" write_partition --partition-name=${USERSETTINGS_PARTITION_NAME} --input "${path.join(GENERATED_USERSETTINGS, "usersettings_partition.bin")}"`, (err, stdout, stderr) => {
    cb(err);
  });
}