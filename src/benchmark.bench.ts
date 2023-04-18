// @vitest-environment jsdom

import { decode } from "blurhash";
import { bench } from "vitest";
import { generatePng } from "./blurhashToPng";
import { blurHashToDataURL } from "./blurhashToDataUrl";
import { encode } from "fast-png";

const blurhash = "UJJkM=_N4:%M%$-pIT-;%MRjIUIps:f6M{IV";
const width = 1000,
  height = 1000;
const pixels = decode(blurhash, width, height);

// This creates a data url and not a blob so the comparison is kind of skewed
bench("Data URL inspiration", () => {
  const dataUrl = blurHashToDataURL(blurhash, width, height);
});
bench("My implementation", () => {
  const result = generatePng(width, height, pixels);
});

bench("fast-png based implementation", () => {
  const pngBytes = encode({ data: pixels, width, height });
});
