import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { html } from "lit-html";
import { DialogController } from "./dialog_controller";
import {OneWeekIn15MinutesSchedule, ScheduleItem, SunRandomSchedule} from "../utils/schedule_items"
import { IAppManagement } from "../utils/interfaces";

export class CreateNewScheduleDialog extends DialogController {

    protected inputName: Ref<HTMLInputElement> = createRef();
    protected selectScheduleType: Ref<HTMLSelectElement> = createRef();

    constructor(private alreadyUsedScheduleNames: Array<string>, private m:IAppManagement, protected handler: ((ok: boolean, scheduleItem: ScheduleItem|null) => any) | undefined) {
        super();
    }

    protected cancelHandler() {
        this.dialog.value!.close('Cancel');
        this.handler?.(false, null);
    }

    protected okHandler() {
        this.dialog.value!.close('Ok');
        switch(this.selectScheduleType.value!.selectedIndex){
            case 0:
                this.handler?.(true, new OneWeekIn15MinutesSchedule(this.inputName.value!.value, this.m));
                break;
            case 1:
                this.handler?.(true, new SunRandomSchedule(this.inputName.value!.value, this.m));
                break;
        }
        
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
            <span>Create New Schedule</span>
            <button @click=${() => this.cancelHandler()} type="button">&times;</button>
        </header>
        <main>
            <table>
                <tr><td>Name</td><td><input ${ref(this.inputName)} type="text" placeholder="Enter Name" /></td></tr>
                <tr><td>Type</td><td><select ${ref(this.selectScheduleType)}><option>WeeklyQuarterHour</option><option>SunRandom</option></select></td></tr>
            </table>
        </main>
        <footer><input @click=${() => this.okHandler()} type="button" value="OK"></input><input @click=${() => this.cancelHandler()} type="button" value="Cancel"></input></footer>
    </dialog>`;
    }

}
