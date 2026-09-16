// Backward-compatible entry point for older tooling. The deployed Worker enters
// through policy-worker.js -> worker.js -> chat.js, so keep a single chat
// implementation instead of maintaining a second copy here.
export { default } from "./chat.js";
