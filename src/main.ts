import "./style.css";
import { decode } from "blurhash";
import { generatePng } from "./blurhashToPng";
import { blurHashToDataURL } from "./blurhashToDataUrl";
import { encode } from "fast-png";

const blurhash = "UJJkM=_N4:%M%$-pIT-;%MRjIUIps:f6M{IV";
const container = document.querySelector<HTMLDivElement>("#app");
const image = document.createElement("img");
container?.appendChild(image);
const otherImage = document.createElement("img");
container?.appendChild(otherImage);
const otherOtherImage = document.createElement("img");
otherOtherImage.setAttribute("download", "other other.png");
container?.appendChild(otherOtherImage);

const witdh = 1000,
  height = 1000;
const pixels = decode(blurhash, witdh, height);

// Homemade
const performance1 = performance.now();
const pngBytes = generatePng(witdh, height, pixels);
const performance2 = performance.now();

console.log("My implementation time", performance2 - performance1);
const blob = new Blob([pngBytes], { type: "image/png" });
const objectUrl = URL.createObjectURL(blob);
image.src = objectUrl;

new WritableStream();

const debugAnchor = document.createElement("a");
debugAnchor.innerText = "Download";
debugAnchor.download = "My Implementation.png";
debugAnchor.href = objectUrl;
container?.appendChild(debugAnchor);

// Data URL
const performance3 = performance.now();
const dataUrl = blurHashToDataURL(blurhash, witdh, height);
const performance4 = performance.now();

console.log("Blurhash to data URL time", performance4 - performance3);
otherImage.src = dataUrl!;

const dataUrlBlob = await fetch(dataUrl!).then((r) => r.blob());

// Fast PNG library

const performance5 = performance.now();
const pngBytes2 = encode(new ImageData(pixels, witdh, height));
const performance6 = performance.now();

console.log("fast-png library time", performance6 - performance5);
const blob2 = new Blob([pngBytes2], { type: "image/png" });
const objectUrl2 = URL.createObjectURL(blob2);
otherOtherImage.src = objectUrl2;

const dataUrlBuffer = await dataUrlBlob.arrayBuffer();
const myBuffer = await blob.arrayBuffer();
const fastPngBuffer = await blob2.arrayBuffer();

console.log("My implementation size", myBuffer.byteLength);
console.log("data URL size", dataUrlBuffer.byteLength);
console.log("fast-png size", fastPngBuffer.byteLength);
