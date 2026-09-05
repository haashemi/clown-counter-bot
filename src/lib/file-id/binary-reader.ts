export class BinaryReader {
  private readonly buffer: Buffer;
  private pos = 0;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
  }

  read(bytes: number): Buffer {
    const chunk = this.buffer.subarray(this.pos, this.pos + bytes);
    this.pos += bytes;
    return chunk;
  }

  skip(bytes: number): void {
    this.pos += bytes;
  }

  readUInt32LE(): number {
    const value = this.buffer.readUInt32LE(this.pos);
    this.pos += 4;
    return value;
  }

  readInt32LE(): number {
    const value = this.buffer.readInt32LE(this.pos);
    this.pos += 4;
    return value;
  }

  readBigInt64LE(): bigint {
    const value = this.buffer.readBigInt64LE(this.pos);
    this.pos += 8;
    return value;
  }
}
