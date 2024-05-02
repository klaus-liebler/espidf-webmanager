<script lang="ts">
    import { onMount } from 'svelte'
    import { Responses, ResponseWrapper, NotifyCanMessage } from '../generated/flatbuffers/webmanager'
    import { MyFavouriteDateTimeFormat } from '../utils/common'
    import type { IAppManagement, IWebsocketMessageListener, IMountEventListener } from '../utils/interfaces'
    import { cCANMessageBuilderParserOld, eNodeCommandType } from '../utils/sensact'

    import { ApplicationId, Command } from '../generated/flatbuffers/app'

    class Entry {
        constructor(
            public time: string,
            public messageId: string,
            public payload: string,
            public payloadLen: number,
            public parsed: string,
        ) {}
    }

    const MAX_MESSAGE_COUNT = 100

    export var app: IAppManagement
    var entries: Entry[]
    export const M = new (class implements IWebsocketMessageListener, IMountEventListener {
        private parser = new cCANMessageBuilderParserOld()

        constructor(private appManagement: IAppManagement) {}

        onMount(): () => void {
            var unregisterer = this.appManagement.registerWebsocketMessageTypes(this, Responses.NotifyCanMessage)
            return unregisterer
        }

        private uint8Array2HexString(d: NotifyCanMessage) {
            var s = ''
            for (let index = 0; index < d.dataLen(); index++) {
                var xx = d.data()!.data(index)!.toString(16)
                if (xx.length == 1) s += '0' + xx
                else s += xx
            }
            return s
        }

        private parse(m:NotifyCanMessage):string{
            var r= this.parser.ParseApplicationCommandMessageId(m);
            var appName:string=ApplicationId[r.destinationAppId];
            var commandName:string = Command[r.commandId];
            return `Cmd "${commandName} for App ${appName}"`; 
        }

        public onMessage(messageWrapper: ResponseWrapper): void {
            if (messageWrapper.responseType() != Responses.NotifyCanMessage) {
                return
            }
            let d = <NotifyCanMessage>messageWrapper.response(new NotifyCanMessage())
            $: entries.unshift(
                new Entry(
                    new Date().toLocaleString('de-DE', MyFavouriteDateTimeFormat),
                    '0x' + d.messageId().toString(16),
                    this.uint8Array2HexString(d),
                    d.dataLen(),
                    this.parse(d),
                ),
            )

            while (entries.length > MAX_MESSAGE_COUNT) {
                $: entries.shift()
            }
        }
    })(app);

    onMount(() => {
        return M.onMount()
    })
</script>

<h1>Messages</h1>
<table>
    <thead>
        <tr>
            <th>Timestamp</th>
            <th>MessageId</th>
            <th>Payload</th>
            <th>Payload Len [byte]</th>
            <th>Parsed Info</th>
        </tr>
    </thead>
    <tbody>
        {#each entries as e}
            <tr>
                <td>{e.time}</td>
                <td>{e.messageId}</td>
                <td>{e.payload}</td>
                <td>{e.payloadLen}</td>
                <td>{e.parsed}</td>
            </tr>
        {/each}
    </tbody>
</table>
