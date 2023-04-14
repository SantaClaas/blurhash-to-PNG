import "./style.css";
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { setupCounter } from "./counter";
import { decode } from "blurhash";
import { generatePng } from "./blurhashToPng";
import { blurHashToDataURL } from "./blurhashToDataUrl";

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

const witdh = 1000,
  height = 1000;
const performance1 = performance.now();
const pixels = decode(blurhash, witdh, height);
const pngBytes = generatePng(witdh, height, pixels);

const performance2 = performance.now();
console.log("Runtime 1", performance2 - performance1);

const blob = new Blob([pngBytes], { type: "image/png" });
const objectUrl = URL.createObjectURL(blob);
const container = document.querySelector<HTMLDivElement>("#app");
const image = document.createElement("img");
image.src = objectUrl;
container?.appendChild(image);

// Other method with strings
const otherImage = document.createElement("img");
const performance3 = performance.now();
const dataUrl = blurHashToDataURL(blurhash, witdh, height);

const performance4 = performance.now();

console.log("Runtime 2", performance4 - performance3);
otherImage.src = dataUrl!;
container?.appendChild(otherImage);
