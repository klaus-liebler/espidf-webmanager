import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { html } from "lit-html";
import { DialogController } from "../screen_controller/dialog_controller";

const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const startHour=6;
enum MarkingMode{TOGGLE,ON,OFF};
export class WeeklyScheduleDialog extends DialogController {
    
    constructor(private pHandler: (ok: boolean, referenceHandle:any, value: Uint8Array) => any, private referenceHandle:any){
        super()
    }

    private isSelecting = false;
    private markingMode:MarkingMode=MarkingMode.TOGGLE
    private tblBody:Ref<HTMLTableSectionElement>= createRef();
   
    public Show(){
        this.setAll(false);
        this.dialog.value!.showModal();
    }
    private tdMousedown(e: MouseEvent) {
        //console.log(`mousedown @ ${(<HTMLElement>e.target).innerText}`)
        this.isSelecting = true;
        this.tdMouseenter(e)
        
        
        e.preventDefault(); // Verhindert die Textauswahl
    };
    private tdMouseenter(e: MouseEvent) {
        //console.log(`mouseenter @ ${(<HTMLElement>e.target).innerText}`)
        if (!this.isSelecting) return;
        switch(this.markingMode){
            case MarkingMode.TOGGLE:(<HTMLElement>e.target).classList.toggle('selected');break;
            case MarkingMode.ON:(<HTMLElement>e.target).classList.add('selected');break;
            case MarkingMode.OFF:(<HTMLElement>e.target).classList.remove('selected');break;
        }
    
    }
    private tdMouseup(e: MouseEvent) {
        //console.log(`mouseup @ ${(<HTMLElement>e.target).innerText}`)
        this.isSelecting = false;
    }

    private rdoChange(e:MouseEvent){
        var value:string =(<HTMLInputElement>e.target).value
        console.log(`rdoChange to ${value}`);
        this.markingMode=MarkingMode[value];
    }

    private copy(sourceDay:number, destinationDays:Array<number>){
        
        for(var fifteen_minutes_slot=0;fifteen_minutes_slot<4*24;fifteen_minutes_slot++){
            var sourceMarked=this.isSelected(sourceDay, fifteen_minutes_slot);
            for(const d of destinationDays){
                this.setSelected(d, fifteen_minutes_slot, sourceMarked);
            }
        }
    }

    private setAll(selected:boolean) {
        
        for(var d=0;d<weekdays.length;d++){
            for(var fifteen_minutes_slot=0;fifteen_minutes_slot<4*24;fifteen_minutes_slot++){
                this.setSelected(d, fifteen_minutes_slot, selected);
            }
        }
    }

    private isSelected(day_zero_based:number, fifteen_minutes_slot:number){
        const r=this.tblBody.value!.rows[day_zero_based]
        return r.cells[fifteen_minutes_slot+1].classList.contains("selected")
    }

    private setSelected(day_zero_based:number, fifteen_minutes_slot:number, value:boolean){
        const r=this.tblBody.value!.rows[day_zero_based]
        if(value){
            r.cells[fifteen_minutes_slot+1].classList.add("selected");
        }else{
            r.cells[fifteen_minutes_slot+1].classList.remove("selected");
        }
    }

    private save() {
        var t=this.tblBody.value!;
        var arr = new Uint8Array(96);
        for(var fifteen_minutes_slot=0;fifteen_minutes_slot<96;fifteen_minutes_slot++){
            var week=0;
            for(const d of [6,5,4,3,2,1,0]){
                var sourceMarked=this.isSelected(d, fifteen_minutes_slot);
                week&=sourceMarked?1:0;
                week<<=1
            }
            arr[fifteen_minutes_slot]=week;
        }
        this.pHandler?.(true, this.referenceHandle, arr);
        this.dialog.value!.close();
    }

    
    

    public Template = () => {
        const weekdayTemplate = (day_name, day_index) => html`${[...Array(96)].map((name, num) =>
            html`<td @mousedown=${(e: MouseEvent) => this.tdMousedown(e)} @mouseenter=${(e: MouseEvent) => this.tdMouseenter(e)} @mouseup=${(e: MouseEvent) => this.tdMouseup(e)}></td>`
        )}`
        const rowTemplates = [];
        weekdays.map((day_name, day_index) =>  {
            rowTemplates.push(html`<tr><td>${day_name}</td>${weekdayTemplate(day_name, day_index)}</tr>`)
            

        })


        return html`
    <dialog ${ref(this.dialog)}>
        <header>
            <span>Weekly Schedule Dialog</span>
            <button @click=${()=>this.dialog.value!.close("cancelled")} type="button">&times;</button>
        </header>
        <main>

                <fieldset>
                    <legend>Marking Mode</legend>
                    <label><input @change=${(e:MouseEvent) => this.rdoChange(e)} type="radio" name="mode" value="TOGGLE" checked />Toggle</label>
                    <label><input @change=${(e:MouseEvent) => this.rdoChange(e)} type="radio" name="mode" value="ON" />On</label>
                    <label><input @change=${(e:MouseEvent) => this.rdoChange(e)} type="radio" name="mode" value="OFF" />Off</label>
                </fieldset>
                <fieldset>
                    <legend>Comfort Copy</legend>
                    <input @click=${(e:MouseEvent) => this.copy(0, [1,2,3,4])} type="button" value="Mo➔Di-Fr" />
                    <input @click=${(e:MouseEvent) => this.copy(0, [1,2,3,4,5,6])} type="button" value="Mo➔Di-So" />
                    <input @click=${(e:MouseEvent) => this.copy(5, [6])} type="button" value="Sa➔So" />
                </fieldset>
                <fieldset>
                    <legend>Comfort Fill</legend>
                    <input @click=${(e:MouseEvent) => this.setAll(true)} type="button" value="Fill All" />
                    <input @click=${(e:MouseEvent) => this.setAll(false)} type="button" value="Clear All" />
                </fieldset>

            <table class="weekschedule">
                <thead>
                <tr>
                    <th></th>
                    ${[...Array(24)].map((v,i) => html`<th colspan=4>${(i+startHour)%24}:00</th>`)}
                </tr>
                </thead>
                <tbody ${ref(this.tblBody)}>
                ${rowTemplates}
                </tbody>
            </table>
        </main>
        <footer><input @click=${(e:MouseEvent) => this.save()} type="button" value="Save" /><input @click=${(e:MouseEvent) => this.save()} type="button" value="Cancel" /></footer>
    </dialog>
    `}



}
