// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from 'flatbuffers';

export class Mac6 {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):Mac6 {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

v(index: number):number|null {
    return this.bb!.readUint8(this.bb_pos + 0 + index);
}

static sizeOf():number {
  return 6;
}

static createMac6(builder:flatbuffers.Builder, v: number[]|null):flatbuffers.Offset {
  builder.prep(1, 6);

  for (let i = 5; i >= 0; --i) {
    builder.writeInt8((v?.[i] ?? 0));

  }

  return builder.offset();
}

}
