<script lang="ts">
    import { onMount } from 'svelte'
    import type { IAppManagement, IMountEventListener, IWebsocketMessageListener } from '../utils/interfaces'
    import icon_wifi from '../assets/icon-wifi.svg'

    import * as flatbuffers from 'flatbuffers'
    import {
        RequestNetworkInformation,
        RequestWifiConnect,
        RequestWifiDisconnect,
        RequestWrapper,
        Requests,
        ResponseNetworkInformation,
        ResponseWifiConnectSuccessful,
        ResponseWrapper,
        Responses,
    } from '../generated/flatbuffers/webmanager'
    import { Severity, ip4_2_string } from '../utils/common'

    var r:ResponseNetworkInformation;
    var access_points_list:number[]=[];
    export var app: IAppManagement
    export const M = new (class implements IWebsocketMessageListener, IMountEventListener {
        constructor(private appManagement: IAppManagement) {}

        onConnectToWifi(ssid?: string|null|undefined): void {
            if(!ssid) return;
            this.appManagement.showEnterPasswordDialog('Enter Password for Wifi', (ok:boolean, password: string) => {
                if(ok) this.sendRequestWifiConnect(ssid, password)
            })
        }

        private sendRequestWifiAccesspoints(forceNewSearch: boolean) {
            let b = new flatbuffers.Builder(1024)
            let n = RequestNetworkInformation.createRequestNetworkInformation(b, forceNewSearch)
            let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestNetworkInformation, n)
            b.finish(mw)
            this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseNetworkInformation], 30000)
        }

        private sendRequestWifiConnect(ssid: string, password: string) {
            let b = new flatbuffers.Builder(1024)
            let ssidOffset = b.createString(ssid)
            let passwordOffset = b.createString(password)
            let n = RequestWifiConnect.createRequestWifiConnect(b, ssidOffset, passwordOffset)
            let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestWifiConnect, n)
            b.finish(mw)
            this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseWifiConnectSuccessful, Responses.ResponseWifiConnectFailed], 30000)
        }

        private sendRequestWifiDisconnect() {
            let b = new flatbuffers.Builder(1024)
            let n = RequestWifiDisconnect.createRequestWifiDisconnect(b)
            let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestWifiDisconnect, n)
            b.finish(mw)
            this.appManagement.sendWebsocketMessage(b.asUint8Array())
        }

        onMount(): () => void {
            var unregisterer= this.appManagement.registerWebsocketMessageTypes(
                this,
                Responses.ResponseNetworkInformation,
                Responses.ResponseWifiConnectFailed,
                Responses.ResponseWifiConnectSuccessful,
                Responses.ResponseWifiDisconnect,
            )    

            this.sendRequestWifiAccesspoints(false)
            return unregisterer;
        }

        onBtnWifiDisconnect(){
            this.appManagement.showOKCancelDialog(Severity.WARN, 'Möchten Sie wirklich die bestehende Verbindung trennen und damit auch vom ESP32 löschen?', (ok, value) => {
                        if (ok) this.sendRequestWifiDisconnect()
                    })
        }

        onBtnWifiUpdateList(){
            this.sendRequestWifiAccesspoints(false)
        }


        onResponseNetworkInformation(p_r: ResponseNetworkInformation) {
            isConnectedSta=p_r.isConnectedSta();
            ssidSta= p_r.ssidSta()??"";
            ipSta=ip4_2_string(p_r.ipSta());
            netmaskSta=ip4_2_string(p_r.netmaskSta());
            gatewaySta = ip4_2_string(p_r.gatewaySta());
            rssiSta = p_r.rssiSta().toLocaleString() + 'dB';
            r=p_r;

            let ssid2index = new Map<string, number>()
            for (let i = 0; i < p_r.accesspointsLength(); i++) {
                let key = p_r.accesspoints(i)!.ssid() + '_' + p_r.accesspoints(i)!.authMode()
                let ap_exist = ssid2index.get(key)
                if (ap_exist === undefined) {
                    ssid2index.set(key, i)
                }
            }

            access_points_list = [...ssid2index.values()]
            access_points_list.sort((a, b) => {
                //sort according to rssi
                var x = p_r.accesspoints(a)!.rssi()
                var y = p_r.accesspoints(b)!.rssi()
                return x < y ? 1 : x > y ? -1 : 0
            })

            
        }

        onResponseWifiConnectSuccessful(r: ResponseWifiConnectSuccessful) {
            console.info('Got connection!')
            this.appManagement.showOKDialog(Severity.SUCCESS, `Connection to ${r.ssid()} was successful. `)
            isConnectedSta=true;
            ssidSta=r.ssid()??"";
            ipSta= ip4_2_string(r.ip());
            netmaskSta=  ip4_2_string(r.netmask());
            gatewaySta= ip4_2_string(r.gateway());
            rssiSta= r.rssi().toLocaleString() + 'dB'
        }

        onMessage(messageWrapper: ResponseWrapper): void {
            switch (messageWrapper.responseType()) {
                case Responses.ResponseNetworkInformation:
                    this.onResponseNetworkInformation(<ResponseNetworkInformation>messageWrapper.response(new ResponseNetworkInformation()))
                    break
                case Responses.ResponseWifiConnectSuccessful:
                    this.onResponseWifiConnectSuccessful(<ResponseWifiConnectSuccessful>messageWrapper.response(new ResponseWifiConnectSuccessful()))
                    break
                case Responses.ResponseWifiDisconnect:
                    console.log('Manual disconnect requested...')
                    this.appManagement.showOKDialog(Severity.INFO, 'Manual disconnection was successful.')
                    break
                case Responses.ResponseWifiConnectFailed:
                    console.info('Connection attempt failed!')
                    this.appManagement.showOKDialog(Severity.ERROR, 'Connection attempt failed!')
                    break
            }
        }
    })(app)

    onMount(() => {
        return M.onMount()
    })

    function rssi2color(i: number, limit:number){

        var rssi=r.accesspoints(i)?.rssi()??-1000;
        return rssi>= limit?'black':'lightgrey';

    }

    var isConnectedSta=false;
    var ssidSta="";
    var ipSta="0.0.0.0";
    var netmaskSta="0.0.0.0";
    var gatewaySta="0.0.0.0";
    var rssiSta="unknown";
