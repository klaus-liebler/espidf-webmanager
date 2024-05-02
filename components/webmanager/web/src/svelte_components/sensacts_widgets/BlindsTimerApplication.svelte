<script lang="ts">
    /*
Ein Blinds-Timer öffnet und schließt die verbundenen Rolläden 
+öffnen: beim CIVIL_SUNRISE + Offset +  Zufallsüberlagerung
es können mehrere Rolläden registriert werden
sie alle erhalten den gleichen SURISE-Type und den gleichen Offset, aber eine individuelle Zufallsüberlagerung
Implementierung in c++:
Beim Hochfahren/Initialisieren werden für alle Rolläden die nächsten Zeitpunkte zum Öffnen und zum Schließen berechnet und abgelegt als epoch seconds
Wenn diese Zeiten dann individuell erreicht werden, wird der passende Befehl an den Rolladen losgesendet und direkt der nächste Termin zum Öffnen/Schließen am Folgetag berechnet
*/
export class BlindsTimerApplication extends SensactApplication {
  constructor(applicationId: ApplicationId, applicationKey: string, applicationDescription: string,) { super(applicationId, applicationKey, applicationDescription) }

  renderHtmlUi(parent: HTMLElement): void {
    var panel = <HTMLElement>T(parent, "BlindsTimerApplication");
    this.renderBase(panel);
    var checkbox: HTMLInputElement = <HTMLInputElement>panel.children[1]!.children[0];
    checkbox.onclick = (e) => {
      if (checkbox.checked) {
        x.SendONCommand(this.applicationId, 0);
      } else {
        x.SendOFFCommand(this.applicationId, 0);
      }
      console.log(`blindstimer ${this.applicationId} ${checkbox.checked}`);
      e.stopPropagation();
    };
  }
}

</script>