const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

let draws = 0, closed = 0, decodes = 0;
let decodeWidth = 1, decodeHeight = 1, decodeFails = false;
class Reader {
  readAsDataURL(blob) {
    blob.arrayBuffer().then((data) => {
      this.result = `data:${blob.type};base64,${Buffer.from(data).toString('base64')}`;
      this.onload();
    });
  }
}
const context = vm.createContext({
  window: { EF: {} }, Blob, FileReader: Reader,
  createImageBitmap: async () => {
    decodes++;
    if (decodeFails) throw new Error('decode failed');
    return { width: decodeWidth, height: decodeHeight, close: () => closed++ };
  },
  document: { createElement: () => ({
    getContext: () => ({ drawImage: () => draws++ }),
    toDataURL: (mime) => `data:${mime};base64,YQ==`
  }) }
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/core/profile-media.js'), 'utf8'), context);
const read = context.window.EF.profileMedia.read;
const file = (bytes, type, size = bytes.length) => ({ type, size, arrayBuffer: async () => Uint8Array.from(bytes).buffer });
const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const png = Buffer.alloc(24);
Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
png.write('IHDR', 12); png.writeUInt32BE(480, 16); png.writeUInt32BE(320, 20);

(async () => {
  // Duplicate the image block: upload must retain all frames, byte-for-byte.
  const animated = Buffer.concat([gif.subarray(0, gif.length - 1), gif.subarray(19)]);
  const result = await read(file(animated, 'image/gif'));
  assert.equal(result, 'data:image/gif;base64,' + animated.toString('base64'));
  assert.equal(draws, 0, 'GIFs must never be drawn to a canvas');
  assert.equal(closed, 1, 'decoded resources must be closed');
  assert.equal(await read(file(gif, '')), 'data:image/gif;base64,' + gif.toString('base64'), 'missing device MIME can be inferred from image bytes');
  decodeWidth = 480; decodeHeight = 320;
  assert.equal(await read(file(png, 'image/png')), 'data:image/webp;base64,YQ==');
  assert.equal(draws, 1);
  await assert.rejects(read(file(gif, 'image/png')), /JPG, PNG, WebP or GIF/);
  await assert.rejects(read(file(Buffer.from('<svg></svg>'), 'image/svg+xml')), /JPG, PNG, WebP or GIF/);
  await assert.rejects(read(file(gif, 'image/gif', 2 * 1024 * 1024 + 1)), /GIF smaller than 2 MB/);
  await assert.rejects(read(file(png, 'image/png', 10 * 1024 * 1024 + 1)), /smaller than 10 MB/);
  const bad = Buffer.from(gif); bad[6] = bad[7] = 0;
  const before = decodes;
  await assert.rejects(read(file(bad, 'image/gif')), /valid picture up to 20 megapixels/);
  const huge = Buffer.from(png); huge.writeUInt32BE(10000, 16); huge.writeUInt32BE(10000, 20);
  await assert.rejects(read(file(huge, 'image/png')), /20 megapixels/);
  assert.equal(decodes, before, 'invalid dimensions must be rejected before decoding');
  decodeFails = true;
  await assert.rejects(read(file(gif, 'image/gif')), /couldn’t be opened/);
  await assert.rejects(read(null), /Choose a photo or GIF/);
  console.log('Profile media: 12 checks passed (GIF bytes/frames, static crop, MIME, limits, dimensions, decode errors).');
})().catch((error) => { console.error(error); process.exitCode = 1; });
