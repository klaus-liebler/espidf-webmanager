import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { Finger, NotifyEnrollNewFinger, NotifyFingerDetected, RequestCancelInstruction, RequestDeleteAllFingers, RequestDeleteFinger, RequestEnrollNewFinger, RequestFingerprintSensorInfo, RequestFingers, RequestOpenDoor, RequestRenameFinger, RequestStoreFingerAction, RequestStoreFingerTimetable, RequestWrapper, Requests, ResponseDeleteFinger, ResponseEnrollNewFinger, ResponseFingerprintSensorInfo, ResponseFingers, ResponseWrapper, Responses } from "../../generated/flatbuffers/webmanager";
import { ScreenController } from "./screen_controller";
import * as flatbuffers from 'flatbuffers';
import { Html, Severity } from "../utils/common";
import { TemplateResult, html, render, svg } from "lit-html";


import calendarPlus from '../../svgs/regular/calendar-plus.svg?raw'
import calendarXMark from '../../svgs/regular/calendar-xmark.svg?raw'
import penToSquare from '../../svgs/regular/pen-to-square.svg?raw'
import folderOpen from '../../svgs/regular/folder-open.svg?raw'
import floppyDisk from '../../svgs/regular/floppy-disk.svg?raw'
import { unsafeSVG } from "lit-html/directives/unsafe-svg.js";
import { ResponseScheduler } from "../../generated/flatbuffers/scheduler/response-scheduler";
import { uResponseScheduler } from "../../generated/flatbuffers/scheduler/u-response-scheduler";
import { ResponseSchedulerList } from "../../generated/flatbuffers/scheduler/response-scheduler-list";
import { ResponseSchedulerListItem } from "../../generated/flatbuffers/scheduler/response-scheduler-list-item";
import { uSchedule } from "../../generated/flatbuffers/scheduler/u-schedule";
import { WeeklyScheduleDialog } from "../dialog_controller/weeklyschedule_dialog";
import { IAppManagement } from "../utils/interfaces";
import { RequestScheduler } from "../../generated/flatbuffers/scheduler/request-scheduler";
import { RequestSchedulerOpen } from "../../generated/flatbuffers/scheduler/request-scheduler-open";
import { uRequestScheduler } from "../../generated/flatbuffers/scheduler/u-request-scheduler";
import { eSchedule } from "../../generated/flatbuffers/scheduler/e-schedule";
import { RequestSchedulerList } from "../../generated/flatbuffers/scheduler/request-scheduler-list";
import { ResponseSchedulerOpen } from "../../generated/flatbuffers/scheduler/response-scheduler-open";
import { OneWeekIn15Minutes } from "../../generated/flatbuffers/scheduler/one-week-in15-minutes";
import { DialogController, OkCancelDialog, SimpleDialogController } from "../dialog_controller/dialog_controller";
import { SunRandom } from "../../generated/flatbuffers/scheduler/sun-random";

export abstract class ScheduleItem {

    constructor(protected readonly name:string, protected readonly type:string, protected readonly appManagement:IAppManagement) { }
    
    public OverallTemplate=()=>html`
    <tr>
        <td style='width:1%; white-space:nowrap'>${this.name}</td>
        <td style='width:1%; white-space:nowrap'>${this.type}</td>
        <td>${this.CoreEditTemplate()}</td>
    </tr>
    `
    protected abstract CoreEditTemplate:()=>TemplateResult<1>;
    public abstract OnResponseSchedulerOpen(m:ResponseSchedulerOpen):void;
}

class PredefinedSchedule extends ScheduleItem{
    constructor(name:string, appManagement:IAppManagement){
        super(name, "Predefined", appManagement);
    }

    public OnResponseSchedulerOpen(m:ResponseSchedulerOpen):void{
        return;
    }

    protected CoreEditTemplate=()=>html``
}

class SunRandomScheduleEditorDialog extends DialogController{
    
    protected inputOffset:Ref<HTMLInputElement> = createRef();
    protected inputRandom:Ref<HTMLInputElement> = createRef();

    constructor(protected nameOfSchedule: string, private offsetMinutes:number, private randomMinutes:number, protected handler: ((ok: boolean, offsetMinutes:number, randomMinutes:number) => any) | undefined) {
        super()
    }

    protected cancelHandler() {
        this.dialog.value!.close('Cancel')
        this.handler?.(false, 0,0)
    }

    protected okHandler() {
        this.dialog.value!.close('Ok')
        this.handler?.(true, this.inputOffset.value!.valueAsNumber,this.inputRandom.value!.valueAsNumber);
    }

    protected backdropClickedHandler(e: MouseEvent) {
        if (e.target === this.dialog) {
            this.cancelHandler();
        }
    }

