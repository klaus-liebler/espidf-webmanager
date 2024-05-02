// automatically generated by the FlatBuffers compiler, do not modify

import { RequestCancelInstruction } from '../webmanager/request-cancel-instruction';
import { RequestDeleteAllFingers } from '../webmanager/request-delete-all-fingers';
import { RequestDeleteFinger } from '../webmanager/request-delete-finger';
import { RequestEnrollNewFinger } from '../webmanager/request-enroll-new-finger';
import { RequestFingerprintSensorInfo } from '../webmanager/request-fingerprint-sensor-info';
import { RequestFingers } from '../webmanager/request-fingers';
import { RequestGetUserSettings } from '../webmanager/request-get-user-settings';
import { RequestJournal } from '../webmanager/request-journal';
import { RequestNetworkInformation } from '../webmanager/request-network-information';
import { RequestOpenDoor } from '../webmanager/request-open-door';
import { RequestRenameFinger } from '../webmanager/request-rename-finger';
import { RequestRestart } from '../webmanager/request-restart';
import { RequestSetUserSettings } from '../webmanager/request-set-user-settings';
import { RequestSystemData } from '../webmanager/request-system-data';
import { RequestTimeseries } from '../webmanager/request-timeseries';
import { RequestWifiConnect } from '../webmanager/request-wifi-connect';
import { RequestWifiDisconnect } from '../webmanager/request-wifi-disconnect';
import { CommandMessage } from '../websensact/command-message';


export enum Requests {
  NONE = 0,
  websensact_CommandMessage = 1,
  RequestNetworkInformation = 2,
  RequestWifiConnect = 3,
  RequestWifiDisconnect = 4,
  RequestSystemData = 5,
  RequestJournal = 6,
  RequestRestart = 7,
  RequestGetUserSettings = 8,
  RequestSetUserSettings = 9,
  RequestTimeseries = 10,
  RequestOpenDoor = 11,
  RequestEnrollNewFinger = 12,
  RequestDeleteFinger = 13,
  RequestDeleteAllFingers = 14,
  RequestRenameFinger = 15,
  RequestFingerprintSensorInfo = 16,
  RequestFingers = 17,
  RequestCancelInstruction = 18
}

export function unionToRequests(
  type: Requests,
  accessor: (obj:CommandMessage|RequestCancelInstruction|RequestDeleteAllFingers|RequestDeleteFinger|RequestEnrollNewFinger|RequestFingerprintSensorInfo|RequestFingers|RequestGetUserSettings|RequestJournal|RequestNetworkInformation|RequestOpenDoor|RequestRenameFinger|RequestRestart|RequestSetUserSettings|RequestSystemData|RequestTimeseries|RequestWifiConnect|RequestWifiDisconnect) => CommandMessage|RequestCancelInstruction|RequestDeleteAllFingers|RequestDeleteFinger|RequestEnrollNewFinger|RequestFingerprintSensorInfo|RequestFingers|RequestGetUserSettings|RequestJournal|RequestNetworkInformation|RequestOpenDoor|RequestRenameFinger|RequestRestart|RequestSetUserSettings|RequestSystemData|RequestTimeseries|RequestWifiConnect|RequestWifiDisconnect|null
): CommandMessage|RequestCancelInstruction|RequestDeleteAllFingers|RequestDeleteFinger|RequestEnrollNewFinger|RequestFingerprintSensorInfo|RequestFingers|RequestGetUserSettings|RequestJournal|RequestNetworkInformation|RequestOpenDoor|RequestRenameFinger|RequestRestart|RequestSetUserSettings|RequestSystemData|RequestTimeseries|RequestWifiConnect|RequestWifiDisconnect|null {
  switch(Requests[type]) {
    case 'NONE': return null; 
    case 'websensact_CommandMessage': return accessor(new CommandMessage())! as CommandMessage;
    case 'RequestNetworkInformation': return accessor(new RequestNetworkInformation())! as RequestNetworkInformation;
    case 'RequestWifiConnect': return accessor(new RequestWifiConnect())! as RequestWifiConnect;
    case 'RequestWifiDisconnect': return accessor(new RequestWifiDisconnect())! as RequestWifiDisconnect;
    case 'RequestSystemData': return accessor(new RequestSystemData())! as RequestSystemData;
    case 'RequestJournal': return accessor(new RequestJournal())! as RequestJournal;
    case 'RequestRestart': return accessor(new RequestRestart())! as RequestRestart;
    case 'RequestGetUserSettings': return accessor(new RequestGetUserSettings())! as RequestGetUserSettings;
    case 'RequestSetUserSettings': return accessor(new RequestSetUserSettings())! as RequestSetUserSettings;
    case 'RequestTimeseries': return accessor(new RequestTimeseries())! as RequestTimeseries;
    case 'RequestOpenDoor': return accessor(new RequestOpenDoor())! as RequestOpenDoor;
    case 'RequestEnrollNewFinger': return accessor(new RequestEnrollNewFinger())! as RequestEnrollNewFinger;
    case 'RequestDeleteFinger': return accessor(new RequestDeleteFinger())! as RequestDeleteFinger;
    case 'RequestDeleteAllFingers': return accessor(new RequestDeleteAllFingers())! as RequestDeleteAllFingers;
    case 'RequestRenameFinger': return accessor(new RequestRenameFinger())! as RequestRenameFinger;
    case 'RequestFingerprintSensorInfo': return accessor(new RequestFingerprintSensorInfo())! as RequestFingerprintSensorInfo;
    case 'RequestFingers': return accessor(new RequestFingers())! as RequestFingers;
    case 'RequestCancelInstruction': return accessor(new RequestCancelInstruction())! as RequestCancelInstruction;
    default: return null;
  }
}

