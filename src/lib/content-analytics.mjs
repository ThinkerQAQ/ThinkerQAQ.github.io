export const TIME_MILESTONES_SECONDS = Object.freeze([30, 60, 180]);
export const PROGRESS_MILESTONES_PERCENT = Object.freeze([50, 90]);

export const ENGAGED_READ_RULE = Object.freeze({
  activeSeconds: 30,
  progressPercent: 50,
});

export const DEEP_READ_RULE = Object.freeze({
  activeSeconds: 60,
  progressPercent: 90,
});

export const ACTIVE_TICK_INTERVAL_MS = 1000;
export const MAX_VISIBLE_TICK_MS = 2500;

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function computeReadingProgress({
  scrollY,
  startY,
  endY,
  viewportHeight,
  headerHeight = 64,
  startOffset = 16,
  maxBottomInset = 120,
}) {
  const adjustedStartY = startY - headerHeight - startOffset;
  const endScrollY = Math.max(
    adjustedStartY + 1,
    endY - viewportHeight + Math.min(viewportHeight * 0.2, maxBottomInset),
  );
  const progress = clamp(
    (scrollY - adjustedStartY) / (endScrollY - adjustedStartY),
    0,
    1,
  );

  return Math.round(progress * 100);
}

export function qualifiesForEngagedRead(activeMilliseconds, progressPercent) {
  return (
    activeMilliseconds >= ENGAGED_READ_RULE.activeSeconds * 1000
    && progressPercent >= ENGAGED_READ_RULE.progressPercent
  );
}

export function qualifiesForDeepRead(activeMilliseconds, progressPercent) {
  return (
    activeMilliseconds >= DEEP_READ_RULE.activeSeconds * 1000
    && progressPercent >= DEEP_READ_RULE.progressPercent
  );
}
