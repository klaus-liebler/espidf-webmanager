import type { ResponseWrapper, Responses } from "../../generated/flatbuffers/webmanager";
import { DialogController } from "../screen_controller/dialog_controller";
import type { Severity } from "./common";

export interface IWebsocketMessageListener {
  onMessage(messageWrapper: ResponseWrapper): void;
}

export interface IDialogBodyRenderer {
  Render(dialogBody: HTMLElement): HTMLInputElement | null;
}

export interface IAppManagement {
  registerWebsocketMessageTypes(listener: IWebsocketMessageListener, ...messageTypes: number[]): (() => void);
  unregister(listener: IWebsocketMessageListener): void;
  sendWebsocketMessage(data: ArrayBuffer, messagesToUnlock?: Array<Responses>, maxWaitingTimeMs?: number): void;
  log(text: string): void;
  showSnackbar(severity: Severity, text: string): void;
  showDialog<T extends DialogController>(type: { new(m: IAppManagement): T; } , pHandler?: ((ok: boolean, value: string) => any)): void;
  showEnterFilenameDialog(messageText: string, pHandler?: ((ok: boolean, value: string) => any)): void;
  showEnterPasswordDialog(messageText: string, pHandler?: ((ok: boolean, value: string) => any)): void;
  showOKDialog(pSeverity: Severity, messageText: string, pHandler?: ((ok: boolean, value: string) => any)): void;
  showOKCancelDialog(pSeverity: Severity, messageText: string, pHandler?: ((ok: boolean, value: string) => any)): void;
  showWeeklyTimetableDialog(pHandler: (ok: boolean, referenceHandle:any, value: Uint8Array) => any, referenceHandle:any):void;
};

export interface IDialogController {

  showDialog(pHandler?: ((ok: boolean, value: string) => any)): void;
  
};
