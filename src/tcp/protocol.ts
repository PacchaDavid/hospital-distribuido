import { EventEmitter } from "node:events";

export interface TcpMessage {
  type: string;
  [key: string]: unknown;
}

export function encodeMessage(msg: TcpMessage): Buffer {
  return Buffer.from(JSON.stringify(msg) + "\n");
}

export class LineBuffer extends EventEmitter {
  private buffer = "";

  push(data: Buffer | string): void {
    this.buffer += data.toString();
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.length > 0) {
        try {
          const msg = JSON.parse(line) as TcpMessage;
          this.emit("message", msg);
        } catch {
          this.emit("parseError", line);
        }
      }
    }
  }
}
