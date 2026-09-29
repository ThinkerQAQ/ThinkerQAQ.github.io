import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MERMAID_RENDERED_EVENT,
  MEDIA_VIEWER_SCALE_STEPS,
  formatMediaScale,
  installPointerPan,
  nextMediaScale,
} from "../src/lib/content-media-viewer.js";

test("content media viewer exposes the intended zoom ladder", () => {
  assert.deepEqual(
    [...MEDIA_VIEWER_SCALE_STEPS],
    [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4],
  );
});

test("content media viewer moves one zoom step at a time", () => {
  assert.equal(nextMediaScale(1, 1), 1.25);
  assert.equal(nextMediaScale(1.25, 1), 1.5);
  assert.equal(nextMediaScale(1, -1), 0.75);
  assert.equal(nextMediaScale(0.75, -1), 0.5);
});

test("content media viewer clamps zoom at both ends", () => {
  assert.equal(nextMediaScale(4, 1), 4);
  assert.equal(nextMediaScale(0.5, -1), 0.5);
});

test("content media viewer formats zoom percentages for the toolbar", () => {
  assert.equal(formatMediaScale(0.75), "75%");
  assert.equal(formatMediaScale(1), "100%");
  assert.equal(formatMediaScale(1.25), "125%");
  assert.equal(formatMediaScale(4), "400%");
});


test("Mermaid runtime signals the viewer only after mermaid.run finishes", async () => {
  assert.equal(MERMAID_RENDERED_EVENT, "blog:mermaid-rendered");

  const source = await readFile(
    new URL("../src/components/MermaidRuntime.astro", import.meta.url),
    "utf8",
  );
  const renderIndex = source.indexOf("await mermaid.run");
  const readyIndex = source.indexOf("diagram.dataset.mermaidReady");
  const eventIndex = source.indexOf('new CustomEvent("blog:mermaid-rendered"');

  assert.ok(renderIndex >= 0);
  assert.ok(readyIndex > renderIndex);
  assert.ok(eventIndex > readyIndex);
});


function createPanHost() {
  const listeners = new Map();
  const classes = new Set();

  return {
    dataset: { mediaPannable: "true" },
    scrollLeft: 120,
    scrollTop: 80,
    classList: {
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
      contains: (value) => classes.has(value),
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (listeners.get(type) === handler) listeners.delete(type);
    },
    setPointerCapture(pointerId) {
      this.capturedPointerId = pointerId;
    },
    releasePointerCapture(pointerId) {
      this.releasedPointerId = pointerId;
    },
    dispatch(type, event) {
      listeners.get(type)?.(event);
    },
  };
}

function pointerEvent(overrides = {}) {
  return {
    button: 0,
    pointerId: 7,
    pointerType: "mouse",
    clientX: 200,
    clientY: 180,
    target: { closest: () => null },
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {},
    ...overrides,
  };
}

test("left-drag pans an overflowing media viewport", () => {
  const host = createPanHost();
  const dispose = installPointerPan({ host });

  const down = pointerEvent();
  host.dispatch("pointerdown", down);

  assert.equal(down.defaultPrevented, true);
  assert.equal(host.classList.contains("is-dragging"), true);
  assert.equal(host.capturedPointerId, 7);

  const move = pointerEvent({ clientX: 150, clientY: 130 });
  host.dispatch("pointermove", move);

  assert.equal(move.defaultPrevented, true);
  assert.equal(host.scrollLeft, 170);
  assert.equal(host.scrollTop, 130);

  host.dispatch("pointerup", pointerEvent());
  assert.equal(host.classList.contains("is-dragging"), false);
  assert.equal(host.releasedPointerId, 7);

  dispose();
});

test("touch pointer uses the same pan gesture when the media is pannable", () => {
  const host = createPanHost();
  const dispose = installPointerPan({ host });

  const down = pointerEvent({ pointerType: "touch" });
  host.dispatch("pointerdown", down);

  assert.equal(down.defaultPrevented, true);
  assert.equal(host.classList.contains("is-dragging"), true);

  dispose();
});
