import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  MEDIA_VIEWER_SCALE_STEPS,
  formatMediaScale,
  hasPanOverflow,
  installPointerPan,
  nextMediaScale,
} from "./content-media-viewer.js";

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


test("Mermaid SVG shares the image viewer with PlantUML", async () => {
  const source = await readFile(new URL("./content-media-viewer.js", import.meta.url), "utf8");
  assert.match(source, /\.plantuml-diagram, \.mermaid-diagram/);
  assert.match(source, /kind: diagramHost\.classList\.contains\("mermaid-diagram"\)/);
  assert.ok(!source.includes("blog:mermaid-rendered"));
});

function createPanHost() {
  const listeners = new Map();
  const classes = new Set();

  return {
    dataset: { mediaPannable: "false" },
    clientWidth: 300,
    clientHeight: 200,
    scrollWidth: 600,
    scrollHeight: 200,
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

test("pan overflow is computed from the live viewport instead of a stale data flag", () => {
  const host = createPanHost();

  assert.equal(host.dataset.mediaPannable, "false");
  assert.equal(hasPanOverflow(host, "x"), true);
  assert.equal(hasPanOverflow(host, "y"), false);
  assert.equal(hasPanOverflow(host, "both"), true);
});

test("left-drag pans an overflowing inline media viewport horizontally", () => {
  const host = createPanHost();
  const dispose = installPointerPan({ host, panAxis: "x" });

  const down = pointerEvent();
  host.dispatch("pointerdown", down);

  assert.equal(down.defaultPrevented, true);
  assert.equal(host.classList.contains("is-dragging"), true);
  assert.equal(host.capturedPointerId, 7);

  const move = pointerEvent({ clientX: 150, clientY: 130 });
  host.dispatch("pointermove", move);

  assert.equal(move.defaultPrevented, true);
  assert.equal(host.scrollLeft, 170);
  assert.equal(host.scrollTop, 80);

  host.dispatch("pointerup", pointerEvent());
  assert.equal(host.classList.contains("is-dragging"), false);
  assert.equal(host.releasedPointerId, 7);

  dispose();
});

test("touch inline drag keeps pointerdown available for normal vertical page scroll", () => {
  const host = createPanHost();
  const dispose = installPointerPan({ host, panAxis: "x" });

  const down = pointerEvent({ pointerType: "touch" });
  host.dispatch("pointerdown", down);

  assert.equal(down.defaultPrevented, false);
  assert.equal(host.classList.contains("is-dragging"), true);

  const verticalMove = pointerEvent({
    pointerType: "touch",
    clientX: 198,
    clientY: 230,
  });
  host.dispatch("pointermove", verticalMove);

  assert.equal(verticalMove.defaultPrevented, false);
  assert.equal(host.classList.contains("is-dragging"), false);

  dispose();
});

test("inline media CSS does not trap vertical wheel scrolling", async () => {
  const css = await readFile(
    new URL("../styles/global.css", import.meta.url),
    "utf8",
  );

  const viewportRule = css.match(/\.media-viewer-viewport \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(viewportRule, /overflow-x:\s*auto/);
  assert.match(viewportRule, /overflow-y:\s*hidden/);
  assert.match(viewportRule, /overscroll-behavior-y:\s*auto/);
  assert.ok(!viewportRule.includes("overscroll-behavior: contain"));
});
