import "./style.css";
import { decode } from "blurhash";
import { generatePng } from "./blurhashToPng";
import { blurHashToDataURL } from "./blurhashToDataUrl";
import { encode } from "fast-png";

// document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
//   <div>
//     <a href="https://vitejs.dev" target="_blank">
//       <img src="${viteLogo}" class="logo" alt="Vite logo" />
//     </a>
//     <a href="https://www.typescriptlang.org/" target="_blank">
//       <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
//     </a>
//     <h1>Vite + TypeScript</h1>
//     <div class="card">
//       <button id="counter" type="button"></button>
//     </div>
//     <p class="read-the-docs">
//       Click on the Vite and TypeScript logos to learn more
//     </p>
//   </div>
// `;

// setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);

const blurhash = "UJJkM=_N4:%M%$-pIT-;%MRjIUIps:f6M{IV";
// Originally
//   "width": 1013,
//   "height": 1350,

const container = document.querySelector<HTMLDivElement>("#app");
const image = document.createElement("img");
container?.appendChild(image);
const otherImage = document.createElement("img");
container?.appendChild(otherImage);
const otherOtherImage = document.createElement("img");
container?.appendChild(otherOtherImage);

const witdh = 10,
  height = 10;
const pixels = decode(blurhash, witdh, height);

// Homemade
const performance1 = performance.now();
const pngBytes = generatePng(witdh, height, pixels);
const performance2 = performance.now();

console.log("Runtime 1", performance2 - performance1);
const blob = new Blob([pngBytes], { type: "image/png" });
const objectUrl = URL.createObjectURL(blob);
image.src = objectUrl;

const debugAnchor = document.createElement("a");
debugAnchor.innerText = "Download";
debugAnchor.download = "";
debugAnchor.href = objectUrl;
container?.appendChild(debugAnchor);

// Data URL
const performance3 = performance.now();
const dataUrl = blurHashToDataURL(blurhash, witdh, height);
const performance4 = performance.now();

console.log("Runtime 2", performance4 - performance3);
otherImage.src = dataUrl!;

// Fast PNG library

const performance5 = performance.now();
const pngBytes2 = encode(new ImageData(pixels, witdh, height));
const performance6 = performance.now();

console.log("Runtime 3", performance6 - performance5);
const blob2 = new Blob([pngBytes2], { type: "image/png" });
const objectUrl2 = URL.createObjectURL(blob2);
otherOtherImage.src = objectUrl2;
