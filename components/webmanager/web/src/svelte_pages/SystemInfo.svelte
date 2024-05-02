<script lang="ts">
    import { onMount } from 'svelte'
    import type { IAppManagement, IMountEventListener, IWebsocketMessageListener } from '../utils/interfaces'
    import {
        Mac6,
        RequestRestart,
        RequestSystemData,
        RequestWrapper,
        Requests,
        ResponseSystemData,
        ResponseWrapper,
        Responses,
    } from '../generated/flatbuffers/webmanager'
    import { findChipModel, findChipFeatures, findPartitionState, findPartitionSubtype, partitionString } from '../utils/esp32'
    import { MyFavouriteDateTimeFormat, Severity } from '../utils/common'

    import * as flatbuffers from 'flatbuffers'
    import { UPLOAD_URL } from '../constants'

    export var app: IAppManagement
    var rsd: ResponseSystemData

    let otaFiles:FileList;
    let uploadPercent:string="0";

    
    export const M = new (class implements IWebsocketMessageListener, IMountEventListener {
        constructor(private appManagement: IAppManagement) {}
        public sendRequestRestart() {
            let b = new flatbuffers.Builder(1024)
            let n = RequestRestart.createRequestRestart(b)
            let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestRestart, n)
            b.finish(mw)
            this.appManagement.sendWebsocketMessage(b.asUint8Array())
        }

        public startUpload() {
            
            if (otaFiles.length == 0) {
                this.appManagement.showOKDialog(Severity.ERROR, 'No file selected!')
                return
            }

            //this.inpOtafile.disabled = true //todo
            //this.btnUpload.disabled = true //todo

            var file = otaFiles[0]
            var xhr = new XMLHttpRequest()
            xhr.onreadystatechange = (e: Event) => {
                console.info(`onreadystatechange: e:${e}; xhr:${xhr}; xhr.text:${xhr.responseText}; xhr.readyState:${xhr.readyState}`)
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        this.appManagement.showOKDialog(Severity.SUCCESS, xhr.responseText)
                    } else if (xhr.status == 0) {
                        console.error('Server closed the connection abruptly!')
                    } else {
                        console.error(' Error!\n' + xhr.responseText)
                    }
                }
            }

            xhr.upload.onprogress = (e: ProgressEvent) => {
                uploadPercent = ((e.loaded / e.total) * 100).toFixed(0)
                
            }
            console.log(`Trying to POST ${UPLOAD_URL}`)
            xhr.open('POST', UPLOAD_URL, true)
            xhr.send(file)
        }

        private sendRequestSystemdata() {
            let b = new flatbuffers.Builder(1024)
            let n = RequestSystemData.createRequestSystemData(b)
            let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestSystemData, n)
            b.finish(mw)
            this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseSystemData], 3000)
        }

        onMessage(messageWrapper: ResponseWrapper): void {
            if (messageWrapper.responseType() != Responses.ResponseSystemData) {
                return
            }
            rsd = <ResponseSystemData>messageWrapper.response(new ResponseSystemData())
        }

        onMount(): () => void {
            var unregisterer = app.registerWebsocketMessageTypes(M, Responses.ResponseSystemData)
            console.info("SystemInfo onMount")
            this.sendRequestSystemdata()
            return unregisterer
        }
    })(app)

    onMount(() => {
        return M.onMount()
    })

    function mac6_2_string(mac: Mac6 | null): string {
        if (!mac) return 'No Mac'
        return `${mac.v(0)}:${mac.v(1)}:${mac.v(2)}:${mac.v(3)}:${mac.v(4)}:${mac.v(5)}`
    }

    function calcKibibyte(size: number | undefined): string {
        if (size == undefined) return 'Unknown'
        return size / 1024 + 'kib'
    }

    function localeDate(){
        if(!rsd) return "";
        return new Date(Number(1000n * rsd?.secondsEpoch())).toLocaleString('de-DE', MyFavouriteDateTimeFormat)
    }

    function appPartitionIndices():number[]{
        var arr = Array.from(Array(rsd.partitionsLength()).keys()).filter((i) => rsd.partitions(i)?.type() == 0);
        return arr;
    }
</script>

