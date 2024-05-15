import type { ResponseWrapper, Responses } from "../../generated/flatbuffers/webmanager";
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
  showDialog(head: string, renderer: IDialogBodyRenderer, pHandler?: ((ok: boolean, value: string) => any)): void;
  showEnterFilenameDialog(messageText: string, pHandler?: ((ok: boolean, value: string) => any)): void;
  showEnterPasswordDialog(messageText: string, pHandler?: ((ok: boolean, value: string) => any)): void;
  showOKDialog(pSeverity: Severity, messageText: string, pHandler?: ((ok: boolean, value: string) => any)): void;
  showOKCancelDialog(pSeverity: Severity, messageText: string, pHandler?: ((ok: boolean, value: string) => any)): void;
};


