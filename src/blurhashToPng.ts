// Source https://gist.github.com/georgexchelebiev/c7f1197509513147a1bc89a56db788ae

import { decode } from "blurhash";

function isBigEndian() {
  let uInt32 = new Uint32Array([0x11223344]);
  let uInt8 = new Uint8Array(uInt32.buffer);

  if (uInt8[0] === 0x44) return false;
  if (uInt8[0] === 0x11) return true;
  // 🤷
  throw "Cannot determine endianness";
}
const encoder = new TextEncoder();

function getPngArray(pngString: string) {
  const pngArray = new Uint8Array(pngString.length);
  for (let i = 0; i < pngString.length; i++) {
    pngArray[i] = pngString.charCodeAt(i);
  }
  return pngArray;
}

function inflateStore(data: Uint8Array) {
  // IDK if "store" is the right terminology. I based this upon the source code, not a technical document
  const storeHeaderLength = 5;
  const maxStoreDataLength = 65535;
  // From my limited understanding, we add 5 bytes to each store of 65535
  // So we assume the length is

  // Round up
  const storeCount = Math.ceil(data.length / maxStoreDataLength);
  // The new length including the headers
  const length = storeCount * storeHeaderLength + data.length;
  let storeBuffer = new Uint8Array(length);

  for (let storeIndex = 0; storeIndex < storeCount; storeIndex++) {
    // Start in new storeBuffer
    const startIndexCurrentStore =
      storeIndex * storeHeaderLength + maxStoreDataLength;
    // Remaining bytes in data
    const remainingBytesCount = data.length - startIndexCurrentStore;
    const isLast = remainingBytesCount <= maxStoreDataLength;

    const storeType = isLast ? 0x01 : 0x00;
    const currentStoreDataLength = isLast
      ? remainingBytesCount
      : maxStoreDataLength;

    // Set store "header"
    storeBuffer.set(
      [
        storeType,
        currentStoreDataLength & 0xff,
        (currentStoreDataLength & 0xff00) >>> 8,
        ~currentStoreDataLength & 0xff,
        (~currentStoreDataLength & 0xff00) >>> 8,
      ],
      startIndexCurrentStore
    );

    // Set data
    // Put the next chunk of data
    // It is ok if endIndex overshoots and is out of range because JS recognizes that and only goes to the end
    const endIndex = startIndexCurrentStore + currentStoreDataLength;

    storeBuffer.set(
      data.subarray(startIndexCurrentStore, endIndex),
      startIndexCurrentStore + storeHeaderLength
    );
  }

  return storeBuffer;
}
function adler32(data: Uint8Array) {
  let MOD_ADLER = 65521;
  let a = 1;
  let b = 0;

  for (let index = 0; index < data.length; index++) {
    a = (a + data[index]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }

  return (b << 16) | a;
}

function updateCrc(crcTable: Uint8Array, crc: number, buffer: Uint8Array) {
  let c = crc;
  let b: number;

  for (let n = 0; n < buffer.length; n++) {
    b = buffer[n];
    c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  }
  return c;
}

function createCrc(crcTable: Uint8Array, buffer: Uint8Array) {
  return updateCrc(crcTable, 0xffffffff, buffer) ^ 0xffffffff;
}

function dwordAsString(dword: number) {
  return String.fromCharCode(
    (dword & 0xff000000) >>> 24,
    (dword & 0x00ff0000) >>> 16,
    (dword & 0x0000ff00) >>> 8,
    dword & 0x000000ff
  );
}

function dwordAsArray(dword: number) {
  return new Uint8Array([
    (dword & 0xff000000) >>> 24,
    (dword & 0x00ff0000) >>> 16,
    (dword & 0x0000ff00) >>> 8,
    dword & 0x000000ff,
  ]);
}

function combine(array1: Uint8Array, array2: Uint8Array) {
  const mergedArray = new Uint8Array(array1.length + array2.length);

  mergedArray.set(array1);
  mergedArray.set(array2, array1.length);
  return mergedArray;
}

function append(array: Uint8Array, number: number) {
  const newArray = new Uint8Array(array.length + 1);

  newArray.set(array);
  newArray[array.length] = number;
  return newArray;
}
function createChunk(
  crcTable: Uint8Array,
  length: number,
  type: Uint8Array,
  data: Uint8Array
) {
  //TODO find a way to not create so many different arrays
  const buffer = append(type, length);
  const crc = createCrc(crcTable, buffer);
  const lengthDword = dwordAsArray(length);
  const crcDword = dwordAsArray(crc);

  // return dwordAsString(length) + type + data + dwordAsString(cr);

  const result = new Uint8Array(
    lengthDword.length + type.length + data.length + crcDword.length
  );

  result.set(lengthDword, 0);
  result.set(type, lengthDword.length);
  result.set(data, lengthDword.length + type.length);
  result.set(crcDword, lengthDword.length + type.length + data.length);

  return result;
}

function createIHDR(crcTable: Uint8Array, width: number, height: number) {
  // 13 Bytes length = 4 + 4 + 1 + 1 + 1 + 1 + 1
  const length = 13;
  const ihdrData = new Uint8Array(length);
  //TODO test if endianness is correct
  ihdrData.set(dwordAsArray(width), 0);
  ihdrData.set(dwordAsArray(height), 4);
  ihdrData.set(
    [
      // bit depth
      8,
      // color type: 6=truecolor with alpha
      6,
      // compression method: 0=deflate, only allowed value
      0,
      // filtering: 0=adaptive, only allowed value
      0,
      // interlacing: 0=none
      0,
    ],
    8
  );

  // UTF-8 == ASCII
  const ihdrTag = encoder.encode("IHDR");
  return createChunk(crcTable, length, ihdrTag, ihdrData);
}
/**
 * Generates a PNG blob from the rgbaPixels array (4 bytes --> 1 Pixel RGBA)
 */
export function generatePng(
  width: number,
  height: number,
  rgbaPixels: Uint8ClampedArray
): Uint8Array {
  const DEFLATE_METHOD = [0x78, 0x01];
  const CRC_TABLE = new Uint8Array(255);
  const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const NO_FILTER = 0;

  let n, c, k;

  // make crc table
  for (n = 0; n < 256; n++) {
    c = n;
    for (k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    CRC_TABLE[n] = c;
  }

  // PNG creations

  // ASCII == UTF-8
  const IEND = createChunk(
    CRC_TABLE,
    0,

    encoder.encode("IEND"),
    new Uint8Array()
  );
  const IHDR = createIHDR(CRC_TABLE, width, height);

  // How many bytes is one pixel (RGBA)
  const pixelBytesLength = 4;
  const countPixelBytes = width * height * pixelBytesLength;
  //TODO this should be the same as the source array or not?
  let scanlines = new Uint8Array(countPixelBytes);
  let currentScanline;

  // Go through each pixel
  for (let y = 0; y < rgbaPixels.length; y += width * pixelBytesLength) {
    // Not sure on width
    currentScanline = new Uint8Array(width);
    currentScanline[0] = NO_FILTER;

    // Here we go through each byte on the x axis but
    const widthInBytes = width * pixelBytesLength;
    for (let x = 0; x < widthInBytes; x++) {
      currentScanline[x + y] = rgbaPixels[y + x] & 0xff;
    }
  }

  // Deflate method 2 bytes
  const deflateMethodBytesLength = 2;
  const inflatedStore = inflateStore(scanlines);
  const dword = dwordAsArray(adler32(scanlines));
  const compressedScanlines = new Uint8Array(
    deflateMethodBytesLength +
      inflatedStore.length /* * inflateStore.BYTES_PER_ELEMENT */ +
      dword.length * dword.BYTES_PER_ELEMENT
  );

  //   console.log(
  //     deflateMethodBytesLength +
  //       inflateStore.length /* * inflateStore.BYTES_PER_ELEMENT */ +
  //       dword.length * dword.BYTES_PER_ELEMENT
  //   );
  // Set deflate method
  compressedScanlines.set(DEFLATE_METHOD);

  // Set inflated store
  compressedScanlines.set(inflatedStore, deflateMethodBytesLength);

  // Set dword
  compressedScanlines.set(
    dword,
    deflateMethodBytesLength + inflatedStore.length
  );

  const IDAT = createChunk(
    CRC_TABLE,
    compressedScanlines.length,
    // Should be 73 68 65 84 in decimal
    encoder.encode("IDAT"),
    compressedScanlines
  );

  // Combine to png binary
  const pngBytes = new Uint8Array(
    SIGNATURE.length + IHDR.length + IDAT.length + IEND.length
  );

  pngBytes.set(SIGNATURE, 0);
  pngBytes.set(IHDR, SIGNATURE.length);
  pngBytes.set(IDAT, SIGNATURE.length + IHDR.length);
  pngBytes.set(IEND, SIGNATURE.length + IHDR.length + IDAT.length);
  return pngBytes;
}
