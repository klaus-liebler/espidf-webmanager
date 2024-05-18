import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { html } from "lit-html";
import { DialogController } from "../screen_controller/dialog_controller";

const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const startHour=6;
enum MarkingMode{TOGGLE,ON,OFF};
export class WeeklyScheduleDialog extends DialogController {
    
    constructor(private pHandler?: (ok: boolean, value: Uint8Array) => any){
        super()
    }

    private isSelecting = false;
    private markingMode:MarkingMode=MarkingMode.TOGGLE
    private tblBody:Ref<HTMLTableSectionElement>= createRef();
   

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
        var t=this.tblBody.value!;
        for(var r_index=0;r_index<t.rows.length;r_index++){
            var offset=0;
            if(r_index%4!=0) offset=-1
            const r=t.rows[r_index]
            var sourceMarked=r.cells[sourceDay+offset].classList.contains("selected")
            for(const d of destinationDays){
                if(sourceMarked){
                    r.cells[d+offset].classList.add("selected")
                }else{
                    r.cells[d+offset].classList.remove("selected")
                }
            }
        }
    }

    save() {
        var t=this.tblBody.value!;
        
    }


    setAll(selected:boolean) {
        var t=this.tblBody.value!;
        for(var r_index=0;r_index<t.rows.length;r_index++){
            var offset=0;
            if(r_index%4!=0) offset=-1
            const r=t.rows[r_index]
            for(const d of [1,2,3,4,5,6,7]){
                if(selected){
                    r.cells[d+offset].classList.add("selected")
                }else{
                    r.cells[d+offset].classList.remove("selected")
                }
            }
        }
    }

    public Template = () => {
        const weekdayTemplate = (h, m, timeStr) => html`${weekdays.map((name, num) =>
            html`<td @mousedown=${(e: MouseEvent) => this.tdMousedown(e)} @mouseenter=${(e: MouseEvent) => this.tdMouseenter(e)} @mouseup=${(e: MouseEvent) => this.tdMouseup(e)}></td>`
        )}`
        const rowTemplates = [];
        [...Array(24)].map((_, hour) => {
            hour += startHour;
            hour %= 24;

            [...Array(4)].map((_, m15) => {
                var timeStr = String(hour).padStart(2, '0') + ":" + String(m15 * 15).padStart(2, '0');
                if (m15 == 0) {//start of hour
                    rowTemplates.push(html`<tr><td rowspan=4>${timeStr}</td>${weekdayTemplate(hour, m15 * 15, timeStr)}</tr>`)
                } else {
                    rowTemplates.push(html`<tr>${weekdayTemplate(hour, m15 * 15, timeStr)}</tr>`)
                }

            })

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
                    <input @click=${(e:MouseEvent) => this.copy(1, [2,3,4,5])} type="button" value="Mo➔Di-Fr" />
                    <input @click=${(e:MouseEvent) => this.copy(1, [2,3,4,5,6,7])} type="button" value="Mo➔Di-So" />
                    <input @click=${(e:MouseEvent) => this.copy(6, [7])} type="button" value="Sa➔So" />
                </fieldset>
                <fieldset>
                    <legend>Comfort Fill</legend>
                    <input @click=${(e:MouseEvent) => this.setAll(true)} type="button" value="Fill All" />
                    <input @click=${(e:MouseEvent) => this.setAll(false)} type="button" value="Clear All" />
                </fieldset>

            <table class="weekschedule">
                <thead>
                <tr>
                    <th>Uhrzeit</th>
                    ${[weekdays.map((v) => html`<th>${v}</th>`)]}
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
