export const MERMAID_RENDERED_EVENT = "blog:mermaid-rendered";

export const MEDIA_VIEWER_SCALE_STEPS = Object.freeze([
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  2,
  3,
  4,
]);

export function nextMediaScale(current, direction) {
  const value = Number(current);
  const normalized = Number.isFinite(value) && value > 0 ? value : 1;
  const delta = Math.sign(Number(direction));

  if (delta > 0) {
    return MEDIA_VIEWER_SCALE_STEPS.find((step) => step > normalized + 0.001)
      ?? MEDIA_VIEWER_SCALE_STEPS.at(-1);
  }
  if (delta < 0) {
    return [...MEDIA_VIEWER_SCALE_STEPS]
      .reverse()
      .find((step) => step < normalized - 0.001)
      ?? MEDIA_VIEWER_SCALE_STEPS[0];
  }
  return normalized;
}

export function formatMediaScale(scale) {
  const value = Number(scale);
  return `${Math.round((Number.isFinite(value) ? value : 1) * 100)}%`;
}

function viewerLabels(documentRef) {
  const isEnglish = documentRef.documentElement.lang?.toLowerCase().startsWith("en");
  return isEnglish
    ? {
        toolbar: "Image controls",
        zoomOut: "Zoom out",
        zoomIn: "Zoom in",
        reset: "Reset zoom",
        fullscreen: "View fullscreen",
      }
    : {
        toolbar: "图片查看工具",
        zoomOut: "缩小",
        zoomIn: "放大",
        reset: "恢复 100%",
        fullscreen: "全屏查看",
      };
}

function rememberSurfaceStyle(surface) {
  return {
    width: surface.style.width,
    height: surface.style.height,
    maxWidth: surface.style.maxWidth,
    maxHeight: surface.style.maxHeight,
  };
}

function restoreSurfaceStyle(state) {
  const { surface, originalStyle } = state;
  surface.style.width = originalStyle.width;
  surface.style.height = originalStyle.height;
  surface.style.maxWidth = originalStyle.maxWidth;
  surface.style.maxHeight = originalStyle.maxHeight;
}

export function hasPanOverflow(host, axis = "both") {
  const horizontal = host.scrollWidth > host.clientWidth + 1;
  const vertical = host.scrollHeight > host.clientHeight + 1;

  if (axis === "x") return horizontal;
  if (axis === "y") return vertical;
  return horizontal || vertical;
}

function updatePannable(state) {
  const { host, panAxis = "both" } = state;
  host.dataset.mediaPannable = hasPanOverflow(host, panAxis) ? "true" : "false";
}

function updateToolbar(state) {
  if (state.resetButton) {
    state.resetButton.textContent = formatMediaScale(state.scale);
    state.resetButton.setAttribute(
      "aria-label",
      `${state.labels.reset} (${formatMediaScale(state.scale)})`,
    );
  }
  if (state.zoomOutButton) {
    state.zoomOutButton.disabled = state.scale <= MEDIA_VIEWER_SCALE_STEPS[0];
  }
  if (state.zoomInButton) {
    state.zoomInButton.disabled = state.scale >= MEDIA_VIEWER_SCALE_STEPS.at(-1);
  }
}

function setMediaScale(state, nextScale, windowRef) {
  const min = MEDIA_VIEWER_SCALE_STEPS[0];
  const max = MEDIA_VIEWER_SCALE_STEPS.at(-1);
  const scale = Math.max(min, Math.min(max, Number(nextScale) || 1));

  if (scale === 1) {
    restoreSurfaceStyle(state);
    state.baseWidth = null;
  } else {
    if (!state.baseWidth || state.scale === 1) {
      const width = state.surface.getBoundingClientRect().width;
      if (!Number.isFinite(width) || width <= 0) return;
      state.baseWidth = width;
    }

    state.surface.style.width = `${state.baseWidth * scale}px`;
    state.surface.style.height = "auto";
    state.surface.style.maxWidth = "none";
    state.surface.style.maxHeight = "none";
  }

  state.scale = scale;
  state.container.dataset.mediaScale = String(scale);
  updateToolbar(state);
  windowRef.requestAnimationFrame(() => updatePannable(state));
}

function createControl(documentRef, action, text, label) {
  const button = documentRef.createElement("button");
  button.type = "button";
  button.className = "media-viewer-control";
  button.dataset.mediaAction = action;
  button.textContent = text;
  button.title = label;
  button.setAttribute("aria-label", label);
  return button;
}

