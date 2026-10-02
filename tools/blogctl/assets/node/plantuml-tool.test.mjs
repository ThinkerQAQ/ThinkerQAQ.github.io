import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";

import { renderPlantUMLPNG } from "./plantuml-tool.mjs";

test("renders PlantUML through the official TeaVM engine without Java", async () => {
  const png = await renderPlantUMLPNG(`@startuml
Alice -> Bob: Hello
@enduml`);
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.format, "png");
  assert.ok(Number(metadata.width || 0) > 0);
  assert.ok(Number(metadata.height || 0) > 0);
});

test("reports PlantUML syntax failures", async () => {
  await assert.rejects(
    () => renderPlantUMLPNG("@startuml\nAlice -> Bob: hello\n@endjson"),
    /PlantUML|syntax|error|line/iu,
  );
});
