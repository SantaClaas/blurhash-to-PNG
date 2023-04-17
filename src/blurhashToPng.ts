// Source https://gist.github.com/georgexchelebiev/c7f1197509513147a1bc89a56db788ae
//TODO can I write the PNG to a stream and set that as image source so that it starts loading in the DOM immediately because PNG has scan lines that can load in like it would come from a network.
//TODO accredit fast-png and source above and W3C spec and...something missing?
const encoder = new TextEncoder();

// CRC START ----------
const crcTable: number[] = [];
// const crcTable = new Uint8Array(255 * 4);
// const crcTableView = new DataView(crcTable.buffer);

// Make crc table
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function updateCrc(currentCrc: number, data: Uint8Array): number {
  let c = currentCrc;
  for (let n = 0; n < data.length; n++) {
    c = crcTable[(c ^ data[n]) & 0xff] ^ (c >>> 8);
  }
  return c;
}

const initialCrc = 0xffffffff;
function createCrc(buffer: Uint8Array) {
  return updateCrc(initialCrc, buffer) ^ initialCrc;
}

// CRC END ----------

function inflateStore2(data: Uint8Array) {
  const MAX_STORE_LENGTH = 65535;
  const storeCount = Math.ceil(data.length / MAX_STORE_LENGTH);
  const length = storeCount * 5 + data.length;
  let storeBuffer = new Uint8Array(length);
  let remaining;
  let blockType;
  let index = 0;
  for (let i = 0; i < data.length; i += MAX_STORE_LENGTH) {
    remaining = data.length - i;
    blockType = 0;

    if (remaining <= MAX_STORE_LENGTH) {
      blockType = 0x01;
    } else {
      remaining = MAX_STORE_LENGTH;
      blockType = 0x00;
    }
    // little-endian

    storeBuffer[index] = blockType;
    storeBuffer[index + 1] = remaining & 0xff;
    storeBuffer[index + 2] = (remaining & 0xff00) >>> 8;
    storeBuffer[index + 3] = ~remaining & 0xff;
    storeBuffer[index + 4] = (~remaining & 0xff00) >>> 8;

    const toAdd = data.subarray(i, i + remaining);

    storeBuffer.set(toAdd, index + 5);
    index += 5 + toAdd.length;
  }

  return storeBuffer;
}
function inflateStore(data: Uint8Array) {
  // IDK if "store" is the right terminology. I based this upon the source code, not a technical document
  const storeHeaderLength = 5;
  const maxStoreDataLength = 65535;
  // From my limited understanding, we add 5 bytes to each store of 65535
  // So we assume the length is

  // Round up
  const storeCount = Math.ceil(data.length / maxStoreDataLength);
  console.log(
    "Store count",
    data.length / maxStoreDataLength,
    Math.ceil(data.length / maxStoreDataLength),
    data.length,
    maxStoreDataLength
  );
  // The new length including the headers
  const length = storeCount * storeHeaderLength + data.length;
  let storeBuffer = new Uint8Array(length);
  const view = new DataView(storeBuffer.buffer);

  console.log("Store buffer length", storeBuffer.length);

  for (let storeIndex = 0; storeIndex < storeCount; storeIndex++) {
    // Start in new storeBuffer
    const startIndexCurrentStore =
      storeIndex * (storeHeaderLength + maxStoreDataLength);
    // Remaining bytes in data
    const remainingBytesCount = data.length - startIndexCurrentStore;
    const isLast = remainingBytesCount <= maxStoreDataLength;

    const storeType = isLast ? 0x01 : 0x00;
    const currentStoreDataLength = isLast
      ? remainingBytesCount
      : maxStoreDataLength;

    view.setUint8(startIndexCurrentStore, storeType);
    view.setUint8(startIndexCurrentStore + 1, currentStoreDataLength & 0xff);
    view.setUint8(
      startIndexCurrentStore + 2,
      (currentStoreDataLength & 0xff00) >>> 8
    );
    view.setUint8(startIndexCurrentStore + 3, ~currentStoreDataLength & 0xff);
    view.setUint8(
      startIndexCurrentStore + 4,
      (~currentStoreDataLength & 0xff00) >>> 8
    );

    // Set store "header"
    // storeBuffer.set(
    //   [
    //     storeType,
    //     currentStoreDataLength & 0xff,
    //     (currentStoreDataLength & 0xff00) >>> 8,
    //     ~currentStoreDataLength & 0xff,
    //     (~currentStoreDataLength & 0xff00) >>> 8,
    //   ],
    //   startIndexCurrentStore
    // );

    // Set data
    // Put the next chunk of data
    // It is ok if endIndex overshoots and is out of range because JS recognizes that and only goes to the end
    const endIndex = startIndexCurrentStore + currentStoreDataLength;
    // if isLast
    if (false) {
      console.log(
        "Remaining bytes length",
        remainingBytesCount,
        currentStoreDataLength,
        maxStoreDataLength
      );
      let s = "";
      let i = 0;
      for (const a of data.subarray(startIndexCurrentStore, endIndex)) {
        const isEven = i % 4 == 0;
        s += a.toString(16);
        if (isEven) s += " ";
      }

      console.log(s);
    }
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

function dwordAsArray(dword: number) {
  return new Uint8Array([
    (dword & 0xff000000) >>> 24,
    (dword & 0x00ff0000) >>> 16,
    (dword & 0x0000ff00) >>> 8,
    dword & 0x000000ff,
  ]);
}

function append(array: Uint8Array, number: number) {
  const newArray = new Uint8Array(array.length + 1);

  newArray.set(array);
  newArray[array.length] = number;
  return newArray;
}
function combine(array1: Uint8Array, array2: Uint8Array) {
  const result = new Uint8Array(array1.length + array2.length);
  result.set(array1);
  result.set(array2, array1.length);
  return result;
}
function createChunk(length: number, type: Uint8Array, data: Uint8Array) {
  //TODO find a way to not create so many different arrays
  //   const a = new Uint8Array();
  const a = type;
  const crc = createCrc(combine(a, data));

  const result = new Uint8Array(8 + data.length + 4);

  const view = new DataView(result.buffer);

  //   view.setInt8;
  // Length 4 bytes
  view.setUint32(0, length);
  // Chunk type 4 bytes
  result.set(type, 4);
  // Chunk Data
  result.set(data, 8);
  view.setUint32(8 + data.length, crc);

  const c = view.getUint32(8 + data.length);
  console.log("ASD", new TextDecoder().decode(type), c.toString(16));

  return result;
}

function printHex(array: Uint8Array) {
  console.log("asd", new Uint32Array(array).toString());
  // array.map(n => n.toString(16).padStart(2, "0")).join("")
}
function createIHDR(width: number, height: number) {
  // https://www.w3.org/TR/2003/REC-PNG-20031110/#11IHDR
  // 13 Bytes length = 4 + 4 + 1 + 1 + 1 + 1 + 1
  const length = 13;
  const ihrData = new Uint8Array(length);
  const view = new DataView(ihrData.buffer);

  //TODO test if endianness is correct
  //
  view.setUint32(0, width);
  view.setUint32(4, height);
  // Set bit depth of 8
  view.setUint8(8, 8);
  // Set color type to 6 which is truecolor with alpha (RGBA)
  view.setUint8(9, 6);
  // Set compression method to 0=deflate, the only allowed value
  view.setUint8(10, 0);
  // Set filtering to 0=adaptive, the only allowed value
  view.setUint8(11, 0);
  // Set interlacing to 0=none
  view.setUint8(12, 0);

  // UTF-8 == ASCII
  const ihdrTag = encoder.encode("IHDR");
  return createChunk(length, ihdrTag, ihrData);
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
  const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const NO_FILTER = 0;

  // PNG creations

  // ASCII == UTF-8
  const IHDR = createIHDR(width, height);

  // How many bytes are one pixel (RGBA)
  const pixelBytesLength = 4;
  // Every row is one byte longer so we add +1 for every row which is height * 1 or just height
  const scanlinesLength = width * height * pixelBytesLength + height;
  //TODO this should be the same as the source array or not?
  let scanlines = new Uint8Array(scanlinesLength);

  for (
    let pixelIndex = 0, scanlineIndex = 0;
    pixelIndex < height * width * pixelBytesLength;

  ) {
    const isPixelRowStart = pixelIndex % (width * pixelBytesLength) === 0;
    const isScanlineRowStart =
      scanlineIndex % (width * pixelBytesLength + 1) === 0;

    // If we completed a pixel row and a scanline row set the first index in the new scanline row to no filter
    if (isPixelRowStart && isScanlineRowStart) {
      //TODO simplify this because we don't need to set the first index to its default state if it is already in it
      scanlines[scanlineIndex] = NO_FILTER;
      // Advance the scanline index so we can set it from the pixels
      scanlineIndex++;
      continue;
    }

    scanlines[scanlineIndex] = rgbaPixels[pixelIndex] & 0xff;
    scanlineIndex++;
    pixelIndex++;
  }

  // Deflate method 2 bytes
  const deflateMethodBytesLength = 2;
  const inflatedStore = inflateStore2(scanlines);
  const dword = dwordAsArray(adler32(scanlines));
  const compressedScanlines = new Uint8Array(
    deflateMethodBytesLength + inflatedStore.length + dword.length
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
    compressedScanlines.length,
    // Should be 73 68 65 84 in decimal
    encoder.encode("IDAT"),
    compressedScanlines
  );

  const IEND = createChunk(0, encoder.encode("IEND"), new Uint8Array());
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