function createInlineToolbar(documentRef, state, openFullscreen) {
  const toolbar = documentRef.createElement("span");
  toolbar.className = "media-viewer-toolbar";
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", state.labels.toolbar);

  const zoomOut = createControl(documentRef, "zoom-out", "−", state.labels.zoomOut);
  const reset = createControl(documentRef, "reset", "100%", state.labels.reset);
  reset.classList.add("media-viewer-control--scale");
  const zoomIn = createControl(documentRef, "zoom-in", "+", state.labels.zoomIn);
  const fullscreen = createControl(
    documentRef,
    "fullscreen",
    "⛶",
    state.labels.fullscreen,
  );

  zoomOut.addEventListener("click", () => {
    setMediaScale(state, nextMediaScale(state.scale, -1), state.windowRef);
  });
  reset.addEventListener("click", () => {
    setMediaScale(state, 1, state.windowRef);
  });
  zoomIn.addEventListener("click", () => {
    setMediaScale(state, nextMediaScale(state.scale, 1), state.windowRef);
  });
  fullscreen.addEventListener("click", () => openFullscreen(state));

  toolbar.append(zoomOut, reset, zoomIn, fullscreen);
  state.resetButton = reset;
  state.zoomOutButton = zoomOut;
  state.zoomInButton = zoomIn;
  updateToolbar(state);
  return toolbar;
}

export function installPointerPan(
  state,
  {
    isEnabled = () => true,
    blockedSelector = ".media-viewer-toolbar",
  } = {},
) {
  const { host, panAxis = "both" } = state;
  let drag = null;
  let suppressNextClick = false;

  const endDrag = (event) => {
    if (!drag || (event.pointerId != null && drag.pointerId !== event.pointerId)) return;
    suppressNextClick = drag.moved;
    host.classList.remove("is-dragging");
    try {
      host.releasePointerCapture?.(drag.pointerId);
    } catch {
      // The pointer may already have been released by the browser.
    }
    drag = null;
  };

  const onPointerDown = (event) => {
    if (
      event.button !== 0
      || !hasPanOverflow(host, panAxis)
      || !isEnabled()
      || (blockedSelector && event.target.closest?.(blockedSelector))
    ) {
      return;
    }

    // Mouse dragging should take ownership immediately so the browser's
    // native image/SVG drag does not steal the gesture. Touch keeps vertical
    // page scrolling available for inline viewers via CSS touch-action.
    if (event.pointerType !== "touch") event.preventDefault();

    drag = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      x: event.clientX,
      y: event.clientY,
      left: host.scrollLeft,
      top: host.scrollTop,
      moved: false,
    };
    host.classList.add("is-dragging");
    host.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    if (
      drag.pointerType === "touch"
      && panAxis === "x"
      && Math.abs(dy) > Math.abs(dx)
      && !drag.moved
    ) {
      // Let a vertical touch gesture become normal page scrolling.
      endDrag(event);
      return;
    }

    event.preventDefault();

    const movedDistance = panAxis === "x"
      ? Math.abs(dx)
      : panAxis === "y"
        ? Math.abs(dy)
        : Math.max(Math.abs(dx), Math.abs(dy));
    if (movedDistance > 3) drag.moved = true;

    if (panAxis !== "y") host.scrollLeft = drag.left - dx;
    if (panAxis !== "x") host.scrollTop = drag.top - dy;
  };

  const onClick = (event) => {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    if (event.target.closest?.("a")) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onDragStart = (event) => {
    if (hasPanOverflow(host, panAxis)) event.preventDefault();
  };

  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("pointerup", endDrag);
  host.addEventListener("pointercancel", endDrag);
  host.addEventListener("click", onClick, true);
  host.addEventListener("dragstart", onDragStart);

  return () => {
    host.removeEventListener("pointerdown", onPointerDown);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerup", endDrag);
    host.removeEventListener("pointercancel", endDrag);
    host.removeEventListener("click", onClick, true);
    host.removeEventListener("dragstart", onDragStart);
  };
}

function wrapImage(img) {
  const documentRef = img.ownerDocument;
  let content = img;

  const picture = img.closest("picture");
  if (picture && picture.contains(img)) content = picture;

  const parent = content.parentElement;
  if (
    parent?.localName === "a"
    && parent.childElementCount === 1
    && !parent.textContent.trim()
  ) {
    content = parent;
  }

  const wrapper = documentRef.createElement("span");
  wrapper.className = "media-viewer media-viewer--image";
  content.before(wrapper);
  wrapper.append(content);
  return wrapper;
}

