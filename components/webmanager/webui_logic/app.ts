
import { AppManagement, WebsocketMessageListener } from "./app_management";
import { DialogController, Severity } from "./screen_controller/dialog_controller";
import { ControllerState, ScreenController, ScreenControllerWrapper, WeblogScreenController } from "./screen_controller/screen_controller";
import { SystemScreenController } from "./screen_controller/systemscreen_controller";
import * as flatbuffers from 'flatbuffers';
import {$, Html, gel, gqs } from "./utils";
import { WifimanagerController } from "./screen_controller/wifimanager_controller";
import { WS_URL } from "./constants";
import { UsersettingsController } from "./screen_controller/usersettings_controller";
import { TimeseriesController } from "./screen_controller/timeseries_controller";
import { FingerprintScreenController } from "./screen_controller/fingerprint_controller";
import { NotifyLiveLogItem, ResponseWrapper, Responses } from "./generated/flatbuffers/webmanager";
//import { SensactScreenController } from "./screen_controller/sensact_controller";

const ANSI_ESCAPE = new RegExp("(\\x9B|\\x1B\\[)[0-?]*[ -\\/]*[@-~]");
const MAX_MESSAGE_COUNT = 20;

class AppController implements AppManagement, WebsocketMessageListener {
  
  private scroller = <HTMLDivElement>gel('scroller');
  private anchor = <HTMLDivElement>gel('anchor');
  private modal = <HTMLDivElement>gel("modal");
  private snackbar = <HTMLDivElement>gel("snackbar");
  private snackbarTimeout:number=-1;
  private nav_hamburger=$("nav>a");
  private nav_ul=$("nav>ul");
  private socket?: WebSocket;
  private messageCount = 0;
  

  private screenControllers: Map<string, ScreenControllerWrapper>;
  private timeseriesScreenController?:TimeseriesController;
  private dialogController: DialogController;
  private messageType2listener: Map<number, Array<WebsocketMessageListener>>;
  private messagesToUnlock:Array<Responses>=[Responses.NONE];
  private modalSpinnerTimeoutHandle:number=0;


  

  public DialogController() { return this.dialogController; };

  private activateScreen(screenNameToActivate:string){
    var howManyActivated=0;
    this.screenControllers.forEach((wrapper, name) => {
      if (name == screenNameToActivate) {
        wrapper.element.style.display = "block";
        if (wrapper.state == ControllerState.CREATED) {
          wrapper.controller.onFirstStart();
          wrapper.state = ControllerState.STARTED;
        }
        else {
          wrapper.controller.onRestart();
          wrapper.state = ControllerState.STARTED;
        }
        howManyActivated++;
      } else {
        wrapper.element.style.display = "none";
        if (wrapper.state == ControllerState.STARTED) {
          wrapper.controller.onPause();
          wrapper.state = ControllerState.PAUSED;
        }
      }
    });
    console.info(`We activated ${howManyActivated} screens.`);
  }

  public AddScreenController<T extends ScreenController>(nameInNavAndInMain: string, type: { new(m:AppManagement): T ;}):ScreenController {
    var mainElement = gqs(`main[data-nav="${nameInNavAndInMain}"]`);
    var anchorElement = gqs(`a[data-nav="${nameInNavAndInMain}"]`);
    var w = new ScreenControllerWrapper(nameInNavAndInMain, ControllerState.CREATED, mainElement, this);
    let controllerObject=new type(w);
    w.controller=controllerObject;
    this.screenControllers.set(nameInNavAndInMain, w);
    anchorElement.onclick = (e: MouseEvent) => {
      e.preventDefault();
      if(this.nav_hamburger.style.display==="block"){
        //wenn der Hamburger sichtbar ist, dann das geöffnete Menü schließen
        this.nav_ul.style.display = "none";
      }
      this.activateScreen(nameInNavAndInMain);
    };
    
    return controllerObject;
  }

  constructor() {
    this.screenControllers = new Map<string, ScreenControllerWrapper>();
    this.messageType2listener = new Map<number, [WebsocketMessageListener]>;
    this.dialogController = new DialogController(this);
    
    this.registerWebsocketMessageTypes(this, Responses.NotifyLiveLogItem);
  }
  MainElement(): HTMLElement {
    throw new Error("May not be called");
  }
  private modalSpinnerTimeout(){
    this.setModal(false);
    this.dialogController.showOKDialog(Severity.ERROR, "Server did not respond");
  }

  sendWebsocketMessage(data: ArrayBuffer, messagesToUnlock:Array<Responses>=[Responses.NONE], maxWaitingTimeMs:number=2000): void {
    this.messagesToUnlock=messagesToUnlock;
    if(messagesToUnlock && messagesToUnlock[0]!=Responses.NONE){
      this.setModal(true);
      this.modalSpinnerTimeoutHandle=setTimeout(()=>this.modalSpinnerTimeout(), maxWaitingTimeMs);
    }
    try {
      this.socket?.send(data);
    } catch (error:any) {
      this.setModal(false);
      if(this.modalSpinnerTimeoutHandle){
        clearTimeout(this.modalSpinnerTimeoutHandle);
      }
      this.dialogController.showOKDialog(Severity.ERROR, `Error while sending a request to server:${error}`);
    }
    
    
  }
  
