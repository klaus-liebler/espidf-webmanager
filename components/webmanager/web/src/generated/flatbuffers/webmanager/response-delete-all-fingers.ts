// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

export class ResponseDeleteAllFingers {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):ResponseDeleteAllFingers {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsResponseDeleteAllFingers(bb:flatbuffers.ByteBuffer, obj?:ResponseDeleteAllFingers):ResponseDeleteAllFingers {
  return (obj || new ResponseDeleteAllFingers()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsResponseDeleteAllFingers(bb:flatbuffers.ByteBuffer, obj?:ResponseDeleteAllFingers):ResponseDeleteAllFingers {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ResponseDeleteAllFingers()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

errorcode():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint16(this.bb_pos + offset) : 0;
}

static startResponseDeleteAllFingers(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addErrorcode(builder:flatbuffers.Builder, errorcode:number) {
  builder.addFieldInt16(0, errorcode, 0);
}

static endResponseDeleteAllFingers(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createResponseDeleteAllFingers(builder:flatbuffers.Builder, errorcode:number):flatbuffers.Offset {
  ResponseDeleteAllFingers.startResponseDeleteAllFingers(builder);
  ResponseDeleteAllFingers.addErrorcode(builder, errorcode);
  return ResponseDeleteAllFingers.endResponseDeleteAllFingers(builder);
}
}
