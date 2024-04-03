import { Mac6, RequestRestart, RequestSystemData, RequestWrapper, Requests, ResponseSystemData, ResponseWrapper, Responses } from "../generated/flatbuffers/webmanager";
import { findChipModel, findChipFeatures, findPartitionState, findPartitionSubtype } from "../esp32";
import { gel, MyFavouriteDateTimeFormat } from "../utils";
import { ScreenController } from "./screen_controller";
import * as flatbuffers from 'flatbuffers';
import { Severity } from "./dialog_controller";
import { UPLOAD_URL } from "../constants";


export class SystemScreenController extends ScreenController {
    private btnUpload = <HTMLInputElement>gel("btnUpload");
    private btnNfc = <HTMLInputElement>gel("btnNfc");
    private btnRestart = <HTMLInputElement>gel("btnRestart");
    private inpOtafile = <HTMLInputElement>gel("inpOtafile");
    private lblProgress = <HTMLInputElement>gel("lblProgress");
    private prgbProgress = <HTMLInputElement>gel("prgbProgress");
    private tblAppPartitions = <HTMLTableSectionElement>gel("tblAppPartitions");
    private tblDataPartitions = <HTMLTableSectionElement>gel("tblDataPartitions");
    private tblParameters = <HTMLTableSectionElement>gel("tblParameters");

    private sendRequestRestart() {
        let b = new flatbuffers.Builder(1024);
        let n = RequestRestart.createRequestRestart(b);
        let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestRestart, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array());
    }

    private sendRequestSystemdata() {
        let b = new flatbuffers.Builder(1024);
        let n = RequestSystemData.createRequestSystemData(b);
        let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestSystemData, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseSystemData], 3000);
    }

    partitionString(original: string | null, def: string) {
        return (original?.charAt(0) == '\0xFF') ? def : original;
    }

    onMessage(messageWrapper: ResponseWrapper): void {
        if (messageWrapper.responseType() != Responses.ResponseSystemData) {
            return;
        }
        let sd = <ResponseSystemData>messageWrapper.response(new ResponseSystemData());
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

    private mac6_2_string(mac: Mac6 | null): string {
        if (!mac) return "No Mac";
        return `${mac.v(0)}:${mac.v(1)}:${mac.v(2)}:${mac.v(3)}:${mac.v(4)}:${mac.v(5)}`;
    }

    private startUpload(e: MouseEvent) {
        let otafiles = this.inpOtafile!.files!;
        if (otafiles.length == 0) {
            this.appManagement.DialogController().showOKDialog(0, "No file selected!");
            return;
        }

        this.inpOtafile.disabled = true;
        this.btnUpload.disabled = true;

        var file = otafiles[0];
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = (e: Event) => {
            console.info(`onreadystatechange: e:${e}; xhr:${xhr}; xhr.text:${xhr.responseText}; xhr.readyState:${xhr.readyState}`);
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    this.appManagement.DialogController().showOKDialog(Severity.SUCCESS, xhr.responseText);
                } else if (xhr.status == 0) {
                    console.error("Server closed the connection abruptly!");
                } else {
                    console.error(" Error!\n" + xhr.responseText);
                }
            }
        };


        xhr.upload.onprogress = (e: ProgressEvent) => {

            let percent = (e.loaded / e.total * 100).toFixed(0);
            this.lblProgress.textContent = "Progress: " + percent + "%";
            this.prgbProgress.value = percent;
        };
        console.log(`Trying to POST ${UPLOAD_URL}`);
        xhr.open("POST", UPLOAD_URL, true);
        xhr.send(file);

    }

    onCreate(): void {
        this.btnUpload.onclick = (e: MouseEvent) => this.startUpload(e);
        this.btnRestart.onclick = (e: MouseEvent) => {
            this.appManagement.DialogController().showOKCancelDialog(Severity.WARN, "Are you really sure to restart the system", (s) => { if (s) this.sendRequestRestart(); });
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

            this.btnNfc.onclick = async () => {
                console.log("Scan starting");
                this.appManagement.log("Scan starting");
                await ndef.scan();
                console.log("Scan Returned");
                this.appManagement.log("Scan Returned");
            }
        }
        this.appManagement.registerWebsocketMessageTypes(this, Responses.ResponseSystemData);

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
