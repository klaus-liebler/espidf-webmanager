<script lang="ts">
    import { onMount } from 'svelte'
    import type { IAppManagement, IMountEventListener, IWebsocketMessageListener } from '../utils/interfaces'
    import * as flatbuffers from 'flatbuffers'
    import { Responses, type ResponseWrapper } from '../generated/flatbuffers/webmanager'

    //import * as cmd from '../generated/sensact/sendCommandImplementation_copied_during_build'

    import BuildApps from '../generated/sensact/sensactapps_copied_during_build'

    export var appManagement: IAppManagement
    let rootDiv:HTMLDivElement;
    export const M = new (class implements IWebsocketMessageListener, IMountEventListener {
        constructor(private appManagement: IAppManagement) {}
        onMessage(messageWrapper: ResponseWrapper): void {
            throw new Error('Method not implemented.')
        }

        onMount(): () => void {
            var allApps = BuildApps()
            var unknownsGroup = new Array<SensactApplication>()
            var regex = new RegExp(
                '^([A-Z]+)_+(L0|L1|L2|L3|LX|LS|XX)_(LVNG|KTCH|KID1|KID2|BATH|CORR|TECH|WORK|BEDR|WELL|STO1|PRTY|STRS|UTIL|LEFT|RGHT|BACK|FRON|CARP|GARA|ROOF|XXX)_(.*)$',
            )
            //Struktur Ebene -->Raum
            var level2room2apps = new Map<string, Map<string, Array<SensactApplication>>>()
            allApps.forEach((app) => {
                var result = regex.exec(app.applicationKey)
                if (!result) {
                    //application key does not fulfil structure
                    unknownsGroup.push(app)
                } else {
                    var type = result[1]
                    var level = result[2]
                    var room = result[3]
                    var room2apps = level2room2apps.get(level)
                    if (room2apps === undefined) {
                        room2apps = new Map<string, Array<SensactApplication>>()
                        level2room2apps.set(level, room2apps)
                    }
                    var apps = room2apps.get(room)
                    if (apps === undefined) {
                        apps = new Array<SensactApplication>()
                        room2apps.set(room, apps)
                    }
                    apps.push(app)
                }
            })
            level2room2apps.forEach((levelMap, levelKey) => {
                this.apps.push(new ApplicationGroup('Ebene ' + levelKey, this.LevelMap2ApplicationGroup(levelMap)))
            })
            if (unknownsGroup.length > 0) this.apps.push(new ApplicationGroup('Andere', unknownsGroup))
            //this.apps.forEach(v => v.renderHtmlUi(appManagement.MainElement()));
            var unregisterer = this.appManagement.registerWebsocketMessageTypes(this, Responses.NotifyCanMessage)
            return unregisterer
        }

        private apps: Array<ApplicationGroup> = []

        private LevelMap2ApplicationGroup(room2apps: Map<string, SensactApplication[]>): ApplicationGroup[] {
            var ret = new Array<ApplicationGroup>()
            room2apps.forEach((apps, roomKey) => {
                ret.push(new ApplicationGroup('Room ' + roomKey, apps))
            })
            return ret
        }
    })(appManagement)

    onMount(() => {
        return M.onMount()
    })
</script>

<h1>SensactApplications</h1>
<div bind:this={rootDiv}></div>

<style lang="scss">
    .appgroup {
        border: 1px dashed;
        margin: 0 5px 15px 0px;

        > button {
            background-color: #eee;
            color: #444;
            cursor: pointer;
            padding: 18px;
            margin: 0 0 5px 0;
            width: 100%;
            text-align: left;
            border: none;
            outline: none;
            transition: 0.4s;

            .active,
            :hover {
                background-color: #ccc;
            }
        }

        > div {
            padding: 0 0 0 18px;
            background-color: white;
            display: none;
            overflow: hidden;
        }
    }

    .app {
        width: 100%;
        background-color: beige;
        margin-bottom: 5px;
        padding: 10px;
        box-sizing: border-box;
        display: flex;
        /* or inline-flex */
        flex-direction: row;
        justify-content: space-between;
        h2,
        p {
            margin: 0;
            padding: 0;
        }

        button {
            height: 40px;
            min-width: 40px;
            font-size: x-large;
        }

        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
        }

        /* Hide default HTML checkbox */
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .toggle {
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            width: 62px;
            height: 32px;
            display: inline-block;
            position: relative;
            border-radius: 50px;
            overflow: hidden;
            outline: none;
            border: none;
            cursor: pointer;
            background-color: #707070;
            transition: background-color ease 0.3s;
        }

        .toggle:before {
            content: 'on off';
            display: block;
            position: absolute;
            z-index: 2;
            width: 28px;
            height: 28px;
            background: #fff;
            left: 2px;
            top: 2px;
            border-radius: 50%;
            font: 10px/28px Helvetica;
            text-transform: uppercase;
            font-weight: bold;
            text-indent: -22px;
            word-spacing: 37px;
            color: #fff;
            text-shadow: -1px -1px rgba(0, 0, 0, 0.15);
            white-space: nowrap;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            transition: all cubic-bezier(0.3, 1.5, 0.7, 1) 0.3s;
        }

        .toggle:checked {
            background-color: #4cd964;
        }

        .toggle:checked:before {
            left: 32px;
        }

        > :nth-child(2) {
            display: flex;
            /* or inline-flex */
            flex-direction: row;
            align-items: center;
        }
    }
</style>
