export const TECHNICAL_CONTEXT = Object.freeze({
  levels: ["concept", "specification", "api", "runtime", "operating-system", "hardware"],
  claimClasses: ["guarantee", "implementation", "example"],
  scopes: ["architecture", "version", "runtime", "storage-engine", "protocol", "operating-system"],
});

export function formatTechnicalContext() {
  return [
    "TECHNICAL_CONTEXT_SCHEMA",
    `levels=${TECHNICAL_CONTEXT.levels.join(" > ")}`,
    `claim_classes=${TECHNICAL_CONTEXT.claimClasses.join(" | ")}`,
    `scope_dimensions=${TECHNICAL_CONTEXT.scopes.join(" | ")}`,
    "TECHNICAL_ANSWER_POLICY:",
    "1. Identify the abstraction level requested by the current question and answer at that level.",
    "2. Keep specification or semantics, API behavior, runtime or engine implementation, operating-system behavior, protocol or storage behavior, and hardware mechanisms distinct.",
    "3. Distinguish what is guaranteed, how it is implemented, and what is only a concrete example.",
    "4. Do not treat one concrete implementation as a universal guarantee.",
    "5. Do not infer a whole-algorithm or whole-system property from a lower-level primitive, component, or implementation detail.",
    "6. Qualify implementation-specific claims by the relevant architecture, version, runtime, storage engine, protocol, or operating system when the sources establish that scope.",
    "7. If the user asks how something works internally, explain progressively from semantics to implementation to lower-level mechanisms, stopping at the requested depth.",
    "8. Use only the current retrieved sources as factual evidence; if they do not establish a detail, state that the blog does not establish it.",
    "9. Preserve differences between platforms or implementations instead of flattening them into one universal description.",
  ].join("\n");
}
