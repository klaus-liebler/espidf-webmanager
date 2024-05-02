<script lang="ts">
    import svelteLogo from './assets/svelte.svg'
  

    import Router, { type RouteLoadedEvent, type WrappedComponent } from 'svelte-spa-router'

    import Dialog from './svelte_components/Dialog.svelte'
    import Snackbar from './svelte_components/Snackbar.svelte'
    import Webconsole from './svelte_components/Webconsole.svelte'

    import wrap from 'svelte-spa-router/wrap'
    import * as flatbuffers from 'flatbuffers'

    import { type IAppManagement, type IDialogBodyRenderer, type IWebsocketMessageListener } from './utils/interfaces'
    import { menuEntries } from './menu'
    import { onMount } from 'svelte'
    import { Severity } from './utils/common'
    import { WS_URL } from './constants'
    import { NotifyLiveLogItem, RequestWrapper, ResponseWrapper, Responses } from './generated/flatbuffers/webmanager'
    import ModalLoader from './svelte_components/ModalLoader.svelte'

    var dialogComponent: Dialog
    var snackbarComponent: Snackbar
    var modalLoaderComponent: ModalLoader
    var webconsoleComponent: Webconsole

    var nav_hamburger: HTMLElement
    var nav_ul: HTMLUListElement

    onMount(() => {
        app.onMount()
    })

    class BufferedMessage{
      constructor(public data: ArrayBuffer, public messagesToUnlock: Responses[] = [Responses.NONE]){}
    }

    var app = new (class implements IAppManagement {
        private messageType2listener: Map<number, Array<IWebsocketMessageListener>> = new Map()
        private messagesToUnlock: Array<Responses> = [Responses.NONE]
        private socket: WebSocket
        private modalSpinnerTimeoutHandle: number = -1
        private messageBuffer?: BufferedMessage
        constructor() {
            console.log(`Connecting to ${WS_URL}`)
            this.socket = new WebSocket(WS_URL)
            this.socket.binaryType = 'arraybuffer'
            this.socket.onopen = (event) => {
                console.log(`Websocket is connected. ${this.messageBuffer?"There is a message in buffer":""}`)
                if(this.messageBuffer){
                    this.sendWebsocketMessage(this.messageBuffer.data, this.messageBuffer.messagesToUnlock);
                }
                this.messageBuffer=undefined;
            }
            this.socket.onerror = (event: Event) => {
                var message = `Websocket error ${event}`
                console.error(message)
                dialogComponent.showOKDialog(Severity.ERROR, message)
            }
            this.socket.onmessage = (event: MessageEvent<any>) => {
                app.onWebsocketData(event.data)
            }
            this.socket.onclose = (event) => {
                if (event.code == 1000) {
                    console.info('The Websocket connection has been closed normally. But why????')
                    return
                }
                var message = `Websocket has been closed ${event}`
                console.error(message)
                dialogComponent.showOKDialog(Severity.ERROR, message)
            }
        }
        showDialog(head: string, renderer: IDialogBodyRenderer, pHandler?: (ok: boolean, value: string) => any): void {
            dialogComponent.showDialog(head, renderer, pHandler)
        }
        showEnterFilenameDialog(messageText: string, pHandler?: (ok: boolean, value: string) => any): void {
            dialogComponent.showEnterFilenameDialog(messageText, pHandler)
        }
        showEnterPasswordDialog(messageText: string, pHandler?: (ok: boolean, value: string) => any): void {
            dialogComponent.showEnterPasswordDialog(messageText, pHandler)
        }
        showOKDialog(pSeverity: Severity, messageText: string, pHandler?: (ok: boolean, value: string) => any): void {
            dialogComponent.showOKDialog(pSeverity, messageText, pHandler)
        }
        showOKCancelDialog(pSeverity: Severity, messageText: string, pHandler?: (ok: boolean, value: string) => any): void {
            dialogComponent.showOKCancelDialog(pSeverity, messageText, pHandler)
        }

        public async onMount() {}

        registerWebsocketMessageTypes(listener: IWebsocketMessageListener, ...messageTypes: number[]): () => any {
            console.info('registerWebsocketMessageTypes')
            messageTypes.forEach((messageType) => {
                let arr = this.messageType2listener.get(messageType)
                if (!arr) {
                    arr = []
                    this.messageType2listener.set(messageType, arr)
                }
                arr.push(listener)
            })
            return () => {
                this.unregister(listener)
            }
        }

        private modalSpinnerTimeout() {
            modalLoaderComponent.setModal(false)
            dialogComponent.showOKDialog(Severity.ERROR, 'Server did not respond')
        }

        public onMessage(messageWrapper: ResponseWrapper): void {
            let li = <NotifyLiveLogItem>messageWrapper.response(new NotifyLiveLogItem())
            webconsoleComponent.log(<string>li.text())
        }

        private onWebsocketData(data: ArrayBuffer) {
            if (data.byteLength == 4096) {
                //TODO: it is dumb idea to use the size of the message to test whether it is a raw timeseries message or not. But hopefully, Flatbuffer messages never get that big
                // this.timeseriesScreenController?.onTimeseriesMessage(data);
                // if(this.messagesToUnlock.includes(Responses.ResponseTimeseriesDummy)){
                //   clearTimeout(this.modalSpinnerTimeoutHandle);
                //   this.messagesToUnlock=[Responses.NONE];
                //   this.setModal(false);
                // }
                return
            }
            let arr = new Uint8Array(data)
            let bb = new flatbuffers.ByteBuffer(arr)
            let messageWrapper = ResponseWrapper.getRootAsResponseWrapper(bb)
            console.log(`A message of type ${messageWrapper.responseType()} with length ${data.byteLength} has arrived.`)
            if (this.messagesToUnlock.includes(messageWrapper.responseType())) {
                clearTimeout(this.modalSpinnerTimeoutHandle)
                this.messagesToUnlock = [Responses.NONE]
                modalLoaderComponent.setModal(false)
            }
            this.messageType2listener.get(messageWrapper.responseType())?.forEach((v) => {
                v.onMessage(messageWrapper)
            })
        }

        unregister(listener: IWebsocketMessageListener) {
            console.info('unregister')
            this.messageType2listener.forEach((v) => {
                v.filter((l) => {
                    l != listener
                })
            })
        }
        sendWebsocketMessage(data: ArrayBuffer, messagesToUnlock: Responses[] = [Responses.NONE], maxWaitingTimeMs: number = 2000): void {
          if (this.socket.readyState!=this.socket.OPEN) {
              console.info('sendWebsocketMessage --> not OPEN --> buffer')
                //still in connection state -->buffer
                if(this.messageBuffer){
                  this.showOKDialog(Severity.ERROR, `Websocket is still in CONNECTING state and there is already a message in buffer`)
                  return;
                }
                this.messageBuffer=new BufferedMessage(data, messagesToUnlock);
                return;
            }

            
          this.messagesToUnlock = messagesToUnlock
            if (messagesToUnlock && messagesToUnlock[0] != Responses.NONE) {
                modalLoaderComponent.setModal(true)
                this.modalSpinnerTimeoutHandle = <number>(<unknown>setTimeout(() => this.modalSpinnerTimeout(), maxWaitingTimeMs)) //casting to make TypeScript happy
            }
            
            console.info(`sendWebsocketMessage --> OPEN --> send to server`)
            try {
                this.socket?.send(data)
            } catch (error: any) {
                modalLoaderComponent.setModal(false)
                if (this.modalSpinnerTimeoutHandle) {
                    clearTimeout(this.modalSpinnerTimeoutHandle)
                }
                this.showOKDialog(Severity.ERROR, `Error while sending a request to server:${error}`)
            }
        }
        log(text: string): void {
            console.info(text)
        }
        showSnackbar(severity: Severity, text: string): void {
            snackbarComponent.showSnackbar(severity, text)
        }
    })()

    const routes = new Map(menuEntries.map((r) => [r.path, wrap({ component: r.handler, props: { app: app } })]))

    function onclick() {
        snackbarComponent.showSnackbar(Severity.WARN, 'This is a message')
    }

    function routeLoaded(event: RouteLoadedEvent) {
        console.log(`routeLoaded ${event.detail.route}`)
        if (nav_hamburger.style.display === 'block') {
            //wenn der Hamburger sichtbar ist, dann das geöffnete Menü schließen
            nav_ul.style.display = 'none'
        }
    }

    function hamburger_click(e: Event) {
        if (nav_ul.style.display === 'block') {
            nav_ul.style.display = 'none'
        } else {
            nav_ul.style.display = 'block'
        }
        e.preventDefault()
    }
</script>

<header>
    <h1>WebManager</h1>
</header>

<nav>
    <ul bind:this={nav_ul}>
        {#each menuEntries as route}
            <li>
                <a href="/#{route.path}"><span>{@html route.icon}</span>{route.caption}</a>
            </li>
        {/each}
    </ul>
    <a href="/#" on:click={hamburger_click}><i bind:this={nav_hamburger}>≡</i></a>
    <input type="button" value="Message" on:click={onclick} />
</nav>
<main>
    <Router {routes} on:routeLoaded={routeLoaded} />
</main>
<footer>
    <!--<Webconsole bind:this={webconsoleComponent}></Webconsole>-->
</footer>
<ModalLoader bind:this={modalLoaderComponent}></ModalLoader>
<Dialog bind:this={dialogComponent}></Dialog>
<Snackbar bind:this={snackbarComponent}></Snackbar>

<style>
</style>
