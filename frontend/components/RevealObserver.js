"use client";
// Watches the whole page for elements marked data-reveal and adds the class "is-in"
// when they scroll into view (the CSS in globals.css does the animating). Because it
// watches for new elements too, product grids and pages loaded later animate as well.
import { useEffect } from "react";

export default function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    const seen = new WeakSet();
    const scan = () =>
      document.querySelectorAll("[data-reveal]:not(.is-in)").forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          io.observe(el);
        }
      });
    scan();
    root.classList.add("reveal-ready");
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
  return null;
}
