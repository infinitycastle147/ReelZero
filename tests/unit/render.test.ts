// F008: Unit tests for validateMp4Buffer()
// Run with: npm test (jest or vitest)

import { validateMp4Buffer } from "@/lib/services/remotion/render";

describe("validateMp4Buffer()", () => {
  it("(a) buffer of length 0 returns false", () => {
    expect(validateMp4Buffer(Buffer.alloc(0))).toBe(false);
  });

  it("(b) 12-byte buffer with 'ftyp' at offset 4 returns true", () => {
    // bytes 4–7 must be 0x66 0x74 0x79 0x70 = "ftyp"
    const buf = Buffer.alloc(12);
    buf[4] = 0x66; // 'f'
    buf[5] = 0x74; // 't'
    buf[6] = 0x79; // 'y'
    buf[7] = 0x70; // 'p'
    expect(validateMp4Buffer(buf)).toBe(true);
  });

  it("(c) buffer with wrong bytes at offset 4 returns false", () => {
    const buf = Buffer.alloc(12);
    buf[4] = 0x00;
    buf[5] = 0x00;
    buf[6] = 0x00;
    buf[7] = 0x00;
    expect(validateMp4Buffer(buf)).toBe(false);
  });

  it("buffer shorter than 12 bytes returns false", () => {
    const buf = Buffer.alloc(8);
    buf[4] = 0x66;
    buf[5] = 0x74;
    buf[6] = 0x79;
    buf[7] = 0x70;
    expect(validateMp4Buffer(buf)).toBe(false);
  });

  it("buffer with 'ftyp' not at correct offset returns false", () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0x66; // 'f' at wrong position
    buf[1] = 0x74;
    buf[2] = 0x79;
    buf[3] = 0x70;
    expect(validateMp4Buffer(buf)).toBe(false);
  });
});
