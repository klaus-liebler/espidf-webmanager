<script lang="ts">
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

</script>
<div class='app'><div><h2></h2><p></p></div><div><button>⏶</button><button>⏹</button><button>⏷</button></div></div>