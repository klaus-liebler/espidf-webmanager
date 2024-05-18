import * as gulp from "gulp";
import fs from "node:fs";
import os from "node:os";
import proc from "node:child_process";
import {getMac} from "./esp32/esp32"
import {parsePartitions} from "./esp32/partition_parser"

import * as cert from "./certificates"
import * as snsct from "./gulpfile_sensact"

import {writeFileCreateDirLazy } from "./gulpfile_utils";
import { flashusersettings, usersettings_createPartition, usersettings_distribute_ts, usersettings_generate_cpp_code } from "./gulpfile_usersettings";
import { COM_PORT, ESP32_HOSTNAME_TEMPLATE } from "./gulpfile_config";
import * as P from "./paths";


function clean(cb: gulp.TaskFunctionCallback) {
  [P.GENERATED, P.WEB_SRC_GENERATED, P.DEST_FLATBUFFERS_TYPESCRIPT_SERVER].forEach((path) => {
    fs.rmSync(path, { recursive: true, force: true });
  });
  cb();
}

function flatbuffers_generate_c(cb: gulp.TaskFunctionCallback) {
  proc.exec(`flatc -c --gen-all -o ${P.GENERATED_FLATBUFFERS_CPP} ${P.FLATBUFFERS_SCHEMA_PATH}`, (err, stdout, stderr) => {
    stdout
    stderr
    cb(err);
  });
}

function flatbuffers_generate_ts(cb: gulp.TaskFunctionCallback) {
  proc.exec(`flatc -T --gen-all --ts-no-import-ext -o ${P.GENERATED_FLATBUFFERS_TS} ${P.FLATBUFFERS_SCHEMA_PATH}`, (err, stdout, stderr) => {
    stdout
    stderr
    cb(err);
  });
}

function flatbuffers_distribute_ts(cb: gulp.TaskFunctionCallback) {
  fs.cpSync(P.GENERATED_FLATBUFFERS_TS, P.DEST_FLATBUFFERS_TYPESCRIPT_WEBUI, { recursive: true });
  fs.cpSync(P.GENERATED_FLATBUFFERS_TS, P.DEST_FLATBUFFERS_TYPESCRIPT_SERVER, { recursive: true });
  cb();
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
  );
  
  exports.clean = clean;
  exports.rootCA = (cb: gulp.TaskFunctionCallback) => {
    let CA = cert.CreateRootCA();
    writeFileCreateDirLazy(P.ROOT_CA_PEM_CRT, CA.certificate);
    writeFileCreateDirLazy(P.ROOT_CA_PEM_PRVTKEY, CA.privateKey, cb);
  }
  
  exports.certificates = (cb: gulp.TaskFunctionCallback) => {
    const hostname = fs.readFileSync(P.HOSTNAME_FILE).toString();//esp32host_2df5c8
    const this_pc_name = os.hostname();
    let hostCert = cert.CreateCert(hostname, P.ROOT_CA_PEM_CRT, P.ROOT_CA_PEM_PRVTKEY);
    writeFileCreateDirLazy(P.HOST_CERT_PEM_CRT, hostCert.certificate);
    writeFileCreateDirLazy(P.HOST_CERT_PEM_PRVTKEY, hostCert.privateKey, cb);
    let testserverCert = cert.CreateCert(this_pc_name, P.ROOT_CA_PEM_CRT, P.ROOT_CA_PEM_PRVTKEY);
    writeFileCreateDirLazy(P.TESTSERVER_CERT_PEM_CRT, testserverCert.certificate);
    writeFileCreateDirLazy(P.TESTSERVER_CERT_PEM_PRVTKEY, testserverCert.privateKey, cb);
  }
  
  exports.gethostname = async (cb: gulp.TaskFunctionCallback) => {
    var mac= await getMac(COM_PORT);
    console.log(`The MAC adress is ${mac.toString()}`);
    var hostname = ESP32_HOSTNAME_TEMPLATE(mac);
    console.log(`The Hostname will be ${hostname}`);
    writeFileCreateDirLazy(P.HOSTNAME_FILE, hostname, cb);
  }

  
  exports.parsepart = async (cb: gulp.TaskFunctionCallback) => {
    const partitionfile = fs.readFileSync("./partition-table.bin");
    
    var res= parsePartitions(partitionfile);
    res.forEach(v=>{
      console.log(v.toString());
    })
    cb();
  }

  exports.flashusersettings = flashusersettings;
  

  exports.default = exports.build
  