function scopeSvgIds(svg, suffix) {
  if (svg.localName !== "svg") return;

  const withIds = [
    ...(svg.hasAttribute("id") ? [svg] : []),
    ...svg.querySelectorAll("[id]"),
  ];
  const idMap = new Map();

  for (const node of withIds) {
    const oldId = node.id;
    if (!oldId) continue;
    const newId = `${oldId}-${suffix}`;
    idMap.set(oldId, newId);
    node.id = newId;
  }

  if (idMap.size === 0) return;

  const nodes = [svg, ...svg.querySelectorAll("*")];
  for (const node of nodes) {
    for (const attribute of [...node.attributes]) {
      let value = attribute.value;
      for (const [oldId, newId] of idMap) {
        value = value.replaceAll(
          `url(#${oldId})`,
          `url(#${newId})`,
        );
        if (value === `#${oldId}`) value = `#${newId}`;
      }

      if (attribute.name === "aria-labelledby" || attribute.name === "aria-describedby") {
        value = value
          .split(/\\s+/)
          .map((id) => idMap.get(id) ?? id)
          .join(" ");
      }

      if (value !== attribute.value) node.setAttribute(attribute.name, value);
    }

    if (node.localName === "style" && node.textContent) {
      const placeholders = new Map();
      let css = node.textContent;
      let index = 0;

      for (const [oldId, newId] of idMap) {
        const token = `__media_viewer_id_${suffix}_${index++}__`;
        placeholders.set(token, newId);
        css = css
          .replaceAll(`url(#${oldId})`, `url(#${token})`)
          .replaceAll(`#${oldId}`, `#${token}`);
      }
      for (const [token, newId] of placeholders) {
        css = css.replaceAll(`#${token}`, `#${newId}`);
      }
      node.textContent = css;
    }
  }
}

function cloneSurface(state, sequence) {
  const clone = state.surface.cloneNode(true);
  clone.classList.add("media-viewer-dialog__media");
  clone.removeAttribute("data-media-viewer-ready");

  clone.style.width = state.originalStyle.width;
  clone.style.height = state.originalStyle.height;
  clone.style.maxWidth = state.originalStyle.maxWidth;
  clone.style.maxHeight = state.originalStyle.maxHeight;

  if (clone.localName === "img") {
    clone.removeAttribute("id");
    clone.loading = "eager";
    clone.draggable = false;
  }
  if (clone.localName === "svg") {
    scopeSvgIds(clone, `viewer-${sequence}`);
  }

  return clone;
}

function contentRootWithin(host, surface) {
  let node = surface;
  while (node.parentElement && node.parentElement !== host) {
    node = node.parentElement;
  }
  return node;
}

function enhanceHost({
  host,
  surface,
  kind,
  documentRef,
  windowRef,
  labels,
  openFullscreen,
  cleanup,
}) {
  if (host.dataset.mediaViewerReady === "true") return;

  host.classList.add("media-viewer", `media-viewer--${kind}`);
  host.dataset.mediaViewerReady = "true";
  host.dataset.mediaScale = "1";

  if (surface.localName === "img") surface.draggable = false;

  const contentRoot = contentRootWithin(host, surface);
  const viewport = documentRef.createElement("span");
  viewport.className = "media-viewer-viewport";
  contentRoot.before(viewport);
  viewport.append(contentRoot);

  const state = {
    host: viewport,
    container: host,
    surface,
    kind,
    labels,
    scale: 1,
    baseWidth: null,
    originalStyle: rememberSurfaceStyle(surface),
    resetButton: null,
    zoomOutButton: null,
    zoomInButton: null,
    windowRef,
    panAxis: "x",
  };

  const toolbar = createInlineToolbar(documentRef, state, openFullscreen);
  host.append(toolbar);
  cleanup.push(installPointerPan(state));
  windowRef.requestAnimationFrame(() => updatePannable(state));
}

