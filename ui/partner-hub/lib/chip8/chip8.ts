export class Chip8 {
  private readonly memory: Uint8Array;
  private readonly v: Uint8Array;
  private readonly stack: Uint16Array;
  private readonly frameBuffer: Uint8Array;
  private readonly keys: boolean[];
  private i: number;
  private pc: number;
  private sp: number;
  private delayTimer: number;
  private soundTimer: number;
  private waitingForKey: boolean;
  private waitingRegister: number | null;

  constructor() {
    this.memory = new Uint8Array(4096);
    this.v = new Uint8Array(16);
    this.stack = new Uint16Array(16);
    this.frameBuffer = new Uint8Array(64 * 32);
    this.keys = new Array(16).fill(false);
    this.i = 0;
    this.pc = 0x200;
    this.sp = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.waitingForKey = false;
    this.waitingRegister = null;
    this.loadFontset();
  }

  reset() {
    this.memory.fill(0);
    this.v.fill(0);
    this.stack.fill(0);
    this.frameBuffer.fill(0);
    this.keys.fill(false);
    this.i = 0;
    this.pc = 0x200;
    this.sp = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.waitingForKey = false;
    this.waitingRegister = null;
    this.loadFontset();
  }

  loadProgram(program: Uint8Array) {
    this.reset();
    this.memory.set(program, 0x200);
  }

  cycle() {
    if (this.waitingForKey) {
      return;
    }

    const opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    this.pc = (this.pc + 2) & 0xfff;

    const nnn = opcode & 0x0fff;
    const nn = opcode & 0x00ff;
    const n = opcode & 0x000f;
    const x = (opcode & 0x0f00) >> 8;
    const y = (opcode & 0x00f0) >> 4;

    switch (opcode & 0xf000) {
      case 0x0000: {
        switch (nn) {
          case 0x00e0:
            this.frameBuffer.fill(0);
            break;
          case 0x00ee:
            this.sp = Math.max(0, this.sp - 1);
            this.pc = this.stack[this.sp];
            break;
          default:
            break;
        }
        break;
      }
      case 0x1000:
        this.pc = nnn;
        break;
      case 0x2000:
        this.stack[this.sp] = this.pc;
        this.sp = (this.sp + 1) & 0xf;
        this.pc = nnn;
        break;
      case 0x3000:
        if (this.v[x] === nn) {
          this.pc = (this.pc + 2) & 0xfff;
        }
        break;
      case 0x4000:
        if (this.v[x] !== nn) {
          this.pc = (this.pc + 2) & 0xfff;
        }
        break;
      case 0x5000:
        if (n === 0 && this.v[x] === this.v[y]) {
          this.pc = (this.pc + 2) & 0xfff;
        }
        break;
      case 0x6000:
        this.v[x] = nn;
        break;
      case 0x7000:
        this.v[x] = (this.v[x] + nn) & 0xff;
        break;
      case 0x8000:
        switch (n) {
          case 0x0:
            this.v[x] = this.v[y];
            break;
          case 0x1:
            this.v[x] |= this.v[y];
            break;
          case 0x2:
            this.v[x] &= this.v[y];
            break;
          case 0x3:
            this.v[x] ^= this.v[y];
            break;
          case 0x4: {
            const sum = this.v[x] + this.v[y];
            this.v[0xf] = sum > 0xff ? 1 : 0;
            this.v[x] = sum & 0xff;
            break;
          }
          case 0x5: {
            this.v[0xf] = this.v[x] > this.v[y] ? 1 : 0;
            this.v[x] = (this.v[x] - this.v[y]) & 0xff;
            break;
          }
          case 0x6:
            this.v[0xf] = this.v[x] & 0x1;
            this.v[x] >>= 1;
            break;
          case 0x7: {
            this.v[0xf] = this.v[y] > this.v[x] ? 1 : 0;
            this.v[x] = (this.v[y] - this.v[x]) & 0xff;
            break;
          }
          case 0xe:
            this.v[0xf] = (this.v[x] & 0x80) >> 7;
            this.v[x] = (this.v[x] << 1) & 0xff;
            break;
          default:
            break;
        }
        break;
      case 0x9000:
        if (n === 0 && this.v[x] !== this.v[y]) {
          this.pc = (this.pc + 2) & 0xfff;
        }
        break;
      case 0xa000:
        this.i = nnn;
        break;
      case 0xb000:
        this.pc = (nnn + this.v[0]) & 0xfff;
        break;
      case 0xc000:
        this.v[x] = (Math.floor(Math.random() * 256) & nn) & 0xff;
        break;
      case 0xd000:
        this.drawSprite(this.v[x], this.v[y], n);
        break;
      case 0xe000:
        if (nn === 0x9e) {
          if (this.keys[this.v[x]]) {
            this.pc = (this.pc + 2) & 0xfff;
          }
        } else if (nn === 0xa1) {
          if (!this.keys[this.v[x]]) {
            this.pc = (this.pc + 2) & 0xfff;
          }
        }
        break;
      case 0xf000:
        switch (nn) {
          case 0x07:
            this.v[x] = this.delayTimer;
            break;
          case 0x0a:
            this.waitingForKey = true;
            this.waitingRegister = x;
            break;
          case 0x15:
            this.delayTimer = this.v[x];
            break;
          case 0x18:
            this.soundTimer = this.v[x];
            break;
          case 0x1e:
            this.i = (this.i + this.v[x]) & 0xfff;
            break;
          case 0x29:
            this.i = this.v[x] * 5;
            break;
          case 0x33: {
            const value = this.v[x];
            this.memory[this.i] = Math.floor(value / 100);
            this.memory[this.i + 1] = Math.floor((value % 100) / 10);
            this.memory[this.i + 2] = value % 10;
            break;
          }
          case 0x55:
            for (let index = 0; index <= x; index += 1) {
              this.memory[this.i + index] = this.v[index];
            }
            break;
          case 0x65:
            for (let index = 0; index <= x; index += 1) {
              this.v[index] = this.memory[this.i + index];
            }
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
  }

  tickTimers() {
    if (this.delayTimer > 0) {
      this.delayTimer -= 1;
    }
    if (this.soundTimer > 0) {
      this.soundTimer -= 1;
    }
  }

  setKey(key: number, down: boolean) {
    this.keys[key] = down;
    if (down && this.waitingForKey && this.waitingRegister !== null) {
      this.v[this.waitingRegister] = key;
      this.waitingForKey = false;
      this.waitingRegister = null;
    }
  }

  getFrameBuffer() {
    return this.frameBuffer;
  }

  getSoundTimer() {
    return this.soundTimer;
  }

  private drawSprite(x: number, y: number, height: number) {
    this.v[0xf] = 0;
    for (let row = 0; row < height; row += 1) {
      const sprite = this.memory[this.i + row];
      for (let col = 0; col < 8; col += 1) {
        const spritePixel = (sprite >> (7 - col)) & 0x1;
        if (spritePixel === 0) {
          continue;
        }
        const xPos = (x + col) % 64;
        const yPos = (y + row) % 32;
        const index = xPos + yPos * 64;
        if (this.frameBuffer[index] === 1) {
          this.v[0xf] = 1;
        }
        this.frameBuffer[index] ^= 1;
      }
    }
  }

  private loadFontset() {
    const fontset = [
      0xf0, 0x90, 0x90, 0x90, 0xf0, // 0
      0x20, 0x60, 0x20, 0x20, 0x70, // 1
      0xf0, 0x10, 0xf0, 0x80, 0xf0, // 2
      0xf0, 0x10, 0xf0, 0x10, 0xf0, // 3
      0x90, 0x90, 0xf0, 0x10, 0x10, // 4
      0xf0, 0x80, 0xf0, 0x10, 0xf0, // 5
      0xf0, 0x80, 0xf0, 0x90, 0xf0, // 6
      0xf0, 0x10, 0x20, 0x40, 0x40, // 7
      0xf0, 0x90, 0xf0, 0x90, 0xf0, // 8
      0xf0, 0x90, 0xf0, 0x10, 0xf0, // 9
      0xf0, 0x90, 0xf0, 0x90, 0x90, // A
      0xe0, 0x90, 0xe0, 0x90, 0xe0, // B
      0xf0, 0x80, 0x80, 0x80, 0xf0, // C
      0xe0, 0x90, 0x90, 0x90, 0xe0, // D
      0xf0, 0x80, 0xf0, 0x80, 0xf0, // E
      0xf0, 0x80, 0xf0, 0x80, 0x80, // F
    ];

    this.memory.set(fontset, 0x0);
  }
}
