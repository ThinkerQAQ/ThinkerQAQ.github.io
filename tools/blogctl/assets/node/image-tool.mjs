import { readFile, writeFile } from "node:fs/promises";

import sharp from "sharp";

function parseArgs(argv) {
  const result = { input: "", maxDimension: 4096 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input") {
      result.input = String(argv[++index] || "").trim();
    } else if (arg === "--max-dimension") {
      result.maxDimension = Number(argv[++index]);
    } else {
      throw new Error("Unknown image-tool option: " + arg);
    }
  }
  if (!result.input) throw new Error("--input is required");
  if (!Number.isFinite(result.maxDimension) || result.maxDimension <= 0) {
    throw new Error("--max-dimension must be positive");
  }
  return result;
}

export async function constrainPNG(input, maxDimension) {
  const payload = await readFile(input);
  const metadata = await sharp(payload).metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  if (!width || !height) throw new Error("Unable to read PNG dimensions");
  if (width <= maxDimension && height <= maxDimension) {
    return { resized: false, width, height };
  }
  const resized = await sharp(payload)
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  await writeFile(input, resized);
  const output = await sharp(resized).metadata();
  return {
    resized: true,
    width,
    height,
    outputWidth: Number(output.width || 0),
    outputHeight: Number(output.height || 0),
  };
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = await constrainPNG(options.input, options.maxDimension);
  process.stdout.write(JSON.stringify(result) + "\n");
}

if (import.meta.url === new URL("file://" + process.argv[1].replaceAll("\\", "/")).href) {
  main().catch((error) => {
    process.stderr.write((error?.stack || error?.message || String(error)) + "\n");
    process.exitCode = 1;
  });
}