    public Template() {
        return html`
    <dialog @cancel=${() => this.cancelHandler()} @click=${(e: MouseEvent) => this.backdropClickedHandler(e)} ${ref(this.dialog)}>
        <header>
            <span>Edit SunRandom Schedule "${this.nameOfSchedule}"</span>
            <button @click=${() => this.dialog.value!.close("cancelled")} type="button">&times;</button>
        </header>
        <main>
            <label><input ${ref(this.inputOffset)} type="number" value=${this.offsetMinutes} />Offset [minutes]</label>
            <label><input ${ref(this.inputRandom)} type="number" value=${this.randomMinutes} />Random [minutes]</label>
        </main>
        <footer><input @click=${() => this.okHandler()} type="button" value="OK"></input><input @click=${() => this.cancelHandler()} type="button" value="Cancel"></input></footer>
    </dialog>`}

}
class SunRandomSchedule extends ScheduleItem{
    
    constructor(name:string, appManagement:IAppManagement){
        super(name, "SunRandom", appManagement);
    }

    private editDialogHandler(ok: boolean, offsetMinutes: number, randomMinutes: number){
        console.info("In SunRandomSchedule: Dialog closed");
    }

    public OnResponseSchedulerOpen(m:ResponseSchedulerOpen):void{
        if(m.scheduleType()!=uSchedule.SunRandom) return;
        var rso = <SunRandom>m.schedule(new SunRandom())
        this.appManagement.showDialog(new SunRandomScheduleEditorDialog(this.name, rso.offsetMinutes(), rso.randomMinutes(), this.editDialogHandler));
    }

    private btnEditClicked() {
        let b = new flatbuffers.Builder(256);       
        b.finish(
            RequestWrapper.createRequestWrapper(b, 
                Requests.scheduler_RequestScheduler,
                RequestScheduler.createRequestScheduler(b, 
                    uRequestScheduler.RequestSchedulerOpen, 
                    RequestSchedulerOpen.createRequestSchedulerOpen(b, b.createString(this.name), eSchedule.SunRandom)
                )
            )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.scheduler_ResponseScheduler], 3000);
    }

    protected CoreEditTemplate=()=>html`<button @click=${()=>this.btnEditClicked()}>Edit</button>`
}

class OneWeekIn15MinutesSchedule extends ScheduleItem{

    
    constructor(name:string, appManagement:IAppManagement){
        super(name, "OneWeekIn15Minutes", appManagement);
    }

    public OnResponseSchedulerOpen(m:ResponseSchedulerOpen):void{
        if(m.scheduleType()!=uSchedule.OneWeekIn15Minutes) return;
        var rso = <OneWeekIn15Minutes>m.schedule(new OneWeekIn15Minutes())
        var data = new Uint8Array(84);
        for(var i=0;i<84;i++){data[i]=rso.data().v(i)}
        this.appManagement.showWeeklyTimetableDialog(`Weekly Schedule ${m.name()}`, data,this.editDialogHandler, null);
    }

    private editDialogHandler(ok: boolean, referenceHandle: any, value: Uint8Array){
        console.info("In OneWeekIn15MinutesSchedule: WeeklyScheduleDialog closed");
    }

    private btnEditClicked(e:MouseEvent){

        let b = new flatbuffers.Builder(256);       
        b.finish(
            RequestWrapper.createRequestWrapper(b, 
                Requests.scheduler_RequestScheduler,
                RequestScheduler.createRequestScheduler(b, 
                    uRequestScheduler.RequestSchedulerOpen, 
                    RequestSchedulerOpen.createRequestSchedulerOpen(b, b.createString(this.name), eSchedule.OneWeekIn15Minutes)
                )
            )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.scheduler_ResponseScheduler], 3000);
    }

    protected CoreEditTemplate=()=>html`<button @click=${(e:MouseEvent)=>this.btnEditClicked(e)}>Edit</button>`
}

export class SchedulerScreenController extends ScreenController {
    btnNew() {
        throw new Error("Method not implemented.");
    }

    private spanTimetableName: Ref<HTMLTableSectionElement> = createRef();
    private tblBody:Ref<HTMLTableSectionElement>= createRef();
    private name2item:Map<string, ScheduleItem>=new Map<string, ScheduleItem>();

    public Template = () =>{
        return html`
    <h1>Schedule Definitions</h1>
        
        <div class="buttons">
        
            <button @click=${() => this.btnNew()}>${unsafeSVG(calendarPlus)} New</button>

        </div>
        

        <table class="schedules">
            <thead>
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Edit</th>
            </tr>
            </thead>
            <tbody ${ref(this.tblBody)}>
            </tbody>
        </table>
        `}

    //jede Tabellenzeile hat einen Button "Rename" und einen Button "Delete"
    //im Property-Speicher des ESP32 wird abgelegt, welche Bezeichnung zu welcher internen Nummer gehört
    //Das Anlegen eines Eintrages findet ausschließlich über die Automatische Nummerierung statt
    //in der Tabelle wird auch die interne Speichernummer angezeigt



