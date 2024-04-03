import { ResponseWrapper, Responses } from "./generated/flatbuffers/webmanager";
import { DialogController, Severity } from "./screen_controller/dialog_controller"

export interface WebsocketMessageListener{
    onMessage(messageWrapper:ResponseWrapper):void;
}

export interface AppManagement
{
    DialogController():DialogController;
    MainElement():HTMLElement;
    registerWebsocketMessageTypes(listener: WebsocketMessageListener, ...messageType:number[]):void;
    sendWebsocketMessage(data:ArrayBuffer, messageToUnlock?:Array<Responses>, maxWaitingTimeMs?:number):void;
    log(text:string):void;
    showSnackbar(severity:Severity, text:string):void;
};