  public registerWebsocketMessageTypes(listener: WebsocketMessageListener, ...messageTypes: number[]): void {
    messageTypes.forEach(messageType => {
      let arr=this.messageType2listener.get(messageType)
      if(!arr){
        arr=[];
        this.messageType2listener.set(messageType, arr);
      }
      arr.push(listener);
    });
  }
  public log(text:string){
    this.logInternal("I"+text);
  }

  public showSnackbar(severity:Severity, text:string){
    if(this.snackbarTimeout>=0){
      clearInterval(this.snackbarTimeout);
    }
    this.snackbar.innerText="";
    Html(this.snackbar, "span", [], [DialogController.severity2class(severity)], DialogController.severity2symbol(severity));
    Html(this.snackbar, "span", [], [], text);
    this.snackbar.style.visibility="visible";
    this.snackbar.style.animation="fadein 0.5s, fadeout 0.5s 2.5s";
    this.snackbarTimeout=setTimeout(()=>{
      this.snackbar.style.visibility="hidden";
      this.snackbar.style.animation="";
      this.snackbarTimeout=-1;
    }, 3000);
  }

  private logInternal(message:string){
    let msg = document.createElement('p');
    if (message.startsWith("I")) {
      msg.className = 'info';
    } else if (message.startsWith("W")) {
      msg.className = 'warn';
    } else {
      msg.className = 'error';
    }
    msg.innerText = message.replace(ANSI_ESCAPE, "");
    this.scroller.insertBefore(msg, this.anchor);
    this.messageCount++;
    if (this.messageCount > MAX_MESSAGE_COUNT) {
      this.scroller.removeChild(this.scroller.firstChild!);
    }
  }

  private onWebsocketData(data: ArrayBuffer) {
    if(data.byteLength==4096){//TODO: it is dumb idea to use the size of the message to test whether it is a raw timeseries message or not. But hopefully, Flatbuffer messages never get that big
      this.timeseriesScreenController?.onTimeseriesMessage(data);
      if(this.messagesToUnlock.includes(Responses.ResponseTimeseriesDummy)){
        clearTimeout(this.modalSpinnerTimeoutHandle);
        this.messagesToUnlock=[Responses.NONE];
        this.setModal(false);
      }
      return;
    }
    let arr=new Uint8Array(data);
    let bb = new flatbuffers.ByteBuffer(arr);
    let messageWrapper= ResponseWrapper.getRootAsResponseWrapper(bb);
    console.log(`A message of type ${messageWrapper.responseType()} with length ${data.byteLength} has arrived.`);
    if(this.messagesToUnlock.includes(messageWrapper.responseType())){
      clearTimeout(this.modalSpinnerTimeoutHandle);
      this.messagesToUnlock=[Responses.NONE];
      this.setModal(false);
    }
    this.messageType2listener.get(messageWrapper.responseType())?.forEach((v)=>{
      v.onMessage(messageWrapper);
    });
  }

  private setModal(state:boolean){
    this.modal.style.display=state?"flex":"none";
  }

  onMessage(messageWrapper: ResponseWrapper): void {
    let li=<NotifyLiveLogItem>messageWrapper.response(new NotifyLiveLogItem());
    this.logInternal(<string>li.text());
  }

  public async startup() {
    this.AddScreenController("home", WeblogScreenController);
    //this.AddScreenController("sensact", SensactScreenController)
    this.AddScreenController("wifimanager", WifimanagerController);
    this.AddScreenController("systemsettings", SystemScreenController);
    this.AddScreenController("usersettings", UsersettingsController);
    this.AddScreenController("fingerprint", FingerprintScreenController);
    this.timeseriesScreenController = <TimeseriesController>this.AddScreenController("timeseries", TimeseriesController);
    this.dialogController.init();
    

    this.nav_hamburger.onclick=(e)=>{
      if (this.nav_ul.style.display === "block") {
        this.nav_ul.style.display = "none";
      } else {
        this.nav_ul.style.display = "block";
      }
      e.preventDefault();
    }
    
    
    try {
      console.log(`Connecting to ${WS_URL}`);
      this.socket = new WebSocket(WS_URL);
      this.socket.binaryType="arraybuffer";
      this.socket.onopen = (event) => {
        console.log('Socket.open');
        this.screenControllers.forEach(w=>w.controller.onCreate());
        this.activateScreen("home");
      };
      this.socket.onerror = (event: Event) => {
        var message = `Websocket error ${event}`;
        console.error(message);
        this.DialogController().showOKDialog(Severity.ERROR, message); 
      };
      this.socket.onmessage = (event:MessageEvent<any>) => {
        this.onWebsocketData(event.data);
      };
      this.socket.onclose = (event)=> {
        if (event.code == 1000) {
          console.info("The Websocket connection has been closed normally. But why????");
          return;
       }
       var message = `Websocket has been closed ${event}`;
       console.error(message);
       this.DialogController().showOKDialog(Severity.ERROR, message); 
     }
    } catch (e) {
      console.error('E ' + e);
    }
  }  
}

let app: AppController;
document.addEventListener("DOMContentLoaded", (e) => {
  app = new AppController();
  app.startup();
});


