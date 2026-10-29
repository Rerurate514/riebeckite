let locks = 0;
let previousOverflow = "";

export function lockScroll(): () => void {
  if (typeof document === "undefined") return () => {};

  if (locks === 0) {
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.documentElement.dataset.rbScrollLock = "true";
  }
  locks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(locks - 1, 0);
    if (locks > 0) return;

    document.documentElement.style.overflow = previousOverflow;
    delete document.documentElement.dataset.rbScrollLock;
  };
}
