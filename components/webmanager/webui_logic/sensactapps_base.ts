import { ApplicationId } from "./flatbuffers_gen/application-id";
import * as x from "./sendCommandImplementation_copied_during_build";
import { T } from "./utils";

export interface SensactContext {

};

export class ApplicationGroup{
  constructor(public readonly DisplayName:string, public readonly Apps:Array<SensactApplication|ApplicationGroup>){}

  renderHtmlUi(parent: HTMLElement): void{
    var container = <HTMLElement>T(parent, "ApplicationGroup");
    var button =<HTMLButtonElement>container.children[0]!;
    var panel =<HTMLButtonElement>container.children[1]!;
    button.children[0].textContent="▶";
    button.children[1].textContent=this.DisplayName;
    button.onclick=(e)=>{
        button.classList.toggle("active");
        if (panel.style.display === "block") {
            panel.style.display = "none";
            button.children[0].textContent="▶";
        } else {
            panel.style.display = "block";
            button.children[0].textContent="▼";
        }
        e.stopPropagation();
    };
    this.Apps.forEach(v=>v.renderHtmlUi(panel));
  }
}

export abstract class SensactApplication {
  abstract renderHtmlUi(parent: HTMLElement): void;
  protected renderBase(panel: HTMLElement){
    panel.children[0]!.children[0]!.textContent=this.applicationKey;
    panel.children[0]!.children[1]!.textContent=this.applicationDescription;

    
  }
  constructor(public readonly applicationId: ApplicationId, public readonly applicationKey: string, public readonly applicationDescription: string,) { }
}

export class OnOffApplication extends SensactApplication {
  constructor(applicationId: ApplicationId, applicationKey: string, applicationDescription: string,) { super(applicationId, applicationKey, applicationDescription) }



  renderHtmlUi(parent: HTMLElement): void {
    var panel = <HTMLElement>T(parent, "OnOffApplication");
    this.renderBase(panel);
    var checkbox: HTMLInputElement = <HTMLInputElement>panel.children[1]!.children[0];
    checkbox.onclick = (e) => {
      if (checkbox.checked) {
        x.SendONCommand(this.applicationId, 0);
      } else {
        x.SendOFFCommand(this.applicationId, 0);
      }
      console.log(`onoff ${this.applicationId} ${checkbox.checked}`);
      e.stopPropagation();
    };
  }
}

export class BlindApplication extends SensactApplication {
  constructor(applicationId: ApplicationId, applicationKey: string, applicationDescription: string,) { super(applicationId, applicationKey, applicationDescription) }


  onStop(input: HTMLInputElement) {
    x.SendSTOPCommand(this.applicationId);
    console.log(`blind_stop ${this.applicationId}`);
  }

  onUp(input: HTMLInputElement) {
    
  }

  onDown(input: HTMLInputElement) {
    x.SendDOWNCommand(this.applicationId, 1);
    console.log(`blind_down ${this.applicationId}`);
  }

  renderHtmlUi(parent: HTMLElement): void {
    let panel = <HTMLElement>T(parent, "BlindApplication");
    this.renderBase(panel);
    let up: HTMLInputElement = <HTMLInputElement>panel.children[1]!.children[0]!;
    let stop: HTMLInputElement = <HTMLInputElement>panel.children[1]!.children[1]!;
    let down: HTMLInputElement = <HTMLInputElement>panel.children[1]!.children[2]!;
    
    up.onclick = (e) => {
      x.SendUPCommand(this.applicationId, 1);
      console.log(`blind_up ${this.applicationId}`);
      e.stopPropagation();
    };
    stop.onclick = (e) => {
      x.SendSTOPCommand(this.applicationId);
      console.log(`blind_stop ${this.applicationId}`);
      e.stopPropagation();
    };
    down.onclick = (e) => {
      x.SendDOWNCommand(this.applicationId, 1);
      console.log(`blind_down ${this.applicationId}`);
      e.stopPropagation();
    };

    
  }

}


export class SinglePwmApplication extends SensactApplication {
  constructor(applicationId: ApplicationId, applicationKey: string, applicationDescription: string,) { super(applicationId, applicationKey, applicationDescription) }




  renderHtmlUi(parent: HTMLElement): void {
    let panel = <HTMLElement>T(parent, "SinglePwmApplication");
    this.renderBase(panel);
    let slider: HTMLInputElement = <HTMLInputElement>panel.children[1]!.children[0]!;
    slider.onchange=(e)=>{
      x.SendSET_VERTICAL_TARGETCommand(this.applicationId, parseInt(slider.value));
      console.log(`singlepwm_slider ${this.applicationId} ${slider.value}`);
    }
    let checkbox: HTMLInputElement = <HTMLInputElement>panel.children[1]!.children[1]!;
    checkbox.onclick = (e) => {
      if (checkbox.checked) {
        x.SendONCommand(this.applicationId, 0);
      } else {
        x.SendOFFCommand(this.applicationId, 0);
      }
      console.log(`singlepwm_toggle ${this.applicationId} ${checkbox.checked} `);
      e.stopPropagation();
    };
  }

}