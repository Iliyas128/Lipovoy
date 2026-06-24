import { useCallback, useEffect, useRef } from "react";
import Lenis from "lenis";

function canUseSmoothScroll() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export function useLenis(enabled = true) {
  const lenisRef = useRef(null);

  const scrollToTop = useCallback((immediate = true) => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate });
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: immediate ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    if (!canUseSmoothScroll()) return;

    const lenis = new Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    if (!enabled) lenis.stop();

    let frame;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!canUseSmoothScroll()) return;
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (enabled) lenis.start();
    else lenis.stop();
  }, [enabled]);

  return scrollToTop;
}
