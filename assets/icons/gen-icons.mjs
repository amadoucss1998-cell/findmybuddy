// Generates PNG app icons for Find My Buddy (no external deps).
// Draws a rounded gradient tile with two overlapping "buddy" circles.
import zlib from "node:zlib";
import { writeFileSync } from "node:fs";

function lerp(a, b, t) { return a + (b - a) * t; }
function mix(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }

function makeIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const brandTop = [124, 58, 237];   // #7c3aed
  const brandBot = [219, 39, 119];   // #db2777
  const r = size * 0.22;             // corner radius
  // two buddy circles
  const cr = size * 0.15;
  const c1 = { x: size * 0.4, y: size * 0.46 };
  const c2 = { x: size * 0.6, y: size * 0.46 };
  const linkY = size * 0.62;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // rounded-rect mask
      const inCorner = (cx, cy) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
      let inside = true;
      if (x < r && y < r && !inCorner(r, r)) inside = false;
      else if (x > size - r && y < r && !inCorner(size - r, r)) inside = false;
      else if (x < r && y > size - r && !inCorner(r, size - r)) inside = false;
      else if (x > size - r && y > size - r && !inCorner(size - r, size - r)) inside = false;

      if (!inside) { buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0; continue; }

      // diagonal gradient
      const t = (x / size + y / size) / 2;
      let [rr, gg, bb] = mix(brandTop, brandBot, t);

      // white buddy circles + connecting bar
      const d1 = Math.hypot(x - c1.x, y - c1.y);
      const d2 = Math.hypot(x - c2.x, y - c2.y);
      const inBar = y > linkY && y < linkY + size * 0.16 && x > c1.x && x < c2.x;
      if (d1 <= cr || d2 <= cr || inBar) {
        rr = 255; gg = 255; bb = 255;
      }
      buf[i] = rr; buf[i + 1] = gg; buf[i + 2] = bb; buf[i + 3] = 255;
    }
  }
  return encodePNG(buf, size, size);
}

function encodePNG(rgba, width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunks = [];
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunks.push(sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(chunks);
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0, 0);
  return Buffer.concat([len, t, data, crc]);
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

for (const size of [192, 512]) {
  writeFileSync(new URL(`./icon-${size}.png`, import.meta.url), makeIcon(size));
  console.log(`icon-${size}.png written`);
}
