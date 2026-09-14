export const TECHNICAL_CONTEXT = Object.freeze({
  levels: ["concept", "specification", "api", "runtime", "operating-system", "hardware"],
  claimClasses: ["guarantee", "implementation", "example"],
  scopes: ["architecture", "version", "runtime", "storage-engine", "protocol", "operating-system"],
});

export function formatTechnicalContext() {
  return [
    "TECHNICAL_CONTEXT_SCHEMA",
    `levels=${TECHNICAL_CONTEXT.levels.join(" > ")}`,
    "answer_depth=requested-level",
    "evidence_limit=current-sources",
    `claim_classes=${TECHNICAL_CONTEXT.claimClasses.join(" | ")}`,
    `scope_dimensions=${TECHNICAL_CONTEXT.scopes.join(" | ")}`,
    "layer_equivalence=disallowed",
    "component_to_system_inference=disallowed",
    "internals_path=semantics > implementation > lower-level-mechanism",
    "preserve_scope_differences=true",
  ].join("\n");
}
