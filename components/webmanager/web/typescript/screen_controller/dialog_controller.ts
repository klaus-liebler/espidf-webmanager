import { TemplateResult, html } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { Severity, severity2class, severity2symbol } from "../utils/common";



export abstract class DialogController {
   
    public abstract Template():TemplateResult<1>;
    protected dialog: Ref<HTMLDialogElement> = createRef();
    public Show():void{ this.dialog.value!.showModal();}
}
    
export abstract class SimpleDialogController extends DialogController{
    protected abstract footerTemplate():TemplateResult<1>;
    protected abstract mainTemplate():TemplateResult<1>;


    constructor(protected headingStr:string, protected severity:Severity, protected handler: ((ok: boolean, value: string) => any)|undefined){
        super()
    }
   
    protected cancelHandler() {
    this.dialog.value!.close('Cancel')
    this.handler?.(false, '')
    }
    
      protected backdropClickedHandler(e:MouseEvent){
        if (e.target === this.dialog) {
            this.cancelHandler();
        }
      }
   
    public Template(){ return html`
    <dialog class="simple" @cancel=${()=>this.cancelHandler()} @click=${(e:MouseEvent)=>this.backdropClickedHandler(e)} ${ref(this.dialog)}>
        <header>
            <span>${this.headingStr}</span>
            <button @click=${()=>this.dialog.value!.close("cancelled")} type="button">&times;</button>
        </header>
        <main>
            <section><span class=${severity2class(this.severity)}>${severity2symbol(this.severity)}</span></section>
            <section>${this.mainTemplate()}</section>
        </main>
        <footer>${this.footerTemplate()}</footer>
    </dialog>`}
}

export abstract class EnterSomethingDialog extends SimpleDialogController{
    constructor(headingStr: string, protected messageText: string, handler?: ((ok: boolean, value: string) => any)){
        super(headingStr, Severity.INFO, handler)
    }
    protected inputElement: Ref<HTMLInputElement>=createRef();
    protected inpTextKeyup(e:KeyboardEvent) {
        if (e.key == 'Enter') {
            this.btnOkClick()
        }
    }

    protected btnOkClick() {
        this.handler?.(true, this.inputElement.value!.value)
    }

    protected footerTemplate(){return html`<input @click=${()=>this.btnOkClick()} type="button" value="OK"></input><input @click=${()=>this.cancelHandler()} type="button" value="Cancel"></input>`}
}

export class FilenameDialog extends EnterSomethingDialog{
  
    constructor(messageText: string, handler?: ((ok: boolean, value: string) => any)){
        super("Enter Filename", messageText, handler)
    }
   
    protected mainTemplate(){return html`<p> ${this.messageText}</p><p><input ${ref(this.inputElement)} @keyup=${(e:KeyboardEvent)=>this.inpTextKeyup(e)} type="text" pattern="^[A-Za-z0-9]{1,10}$"></input></p>`}
}

export class PasswordDialog extends EnterSomethingDialog{

    constructor(messageText: string, handler?: ((ok: boolean, value: string) => any)){
        super("Enter Passwort", messageText, handler)
    }

    protected mainTemplate(){return html`<p> ${this.messageText}</p><p><input @keyup=${(e:KeyboardEvent)=>this.inpTextKeyup(e)} type="password"></input></p>`}
}

export class OkDialog extends SimpleDialogController{
    constructor(severity: Severity, private messageText: string, handler?: ((ok: boolean, value: string) => any)){
        super(Severity[severity], severity, handler)
    }

    protected btnOkClick=()=>this.handler?.(true, '')
    protected mainTemplate(){return html`<p> ${this.messageText}</p>`}
    protected footerTemplate(){return html`<input @click=${()=>this.btnOkClick()} type="button" value="OK"></input>`}
}

export class OkCancelDialog extends SimpleDialogController{
    constructor(severity: Severity, private messageText: string, handler?: ((ok: boolean, value: string) => any)){
        super(Severity[severity], severity, handler)
    }

    protected btnOkClick=()=>this.handler?.(true, '')
    protected mainTemplate(){return html`<p> ${this.messageText}</p>`}
    protected footerTemplate(){return html`<input @click=${()=>this.btnOkClick()} type="button" value="OK"></input><input @click=${()=>this.cancelHandler()} type="button" value="Cancel"></input>`}
}
