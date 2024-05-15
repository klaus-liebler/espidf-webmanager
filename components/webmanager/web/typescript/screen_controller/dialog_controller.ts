import { html } from "lit-html";
import { Ref, createRef, ref } from "lit-html/directives/ref.js";
import { IDialogBodyRenderer } from "../utils/interfaces";
import { Html, Severity, severity2class, severity2symbol } from "../utils/common";

enum Mode {
    CUSTOM_RENDERER,
    OK,
    OK_CANCEL,
    FILENAME,
    PASSWORD,
  }

export class DialogController {
    private dialog: Ref<HTMLDialogElement> = createRef();
    private dialogHeading:Ref<HTMLElement> = createRef();
    private dialogBodyLeft:Ref<HTMLElement> = createRef();
    private dialogBodyRightMessage:Ref<HTMLParagraphElement> = createRef();
    private dialogBodyRightContent:Ref<HTMLParagraphElement> = createRef();
    private dialogFooter:Ref<HTMLElement> = createRef();
   
   
    public Template = () => html`
    <dialog ${ref(this.dialog)}>
        <header>
            <span ${ref(this.dialogHeading)}>Überschrift</span>
            <button @click=${()=>this.dialog.value!.close("cancelled")} type="button">&times;</button>
        </header>
        <main>
            <section ${ref(this.dialogBodyLeft)}></section>
            <section><p ${ref(this.dialogBodyRightMessage)}></p><p ${ref(this.dialogBodyRightContent)}></p></section>
        </main>
        <footer ${ref(this.dialogFooter)}></footer>
    </dialog>`

    private handler: ((ok: boolean, value: string) => any)|undefined;
    private inputElement: HTMLInputElement | null=null;
    private mode = Mode.OK

    private ok_handler() {
        this.dialog.value!.close('OK')
        switch (this.mode) {
            case Mode.FILENAME:
            case Mode.PASSWORD:
                this.handler?.(true, this.inputElement.value)
                break;
            case Mode.CUSTOM_RENDERER:
                this.handler?.(true, this.inputElement?.value ?? '')
                break;
            default:
                this.handler?.(true, '')
                break;
        }
        
    }

  private cancel_handler() {
    this.dialog.value!.close('Cancel')
    this.handler?.(false, '')
  }

    public init() {

        this.dialog.value!.oncancel = () => {
            this.dialog.value!.close("cancelled");
        }

        // close when clicking on backdrop
        this.dialog.value!.onclick = (event) => {
            if (event.target === this.dialog) {
                this.dialog.value!.close('cancelled');
            }
        }
    }


    private prepareDialog(mode:Mode, h:string, m:string, severity:Severity, handler?:((ok: boolean, value: string) => any)) {
        this.mode=mode;
        this.dialogHeading.value!.innerText = h;
        this.dialogBodyLeft.value!.innerText="";
        Html(this.dialogBodyLeft.value!, "span", [], [severity2class(severity)], severity2symbol(severity));
        this.dialogBodyRightMessage.value!.innerText = m;
        this.dialogBodyRightContent.value!.innerText = "";
        this.dialogFooter.value!.innerText="";
        this.handler=handler;
    }

    
    public showDialog(heading: string, message: string, renderer: IDialogBodyRenderer, handler?:((ok: boolean, value: string) => any)) {
        this.prepareDialog(Mode.CUSTOM_RENDERER, heading, message, Severity.INFO, handler);
        this.inputElement = renderer.Render(this.dialogBodyRightContent.value!);
        Html(this.dialogFooter.value!, "button", [], [], "OK").onclick = () => {this.ok_handler()}
        Html(this.dialogFooter.value!, "button", [], [], "Cancel").onclick = () => {this.cancel_handler()}
        this.dialog.value!.showModal();
        return this.dialog.value!;
    }

    public showEnterFilenameDialog(messageText: string, handler?: ((ok: boolean, value: string) => any)) {
        this.prepareDialog(Mode.FILENAME, "Enter Filename", messageText, Severity.INFO, handler);
        this.inputElement = <HTMLInputElement>Html(this.dialogBodyRightContent.value!, "input", ["pattern", "^[A-Za-z0-9]{1,10}$"], []);

        var btnOk=Html(this.dialogFooter.value!, "button", [], [], "OK")
        btnOk.onclick = () => {this.ok_handler()}
        Html(this.dialogFooter.value!, "button", [], [], "Cancel").onclick = () => {this.cancel_handler()}
        this.dialog.value!.showModal();
        this.inputElement.focus();
        this.inputElement.onkeyup = (e) => {
            if (e.key == 'Enter') {
                btnOk.click();
            }
        }
        return this.dialog.value!;
    }

    public showEnterPasswordDialog(severity: Severity, messageText: string, handler?: ((ok: boolean, value: string) => any)) {
        this.prepareDialog(Mode.PASSWORD, "Enter Password", messageText, severity, handler);
        
        var btnOk = Html(this.dialogFooter.value!, "button", [], [], "OK");
        btnOk.onclick = () => {this.ok_handler()}
        this.inputElement = <HTMLInputElement>Html(this.dialogBodyRightContent.value!, "input", ["type", "password"], []);
        Html(this.dialogFooter.value!, "button", [], [], "Cancel").onclick = () => {this.cancel_handler()}
        this.dialog.value!.showModal();
        this.inputElement.focus();
        this.inputElement.onkeyup = (e) => {
            if (e.key == 'Enter') {
                btnOk.click();
            }
        }
        return this.dialog.value!;
    }

    public showOKDialog(severity: Severity, messageText: string, handler?: ((ok: boolean, value: string) => any)) {
        this.prepareDialog(Mode.OK, Severity[severity], messageText, severity, handler);
        Html(this.dialogFooter.value!, "button", [], [], "OK").onclick = () => {this.ok_handler()}
        this.dialog.value!.showModal();
        return this.dialog.value!;
    }

    public showOKCancelDialog(severity: Severity, messageText: string, handler?: ((ok: boolean, value: string) => any)) {
        this.prepareDialog(Mode.OK_CANCEL, Severity[severity], messageText, severity, handler);
        Html(this.dialogFooter.value!, "button", [], [], "OK").onclick = () => {this.ok_handler()}
        Html(this.dialogFooter.value!, "button", [], [], "Cancel").onclick = () => {this.cancel_handler()}
        this.dialog.value!.showModal();
        return this.dialog.value!;
    }
}
