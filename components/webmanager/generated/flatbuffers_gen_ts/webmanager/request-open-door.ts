// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

export class RequestOpenDoor {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):RequestOpenDoor {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsRequestOpenDoor(bb:flatbuffers.ByteBuffer, obj?:RequestOpenDoor):RequestOpenDoor {
  return (obj || new RequestOpenDoor()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsRequestOpenDoor(bb:flatbuffers.ByteBuffer, obj?:RequestOpenDoor):RequestOpenDoor {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new RequestOpenDoor()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static startRequestOpenDoor(builder:flatbuffers.Builder) {
  builder.startObject(0);
}

static endRequestOpenDoor(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createRequestOpenDoor(builder:flatbuffers.Builder):flatbuffers.Offset {
  RequestOpenDoor.startRequestOpenDoor(builder);
  return RequestOpenDoor.endRequestOpenDoor(builder);
}
}