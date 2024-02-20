import { NotifyCanMessage, ResponseWrapper, Responses } from "../flatbuffers_gen/webmanager";
import { gel, MyFavouriteDateTimeFormat } from "../utils";
import { ScreenController } from "./screen_controller";


export class CanMonitorScreenController extends ScreenController {
    private tblCanMessages = <HTMLTableSectionElement>gel("tblCanMessages");

    private uint8Array2HexString(d:NotifyCanMessage){
        var s="";
        for (let index = 0; index < d.dataLen(); index++) {
            var xx=d.data()!.data(index)!.toString(16);
            if(xx.length==1) s+="0"+xx;
            else s+=xx;
        }
        return s;
    }

    onMessage(messageWrapper: ResponseWrapper): void {
        if (messageWrapper.responseType() != Responses.NotifyCanMessage) {
            return;
        }
        let d = <NotifyCanMessage>messageWrapper.response(new NotifyCanMessage());
        if(this.tblCanMessages.rows.length>100){
            this.tblCanMessages.deleteRow(-1);
        }
        var row = this.tblCanMessages.insertRow(0);
        row.insertCell().textContent = new Date().toLocaleString("de-DE", MyFavouriteDateTimeFormat);
        row.insertCell().textContent = d.messageId().toString(16);
        row.insertCell().textContent = this.uint8Array2HexString(d);
        row.insertCell().textContent = d.dataLen.toString();
            

       
       
    }

    onCreate(): void {
        this.appManagement.registerWebsocketMessageTypes(this, Responses.NotifyCanMessage);

    }
    onFirstStart(): void {
        
    }
    onRestart(): void {
        
    }
    onPause(): void {
    }

}