<h1>Application Partitions</h1>
<table>
    <thead>
        <tr>
            <th>Label</th>
            <th>Subtype</th>
            <th>Size [byte]</th>
            <th>State</th>
            <th>Is Running</th>
            <th>Project Name</th>
            <th>Project Version</th>
            <th>Compile Date</th>
            <th>Compile Time</th>
        </tr>
    </thead>
    <tbody>
        {#if rsd}
        {#each Array.from(Array(rsd.partitionsLength()).keys()).filter((i) => rsd.partitions(i)?.type() == 0) as i}
            <tr>
                <td>{rsd.partitions(i)?.label()}</td>
                <td>{findPartitionSubtype(rsd.partitions(i)?.type(), rsd.partitions(i)?.subtype())}</td>
                <td>{calcKibibyte(rsd.partitions(i)?.size())}</td>
                <td>{findPartitionState(rsd.partitions(i)?.otaState())}</td>
                <td>{rsd.partitions(i)?.running().toString()}</td>
                <td>{partitionString(rsd.partitions(i)?.appName(), '<undefined>')}</td>
                <td>{partitionString(rsd.partitions(i)?.appVersion(), '<undefined>')}</td>
                <td>{partitionString(rsd.partitions(i)?.appDate(), '<undefined>')}</td>
                <td>{partitionString(rsd.partitions(i)?.appTime(), '<undefined>')}</td></tr>
        {/each}
        {/if}
    </tbody>
</table>
<h1>Data Partitions</h1>
<table>
    <thead>
        <tr>
            <th>Label</th>
            <th>Subtype</th>
            <th>Size [byte]</th>
        </tr>
    </thead>
    <tbody>
        {#if rsd}
        {#each Array.from(Array(rsd.partitionsLength()).keys()).filter((i) => rsd.partitions(i)?.type() == 1) as i}
            <tr>
                <td>{rsd.partitions(i)?.label()}</td>
                <td>{findPartitionSubtype(rsd.partitions(i)?.type(), rsd.partitions(i)?.subtype())}</td>
                <td>{calcKibibyte(rsd.partitions(i)?.size())}</td>
            </tr>
        {/each}
        {/if}
    </tbody>
</table>
<h1>Parameters</h1>
<table>
    <thead>
        <tr>
            <th style="width: 200px;">Parameter</th>
            <th>Value</th>
        </tr>
    </thead>
    <tbody>
        {#if rsd}
            

        <tr><td>Real Time Clock</td><td>{localeDate() + ' [' + rsd.secondsEpoch().toString() + ' secs since epoch]'}</td></tr>
        <tr><td>Uptime [secs]</td><td>{rsd.secondsUptime().toString()}</td></tr>
        <tr><td>Free Heap [byte]</td><td>{rsd.freeHeap()}</td></tr>
        <tr><td>MAC Address WIFI_STA</td><td>{mac6_2_string(rsd.macAddressWifiSta())}</td></tr>
        <tr><td>MAC Address WIFI_SOFTAP</td><td>{mac6_2_string(rsd.macAddressWifiSoftap())}</td></tr>
        <tr><td>MAC Address BT</td><td>{mac6_2_string(rsd.macAddressBt())}</td></tr>
        <tr><td>MAC Address ETH</td><td>{mac6_2_string(rsd.macAddressEth())}</td></tr>
        <tr><td>MAC Address IEEE802154</td><td>{mac6_2_string(rsd.macAddressIeee802154())}</td></tr>
        <tr><td>Chip Model</td><td>{findChipModel(rsd.chipModel())}</td></tr>
        <tr><td>Chip Features</td><td>{findChipFeatures(rsd.chipFeatures())}</td></tr>
        <tr><td>Chip Revision</td><td>{rsd.chipRevision()}</td></tr>
        <tr><td>Chip Cores</td><td>{rsd.chipCores()}</td></tr>
        <tr><td>Chip Temperature</td><td>{rsd.chipTemperature().toLocaleString() + '°C'}</td></tr>
        {/if}
    </tbody>
</table>

<h1 class="dangerous">Dangerous Zone</h1>
<h2>Over-the-air Firmware Update</h2>
<table>
    <tbody>
        <tr>
            <td>1.) Choose Firmware File</td>
            <td><input type="file" name="otafile" accept=".bin" bind:files={otaFiles} /></td>
        </tr>
        <tr>
            <td>2.) Click!</td>
            <td><input type="button" value="Start Over The Air Firmware Update" on:click={M.startUpload} /></td>
        </tr>
        <tr>
            <td>3.) See Progress</td>
            <td><progress value="{uploadPercent}" max="100"></progress><span>{'Progress: ' + uploadPercent + '%'}</span></td>
        </tr>
        <tr>
            <td>4.) Wait</td>
            <td>After Upload, the CPU is reset automatically. You have to reconnect after an appropriate waiting time</td>
        </tr>
    </tbody>
</table>
<h2>Reset CPU</h2>
<table>
    <tbody>
        <tr>
            <td>Click to Reset/Restart CPU</td>
            <td><input type="button" value="Restart" on:click={M.sendRequestRestart} /></td>
        </tr>
    </tbody>
</table>