    public sendRequestDeleteFinger(name: string) {
        let b = new flatbuffers.Builder(1024);
        b.finish(
            RequestWrapper.createRequestWrapper(b, Requests.RequestDeleteFinger,
                RequestDeleteFinger.createRequestDeleteFinger(b, b.createString(name))
            )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseDeleteFinger]);
    }

    private sendRequestStoreFingerTimetable(fingerIndex: number, timetableIndex: number) {
        console.log(`sendRequestStoreFingerTimetable fingerIndex=${fingerIndex} timetableIndex=${timetableIndex}`)
        let b = new flatbuffers.Builder(1024);
        b.finish(
            RequestWrapper.createRequestWrapper(b, Requests.RequestStoreFingerTimetable,
                RequestStoreFingerTimetable.createRequestStoreFingerTimetable(b, fingerIndex, timetableIndex)
            )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseStoreFingerTimetable]);
    }

    private sendRequestStoreFingerAction(fingerIndex: number, actionIndex: number) {
        console.log(`sendRequestStoreFingerAction fingerIndex=${fingerIndex} actionIndex=${actionIndex}`)
        let b = new flatbuffers.Builder(1024);
        b.finish(
            RequestWrapper.createRequestWrapper(b, Requests.RequestStoreFingerAction,
                RequestStoreFingerAction.createRequestStoreFingerAction(b, fingerIndex, actionIndex)
            )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseStoreFingerAction]);
    }

    private sendRequestRenameFinger(fingerIndex: number, oldName:string,  newName: string) {
        console.log(`sendRequestRenameFinger fingerIndex=${fingerIndex} newName=${newName}`)
        let b = new flatbuffers.Builder(1024);
        b.finish(
            RequestWrapper.createRequestWrapper(b, Requests.RequestRenameFinger,
                RequestRenameFinger.createRequestRenameFinger(b, b.createString(oldName), b.createString(newName))
            )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.ResponseRenameFinger]);
    }

   


    

    onMessage(messageWrapper: ResponseWrapper): void {
        if(messageWrapper.responseType() != Responses.scheduler_ResponseScheduler)
            return;
        let m = <ResponseScheduler>messageWrapper.response(new ResponseScheduler());
        console.log(`Received Message in scheduler`)
        switch (m.contentType()) {
            case uResponseScheduler.ResponseSchedulerList:{
                var itemTemplates:Array<TemplateResult<1>>=[];
                var list = <ResponseSchedulerList>m.content(new ResponseSchedulerList())
                for(var i=0;i<list.itemsLength();i++){
                    var item = list.items(i);
                    this.processItem(item, itemTemplates);
                }
                render(itemTemplates, this.tblBody!.value);
                break;
            }
            case uResponseScheduler.ResponseSchedulerOpen:{
                var open = <ResponseSchedulerOpen>m.content(new ResponseSchedulerOpen())
                var o =this.name2item.get(open.name())
                if(o===undefined) return;
                o.OnResponseSchedulerOpen(open);
                break;
            }
        }
        
    }
    processItem(item: ResponseSchedulerListItem, itemTemplates: TemplateResult<1>[]) {
        var elem:ScheduleItem=null;
        switch (item.type()) {
            case eSchedule.OneWeekIn15Minutes:{
                elem= new OneWeekIn15MinutesSchedule(item.name(), this.appManagement)
                this.name2item.set(item.name(), elem);
                itemTemplates.push(elem.OverallTemplate())
                break;
            }
            case eSchedule.SunRandom:{
                elem= new SunRandomSchedule(item.name(), this.appManagement)
                this.name2item.set(item.name(), elem);
                itemTemplates.push(elem.OverallTemplate())
                break;
            }
            case eSchedule.Predefined:{
                elem= new PredefinedSchedule(item.name(), this.appManagement)
                this.name2item.set(item.name(), elem);
                itemTemplates.push(elem.OverallTemplate())
                break;
            }
            default:
                break;
        }


    }

    private onStart_or_onRestart(){
        let b = new flatbuffers.Builder(256);       
        b.finish(
            RequestWrapper.createRequestWrapper(b, 
                Requests.scheduler_RequestScheduler,
                RequestScheduler.createRequestScheduler(b, 
                    uRequestScheduler.RequestSchedulerList, 
                    RequestSchedulerList.createRequestSchedulerList(b)
                )
            )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.scheduler_ResponseScheduler], 3000);
    }
    
    onCreate(): void {
        this.appManagement.registerWebsocketMessageTypes(this, Responses.scheduler_ResponseScheduler);
    }


    onFirstStart(): void {
        this.onStart_or_onRestart()
    }
    onRestart(): void {
        this.onStart_or_onRestart()
    }
    onPause(): void {
    }

}
