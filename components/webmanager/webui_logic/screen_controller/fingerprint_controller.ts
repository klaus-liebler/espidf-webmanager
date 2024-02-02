import { Mac6, RequestJournal, RequestRestart, RequestSystemData, ResponseSystemData } from "../flatbuffers_gen/webmanager";
import { Message } from "../flatbuffers_gen/webmanager/message";
import { MessageWrapper } from "../flatbuffers_gen/webmanager/message-wrapper";
import { gel, MyFavouriteDateTimeFormat } from "../utils";
import { ScreenController } from "./screen_controller";
import * as flatbuffers from 'flatbuffers';
import { Severrity } from "./dialog_controller";
import { UPLOAD_URL } from "../constants";


export class SystemScreenController extends ScreenController {
    private btnEnrollNewFinger = <HTMLInputElement>gel("btnEnrollNewFinger");
    private tblKnownFingers = <HTMLTableSectionElement>gel("tblKnownFingers");
    private tblFingerprintSensorInfo=<HTMLTableSectionElement>gel("tblFingerprintSensorInfo");

    //jede Tabellenzeile hat einen Button "Rename" und einen Button "Delete"
    //im Property-Speicher des ESP32 wird abgelegt, welche Bezeichnung zu welcher internen Nummer gehört
    //Das Anlegen eines Eintrages findet ausschließlich über die Automatische Nummerierung statt
    //in der Tabelle wird auch die interne Speichernummer angezeigt

    private sendRequestEnrollNewFinger() {
        let b = new flatbuffers.Builder(1024);
        let n = RequestRestart.createRequestRestart(b);
        let mw = MessageWrapper.createMessageWrapper(b, Message.RequestRestart, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array());
    }

    private sendRequestDeleteFinger(){

    }

    private sendReqestDeleteAllFingers(){

    }

    private sendRequestFingerprintSensorInfo() {
        let b = new flatbuffers.Builder(1024);
        let n = RequestSystemData.createRequestSystemData(b);
        let mw = MessageWrapper.createMessageWrapper(b, Message.RequestSystemData, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Message.ResponseSystemData], 3000);
    }

    

    onMessage(messageWrapper: MessageWrapper): void {
        if (messageWrapper.messageType() != Message.ResponseSystemData) {
            return;
        }
        let sd = <ResponseSystemData>messageWrapper.message(new ResponseSystemData());
        this.tblParameters.textContent = "";

        let secondsEpoch = sd.secondsEpoch();
        let localeDate = new Date(Number(1000n * secondsEpoch)).toLocaleString("de-DE", MyFavouriteDateTimeFormat);
        this.insertParameter("Real Time Clock", localeDate + " [" + secondsEpoch.toString() + " secs since epoch]");
        this.insertParameter("Uptime [secs]", sd.secondsUptime().toString());
        this.insertParameter("Free Heap [byte]", sd.freeHeap());
        this.insertParameter("MAC Address WIFI_STA", this.mac6_2_string(sd.macAddressWifiSta()));
        this.insertParameter("MAC Address WIFI_SOFTAP", this.mac6_2_string(sd.macAddressWifiSoftap()));
        this.insertParameter("MAC Address BT", this.mac6_2_string(sd.macAddressBt()));
        this.insertParameter("MAC Address ETH", this.mac6_2_string(sd.macAddressEth()));
        this.insertParameter("MAC Address IEEE802154", this.mac6_2_string(sd.macAddressIeee802154()));
        this.insertParameter("Chip Model", findChipModel(sd.chipModel()));
        this.insertParameter("Chip Features", findChipFeatures(sd.chipFeatures()));
        this.insertParameter("Chip Revision", sd.chipRevision());
        this.insertParameter("Chip Cores", sd.chipCores());
        this.insertParameter("Chip Temperature", sd.chipTemperature().toLocaleString() + "°C");

        this.tblAppPartitions.textContent = "";
        for (let i = 0; i < sd.partitionsLength(); i++) {
            if (sd.partitions(i)!.type() != 0) continue;
            var row = this.tblAppPartitions.insertRow();
            row.insertCell().textContent = <string>sd.partitions(i)!.label();
            row.insertCell().textContent = findPartitionSubtype(sd.partitions(i)!.type(), sd.partitions(i)!.subtype());
            row.insertCell().textContent = (sd.partitions(i)!.size() / 1024) + "k";
            row.insertCell().textContent = findPartitionState(sd.partitions(i)!.otaState());
            row.insertCell().textContent = sd.partitions(i)!.running().toString();
            row.insertCell().textContent = this.partitionString(sd.partitions(i)!.appName(), "<undefined>");
            row.insertCell().textContent = this.partitionString(sd.partitions(i)!.appVersion(), "<undefined>");
            row.insertCell().textContent = this.partitionString(sd.partitions(i)!.appDate(), "<undefined>");
            row.insertCell().textContent = this.partitionString(sd.partitions(i)!.appTime(), "<undefined>");
        }
        this.tblDataPartitions.textContent = "";
        for (let i = 0; i < sd.partitionsLength(); i++) {
            if (sd.partitions(i)!.type() != 1) continue;
            var row = this.tblDataPartitions.insertRow();
            row.insertCell().textContent = <string>sd.partitions(i)!.label();
            row.insertCell().textContent = findPartitionSubtype(sd.partitions(i)!.type(), sd.partitions(i)!.subtype());
            row.insertCell().textContent = (sd.partitions(i)!.size() / 1024) + "k";
        }
    }

    private insertParameter(name: string, value: string | number) {
        var row = this.tblParameters.insertRow();
        row.insertCell().textContent = name;
        row.insertCell().textContent = value.toString();
    }

   

    onCreate(): void {
        this.btnUpload.onclick = (e: MouseEvent) => this.startUpload(e);
        this.btnRestart.onclick = (e: MouseEvent) => {
            this.appManagement.DialogController().showOKCancelDialog(Severrity.WARN, "Are you really sure to restart the system", (s) => { if (s) this.sendRequestRestart(); });
        };

        if (window["NDEFReader"]) {
            var ndef = new NDEFReader();

            ndef.onreading = (event) => {
                console.log(`Serial Number: ${event.serialNumber}, Records Length:${event.message.records.length}`);
                var td = new TextDecoder();
                this.appManagement.log(`Serial Number: ${event.serialNumber}, Records Length:${event.message.records.length}`);
                for (const record of event.message.records) {
                    if (!record.data) continue;
                    this.appManagement.log(`   Record ${record.recordType} ${record.mediaType} ${record.data.byteLength} ${td.decode(record.data)}`);
                }
            };

        }
        this.appManagement.registerWebsocketMessageTypes(this, Message.ResponseSystemData);

    }
    onFirstStart(): void {
        this.sendRequestSystemdata();
    }
    onRestart(): void {
        this.sendRequestSystemdata();
    }
    onPause(): void {
    }

}
