/* Profile media only: preserve GIF animation, crop still photos, reject other files. */
(function () {
  'use strict';
  const MAX_GIF = 2 * 1024 * 1024, MAX_PHOTO = 10 * 1024 * 1024, MAX_PIXELS = 20000000;
  const fail = (message) => { throw new Error(message); };
  const ascii = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
  const dimensionsOK = (width, height) => Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0 && width * height <= MAX_PIXELS;

  function typeOf(bytes) {
    if (bytes.length >= 13 && /^(GIF87a|GIF89a)$/.test(ascii(bytes, 0, 6))) return 'image/gif';
    if (bytes.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b) && ascii(bytes, 12, 4) === 'IHDR') return 'image/png';
    if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
    if (bytes.length >= 30 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp';
    return null;
  }

  // Check dimensions before asking the browser to decode compressed image data.
  function headerSize(bytes, mime) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (mime === 'image/gif') return [view.getUint16(6, true), view.getUint16(8, true)];
    if (mime === 'image/png') return [view.getUint32(16), view.getUint32(20)];
    if (mime === 'image/webp') {
      const chunk = ascii(bytes, 12, 4);
      if (chunk === 'VP8X') return [1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)];
      if (chunk === 'VP8 ' && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) return [view.getUint16(26, true) & 16383, view.getUint16(28, true) & 16383];
      if (chunk === 'VP8L' && bytes[20] === 47) return [1 + bytes[21] + ((bytes[22] & 63) << 8), 1 + (bytes[22] >> 6) + (bytes[23] << 2) + ((bytes[24] & 15) << 10)];
      return null;
    }
    if (mime === 'image/jpeg') {
      let offset = 2;
      while (offset + 3 < bytes.length) {
        if (bytes[offset++] !== 255) return null;
        while (offset < bytes.length && bytes[offset] === 255) offset++;
        const marker = bytes[offset++];
        if (marker === 217 || marker === 218) return null;
        if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
        if (offset + 2 > bytes.length) return null;
        const length = view.getUint16(offset);
        if (length < 2 || offset + length > bytes.length) return null;
        if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
          return length >= 8 ? [view.getUint16(offset + 5), view.getUint16(offset + 3)] : null;
        }
        offset += length;
      }
    }
    return null;
  }

  async function decode(blob) {
    if (typeof createImageBitmap === 'function') {
      const image = await createImageBitmap(blob);
      return { image, close: () => image.close() };
    }
    const url = URL.createObjectURL(blob), image = new Image();
    try {
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      return { image, close: () => URL.revokeObjectURL(url) };
    } catch (error) { URL.revokeObjectURL(url); throw error; }
  }

  const dataURL = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Couldn’t read that picture. Please choose it again.'));
    reader.readAsDataURL(blob);
  });

  async function read(file) {
    if (!file) fail('Choose a photo or GIF from your device.');
    if (!file.size || file.size > MAX_PHOTO) fail('Choose a picture smaller than 10 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer()), mime = typeOf(bytes);
    const declared = String(file.type || '').toLowerCase();
    if (!mime || (declared && declared !== mime)) fail('Choose a JPG, PNG, WebP or GIF image.');
    if (mime === 'image/gif' && file.size > MAX_GIF) fail('Choose a GIF smaller than 2 MB to keep its animation.');
    const dimensions = headerSize(bytes, mime);
    if (!dimensions || !dimensionsOK(...dimensions)) fail('Choose a valid picture up to 20 megapixels.');
    const blob = new Blob([bytes], { type: mime });
    let decoded;
    try {
      decoded = await decode(blob);
      const image = decoded.image;
      if (!dimensionsOK(image.width, image.height)) fail('Choose a valid picture up to 20 megapixels.');
      if (mime === 'image/gif') return await dataURL(blob);
      const side = Math.min(image.width, image.height), canvas = document.createElement('canvas');
      canvas.width = canvas.height = 192;
      const context = canvas.getContext('2d');
      if (!context) fail('Your browser couldn’t prepare that picture. Try another browser.');
      context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 192, 192);
      const webp = canvas.toDataURL('image/webp', 0.82);
      return /^data:image\/webp;base64,/.test(webp) ? webp : canvas.toDataURL('image/jpeg', 0.82);
    } catch (error) {
      if (error instanceof Error && /^(Choose|Your browser|Couldn’t read)/.test(error.message)) throw error;
      fail('That picture couldn’t be opened. Try another photo or GIF.');
    } finally { if (decoded) decoded.close(); }
  }

  window.EF.profileMedia = Object.freeze({ read });
})();
