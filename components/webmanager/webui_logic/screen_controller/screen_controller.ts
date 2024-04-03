
import { AppManagement, WebsocketMessageListener } from "../app_management";
import { RequestJournal, RequestWrapper, Requests, ResponseJournal, ResponseWrapper, Responses } from "../generated/flatbuffers/webmanager";
import { $, MyFavouriteDateTimeFormat } from "../utils";
import { DialogController, Severity } from "./dialog_controller";
import * as flatbuffers from 'flatbuffers';

export enum ControllerState {
    CREATED,
    STARTED,
    PAUSED,
}



export abstract class ScreenController implements WebsocketMessageListener {
    constructor(protected appManagement: AppManagement) {

    }
    abstract onCreate(): void;
    abstract onFirstStart(): void;
    abstract onRestart(): void;
    abstract onPause(): void;
    abstract onMessage(messageWrapper:ResponseWrapper):void;
}

export class ScreenControllerWrapper  implements AppManagement{

    public controller!: ScreenController; 

    constructor(public name: string, public state: ControllerState, public element: HTMLElement, private parent:AppManagement) { }
    DialogController(): DialogController {
        return this.parent.DialogController();
    }
    MainElement(): HTMLElement {
        return this.element;
    }
    registerWebsocketMessageTypes(listener: WebsocketMessageListener, ...messageType: number[]): void {
        return this.parent.registerWebsocketMessageTypes(listener, ...messageType);
    }
    sendWebsocketMessage(data: ArrayBuffer, messageToUnlock?:Array<Responses> | undefined, maxWaitingTimeMs?: number | undefined): void {
        return this.parent.sendWebsocketMessage(data, messageToUnlock, maxWaitingTimeMs);
    }

    log(text:string){
        return this.parent.log(text);
    }

    showSnackbar(severity:Severity, text:string){
        return this.parent.showSnackbar(severity, text);
    }
}

export class DefaultScreenController extends ScreenController {
    onMessage(messageWrapper: ResponseWrapper): void {
        
    }
    onCreate(): void {

    }
    onFirstStart(): void {

    }
    onRestart(): void {

    }
    onPause(): void {

    }
}



export class WeblogScreenController extends ScreenController {
    onMessage(messageWrapper: ResponseWrapper): void {
        let res = <ResponseJournal>messageWrapper.response(new ResponseJournal());
        this.tblLogs.innerText="";
        for (let i = 0; i < res.journalItemsLength(); i++) {
            let item = res.journalItems(i);
            if(!item)return;
            var row = this.tblLogs.insertRow();
            let secondsEpoch = item.lastMessageTimestamp()!;
            if (secondsEpoch > 1684412222){
                row.insertCell().textContent = new Date(1000*Number(secondsEpoch)).toLocaleString("de-DE", MyFavouriteDateTimeFormat);;
            }else{
                row.insertCell().textContent=secondsEpoch.toString();
            }
          
            row.insertCell().textContent = item.messageCode().toString();
            row.insertCell().textContent = item.messageString();
            row.insertCell().textContent = item.messageData().toString();
            row.insertCell().textContent = item.messageCount().toString();
        }
    }
    private tblLogs = <HTMLTableSectionElement>$("#tblLogs");

    sendRequestJournal(){
        let b = new flatbuffers.Builder(256);
        let n = RequestJournal.createRequestJournal(b);
        let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestJournal, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseJournal], 3000);
    }

    onCreate(): void {
        this.appManagement.registerWebsocketMessageTypes(this, Responses.ResponseJournal)
        this.sendRequestJournal();
        $("#btnUpdateJournal").onclick=()=>{
            this.sendRequestJournal();
        }
    }

    onFirstStart(): void {
        
    }
    onRestart(): void {
        
    }
    onPause(): void {
        
    }

}
