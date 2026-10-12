"use client";
// The 360° outfit viewer on the home page. Drag (or use the slider) to turn the figure all the
// way round, and pick an outfit to dress it. The 3D library loads only when the section scrolls
// near the screen, so it never slows down the rest of the page.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/helpers";
import SplitText from "./SplitText";

const CATEGORY_KEYS = { "Leather Jackets": "jacket", "Denim Jeans": "jeans", Boots: "boots" };

// Picks the jacket, jeans and boots colours out of an outfit's products.
function colorsOf(outfit) {
  const out = {};
  for (const item of outfit?.items || []) {
    const key = CATEGORY_KEYS[item.category];
    if (key && item.color_hex) out[key] = item.color_hex;
  }
  return out;
}

export default function Viewer360({ data }) {
  const outfits = useMemo(() => (data.outfits || []).filter((o) => o.items?.length), [data.outfits]);
  const settings = data.viewer || {};
  const hostRef = useRef(null);
  const apiRef = useRef(null); // { setColors, setAngle }
  const [active, setActive] = useState(0);
  const [angle, setAngle] = useState(0);
  const [state, setState] = useState("idle"); // idle | loading | ready | unsupported
  const outfit = outfits[active];

  // Start the 3D scene when the section is near the screen.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let cleanup = () => {};

    async function start() {
      setState("loading");
      try {
        const THREE = await import("three");
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        host.appendChild(canvas);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
        camera.position.set(0, 1.05, 4.6);
        camera.lookAt(0, 0.92, 0);

        scene.add(new THREE.HemisphereLight("#ffffff", "#b9b4aa", 1.15));
        const key = new THREE.DirectionalLight("#ffffff", 2.2);
        key.position.set(2.2, 3.5, 3);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -1.2;
        key.shadow.camera.right = 1.2;
        key.shadow.camera.top = 2.2;
        key.shadow.camera.bottom = -0.5;
        scene.add(key);
        const rim = new THREE.DirectionalLight("#dfe6ff", 0.9);
        rim.position.set(-2.5, 2, -3);
        scene.add(rim);

        // The figure: a real model if the admin set one, otherwise the built-in mannequin.
        const pivot = new THREE.Group();
        scene.add(pivot);
        let mannequin = null;
        let disposeModel = () => {};
        if (settings.model_url) {
          const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
          const gltf = await new GLTFLoader().loadAsync(settings.model_url);
          if (cancelled) return;
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const scale = 1.8 / Math.max(size.y, 0.001);
          model.scale.setScalar(scale);
          const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
          model.position.set(-center.x, -box.min.y * scale, -center.z);
          pivot.add(model);
          disposeModel = () => model.traverse((o) => o.geometry?.dispose?.());
        } else {
          const { buildMannequin } = await import("@/lib/mannequin");
          mannequin = buildMannequin(THREE);
          pivot.add(mannequin.root);
          disposeModel = mannequin.dispose;
        }

        // Size the canvas to its box.
        const resize = () => {
          const { clientWidth: w, clientHeight: h } = host;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(host);

        // Drag to turn, with a little momentum; slowly spins on its own until touched.
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let rotation = 0.6;
        let velocity = 0;
        let dragging = false;
        let lastX = 0;
        let idleSince = performance.now();
        const autoSpin = settings.auto_rotate !== false && !reduceMotion;
        const down = (e) => {
          dragging = true;
          lastX = e.clientX;
          velocity = 0;
          host.setPointerCapture?.(e.pointerId);
        };
        const move = (e) => {
          if (!dragging) return;
          const dx = e.clientX - lastX;
          lastX = e.clientX;
          rotation += dx * 0.012;
          velocity = dx * 0.012;
          idleSince = performance.now();
        };
        const up = () => {
          dragging = false;
          idleSince = performance.now();
        };
        host.addEventListener("pointerdown", down);
        host.addEventListener("pointermove", move);
        host.addEventListener("pointerup", up);
        host.addEventListener("pointercancel", up);

        let visible = true;
        const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { threshold: 0.05 });
        io.observe(host);

        let raf = 0;
        let last = performance.now();
        let reported = 0;
        const frame = (now) => {
          raf = requestAnimationFrame(frame);
          if (!visible || document.hidden) {
            last = now;
            return;
          }
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          if (!dragging) {
            rotation += velocity;
            velocity *= 0.92;
            if (autoSpin && now - idleSince > 1800) rotation += dt * 0.5;
          }
          pivot.rotation.y = rotation;
          renderer.render(scene, camera);
          const deg = Math.round((((rotation * 180) / Math.PI) % 360 + 360) % 360);
          if (deg !== reported) {
            reported = deg;
            setAngle(deg);
          }
        };
        raf = requestAnimationFrame(frame);

        apiRef.current = {
          setColors: (c) => mannequin?.setColors(c),
          setAngle: (deg) => {
            rotation = (deg * Math.PI) / 180;
            velocity = 0;
            idleSince = performance.now();
          },
        };
        setState("ready");

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          io.disconnect();
          host.removeEventListener("pointerdown", down);
          host.removeEventListener("pointermove", move);
          host.removeEventListener("pointerup", up);
          host.removeEventListener("pointercancel", up);
          disposeModel();
          renderer.dispose();
          canvas.remove();
          apiRef.current = null;
        };
      } catch (err) {
        console.error("3D viewer unavailable", err);
        if (!cancelled) setState("unsupported");
      }
    }

    // Only start (and download the 3D code) when the section is about to be seen.
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          watcher.disconnect();
          start();
        }
      },
      { rootMargin: "300px" }
    );
    watcher.observe(host);
    return () => {
      cancelled = true;
      watcher.disconnect();
      cleanup();
    };
  }, [settings.model_url, settings.auto_rotate]);

  // Dress the figure whenever the chosen outfit changes (or the figure finishes loading).
  useEffect(() => {
    if (state === "ready" && outfit) apiRef.current?.setColors(colorsOf(outfit));
  }, [state, outfit]);

  const total = (outfit?.items || []).reduce((s, i) => s + i.price, 0);

  return (
    <section className="viewer-section theme-dark">
      <div className="container viewer-grid">
        <div className="viewer-copy">
          <SplitText as="h2" className="display" text={data.title || "See it from every side"} />
          {data.text && (
            <p data-reveal style={{ "--i": 3 }}>
              {data.text}
            </p>
          )}

          {outfits.length > 0 && (
            <div className="viewer-outfits" role="group" aria-label="Choose an outfit">
              {outfits.map((o, i) => (
                <button key={o.id} type="button" className="chip" aria-pressed={i === active} onClick={() => setActive(i)}>
                  {o.name}
                </button>
              ))}
            </div>
          )}

          {outfit && (
            <ul className="viewer-items">
              {outfit.items.map((p) => (
                <li key={p.id}>
                  <Link href={`/product/${p.id}`}>
                    <span>
                      {p.name}
                      <small>{[p.color_name, p.category].filter(Boolean).join(" · ")}</small>
                    </span>
                    <b>{formatPrice(p.price)}</b>
                  </Link>
                </li>
              ))}
              <li className="viewer-total">
                <span>Whole look</span>
                <b>{formatPrice(total)}</b>
              </li>
            </ul>
          )}
          {outfit && (
            <Link href={`/outfits/${outfit.id}`} className="btn btn-lg">
              Shop this look
            </Link>
          )}
        </div>

        <div className="viewer-stage">
          <div className="viewer-canvas" ref={hostRef} role="img" aria-label={`Rotating 3D view of the outfit${outfit ? ` ${outfit.name}` : ""}`}>
            {state !== "ready" && (
              <div className="viewer-status">{state === "unsupported" ? "Your browser can't show the 3D view." : "Loading 3D view…"}</div>
            )}
          </div>
          <div className="viewer-controls">
            <span className="viewer-hint">Drag to turn · {angle}°</span>
            <label className="visually-hidden" htmlFor="viewer-angle">
              Rotate the outfit
            </label>
            <input id="viewer-angle" type="range" min="0" max="359" value={angle} onChange={(e) => apiRef.current?.setAngle(Number(e.target.value))} disabled={state !== "ready"} />
          </div>
          {data.caption && <p className="viewer-caption">{data.caption}</p>}
        </div>
      </div>
    </section>
  );
}
