import { X02 } from "./gulpfile_utils";

export const USERSETTINGS_PARTITION_NAME="nvs"
export const USERSETTINGS_PARTITION_SIZE_KILOBYTES=16;
export const COM_PORT = "COM11";
export const IDF_PATH=process.env.IDF_PATH;
export const CONFIGURATION_TOOL_GENERATED_PATH = "C:/repos/sensact/espidf-components/generated";
export const OPTION_SENSACT=false;


export const ESP32_HOSTNAME_TEMPLATE = (mac:Uint8Array)=>{
    return `esp32host_${X02(mac[3])}${X02(mac[4])}${X02(mac[5])}`;
}

export const DEFAULT_COUNTRY = 'Germany';
export const DEFAULT_STATE = 'NRW';
export const DEFAULT_LOCALITY = 'Greven';
export const DEFAULT_ORGANIZATION = 'Klaus Liebler personal';

//not needed export const ROOT_CA_SUBJECT_NAME ="Klaus Liebler"
export const ROOT_CA_COMMON_NAME ="AAA Klaus Liebler personal Root CA"