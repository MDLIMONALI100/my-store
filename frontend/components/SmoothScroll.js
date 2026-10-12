"use client";
// Buttery page scrolling (Lenis). It pauses while the cart drawer or mobile menu
// is open (they add the "drawer-lock" class to <html>) and is skipped entirely for
// visitors who asked their device for reduced motion.
import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      anchors: true,
    });
    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });
    const root = document.documentElement;
    const sync = () => (root.classList.contains("drawer-lock") ? lenis.stop() : lenis.start());
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
