export function footerBottomOverlap(rect, viewportHeight) {
  const height = Number(rect?.height);
  const top = Number(rect?.top);
  const bottom = Number(rect?.bottom);
  const viewport = Number(viewportHeight);

  if (
    !Number.isFinite(height) ||
    !Number.isFinite(top) ||
    !Number.isFinite(bottom) ||
    !Number.isFinite(viewport) ||
    height <= 0 ||
    viewport <= 0
  ) {
    return 0;
  }

  // Floating controls only need to move when the footer occupies the bottom
  // edge of the viewport. Merely intersecting elsewhere should not move them.
  if (top >= viewport || bottom < viewport - 1) return 0;

  return Math.max(0, Math.min(height, viewport - top));
}

export function initFloatingActionLayout({
  documentRef = document,
  windowRef = window,
} = {}) {
  const footer = documentRef.querySelector(".site-footer");
  const root = documentRef.documentElement;
  if (!footer || !root) return () => {};

  let frame = 0;
  let lastOffset = -1;

  const sync = () => {
    frame = 0;
    const offset = Math.ceil(
      footerBottomOverlap(footer.getBoundingClientRect(), windowRef.innerHeight),
    );
    if (offset === lastOffset) return;
    lastOffset = offset;
    root.style.setProperty("--floating-footer-offset", `${offset}px`);
  };

  const schedule = () => {
    if (!frame) frame = windowRef.requestAnimationFrame(sync);
  };

  windowRef.addEventListener("scroll", schedule, { passive: true });
  windowRef.addEventListener("resize", schedule);

  const observer = "ResizeObserver" in windowRef
    ? new windowRef.ResizeObserver(schedule)
    : null;
  observer?.observe(footer);

  sync();

  return () => {
    if (frame) windowRef.cancelAnimationFrame(frame);
    windowRef.removeEventListener("scroll", schedule);
    windowRef.removeEventListener("resize", schedule);
    observer?.disconnect();
    root.style.removeProperty("--floating-footer-offset");
  };
}
