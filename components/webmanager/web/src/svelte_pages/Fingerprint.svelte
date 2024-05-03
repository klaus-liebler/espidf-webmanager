<script lang="ts">
    import {
        NotifyEnrollNewFinger,
        NotifyFingerDetected,
        RequestCancelInstruction,
        RequestDeleteAllFingers,
        RequestDeleteFinger,
        RequestEnrollNewFinger,
        RequestFingerprintSensorInfo,
        RequestFingers,
        RequestOpenDoor,
        RequestWrapper,
        Requests,
        ResponseDeleteFinger,
        ResponseEnrollNewFinger,
        ResponseFingerprintSensorInfo,
        ResponseFingers,
        ResponseWrapper,
        Responses,
    } from '../generated/flatbuffers/webmanager'
    import * as flatbuffers from 'flatbuffers'
    import type { IAppManagement, IMountEventListener, IWebsocketMessageListener } from '../utils/interfaces'
    import { onMount } from 'svelte'
    import { Severity } from '../utils/common'

    enum RET {
        OK = 0x00, //!< Command execution is complete
        PACKET_RECIEVE_ERR = 0x01, //!< Error when receiving data package
        NO_FINGER_ON_SENSOR = 0x02, //!< No finger on the sensor
        ENROLL_FAIL = 0x03, //!< Failed to enroll the finger
        GENERATE_CHARACTER_FILE_FAIL = 0x06, //!< Failed to generate character file due to overly disorderly fingerprint image
        FEATURE_FAIL = 0x07, //!< Failed to generate character file due to the lack of character point or small fingerprint image
        NO_MATCH = 0x08, //!< Finger doesn't match
        FINGER_NOT_FOUND = 0x09, //!< Failed to find matching finger
        FAILTO_COMBINE_FINGER_FILES = 0x0a, //!< Failed to combine the character files
        BAD_LOCATION = 0x0b, //!< Addressed PageID is beyond the finger library
        DB_RANGE_FAIL = 0x0c, //!< Error when reading template from library or invalid template
        UPLOAD_TEMPLATE_FAIL = 0x0d, //!< Error when uploading template
        PACKETRESPONSEFAIL = 0x0e, //!< Module failed to receive the following data packages
        UPLOADFAIL = 0x0f, //!< Error when uploading image
        DELETEFAIL = 0x10, //!< Failed to delete the template
        DBCLEARFAIL = 0x11, //!< Failed to clear finger library
        WRONG_PASSWORD = 0x13, //!< wrong password!
        INVALIDIMAGE = 0x15, //!< Failed to generate image because of lac of valid primary image
        FLASHERR = 0x18, //!< Error when writing flash
        NO_DEFINITION_ERROR = 0x19,
        INVALIDREG = 0x1a, //!< Invalid register number
        INCORRECT_CONFIGURATION = 0x1b,
        WRONG_NOTEPAD_PAGE_NUMBER = 0x1c,
        COMMUNICATION_PORT_FAILURE = 0x1d,
        FINGERPRINT_LIBRARY_IS_FULL = 0x1f,

        ADDRESS_CODE_INCORRECT = 0x20,
        PASSWORT_MUST_BE_VERIFIED = 0x21, // password must be verified;
        FINGERPRINT_TEMPLATE_IS_EMPTY = 0x22, // fingerprint template is empty;
        FINGERPRINT_LIB_IS_EMPTY = 0x24,
        TIMEOUT = 0x26,
        FINGERPRINT_ALREADY_EXISTS = 0x27,
        SENSOR_HARDWARE_ERROR = 0x29,

        UNSUPPORTED_COMMAND = 0xfc,
        HARDWARE_ERROR = 0xfd,
        COMMAND_EXECUTION_FAILURE = 0xfe,

        xPARSER_CANNOT_FIND_STARTCODE = 0x100,
        xPARSER_WRONG_MODULE_ADDRESS = 0x101,
        xPARSER_ACKNOWLEDGE_PACKET_EXPECTED = 0x102,
        xPARSER_UNEXPECTED_LENGTH = 0x103,
        xPARSER_CHECKSUM_ERROR = 0x104,
        xPARSER_TIMEOUT = 0x105,
        xNVS_READWRITE_ERROR = 0x106,
        xNVS_NAME_ALREADY_EXISTS = 0x107,
        xNVS_NAME_UNKNOWN = 0x108,
        xNVS_NAME_TOO_LONG = 0x109,
        xCANNOT_GET_MUTEX = 0x10a,
        xNVS_NOT_AVAILABLE = 0x10b,
    }
    class FingerInfo {
        constructor(
            public index: number,
            public name: string,
            public row: HTMLTableRowElement | null,
        ) {}
    }

    export var app: IAppManagement
    var fpSensorInfo: ResponseFingerprintSensorInfo
    var fingers: FingerInfo[]=[]

    export const M = new (class implements IWebsocketMessageListener, IMountEventListener {
        private fingerIndex2finger = new Map<number, FingerInfo>()

        constructor(private appManagement: IAppManagement) {}

        public sendRequestDeleteFinger(name: string) {
            let b = new flatbuffers.Builder(1024)
            b.finish(
                RequestWrapper.createRequestWrapper(b, Requests.RequestDeleteFinger, RequestDeleteFinger.createRequestDeleteFinger(b, b.createString(name))),
            )
            this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseDeleteFinger])
        }

        public sendRequestFingers() {
            let b = new flatbuffers.Builder(1024)
            b.finish(RequestWrapper.createRequestWrapper(b, Requests.RequestFingers, RequestFingers.createRequestFingers(b)))
            this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseFingers])
        }

        public onMessage(messageWrapper: ResponseWrapper): void {
            var ret:RET
            switch (messageWrapper.responseType()) {
                case Responses.ResponseFingerprintSensorInfo:
                    fpSensorInfo = <ResponseFingerprintSensorInfo>messageWrapper.response(new ResponseFingerprintSensorInfo())
                    break

                case Responses.ResponseFingers:{
                        var ff = <ResponseFingers>messageWrapper.response(new ResponseFingers())
                        this.fingerIndex2finger.clear()
                        for (let i = 0; i < ff.fingersLength(); i++) {
                            var f = ff.fingers(i)
                            if (!f) continue
                            var info = new FingerInfo(f.index(), f.name()!, null);
                            this.fingerIndex2finger.set(f.index(), info)
                            fingers.push(info)
                        }
                        fingers = fingers
                    }
                    break
                case Responses.ResponseDeleteFinger: {
                    var m = <ResponseDeleteFinger>messageWrapper.response(new ResponseDeleteFinger())
                    ret = <RET>m.errorcode()
                    if (ret != RET.OK) {
                        this.appManagement.showOKDialog(Severity.ERROR, `Error while deleting Finger ${m.name()}: ${RET[ret]}.`)
                    } else {
                        this.appManagement.showOKDialog(Severity.SUCCESS, `Finger ${m.name()} successfully deleted.`)
                        this.sendRequestFingers()
                    }
                    break
                }
                case Responses.ResponseEnrollNewFinger: {
                    let m = <ResponseEnrollNewFinger>messageWrapper.response(new ResponseEnrollNewFinger())
                    ret = <RET>m.errorcode()
                    if (ret != RET.OK) {
                        this.appManagement.showOKDialog(Severity.ERROR, `Enrollment could not be started: ${RET[ret]}`)
                    } else {
                        this.appManagement.showSnackbar(Severity.SUCCESS, `Enrollment successfully started. Put your finger on the sensor`)
                    }
                    break
                }
                case Responses.NotifyEnrollNewFinger: {
                    let m = <NotifyEnrollNewFinger>messageWrapper.response(new NotifyEnrollNewFinger())
                    ret = <RET>m.errorcode()
                    console.log(`NotifyEnrollNewFinger: step=${m.step()}, name=${m.name()}, errorcode=${RET[ret]}`)
                    if (m.step() < 13) {
                        var step = Math.ceil(m.step() / 2)
                        var collectImage = m.step() % 2 == 1
                        this.appManagement.showSnackbar(
                            ret == RET.OK ? Severity.INFO : Severity.WARN,
                            `Round ${step}: ${collectImage ? 'Collect Image' : 'Generate Feature'}: ${RET[ret]}.`,
                        )
                    } else if (m.step() == 13) {
                        this.appManagement.showSnackbar(ret == RET.OK ? Severity.INFO : Severity.WARN, `Repeat fingerprint check: ${RET[ret]}.`)
                    } else if (m.step() == 14) {
                        this.appManagement.showSnackbar(ret == RET.OK ? Severity.INFO : Severity.WARN, `Merge feature: ${RET[ret]}.`)
                    } else if (m.step() == 15) {
                        this.appManagement.showSnackbar(
                            ret == RET.OK ? Severity.SUCCESS : Severity.WARN,
                            `Fingerprint stored in Sensor with  name "${m.name()}" on index ${m.index}: ${RET[ret]}.`,
                        )
                    } else {
                        this.appManagement.showSnackbar(Severity.ERROR, `Unknown step: ${m.step()}, errorcode: ${RET[ret]}.!`)
                    }
                    break
                }
                case Responses.NotifyFingerDetected: {
                    let m = <NotifyFingerDetected>messageWrapper.response(new NotifyFingerDetected())
                    if (m.errorcode() != 0) {
                        this.appManagement.showSnackbar(Severity.WARN, `Finger has not been detected.`)
                        console.warn(`Finger has not been detected.`)
                        return
                    }
                    var fingerInfo = this.fingerIndex2finger.get(m.index())
                    if (!fingerInfo) {
                        this.appManagement.showSnackbar(Severity.SUCCESS, `Unknown Finger ${m.index()} detected with score ${m.score()}.`)
                        console.info(`Unknown Finger ${m.index()} detected with score ${m.score()}.`)
                        return
                    }
                    var tr = fingerInfo.row!
                    this.appManagement.showSnackbar(Severity.SUCCESS, `Finger ${fingerInfo.name} (${m.index()}) detected with score ${m.score()}.`)
                    console.info(`Finger ${fingerInfo.name} (${m.index()}) detected with score ${m.score()}.`)
                    var storedBgColor = tr.style.backgroundColor
                    tr.style.backgroundColor = 'green'
                    setTimeout(() => {
                        tr.style.backgroundColor = storedBgColor
                    }, 2000)
                    break
                }

                default:
                    break
            }
        }

        public onMount() {
            var unregisterer = this.appManagement.registerWebsocketMessageTypes(this, Responses.ResponseSystemData)
            this.appManagement.registerWebsocketMessageTypes(
                this,
                Responses.ResponseEnrollNewFinger,
                Responses.ResponseDeleteFinger,
                Responses.ResponseDeleteAllFingers,
                Responses.ResponseFingerprintSensorInfo,
                Responses.ResponseFingers,
                Responses.NotifyEnrollNewFinger,
                Responses.NotifyFingerDetected,
            )
            return unregisterer
        }

        public btnEnroll() {
            this.appManagement.showEnterFilenameDialog('Enter name of finger', (ok: boolean, name: string) => {
                let b = new flatbuffers.Builder(1024)
                b.finish(
                    RequestWrapper.createRequestWrapper(
                        b,
                        Requests.RequestEnrollNewFinger,
                        RequestEnrollNewFinger.createRequestEnrollNewFinger(b, b.createString(name)),
                    ),
                )
                this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseEnrollNewFinger])
            })
        }

        public btnDeleteAll() {
            this.appManagement.showOKCancelDialog(Severity.WARN, 'Please confirm to DELETE ALL FINGERPRINTS', (ok: boolean) => {
                if (!ok) return
                let b = new flatbuffers.Builder(1024)
                let n = RequestDeleteAllFingers.createRequestDeleteAllFingers(b)
                let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestDeleteAllFingers, n)
                b.finish(mw)
                this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseDeleteAllFingers])
            })
        }

        public btnDoorOpen() {
            let b = new flatbuffers.Builder(1024)
            let n = RequestOpenDoor.createRequestOpenDoor(b)
            let mw = RequestWrapper.createRequestWrapper(b, Requests.RequestOpenDoor, n)
            b.finish(mw)
            this.appManagement.sendWebsocketMessage(b.asUint8Array())
        }

        public btnGetSensorInfo() {
            let b = new flatbuffers.Builder(1024)
            b.finish(
                RequestWrapper.createRequestWrapper(
                    b,
                    Requests.RequestFingerprintSensorInfo,
                    RequestFingerprintSensorInfo.createRequestFingerprintSensorInfo(b),
                ),
            )
            this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseFingerprintSensorInfo])
        }
    })(app)

    onMount(() => {
        return M.onMount()
    })