</script>

<h1>Current Wifi-Connection (as stored in flash, maybe not connected)</h1>
<div class="buttons">
    <input type="button" value="Disconnect & Delete" on:click={M.onBtnWifiDisconnect} />
    <input type="button" value="Show More Details" />
</div>
<table>
    <tbody>
        <tr>
            <td>Connection State</td>
            <td style:background-color={isConnectedSta ? 'green' : 'red'}></td>
        </tr>
        <tr>
            <td>Current SSID</td>
            <td>{ssidSta}</td>
        </tr>
        
        <tr>
            <td>IP</td>
            <td>{ipSta}</td>
        </tr>
        <tr>
            <td>Netmask</td>
            <td>{netmaskSta}</td>
        </tr>
        <tr>
            <td>Gateway</td>
            <td>{gatewaySta}</td>
        </tr>
        <tr>
            <td>Signal Strength</td>
            <td>{rssiSta}</td>
        </tr>
    </tbody>

</table>

<h1>Common Network Configuration</h1>
<table>
    <tbody>
        {#if r}
        <tr>
            <td>Hostname</td>
            <td>{r.hostname()}</td>
        </tr>
        <tr>
            <td>Access Point SSID</td>
            <td>{r.ssidAp()}</td>
        </tr>
        <tr>
            <td>Access Point Password</td>
            <td>{r.passwordAp()}</td>
        </tr>
        <tr>
            <td>Access Point IP</td>
            <td>{ip4_2_string(r.ipAp())}</td>
        </tr>
        {/if}
    </tbody>
</table>

<h1>Select New Connection</h1>
<div class="buttons">
    <input type="button" value="Update Access Point List" on:click={()=>M.onBtnWifiUpdateList()} />
</div>
<table>
    <thead>
        <tr>
            <th style="width: 34px;">RSSI</th>
            <th style="width: 34px;">Security</th>
            <th>SSID</th>
            <th>Connect</th>
        </tr>

    </thead>
    <tbody>
        {#each access_points_list as i}
        {#if (r&& r.accesspoints(i))}
            <tr>
                <td><svg width="24" height="24" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path style:fill={rssi2color(i, -60)} d="M1,9L3,11C7.97,6.03 16.03,6.03 21,11L23,9C16.93,2.93 7.08,2.93 1,9Z" />
                    <path style:fill={rssi2color(i, -67)} d="M5,13L7,15C9.76,12.24 14.24,12.24 17,15L19,13C15.14,9.14 8.87,9.14 5,13Z" />
                    <path style:fill={rssi2color(i, -75)} d="M9,17L12,20L15,17C13.35,15.34 10.66,15.34 9,17Z" />
                    </svg></td>
                <td>
                    {#if r.accesspoints(i)?.authMode() != 0}
                    <svg width="24" height="24" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path style="fill: black;"
                            d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z">
                        </path>
                    </svg>
                    {/if}
                </td>
                <td>{`${r.accesspoints(i)?.ssid()} [${r.accesspoints(i)?.rssi()}dB]`}</td>
                <td><input type="button" value="Connect" on:click={()=>M.onConnectToWifi(r.accesspoints(i)?.ssid())}/></td>

            </tr>
            {/if}
        {/each}
    </tbody>
</table>
