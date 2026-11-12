const path = require('node:path');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');

const uploadsDirectory = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads'));
const maxBytes = 2 * 1024 * 1024;
function invalid(message, statusCode = 400) { return Object.assign(new Error(message), { statusCode }); }

function validateImage(encoded) {
  if (typeof encoded !== 'string' || !encoded || encoded.length > Math.ceil(maxBytes / 3) * 4) {
    throw invalid('Selecione uma imagem JPG ou PNG de até 2 MB.');
  }
  if (encoded.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw invalid('Imagem inválida.');
  const data = Buffer.from(encoded, 'base64');
  if (data.length > maxBytes) throw invalid('A imagem precisa ter até 2 MB.', 413);
  let extension, width, height;
  if (data.length >= 45 && data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
      data.readUInt32BE(8) === 13 && data.toString('ascii',12,16) === 'IHDR' &&
      data.subarray(-12).equals(Buffer.from('0000000049454e44ae426082', 'hex'))) {
    extension = 'png'; width = data.readUInt32BE(16); height = data.readUInt32BE(20);
  } else if (data.length >= 12 && data[0] === 0xff && data[1] === 0xd8 && data[data.length-2] === 0xff && data[data.length-1] === 0xd9) {
    let offset = 2;
    while (offset + 4 < data.length) {
      if (data[offset] !== 0xff) break;
      while (data[offset] === 0xff) offset++;
      const marker = data[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > data.length) break;
      const length = data.readUInt16BE(offset);
      if (length < 2 || offset + length > data.length) break;
      if ([0xc0,0xc1,0xc2].includes(marker) && length >= 8) {
        height = data.readUInt16BE(offset+3); width = data.readUInt16BE(offset+5); extension = 'jpg'; break;
      }
      offset += length;
    }
  }
  if (!extension || !width || !height || width > 10000 || height > 10000 || width * height > 20000000) {
    throw invalid('Escolha uma imagem JPG ou PNG válida de até 20 megapixels.');
  }
  return { data, extension, width, height };
}

async function saveImage(encoded) {
  const { data, extension } = validateImage(encoded);
  await fs.mkdir(uploadsDirectory, { recursive: true });
  const name = `${randomUUID()}.${extension}`;
  await fs.writeFile(path.join(uploadsDirectory, name), data, { flag:'wx', mode:0o600 });
  return { caminho:`/uploads/${name}` };
}

module.exports = { saveImage, validateImage, uploadsDirectory };
