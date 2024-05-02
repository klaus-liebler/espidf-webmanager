<script lang="ts">
    
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
  constructor(public readonly applicationId: ApplicationId, public readonly applicationKey: string, public readonly applicationDescription: string,) { }
  
  abstract renderHtmlUi(parent: HTMLElement): void;
  
  protected renderBase(panel: HTMLElement){
    panel.children[0]!.children[0]!.textContent=this.applicationKey;
    panel.children[0]!.children[1]!.textContent=this.applicationDescription;
  }
}
</script>

<div class='appgroup'><button><span></span><span></span></button><div></div></div>