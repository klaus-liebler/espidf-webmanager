<script lang="ts">
    class Entry {
        constructor(
            public classname: string,
            public text: string,
        ) {}
    }
    const ANSI_ESCAPE = new RegExp('(\\x9B|\\x1B\\[)[0-?]*[ -\\/]*[@-~]')
    const MAX_MESSAGE_COUNT = 20
    var entries = new Array<Entry>(MAX_MESSAGE_COUNT)
    export function log(message: string) {
        message = message.replace(ANSI_ESCAPE, '')
        if (message.startsWith('I')) {
            $:entries.push(new Entry('info', message))
        } else if (message.startsWith('W')) {
            $:entries.push(new Entry('warn', message))
        } else {
            $:entries.push(new Entry('error', message))
        }
        while (entries.length > 20) {
            $:entries.shift()
        }
    }
</script>

<div>
    {#each entries as e}
        <p class={e.classname}>{e.text}</p>
    {/each}
    <div></div>
</div>

<style lang="scss">
    div>p {
        font-family:
            Courier New,
            Courier,
            monospace;
        white-space: pre;
        padding: 0px;
        margin: 0px;
        overflow-anchor: none;
    }

    div>div{
        overflow-anchor: auto;
        height: 1px;
    }

    .info {
        color: rgb(102, 249, 102);
    }

    .warn {
        color: yellow;
    }

    .error {
        color: pink;
    }

    .dangerous {
        color: red;
    }
</style>