</script>

<h1>Current Fingers</h1>
<div class="buttons">
    <input
        type="button"
        value="Open Door"
        on:click={() => {
            M.btnDoorOpen()
        }}
    />
    <input
        id="btnUpdateFingers"
        type="button"
        value="Update"
        on:click={() => {
            M.sendRequestFingers()
        }}
    />
    <input
        id="btnFingerprintEnroll"
        type="button"
        value="Enroll"
        on:click={() => {
            M.btnEnroll()
        }}
    />
    <input
        id="btnDeleteAll"
        type="button"
        value="Delete All"
        on:click={() => {
            M.btnDeleteAll()
        }}
    />
    <input
        id="btnCancelInstruction"
        type="button"
        value="Cancel Instruction"
        on:click={() => {
            let b = new flatbuffers.Builder(1024)
            b.finish(RequestWrapper.createRequestWrapper(b, Requests.RequestCancelInstruction, RequestCancelInstruction.createRequestCancelInstruction(b)))
            app.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseCancelInstruction])
        }}
    />
</div>
<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Index</th>
            <th>Actions</th>
        </tr>
    </thead>
    <tbody>
        {#each fingers as f}
            <tr bind:this={f.row}><td>{f.name}</td><td>{f.index}</td><td><input type="button" value="🗑" on:click={() => {M.sendRequestDeleteFinger(f.name)
                        }} ></td></tr>
        {/each}
    </tbody>
</table>

<h1>Fingerprint Sensor</h1>
<div class="buttons">
    <input
        id="btnFingerprintGetSensorInfo"
        type="button"
        value="Get Sensor Info"
        on:click={() => {
            M.btnGetSensorInfo()
        }}
    />
</div>
<table>
    <thead>
        <tr>
            <th>Property</th>
            <th>Value</th>
        </tr>
    </thead>
    <tbody>
        {#if fpSensorInfo}
            <tr><td>Status</td><td>{fpSensorInfo.status()}</td></tr>
            <tr><td>Security Level</td><td>{fpSensorInfo.securityLevel()}</td></tr>
            <tr><td>Library Size</td><td>{fpSensorInfo.librarySize()}</td></tr>
            <tr><td>Device Address</td><td>{'0x' + fpSensorInfo.deviceAddress().toString(16)}</td></tr>
            <tr><td>DataPacketSizeCode</td><td>{Math.pow(2, 5 + fpSensorInfo.dataPacketSizeCode()) + 'byte'}</td></tr>
            <tr><td>Firmware</td><td>{fpSensorInfo.fwVer()}</td></tr>
            <tr><td>Algorithm</td><td>{fpSensorInfo.algVer()}</td></tr>
            <tr><td>Baud Rate</td><td>{fpSensorInfo.baudRateTimes9600() * 9600 + 'baud'}</td></tr>
        {/if}
    </tbody>
</table>
