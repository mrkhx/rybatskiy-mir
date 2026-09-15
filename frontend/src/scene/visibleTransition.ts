/** A visual deadline counts visible-tab time only, like the embedded Canvas. */
export function scheduleVisualTransition(callback: () => void, delay: number): () => void {
  let remaining = delay;
  let started = 0;
  let timer: number | undefined;
  let disposed = false;
  const clear = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
  };
  const dispose = () => {
    disposed = true;
    clear();
    document.removeEventListener("visibilitychange", onVisibility);
  };
  const start = () => {
    if (disposed || document.hidden || timer !== undefined) return;
    started = performance.now();
    timer = window.setTimeout(() => {
      timer = undefined;
      remaining = Math.max(0, remaining - (performance.now() - started));
      if (document.hidden) return;
      dispose();
      callback();
    }, remaining);
  };
  const onVisibility = () => {
    if (document.hidden) {
      if (timer !== undefined) remaining = Math.max(0, remaining - (performance.now() - started));
      clear();
    } else start();
  };
  document.addEventListener("visibilitychange", onVisibility);
  start();
  return dispose;
}
