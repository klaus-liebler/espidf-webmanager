import { html, TemplateResult } from "lit-html";
import {IAppManagement} from "./interfaces"
import { SunRandomScheduleEditorDialog } from "../dialog_controller/SunRandomScheduleEditorDialog";
import { RequestSchedulerOpen } from "../../generated/flatbuffers/scheduler/request-scheduler-open";
import { eSchedule } from "../../generated/flatbuffers/scheduler/e-schedule";
import { OneWeekIn15Minutes } from "../../generated/flatbuffers/scheduler/one-week-in15-minutes";
import { RequestScheduler } from "../../generated/flatbuffers/scheduler/request-scheduler";
import { ResponseSchedulerOpen } from "../../generated/flatbuffers/scheduler/response-scheduler-open";
import { SunRandom } from "../../generated/flatbuffers/scheduler/sun-random";
import { uRequestScheduler } from "../../generated/flatbuffers/scheduler/u-request-scheduler";
import { uSchedule } from "../../generated/flatbuffers/scheduler/u-schedule";
import { RequestWrapper, Requests, Responses } from "../../generated/flatbuffers/webmanager";
import * as flatbuffers from 'flatbuffers';
import { RequestSchedulerSave } from "../../generated/flatbuffers/scheduler/request-scheduler-save";
import { Schedule } from "../../generated/flatbuffers/scheduler/schedule";
import { OneWeekIn15MinutesData } from "../../generated/flatbuffers/scheduler/one-week-in15-minutes-data";
import { iWeeklyScheduleDialogHandler } from "../dialog_controller/weeklyschedule_dialog";

export abstract class ScheduleItem {

    constructor(public readonly name:string, protected readonly type:string, protected readonly appManagement:IAppManagement) { }
    
    public OverallTemplate=()=>html`
    <tr>
        <td class="minwidth">${this.name}</td>
        <td class="minwidth">${this.type}</td>
        <td>${this.CoreEditTemplate()}</td>
    </tr>
    `
    protected abstract CoreEditTemplate:()=>TemplateResult<1>;
    public abstract OnResponseSchedulerOpen(m:ResponseSchedulerOpen):void;

    public abstract SaveToServer():void;
}

export class PredefinedSchedule extends ScheduleItem{
    constructor(name:string, appManagement:IAppManagement){
        super(name, "Predefined", appManagement);
    }

    public OnResponseSchedulerOpen(m:ResponseSchedulerOpen):void{
        return;
    }

    protected CoreEditTemplate=()=>html``

    public SaveToServer():void{
        return
    }
}

export class SunRandomSchedule extends ScheduleItem{
    private offsetMinutes: number;
    private randomMinutes: number;
    constructor(name:string, appManagement:IAppManagement){
        super(name, "SunRandom", appManagement);
    }

    private editDialogHandler(ok: boolean, offsetMinutes: number, randomMinutes: number){
        console.info("In SunRandomSchedule: Dialog closed");
        if(!ok) return;
        this.offsetMinutes=offsetMinutes;
        this.randomMinutes=randomMinutes;
    }
    public SaveToServer():void{
        let b = new flatbuffers.Builder(1024);       
        b.finish(
            RequestWrapper.createRequestWrapper(b, 
                Requests.scheduler_RequestScheduler,
                RequestScheduler.createRequestScheduler(b, 
                    uRequestScheduler.RequestSchedulerSave, 
                    RequestSchedulerSave.createRequestSchedulerSave(b, 
                        Schedule.createSchedule(b,
                            b.createString(this.name), 
                            uSchedule.SunRandom,
                            SunRandom.createSunRandom(b,
                                this.offsetMinutes,
                                this.randomMinutes
                            )
                        )
                    )
                )
            )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.scheduler_ResponseScheduler], 3000);
    }

    public OnResponseSchedulerOpen(m:ResponseSchedulerOpen):void{
        if(m.payload().scheduleType()!=uSchedule.SunRandom) return;
        var rso = <SunRandom>m.payload().schedule(new SunRandom())
        this.offsetMinutes=rso.offsetMinutes();
        this.randomMinutes=rso.randomMinutes();
        this.appManagement.showDialog(new SunRandomScheduleEditorDialog(this.name, this.offsetMinutes, this.randomMinutes, this.editDialogHandler));
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

export class OneWeekIn15MinutesSchedule extends ScheduleItem implements iWeeklyScheduleDialogHandler{
    private value: Uint8Array;
    
    constructor(name:string, appManagement:IAppManagement){
        super(name, "OneWeekIn15Minutes", appManagement);
    }
    
       

    public OnResponseSchedulerOpen(m:ResponseSchedulerOpen):void{
        if(m.payload().scheduleType()!=uSchedule.OneWeekIn15Minutes) return;
        var rso = <OneWeekIn15Minutes>m.payload().schedule(new OneWeekIn15Minutes())
        this.value = new Uint8Array(84);
        for(var i=0;i<84;i++){this.value[i]=rso.data()!.v(i)!}
        this.appManagement.showWeeklyTimetableDialog(`Weekly Schedule ${m.payload().name()}`, this.value, this, null);
    }

    public handleWeeklyScheduleDialog(ok: boolean, referenceHandle: any, value: Uint8Array) {
        console.info("In OneWeekIn15MinutesSchedule: WeeklyScheduleDialog closed");
        if(!ok) return;
        this.value=value;
        this.SaveToServer();
    }
    public SaveToServer():void{
        var data:Array<number> =[]
        for(var i=0;i<84;i++){data[i]=this.value[i]}
        let b = new flatbuffers.Builder(1024);       
        b.finish(
            RequestWrapper.createRequestWrapper(b, 
                Requests.scheduler_RequestScheduler,
                RequestScheduler.createRequestScheduler(b, 
                    uRequestScheduler.RequestSchedulerSave, 
                    RequestSchedulerSave.createRequestSchedulerSave(b, 
                        Schedule.createSchedule(b,
                            b.createString(this.name), 
                            uSchedule.OneWeekIn15Minutes,
                            OneWeekIn15Minutes.createOneWeekIn15Minutes(b,
                                OneWeekIn15MinutesData.createOneWeekIn15MinutesData(b, data)
                            )
                        )
                    )
                )
            )
        );
        this.appManagement.sendWebsocketMessage(b.asUint8Array(), [Responses.scheduler_ResponseScheduler], 3000);
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