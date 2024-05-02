<script lang="ts">
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
</script>

<div class='app'><div><h2></h2><p></p></div><div class='controls'><input class='toggle' type='checkbox'/></div></div>