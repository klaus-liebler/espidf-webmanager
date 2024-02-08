import {NotifyEnrollNewFinger, RequestDeleteAllFingers, RequestDeleteFinger, RequestEnrollNewFinger, RequestFingerprintSensorInfo, RequestFingers, RequestRestart, RequestSystemData, ResponseDeleteFinger, ResponseEnrollNewFinger, ResponseFingerprintSensorInfo, ResponseFingers, ResponseSystemData } from "../flatbuffers_gen/webmanager";
import { Message } from "../flatbuffers_gen/webmanager/message";
import { MessageWrapper } from "../flatbuffers_gen/webmanager/message-wrapper";
import { Html, gel} from "../utils";
import { Severrity } from "./dialog_controller";
import { ScreenController } from "./screen_controller";
import * as flatbuffers from 'flatbuffers';



export class FingerprintScreenController extends ScreenController {
    
    private tblFingers = <HTMLTableSectionElement>gel("tblFingers");
    private tblFingerprintSensorInfo=<HTMLTableSectionElement>gel("tblFingerprintSensorInfo");

    //jede Tabellenzeile hat einen Button "Rename" und einen Button "Delete"
    //im Property-Speicher des ESP32 wird abgelegt, welche Bezeichnung zu welcher internen Nummer gehört
    //Das Anlegen eines Eintrages findet ausschließlich über die Automatische Nummerierung statt
    //in der Tabelle wird auch die interne Speichernummer angezeigt



