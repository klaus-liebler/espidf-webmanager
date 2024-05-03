import { ApplicationId } from '../../generated/flatbuffers/application-id'
import { Command } from '../../generated/flatbuffers/command';
import { sendCommandMessage } from '../../utils/utils_sensact'

export function SendNOPCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.NOP, new Uint8Array(view.buffer));
}
export function SendRESETCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.RESET, new Uint8Array(view.buffer));
}
export function SendSTART_IAPCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.START_IAP, new Uint8Array(view.buffer));
}
export function SendSTARTCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.START, new Uint8Array(view.buffer));
}
export function SendSTOPCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.STOP, new Uint8Array(view.buffer));
}
export function SendUPCommand(destinationApp:ApplicationId, forced:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setInt8(0,forced);
	sendCommandMessage(destinationApp, Command.UP, new Uint8Array(view.buffer));
}
export function SendDOWNCommand(destinationApp:ApplicationId, forced:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setInt8(0,forced);
	sendCommandMessage(destinationApp, Command.DOWN, new Uint8Array(view.buffer));
}
export function SendFORWARDCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.FORWARD, new Uint8Array(view.buffer));
}
export function SendBACKWARDCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.BACKWARD, new Uint8Array(view.buffer));
}
export function SendLEFTCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.LEFT, new Uint8Array(view.buffer));
}
export function SendRIGHTCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.RIGHT, new Uint8Array(view.buffer));
}
export function SendONCommand(destinationApp:ApplicationId, autoReturnToOffMsecs:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint32(0,autoReturnToOffMsecs);
	sendCommandMessage(destinationApp, Command.ON, new Uint8Array(view.buffer));
}
export function SendON_FILTERCommand(destinationApp:ApplicationId, targetApplicationId:number, autoReturnToOffMsecs:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint16(0,targetApplicationId);
	view.setUint32(2,autoReturnToOffMsecs);
	sendCommandMessage(destinationApp, Command.ON_FILTER, new Uint8Array(view.buffer));
}
export function SendOFFCommand(destinationApp:ApplicationId, autoReturnToOnMsecs:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint32(0,autoReturnToOnMsecs);
	sendCommandMessage(destinationApp, Command.OFF, new Uint8Array(view.buffer));
}
export function SendTOGGLECommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.TOGGLE, new Uint8Array(view.buffer));
}
export function SendTOGGLE_FILTERCommand(destinationApp:ApplicationId, targetApplicationId:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint16(0,targetApplicationId);
	sendCommandMessage(destinationApp, Command.TOGGLE_FILTER, new Uint8Array(view.buffer));
}
export function SendTOGGLE_SPECIALCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.TOGGLE_SPECIAL, new Uint8Array(view.buffer));
}
export function SendSET_PARAMCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.SET_PARAM, new Uint8Array(view.buffer));
}
export function SendSET_HORIZONTAL_TARGETCommand(destinationApp:ApplicationId, target:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint16(0,target);
	sendCommandMessage(destinationApp, Command.SET_HORIZONTAL_TARGET, new Uint8Array(view.buffer));
}
export function SendSTEP_HORIZONTALCommand(destinationApp:ApplicationId, step:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setInt16(0,step);
	sendCommandMessage(destinationApp, Command.STEP_HORIZONTAL, new Uint8Array(view.buffer));
}
export function SendSET_VERTICAL_TARGETCommand(destinationApp:ApplicationId, target:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint16(0,target);
	sendCommandMessage(destinationApp, Command.SET_VERTICAL_TARGET, new Uint8Array(view.buffer));
}
export function SendSTEP_VERTICALCommand(destinationApp:ApplicationId, step:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setInt16(0,step);
	sendCommandMessage(destinationApp, Command.STEP_VERTICAL, new Uint8Array(view.buffer));
}
export function SendSET_LATERAL_TARGETCommand(destinationApp:ApplicationId, target:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint16(0,target);
	sendCommandMessage(destinationApp, Command.SET_LATERAL_TARGET, new Uint8Array(view.buffer));
}
export function SendSTEP_LATERALCommand(destinationApp:ApplicationId, step:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setInt16(0,step);
	sendCommandMessage(destinationApp, Command.STEP_LATERAL, new Uint8Array(view.buffer));
}
export function SendHEARTBEATCommand(destinationApp:ApplicationId, sender:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint32(0,sender);
	sendCommandMessage(destinationApp, Command.HEARTBEAT, new Uint8Array(view.buffer));
}
export function SendSEND_STATUSCommand(destinationApp:ApplicationId)
{
	var view = new DataView(new ArrayBuffer(8));
	sendCommandMessage(destinationApp, Command.SEND_STATUS, new Uint8Array(view.buffer));
}
export function SendSET_RGBWCommand(destinationApp:ApplicationId, R:number, G:number, B:number, W:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setInt8(0,R);
	view.setInt8(1,G);
	view.setInt8(2,B);
	view.setInt8(3,W);
	sendCommandMessage(destinationApp, Command.SET_RGBW, new Uint8Array(view.buffer));
}
export function SendSET_SIGNALCommand(destinationApp:ApplicationId, signal:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint16(0,signal);
	sendCommandMessage(destinationApp, Command.SET_SIGNAL, new Uint8Array(view.buffer));
}
export function SendPINGCommand(destinationApp:ApplicationId, payload:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint32(0,payload);
	sendCommandMessage(destinationApp, Command.PING, new Uint8Array(view.buffer));
}
export function SendDEMOCommand(destinationApp:ApplicationId, demostep:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint32(0,demostep);
	sendCommandMessage(destinationApp, Command.DEMO, new Uint8Array(view.buffer));
}
export function SendSET_PWMCommand(destinationApp:ApplicationId, bitmask:number, value:number)
{
	var view = new DataView(new ArrayBuffer(8));
	view.setUint32(0,bitmask);
	view.setUint16(4,value);
	sendCommandMessage(destinationApp, Command.SET_PWM, new Uint8Array(view.buffer));
}

