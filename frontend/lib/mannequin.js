// A stylised 3D male mannequin wearing a leather jacket, jeans and boots, built from simple
// shapes (no model file needed). The three clothing colours can be changed at any time, so the
// viewer can show any outfit. Units are metres; the figure is about 1.8 m tall and faces +z.

export function buildMannequin(THREE) {
  const root = new THREE.Group();
  const parts = { jacket: [], jeans: [], boots: [] };

  const mat = {
    skin: new THREE.MeshStandardMaterial({ color: "#cfcac2", roughness: 0.55, metalness: 0 }),
    shirt: new THREE.MeshStandardMaterial({ color: "#1a1a1c", roughness: 0.85 }),
    jacket: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.42, metalness: 0.08, side: THREE.DoubleSide }),
    jeans: new THREE.MeshStandardMaterial({ color: "#2f4a75", roughness: 0.92 }),
    boots: new THREE.MeshStandardMaterial({ color: "#3b2418", roughness: 0.45, metalness: 0.05 }),
    sole: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.9 }),
    metal: new THREE.MeshStandardMaterial({ color: "#c9c9cc", roughness: 0.28, metalness: 0.9 }),
    stitch: new THREE.MeshStandardMaterial({ color: "#b98a52", roughness: 0.8 }),
  };

  const add = (mesh, material, group, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}, tag) => {
    mesh.material = material;
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    if (tag) parts[tag].push(mesh);
    return mesh;
  };
  const cyl = (rt, rb, h, seg = 32, open = false, thetaStart = 0, thetaLength = Math.PI * 2) =>
    new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, thetaStart, thetaLength));
  const sphere = (r) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 24));
  const box = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  const capsule = (r, len) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20));

  // ---------- boots ----------
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.x = side * 0.105;
    root.add(leg);
    add(box(0.115, 0.03, 0.31), mat.sole, leg, { y: 0.015, z: 0.05 });
    add(box(0.1, 0.02, 0.09), mat.sole, leg, { y: 0.04, z: -0.06 }); // heel
    add(cyl(0.062, 0.066, 0.2, 28), mat.boots, leg, { y: 0.17 }, "boots"); // shaft
    add(box(0.108, 0.075, 0.215), mat.boots, leg, { y: 0.075, z: 0.085 }, "boots"); // foot
    add(sphere(0.054), mat.boots, leg, { y: 0.07, z: 0.185, sy: 0.75, sz: 1.15 }, "boots"); // toe cap
    add(cyl(0.066, 0.066, 0.014, 28), mat.stitch, leg, { y: 0.27 }); // top welt line

    // ---------- jeans ----------
    add(cyl(0.083, 0.07, 0.4, 28), mat.jeans, leg, { y: 0.47 }, "jeans"); // shin to knee
    add(cyl(0.098, 0.083, 0.4, 28), mat.jeans, leg, { y: 0.86 }, "jeans"); // knee to hip
    add(cyl(0.071, 0.071, 0.012, 28), mat.stitch, leg, { y: 0.27 }); // hem stitch
  }

  // hips, belt
  add(sphere(0.19), mat.jeans, root, { y: 1.05, sx: 1.08, sy: 0.55, sz: 0.78 }, "jeans");
  add(new THREE.Mesh(new THREE.TorusGeometry(0.178, 0.011, 10, 40)), mat.sole, root, { y: 1.085, rx: Math.PI / 2, sx: 1.06, sy: 0.74 });
  add(box(0.03, 0.026, 0.008), mat.metal, root, { y: 1.085, z: 0.138 }); // buckle

  // ---------- torso (shirt) ----------
  add(cyl(0.165, 0.15, 0.4, 36), mat.shirt, root, { y: 1.27, sz: 0.72 });
  add(cyl(0.05, 0.055, 0.1, 20), mat.skin, root, { y: 1.52 }); // neck
  add(sphere(0.098), mat.skin, root, { y: 1.64, sy: 1.18, sz: 1.05 }); // head
  add(box(0.012, 0.035, 0.02), mat.skin, root, { y: 1.625, z: 0.098 }); // nose hint

  // ---------- jacket ----------
  // Body: an open front (a gap at the front) shows the shirt and the zip.
  const bodyGap = 0.5;
  add(cyl(0.2, 0.185, 0.5, 40, true, bodyGap / 2 + Math.PI / 2 * 0, Math.PI * 2 - bodyGap), mat.jacket, root, { y: 1.23, sz: 0.74 }, "jacket");
  add(sphere(0.215), mat.jacket, root, { y: 1.43, sx: 1.12, sy: 0.42, sz: 0.62 }, "jacket"); // shoulders
  add(cyl(0.195, 0.2, 0.05, 40), mat.jacket, root, { y: 0.985, sz: 0.74 }, "jacket"); // waistband
  // collar and lapels
  for (const side of [-1, 1]) {
    add(box(0.09, 0.15, 0.012), mat.jacket, root, { x: side * 0.07, y: 1.43, z: 0.12, rz: side * -0.35, rx: -0.25 }, "jacket");
    add(cyl(0.012, 0.012, 0.5, 8), mat.metal, root, { x: side * 0.012, y: 1.21, z: 0.158 }); // zip
  }
  add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 12, 28, Math.PI)), mat.jacket, root, { y: 1.5, z: -0.01, rx: Math.PI / 2, ry: 0, sy: 1, sz: 1 }, "jacket"); // collar band

  // sleeves and hands
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.245, 1.42, 0);
    arm.rotation.z = side * 0.13;
    root.add(arm);
    add(capsule(0.05, 0.36), mat.jacket, arm, { y: -0.27 }, "jacket"); // upper sleeve
    add(capsule(0.045, 0.3), mat.jacket, arm, { y: -0.58, rx: -0.12, z: 0.03 }, "jacket"); // forearm sleeve
    add(cyl(0.052, 0.052, 0.025, 20), mat.jacket, arm, { y: -0.78, z: 0.06, rx: -0.12 }, "jacket"); // cuff
    add(sphere(0.045), mat.skin, arm, { y: -0.86, z: 0.075, sy: 1.15 }); // hand
  }

  // ---------- floor ----------
  const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 64), new THREE.MeshStandardMaterial({ color: "#d9d6cf", roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  floor.receiveShadow = true;
  root.add(floor);

  // Change the clothing colours: setColors({ jacket: "#8a4b22", jeans: "#2f4a75", boots: "#111111" })
  const setColors = ({ jacket, jeans, boots }) => {
    if (jacket) mat.jacket.color.set(jacket);
    if (jeans) mat.jeans.color.set(jeans);
    if (boots) mat.boots.color.set(boots);
  };
  const dispose = () => {
    root.traverse((o) => {
      o.geometry?.dispose?.();
    });
    Object.values(mat).forEach((m) => m.dispose());
  };
  return { root, setColors, dispose };
}
