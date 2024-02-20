import { Severity } from "./dialog_controller";
import { ScreenController } from "./screen_controller";
import { gel, $, gqsa, Html, ip4_2_string } from "../utils";
import * as flatbuffers from 'flatbuffers';
import { RequestNetworkInformation, RequestWifiConnect, RequestWifiDisconnect, RequestWrapper, Requests, ResponseNetworkInformation, ResponseWifiConnectSuccessful, ResponseWrapper, Responses } from "../flatbuffers_gen/webmanager";

const icon_lock_template = document.getElementById("icon-lock") as HTMLTemplateElement;
const icon_rssi_template = document.getElementById("icon-wifi") as HTMLTemplateElement;


export class WifimanagerController extends ScreenController {
    onConnectToWifi(ssid: string): void {
        this.appManagement.DialogController().showEnterPasswordDialog(Severity.INFO, "Enter Password for Wifi", (password: string) => {
            this.sendRequestWifiConnect(ssid, password);
        });
    }

    private sendRequestWifiAccesspoints(forceNewSearch:boolean) {
        let b = new flatbuffers.Builder(1024);
        let n = RequestNetworkInformation.createRequestNetworkInformation(b, forceNewSearch);
        let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestNetworkInformation, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseNetworkInformation], 30000);
    }

    private sendRequestWifiConnect(ssid: string, password: string) {
        let b = new flatbuffers.Builder(1024);
        let ssidOffset = b.createString(ssid);
        let passwordOffset = b.createString(password);
        let n = RequestWifiConnect.createRequestWifiConnect(b, ssidOffset, passwordOffset);
        let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestWifiConnect, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseWifiConnectSuccessful, Responses.ResponseWifiConnectFailed], 30000);
    }

    private sendRequestWifiDisconnect() {
        let b = new flatbuffers.Builder(1024);
        let n = RequestWifiDisconnect.createRequestWifiDisconnect(b)
        let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestWifiDisconnect, n);
        b.finish(mw);
        this.appManagement.sendWebsocketMessage(b.asUint8Array());
    }

    onCreate(): void {
        this.appManagement.registerWebsocketMessageTypes(this, Responses.ResponseNetworkInformation, Responses.ResponseWifiConnectFailed ,Responses.ResponseWifiConnectSuccessful, Responses.ResponseWifiDisconnect);
        gel("btnWifiShowDetails").onclick = () => this.appManagement.DialogController().showOKDialog(Severity.INFO, "Das sind die Details", (s) => { });
        gel("btnWifiUpdateList").onclick = () =>{this.sendRequestWifiAccesspoints(false);};
        gel("btnWifiDisconnect").onclick=()=> this.appManagement.DialogController().showOKCancelDialog(Severity.WARN, "Möchten Sie wirklich die bestehende Verbindung trennen und damit auch vom ESP32 löschen?", (ok) => {if(ok) this.sendRequestWifiDisconnect();});
    }



    onFirstStart(): void {
        this.sendRequestWifiAccesspoints(false);
    }
    onRestart(): void {

    }
    onPause(): void {

    }

    onResponseNetworkInformation(r: ResponseNetworkInformation) {
        gqsa(".hostname", (e) => e.textContent = r.hostname());
        gqsa(".ssid_ap", (e) => e.textContent = r.ssidAp());
        gqsa(".password_ap", (e) => e.textContent = r.passwordAp());
        gqsa(".ip_ap", (e) => e.textContent = ip4_2_string(r.ipAp()));
        gqsa(".is_connected_sta", (e) => e.style.backgroundColor=r.isConnectedSta()?"green":"red");
        gqsa(".ssid_sta", (e) => e.textContent = r.ssidSta());
        gqsa(".ip_sta", (e) => e.textContent = ip4_2_string(r.ipSta()));
        gqsa(".netmask_sta", (e) => e.textContent = ip4_2_string(r.netmaskSta()));
        gqsa(".gateway_sta", (e) => e.textContent = ip4_2_string(r.gatewaySta()));
        gqsa(".rssi_sta", (e) => e.textContent = r.rssiSta().toLocaleString()+"dB");
        let ssid2index = new Map<string, number>();
        for (let i = 0; i < r.accesspointsLength(); i++) {
            let key = r.accesspoints(i)!.ssid() + "_" + r.accesspoints(i)!.authMode();
            let ap_exist = ssid2index.get(key);
            if (ap_exist === undefined) {
                ssid2index.set(key, i);
            }
        }

        let access_points_list = [...ssid2index.values()];
        access_points_list.sort((a, b) => {
            //sort according to rssi
            var x = r.accesspoints(a)!.rssi();
            var y = r.accesspoints(b)!.rssi();
            return x < y ? 1 : x > y ? -1 : 0;
        });


        let table = gel("tblAccessPointList");
        table.textContent = "";
        for (let i of access_points_list) {
            let tr = Html(table, "tr");
            let td_rssi = Html(tr, "td");
            let figure_rssi = document.importNode(icon_rssi_template.content, true);
            td_rssi.appendChild(figure_rssi);
            let td_auth = Html(tr, "td");
            if (r.accesspoints(i)!.authMode() != 0) {
                td_auth.appendChild(document.importNode(icon_lock_template.content, true));
            }
            let rssiIcon = td_rssi.children[0];
            (rssiIcon.children[0] as SVGPathElement).style.fill = r.accesspoints(i)!.rssi() >= -60 ? "black" : "Gray";
            (rssiIcon.children[1] as SVGPathElement).style.fill = r.accesspoints(i)!.rssi() >= -67 ? "black" : "Gray";
            (rssiIcon.children[2] as SVGPathElement).style.fill = r.accesspoints(i)!.rssi() >= -75 ? "black" : "Gray";
            Html(tr, "td", [], [], `${r.accesspoints(i)!.ssid()} [${r.accesspoints(i)!.rssi()}dB]`);
            let buttonParent = Html(tr, "td");
            let button = <HTMLInputElement>Html(buttonParent, "input", ["type", "button", "value", `Connect`]);
            button.onclick = () => {
                this.onConnectToWifi(r.accesspoints(i)!.ssid()!);
            };
        }
    }

    onResponseWifiConnectSuccessful(r: ResponseWifiConnectSuccessful) {
        console.info("Got connection!");
        this.appManagement.DialogController().showOKDialog(Severity.SUCCESS, `Connection to ${r.ssid()} was successful. `, () => { });
        gqsa(".current_ssid", (e) => e.textContent = r.ssid());
        gqsa(".current_ip", (e) => e.textContent = ip4_2_string(r.ip()));
        gqsa(".current_netmask", (e) => e.textContent = ip4_2_string(r.netmask()));
        gqsa(".current_gw", (e) => e.textContent = ip4_2_string(r.gateway()));

        gqsa(".current_rssi", (e) => e.textContent = r.rssi().toLocaleString()+"dB");
    }

    onMessage(messageWrapper: ResponseWrapper): void {
        switch (messageWrapper.responseType()) {
            case Responses.ResponseNetworkInformation: 
                this.onResponseNetworkInformation(<ResponseNetworkInformation>messageWrapper.response(new ResponseNetworkInformation()));
                break;
            case Responses.ResponseWifiConnectSuccessful:
                this.onResponseWifiConnectSuccessful(<ResponseWifiConnectSuccessful>messageWrapper.response(new ResponseWifiConnectSuccessful()));
               
                break;
            case Responses.ResponseWifiDisconnect:
                console.log("Manual disconnect requested...");
                this.appManagement.DialogController().showOKDialog(Severity.INFO, "Manual disconnection was successful. ", () => { });
                break;
            case Responses.ResponseWifiConnectFailed:
                console.info("Connection attempt failed!");
                this.appManagement.DialogController().showOKDialog(Severity.ERROR, "Connection attempt failed! ", () => { });
            break;
        }
    }
}