export function initContentMediaViewer({
  documentRef = document,
  windowRef = window,
} = {}) {
  const proseRoots = [...documentRef.querySelectorAll(".prose")];
  const dialog = documentRef.querySelector("[data-media-viewer-dialog]");
  if (proseRoots.length === 0 || !dialog) return () => {};
  if (dialog.dataset.mediaViewerRuntime === "true") return () => {};

  const labels = viewerLabels(documentRef);
  const cleanup = [];
  const observers = [];
  const dialogViewport = dialog.querySelector("[data-media-viewer-dialog-viewport]");
  const dialogSurface = dialog.querySelector("[data-media-viewer-dialog-surface]");
  const dialogReset = dialog.querySelector('[data-media-action="reset"]');
  const dialogZoomOut = dialog.querySelector('[data-media-action="zoom-out"]');
  const dialogZoomIn = dialog.querySelector('[data-media-action="zoom-in"]');
  if (!dialogViewport || !dialogSurface) return () => {};

  dialog.dataset.mediaViewerRuntime = "true";
  let activeDialogState = null;
  let fullscreenSequence = 0;
  let scanQueued = false;
  let nativeFullscreenActive = false;

  const closeDialog = () => {
    if (documentRef.fullscreenElement === dialog && documentRef.exitFullscreen) {
      documentRef.exitFullscreen().catch(() => {});
    }
    nativeFullscreenActive = false;
    if (dialog.open) dialog.close();
  };

  const syncDialogButtons = () => {
    if (!activeDialogState) return;
    if (dialogReset) {
      dialogReset.textContent = formatMediaScale(activeDialogState.scale);
      dialogReset.setAttribute(
        "aria-label",
        `${labels.reset} (${formatMediaScale(activeDialogState.scale)})`,
      );
    }
    if (dialogZoomOut) {
      dialogZoomOut.disabled =
        activeDialogState.scale <= MEDIA_VIEWER_SCALE_STEPS[0];
    }
    if (dialogZoomIn) {
      dialogZoomIn.disabled =
        activeDialogState.scale >= MEDIA_VIEWER_SCALE_STEPS.at(-1);
    }
  };

  const setDialogScale = (scale) => {
    if (!activeDialogState) return;
    setMediaScale(activeDialogState, scale, windowRef);
    syncDialogButtons();
  };

  const openFullscreen = (sourceState) => {
    if (!dialogSurface || !dialogViewport) return;
    if (dialog.open) closeDialog();

    dialogSurface.replaceChildren();
    const clone = cloneSurface(sourceState, ++fullscreenSequence);
    dialogSurface.append(clone);

    activeDialogState = {
      host: dialogViewport,
      container: dialog,
      surface: clone,
      kind: sourceState.kind,
      labels,
      scale: 1,
      baseWidth: null,
      originalStyle: rememberSurfaceStyle(clone),
      resetButton: dialogReset,
      zoomOutButton: dialogZoomOut,
      zoomInButton: dialogZoomIn,
      windowRef,
      panAxis: "both",
    };

    dialog.dataset.mediaKind = sourceState.kind;
    dialog.showModal();
    syncDialogButtons();
    windowRef.requestAnimationFrame(() => {
      updatePannable(activeDialogState);
      dialog.querySelector('[data-media-action="close"]')?.focus();
    });

    if (
      documentRef.fullscreenEnabled
      && typeof dialog.requestFullscreen === "function"
    ) {
      try {
        Promise.resolve(dialog.requestFullscreen())
          .then(() => {
            nativeFullscreenActive = documentRef.fullscreenElement === dialog;
          })
          .catch(() => {
            nativeFullscreenActive = false;
          });
      } catch {
        nativeFullscreenActive = false;
      }
    }
  };

  // The dialog DOM is reused across images, so the same pan runtime checks
  // whether a dialog image is currently active before starting a gesture.
  cleanup.push(installPointerPan(
    { host: dialogViewport, panAxis: "both" },
    {
      isEnabled: () => Boolean(activeDialogState),
      blockedSelector: ".media-viewer-dialog__toolbar",
    },
  ));

  const enhanceImage = (img) => {
    if (
      img.closest("[data-no-viewer]")
      || img.closest(".media-viewer-dialog")
      || img.closest('[data-media-viewer-ready="true"]')
    ) {
      return;
    }

    const plantumlHost = img.closest(".plantuml-diagram");
    if (plantumlHost) {
      enhanceHost({
        host: plantumlHost,
        surface: img,
        kind: "plantuml",
        documentRef,
        windowRef,
        labels,
        openFullscreen,
        cleanup,
      });
      return;
    }

    const host = wrapImage(img);
    enhanceHost({
      host,
      surface: img,
      kind: img.currentSrc?.toLowerCase().includes(".svg")
        || img.src?.toLowerCase().includes(".svg")
        ? "svg"
        : "image",
      documentRef,
      windowRef,
      labels,
      openFullscreen,
      cleanup,
    });
  };

  const enhanceMermaid = (svg) => {
    const host = svg.closest("pre.mermaid-diagram");
    if (
      !host
      || host.dataset.mermaidReady !== "true"
      || host.closest("[data-no-viewer]")
      || host.dataset.mediaViewerReady === "true"
    ) {
      return;
    }

    enhanceHost({
      host,
      surface: svg,
      kind: "mermaid",
      documentRef,
      windowRef,
      labels,
      openFullscreen,
      cleanup,
    });
  };

  const scan = () => {
    scanQueued = false;
    for (const root of proseRoots) {
      root.querySelectorAll("img").forEach(enhanceImage);
      root
        .querySelectorAll('pre.mermaid-diagram[data-mermaid-ready="true"] svg')
        .forEach(enhanceMermaid);
    }
  };

  const scheduleScan = () => {
    if (scanQueued) return;
    scanQueued = true;
    Promise.resolve().then(scan);
  };

  for (const root of proseRoots) {
    if (windowRef.MutationObserver) {
      const observer = new windowRef.MutationObserver(scheduleScan);
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-mermaid-ready"],
      });
      observers.push(observer);
    }
  }

  const onMermaidRendered = (event) => {
    const host = event.target?.closest?.("pre.mermaid-diagram");
    if (!host || !proseRoots.some((root) => root.contains(host))) return;
    const svg = host.querySelector("svg");
    if (svg) enhanceMermaid(svg);
  };

  documentRef.addEventListener(MERMAID_RENDERED_EVENT, onMermaidRendered);
  cleanup.push(() => {
    documentRef.removeEventListener(MERMAID_RENDERED_EVENT, onMermaidRendered);
  });

  const onDialogClick = (event) => {
    const button = event.target.closest?.("[data-media-action]");
    if (!button || !dialog.contains(button)) return;

    switch (button.dataset.mediaAction) {
      case "zoom-out":
        setDialogScale(nextMediaScale(activeDialogState?.scale ?? 1, -1));
        break;
      case "reset":
        setDialogScale(1);
        break;
      case "zoom-in":
        setDialogScale(nextMediaScale(activeDialogState?.scale ?? 1, 1));
        break;
      case "close":
        closeDialog();
        break;
    }
  };

  const onDialogCancel = (event) => {
    event.preventDefault();
    closeDialog();
  };

  const onDialogClose = () => {
    activeDialogState = null;
    dialogSurface?.replaceChildren();
    dialogViewport?.removeAttribute("data-media-pannable");
    dialog.removeAttribute("data-media-kind");
  };

  const onDialogKeyDown = (event) => {
    if (!activeDialogState || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setDialogScale(nextMediaScale(activeDialogState.scale, 1));
    } else if (event.key === "-") {
      event.preventDefault();
      setDialogScale(nextMediaScale(activeDialogState.scale, -1));
    } else if (event.key === "0") {
      event.preventDefault();
      setDialogScale(1);
    }
  };

  const onFullscreenChange = () => {
    if (
      nativeFullscreenActive
      && documentRef.fullscreenElement !== dialog
      && dialog.open
    ) {
      nativeFullscreenActive = false;
      dialog.close();
    }
  };

  dialog.addEventListener("click", onDialogClick);
  dialog.addEventListener("cancel", onDialogCancel);
  dialog.addEventListener("close", onDialogClose);
  dialog.addEventListener("keydown", onDialogKeyDown);
  documentRef.addEventListener("fullscreenchange", onFullscreenChange);
  cleanup.push(() => {
    dialog.removeEventListener("click", onDialogClick);
    dialog.removeEventListener("cancel", onDialogCancel);
    dialog.removeEventListener("close", onDialogClose);
    dialog.removeEventListener("keydown", onDialogKeyDown);
    documentRef.removeEventListener("fullscreenchange", onFullscreenChange);
  });

  scan();

  return () => {
    for (const observer of observers) observer.disconnect();
    for (const dispose of cleanup.splice(0)) dispose();
    if (dialog.open) closeDialog();
    dialog.removeAttribute("data-media-viewer-runtime");
  };
}
