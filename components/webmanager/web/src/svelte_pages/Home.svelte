<script lang="ts">
    import type { ResponseWrapper } from '../generated/flatbuffers/webmanager'
    import type { IAppManagement, IWebsocketMessageListener } from '../utils/interfaces'
    export var app:IAppManagement;

    export const M = new (class implements IWebsocketMessageListener {
        onMessage(messageWrapper: ResponseWrapper): void {}
    })()
</script>

<h2>Home component</h2>

<p>
    This sample shows how to set up the router with minimum functionality. <br />
    The route definition object contains a number of routes (including some with parameters and a catch-all at the end).<br />
    The links below allow navigating between pages.
</p>

<p>This is the Home component, which contains markup only.</p>

<p><em>Hint:</em> Try navigating with the links below, then use your browser's back and forward buttons.</p>
