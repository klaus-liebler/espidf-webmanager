import { AppManagement } from "../app_management";
import { $, A, Html, SvgIcon, gel, gqs } from "../utils"

export interface IDialogBodyRenderer {
    Render(dialogBody: HTMLDivElement): HTMLInputElement | null;
}

export enum Severity {
    SUCCESS,
    INFO,
    WARN,
    ERROR,
}

export class DialogController {

    private dialog = <HTMLDialogElement>gqs('dialog')!;
    private dialogHeading = <HTMLHeadingElement>gqs('dialog>header>span')!;
    private dialogBodyLeft = <HTMLDivElement>gqs('dialog>main>section:nth-child(1)')!;
    private dialogBodyRight = <HTMLDivElement>gqs('dialog>main>section:nth-child(2)')!;
    private dialogFooter = <HTMLElement>gqs('dialog>footer')!;
    private dialogClose = <HTMLElement>gqs('dialog>header>button')!;

    constructor(private appManagement: AppManagement) {

    }

    public init() {

        this.dialogClose.onclick = (e) => {
            this.dialog.close("cancelled");
        }
        this.dialog.oncancel = (e) => {
            this.dialog.close("cancelled");
        }

        // close when clicking on backdrop
        this.dialog.onclick = (event) => {
            if (event.target === this.dialog) {
                this.dialog.close('cancelled');
            }
        }
    }

    public showDialog(heading: string, message: string, renderer: IDialogBodyRenderer, handler: ((a: string) => any) | null) {
        this.whipeDialog();
        this.dialogHeading.innerText = heading;
        Html(this.dialogBodyRight, "p", [], [], message);
        let inputElement = renderer.Render(this.dialogBodyRight);
        Html(this.dialogFooter, "button", [], [], "OK").onclick = (e) => {
            this.dialog.close('OK');
            if (handler != null) handler(inputElement ? inputElement.value : "");
        };
    }

    public showEnterFilenameDialog(priority: number, messageText: string, handler: (filename: string) => void) {
        this.whipeDialog();
        this.dialogHeading.innerText = "Enter Filename";
        Html(this.dialogBodyRight, "p", [], [], messageText);
        var fileInput = <HTMLInputElement>Html(this.dialogBodyRight, "input", ["pattern", "^[A-Za-z0-9]{1,10}$"], []);

        var btnOk=Html(this.dialogFooter, "button", [], [], "OK")
        btnOk.onclick = (e) => {
            this.dialog.close('OK');
            if (handler != null) handler(fileInput.value);
        };
        this.dialog.showModal();
        fileInput.focus();
        fileInput.onkeyup = (e) => {
            if (e.key == 'Enter') {
                btnOk.click();
            }
        }
    }

    public showEnterPasswordDialog(severity: Severity, messageText: string, handler: (filename: string) => void) {
        this.whipeDialog();
        this.dialogHeading.innerText = "Enter Password";
        Html(this.dialogBodyLeft, "span", [], [DialogController.severity2class(severity)], DialogController.severity2symbol(severity));
        Html(this.dialogBodyRight, "p", [], [], messageText);
        var btnOk = Html(this.dialogFooter, "button", [], [], "OK");
        btnOk.onclick = (e) => {
            this.dialog.close('OK');
            if (handler != null) handler(passwordInput.value);
        };
        var passwordInput = <HTMLInputElement>Html(this.dialogBodyRight, "input", ["type", "password"], []);


        Html(this.dialogFooter, "button", ["type", "button"], [], "Cancel").onclick = (e) => {
            this.dialog.close('Cancel');
        };
        this.dialog.showModal();
        passwordInput.focus();
        passwordInput.onkeyup = (e) => {
            if (e.key == 'Enter') {
                btnOk.click();
            }
        }
    }

    public static severity2symbol(severity: Severity): string {
        switch (severity) {
            case Severity.WARN:
            case Severity.ERROR: return "⚠";
            case Severity.INFO: return "🛈";
            case Severity.SUCCESS: return "👍";
        }
    }

    public static severity2class(severity: Severity): string {
        switch (severity) {
            case Severity.WARN: return "ye"
            case Severity.ERROR: return "rd";
            case Severity.INFO: return "gr";
            case Severity.SUCCESS: return "gr";
        }
    }

    public showOKDialog(severity: Severity, messageText: string, handler?: ((a: string) => any) | null) {
        this.whipeDialog();
        this.dialogHeading.innerText = Severity[severity];
        Html(this.dialogBodyRight, "p", [], [], messageText);
        Html(this.dialogBodyLeft, "span", [], [], DialogController.severity2symbol(severity));
        Html(this.dialogFooter, "button", ["type", "button"], [], "OK").onclick = (e) => {
            this.dialog.close('OK');
            if (handler != null) handler("OK");
        };
        this.dialog.showModal();
    }

    public showOKCancelDialog(severity: Severity, messageText: string, handler: ((clickedOk: boolean) => any) | null): HTMLDialogElement {
        this.whipeDialog();
        this.dialogHeading.innerText = "Message";
        Html(this.dialogBodyRight, "p", [], [], messageText);
        Html(this.dialogBodyLeft, "span", [], [DialogController.severity2class(severity)], DialogController.severity2symbol(severity));
        Html(this.dialogFooter, "button", ["type", "button"], [], "OK").onclick = (e) => {
            this.dialog.close('OK');
            if (handler != null) handler(true);
        };
        Html(this.dialogFooter, "button", ["type", "button"], [], "Cancel").onclick = (e) => {
            this.dialog.close('Cancel');
            if (handler != null) handler(false);
        };
        this.dialog.showModal();
        return this.dialog;
    }

    private whipeDialog() {
        this.dialogHeading.innerText = "";
        this.dialogBodyLeft.innerText = "";
        this.dialogBodyRight.innerText = "";
        this.dialogFooter.innerText = "";
    }

    public showFilelist(priority: number, files: string[], openhandler: (filename: string) => any, deletehandler: (filename: string) => any) {

        this.whipeDialog();
        this.dialogHeading.innerText = "Please select a file to load"
        Html(this.dialogFooter, "button", ["type", "button"], [], "Cancel").onclick = (e) => {
            this.dialog.close("cancelled");
        };
        let table = <HTMLTableElement>Html(this.dialogBodyRight, "table", [], []);
        let thead = <HTMLTableSectionElement>Html(table, "thead", [], []);
        let tr_head = Html(thead, "tr", [], []);
        Html(tr_head, "th", [], [], "File Name");
        Html(tr_head, "th", [], [], "File Operation");
        let tbody = <HTMLTableSectionElement>Html(table, "tbody", [], []);
        for (let filename of files) {
            if (!filename.endsWith(".json")) continue;
            filename = filename.substring(0, filename.length - 5);
            let tr = Html(tbody, "tr", [], []);
            Html(tr, "td", [], [], filename);
            let operationTd = Html(tr, "td", [], []);
            let openButton = Html(operationTd, "button", ["type", "button"], []);
            SvgIcon(openButton, "folder-open");
            openButton.onclick = (e) => {
                this.dialog.close("opened");
                openhandler(filename);

            };
            let deleteButton = Html(operationTd, "button", ["type", "button"], [],);
            SvgIcon(deleteButton, "bin2");
            deleteButton.onclick = (e) => {
                this.dialog.close("deleted");
                deletehandler(filename);
            }
        };
        this.dialog.showModal();

    }
}