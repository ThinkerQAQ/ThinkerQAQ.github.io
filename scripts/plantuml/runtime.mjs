import { normalize, validateSvg } from "./core.mjs";
import { renderPlantUMLSVG } from "../../tools/blogctl/assets/node/plantuml-tool.mjs";

export async function renderSvg(source) {
  return validateSvg(await renderPlantUMLSVG(normalize(source)));
}