export function unionListToRequests(
  type: Requests, 
  accessor: (index: number, obj:CommandMessage|RequestCancelInstruction|RequestDeleteAllFingers|RequestDeleteFinger|RequestEnrollNewFinger|RequestFingerprintSensorInfo|RequestFingers|RequestGetUserSettings|RequestJournal|RequestNetworkInformation|RequestOpenDoor|RequestRenameFinger|RequestRestart|RequestSetUserSettings|RequestSystemData|RequestTimeseries|RequestWifiConnect|RequestWifiDisconnect) => CommandMessage|RequestCancelInstruction|RequestDeleteAllFingers|RequestDeleteFinger|RequestEnrollNewFinger|RequestFingerprintSensorInfo|RequestFingers|RequestGetUserSettings|RequestJournal|RequestNetworkInformation|RequestOpenDoor|RequestRenameFinger|RequestRestart|RequestSetUserSettings|RequestSystemData|RequestTimeseries|RequestWifiConnect|RequestWifiDisconnect|null, 
  index: number
): CommandMessage|RequestCancelInstruction|RequestDeleteAllFingers|RequestDeleteFinger|RequestEnrollNewFinger|RequestFingerprintSensorInfo|RequestFingers|RequestGetUserSettings|RequestJournal|RequestNetworkInformation|RequestOpenDoor|RequestRenameFinger|RequestRestart|RequestSetUserSettings|RequestSystemData|RequestTimeseries|RequestWifiConnect|RequestWifiDisconnect|null {
  switch(Requests[type]) {
    case 'NONE': return null; 
    case 'websensact_CommandMessage': return accessor(index, new CommandMessage())! as CommandMessage;
    case 'RequestNetworkInformation': return accessor(index, new RequestNetworkInformation())! as RequestNetworkInformation;
    case 'RequestWifiConnect': return accessor(index, new RequestWifiConnect())! as RequestWifiConnect;
    case 'RequestWifiDisconnect': return accessor(index, new RequestWifiDisconnect())! as RequestWifiDisconnect;
    case 'RequestSystemData': return accessor(index, new RequestSystemData())! as RequestSystemData;
    case 'RequestJournal': return accessor(index, new RequestJournal())! as RequestJournal;
    case 'RequestRestart': return accessor(index, new RequestRestart())! as RequestRestart;
    case 'RequestGetUserSettings': return accessor(index, new RequestGetUserSettings())! as RequestGetUserSettings;
    case 'RequestSetUserSettings': return accessor(index, new RequestSetUserSettings())! as RequestSetUserSettings;
    case 'RequestTimeseries': return accessor(index, new RequestTimeseries())! as RequestTimeseries;
    case 'RequestOpenDoor': return accessor(index, new RequestOpenDoor())! as RequestOpenDoor;
    case 'RequestEnrollNewFinger': return accessor(index, new RequestEnrollNewFinger())! as RequestEnrollNewFinger;
    case 'RequestDeleteFinger': return accessor(index, new RequestDeleteFinger())! as RequestDeleteFinger;
    case 'RequestDeleteAllFingers': return accessor(index, new RequestDeleteAllFingers())! as RequestDeleteAllFingers;
    case 'RequestRenameFinger': return accessor(index, new RequestRenameFinger())! as RequestRenameFinger;
    case 'RequestFingerprintSensorInfo': return accessor(index, new RequestFingerprintSensorInfo())! as RequestFingerprintSensorInfo;
    case 'RequestFingers': return accessor(index, new RequestFingers())! as RequestFingers;
    case 'RequestCancelInstruction': return accessor(index, new RequestCancelInstruction())! as RequestCancelInstruction;
    default: return null;
  }
}