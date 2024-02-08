
import * as flatbuffers from 'flatbuffers';
import { ApplicationId } from './flatbuffers_gen/application-id';
import { Command } from './flatbuffers_gen/command';
import { CommandMessage } from './flatbuffers_gen/websensact/command-message';

export async function sendCommandMessage(id: ApplicationId, cmd: Command, payload: Uint8Array) {
    let b = new flatbuffers.Builder(1024);
    let payloadOffset = CommandMessage.createPayloadVector(b, payload);
    CommandMessage.startCommandMessage(b);
    CommandMessage.addId(b, id);
    CommandMessage.addCmd(b, cmd);
    CommandMessage.addPayload(b, payloadOffset);
    let x = CommandMessage.endCommandMessage(b);
    b.finish(x);
    let buf = b.asUint8Array();
}