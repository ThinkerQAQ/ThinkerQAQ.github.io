import { createHash } from "node:crypto";

export const VERSION = "mcp-js-0.2.2";

export function normalizePlantUML(source) {
  let text = String(source ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
  if (!text) throw new Error("Empty PlantUML diagram");
  if (/^\s*!\s*(?:include\w*|import|theme)\b/im.test(text) || /%(?:getenv|load\w*|filename|dirpath)\s*\(/i.test(text)) {
    throw new Error("External includes, themes and environment/file access are disabled for diagrams");
  }
  const starts = [...text.matchAll(/^\s*@start(\w+)\b/gim)];
  const ends = [...text.matchAll(/^\s*@end(\w+)\b/gim)];
  if (starts.length === 0 && ends.length === 0) {
    text = `@startuml\n${text}\n@enduml`;
  } else if (
    starts.length !== 1 ||
    ends.length !== 1 ||
    starts[0][1].toLowerCase() !== ends[0][1].toLowerCase() ||
    starts[0].index > ends[0].index
  ) {
    throw new Error("Each code block must contain exactly one matching @start… / @end… pair");
  }
  return text + "\n";
}

export function plantUMLDiagramKey(source) {
  return createHash("sha256")
    .update(`plantuml:${VERSION}:sandbox:utf8:svg:v1\n${normalizePlantUML(source)}`)
    .digest("hex");
}