    public sendRequestDeleteFinger(index:number){
        let b = new flatbuffers.Builder(1024);
        b.finish(
            MessageWrapper.createMessageWrapper(b, Message.RequestDeleteFinger, 
                RequestDeleteFinger.createRequestDeleteFinger(b, index)
                )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Message.ResponseDeleteFinger]);
    }


    private insertParameter(name: string, value: string | number) {
        var row = this.tblFingerprintSensorInfo.insertRow();
        row.insertCell().textContent = name;
        row.insertCell().textContent = value.toString();
    }

    onMessage(messageWrapper: MessageWrapper): void {
        switch (messageWrapper.messageType()) {
            case Message.ResponseFingerprintSensorInfo:{
                let m = <ResponseFingerprintSensorInfo>messageWrapper.message(new ResponseFingerprintSensorInfo());
                this.tblFingerprintSensorInfo.textContent = "";
               
                this.insertParameter("Status", m.status());
                this.insertParameter("Security Level", m.securityLevel());
                this.insertParameter("Library Size", m.librarySize());
                this.insertParameter("Device Address", m.deviceAddress());
                this.insertParameter("DataPacketSizeCode", m.dataPacketSizeCode());
                this.insertParameter("Firmware", m.fwVer()!);
                this.insertParameter("Algorithm", m.algVer()!);
                this.insertParameter("Baud Rate", m.baudRateTimes9600()*9600+"baud");
                break;
            }
            case Message.ResponseFingers:
            {
                let m = <ResponseFingers>messageWrapper.message(new ResponseFingers());
                this.tblFingers.textContent = "";
                for (let i = 0; i < m.fingersLength(); i++) {
                    var row = this.tblFingers.insertRow();
                    row.insertCell().textContent = m.fingers(i)!.name();
                    row.insertCell().textContent = String(m.fingers(i)!.index());
                    var cell= row.insertCell();
                    let button = <HTMLInputElement>Html(cell, "input", ["type", "button", "value", `🗑`]);
                    button.onclick = () => {
                        this.sendRequestDeleteFinger(m.fingers(i)!.index());
                    };
                }
                break;
            }
            case Message.ResponseDeleteFinger:{
                let m = <ResponseDeleteFinger>messageWrapper.message(new ResponseDeleteFinger());
                if(!m.success()){
                    this.appManagement.DialogController().showOKDialog(Severrity.ERROR, `Error while deleting Finger ${m.name()}.`);
                    break;
                }

                this.appManagement.DialogController().showOKDialog(Severrity.SUCCESS, `Finger ${m.name()} successfully deleted.`);
                this.sendRequestFingers();
                break;
            }
            case Message.ResponseEnrollNewFinger:{
                let m = <ResponseEnrollNewFinger>messageWrapper.message(new ResponseEnrollNewFinger());
                if(!m.started()){
                    this.appManagement.DialogController().showOKDialog(Severrity.ERROR, `Enrollment could not be started.`);
                    break;
                }
                this.appManagement.DialogController().showOKDialog(Severrity.SUCCESS, `Enrollment successfully started. Put your finger on the sensor`);
            }
            case Message.NotifyEnrollNewFinger:{
                let m = <NotifyEnrollNewFinger>messageWrapper.message(new NotifyEnrollNewFinger());
                if(m.errorcode()!=0){
                    this.appManagement.DialogController().showOKDialog(Severrity.ERROR, `Error while enroll Finger ${m.name()}: ${m.errorcode()}.`);
                    break;
                }
                if(m.step()<13){
                    var step = Math.ceil(m.step()/2)
                    var collectImage = m.step()%2==1;
                    this.appManagement.DialogController().showOKDialog(Severrity.INFO, `Round ${step}: ${collectImage?"Collect Image":"Generate Feature"}.`);
                }
                else if(m.step()==13){
                    this.appManagement.DialogController().showOKDialog(Severrity.WARN, `Repeat fingerprint check`);
                }
                else if(m.step()==14){
                    this.appManagement.DialogController().showOKDialog(Severrity.INFO, `Merge feature`);
                }
                else if(m.step()==15){
                    this.appManagement.DialogController().showOKDialog(Severrity.SUCCESS, `Fingerprint successfully stored in Sensor with  name "${m.name()}" on index ${m.index}`);
                }
                else{
                    this.appManagement.DialogController().showOKDialog(Severrity.ERROR, `Unknown step: ${m.step()}!`);
                }
                break;
            }
        
            default:
                break;
        }
    }

    

   

    onCreate(): void {
        gel("btnFingerprintEnroll").onclick = (e: MouseEvent) => {
            this.appManagement.DialogController().showEnterFilenameDialog(1, "Enter name of finger", (name)=>{
                let b = new flatbuffers.Builder(1024);
                b.finish(
                    MessageWrapper.createMessageWrapper(b, Message.RequestEnrollNewFinger, 
                        RequestEnrollNewFinger.createRequestEnrollNewFinger(b, b.createString(name))
                    )
                );
                this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Message.ResponseEnrollNewFinger]);
            })
           
        };
        gel("btnDeleteAll").onclick=(e)=>{
            let b = new flatbuffers.Builder(1024);
            let n = RequestDeleteAllFingers.createRequestDeleteAllFingers(b);
            let mw = MessageWrapper.createMessageWrapper(b, Message.RequestDeleteAllFingers, n);
            b.finish(mw);
            this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Message.ResponseDeleteAllFingers]);
        };
        gel("btnFingerprintGetSensorInfo").onclick=(e)=>{
            let b = new flatbuffers.Builder(1024);
            b.finish(
                MessageWrapper.createMessageWrapper(b, Message.RequestFingerprintSensorInfo, 
                    RequestFingerprintSensorInfo.createRequestFingerprintSensorInfo(b)
                    )
            );
            this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Message.ResponseFingerprintSensorInfo]);
        }

        gel("btnUpdateFingers").onclick=()=>{
            this.sendRequestFingers();
        }

     
        
        this.appManagement.registerWebsocketMessageTypes(this, Message.ResponseEnrollNewFinger, Message.ResponseDeleteFinger, Message.ResponseDeleteAllFingers, Message.ResponseFingerprintSensorInfo, Message.ResponseFingers, Message.NotifyEnrollNewFinger);

    }
    private sendRequestFingers(){
        let b = new flatbuffers.Builder(1024);
        b.finish(
            MessageWrapper.createMessageWrapper(b, Message.RequestFingers, 
                RequestFingers.createRequestFingers(b)
                )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Message.ResponseFingers]);
    }

    onFirstStart(): void {
       this.sendRequestFingers();
    }
    onRestart(): void {
        this.sendRequestFingers();
    }
    onPause(): void {
    }

}
