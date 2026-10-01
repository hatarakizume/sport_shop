import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  ACCENT,
  ANCHORS,
  EXPLODE,
  MODEL_URLS,
  PARTS,
  chapterAt,
  clamp01,
  stateAt,
} from './story';

const TAU = Math.PI * 2;
const tmp = new THREE.Vector3();

function ease(current, target, perFrame, dt) {
  return current + (target - current) * (1 - Math.pow(1 - perFrame, dt * 60));
}

function useReducedMotion() {
  return useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );
}

function useTimerRing() {
  const ring = useMemo(() => {
    const group = new THREE.Group();
    const geometry = new THREE.BoxGeometry(0.05, 0.2, 0.02);
    const active = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, toneMapped: false });
    const spent = new THREE.MeshBasicMaterial({ color: 0x4a4d55, transparent: true, toneMapped: false });
    const ticks = [];
    for (let k = 0; k < 60; k++) {
      const a = (k / 60) * TAU;
      const m = new THREE.Mesh(geometry, active);
      m.position.set(Math.sin(a) * 1.75, Math.cos(a) * 1.75, 0);
      m.rotation.z = -a;
      group.add(m);
      ticks.push(m);
    }
    group.visible = false;
    return { group, geometry, active, spent, ticks };
  }, []);

  useEffect(
    () => () => {
      ring.geometry.dispose();
      ring.active.dispose();
      ring.spent.dispose();
    },
    [ring]
  );

  return ring;
}

function Story({ progressRef, pointerRef, hoverRef, callouts, onReady }) {
  const sneaker = useGLTF(MODEL_URLS.sneaker);
  const hoodie = useGLTF(MODEL_URLS.hoodie);
  const ball = useGLTF(MODEL_URLS.ball);
  const reduceMotion = useReducedMotion();

  const pivot = useRef();
  const shoe = useRef();
  const hoodieGroup = useRef();
  const ballGroup = useRef();
  const glow = useRef();
  const parts = useRef({});
  const ring = useTimerRing();

  useMemo(() => {
    hoodie.scene.traverse((o) => {
      if (o.isMesh && !o.material.userData.boosted) {
        o.material.color.multiplyScalar(2.2);
        o.material.userData.boosted = true;
      }
    });
  }, [hoodie]);

  const anchors = useMemo(
    () => ANCHORS.map((a) => ({ part: a.part, v: new THREE.Vector3(...a.point) })),
    []
  );

  const sim = useRef({ p: progressRef.current, mx: 0, my: 0, hov: 0, spin: 0, spent: -1, lastVis: -1 });

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useFrame((state, delta) => {
    const s = sim.current;
    const dt = Math.min(delta, 0.05);
    const { width: W, height: H } = state.size;

    s.p = reduceMotion ? progressRef.current : ease(s.p, progressRef.current, 0.09, dt);
    const st = stateAt(s.p);
    const chapter = chapterAt(s.p);

    const hover = hoverRef.current;
    const asset = chapter === 2 ? hover.asset : 'sneaker';
    shoe.current.visible = asset === 'sneaker';
    hoodieGroup.current.visible = asset === 'hoodie';
    ballGroup.current.visible = asset === 'ball';
    glow.current.color.setHex(chapter === 2 ? hover.color : ACCENT);
    if (!reduceMotion) ballGroup.current.rotation.y += dt * 0.5;

    const aspect = W / H;
    const kk = clamp01((aspect - 0.8) / 0.7);
    const sc = Math.max(0.42, Math.min(1, 0.95 * aspect));
    const yoff = (1 - kk) * 0.6;

    const ptr = pointerRef.current;
    s.hov = ease(s.hov, ptr.inside ? 1 : 0, 0.08, dt);
    s.mx = ease(s.mx, ptr.x, 0.07, dt);
    s.my = ease(s.my, ptr.y, 0.07, dt);
    if (!reduceMotion) s.spin = (s.spin + dt * 0.4 * (1 - s.hov)) % TAU;

    const yaw = st.yaw + st.spin * (s.spin + s.mx * 1.6) + (1 - st.spin) * s.mx * 0.25;
    const pitch = st.pitch + s.my * (0.15 + 0.35 * st.spin);
    const bob = reduceMotion ? 0 : Math.sin(state.clock.elapsedTime * 1.2) * 0.06;

    pivot.current.rotation.set(pitch, yaw, 0);
    pivot.current.scale.setScalar(st.s * sc);
    pivot.current.position.set(st.x * kk, st.y + yoff + bob, 0);

    for (const name of PARTS) {
      const [ox, oy, oz] = EXPLODE[name];
      parts.current[name].position.set(ox * st.ex, oy * st.ex, oz * st.ex);
    }

    const spent = Math.floor(60 * clamp01((s.p - 0.78) / 0.12));
    ring.group.visible = st.ring > 0.01;
    ring.group.position.set(st.x * kk, st.y + yoff, 0);
    ring.group.scale.setScalar((0.7 + 0.3 * st.ring) * sc);
    ring.active.opacity = st.ring;
    ring.spent.opacity = 0.5 * st.ring;
    if (spent !== s.spent) {
      ring.ticks.forEach((m, k) => {
        m.material = k < spent ? ring.spent : ring.active;
      });
      s.spent = spent;
    }

    const vis = st.hot > 0.6 ? Math.min(1, (st.hot - 0.6) / 0.4) : 0;
    if (vis === 0 && s.lastVis === 0) return;
    s.lastVis = vis;

    pivot.current.updateMatrixWorld(true);
    const lx = W * (W < 760 ? 0.72 : 0.86);
    const pts = anchors.map((a, i) => {
      tmp.copy(a.v).applyMatrix4(parts.current[a.part].matrixWorld).project(state.camera);
      return { i, px: (tmp.x * 0.5 + 0.5) * W, py: (-tmp.y * 0.5 + 0.5) * H, ly: 0 };
    });
    pts.sort((a, b) => a.py - b.py);
    pts[0].ly = pts[0].py;
    for (let i = 1; i < pts.length; i++) pts[i].ly = Math.max(pts[i].py, pts[i - 1].ly + 26);

    for (const pt of pts) {
      const c = callouts.current[pt.i];
      if (!c.line || !c.dot || !c.label) continue;
      c.line.setAttribute('x1', pt.px);
      c.line.setAttribute('y1', pt.py);
      c.line.setAttribute('x2', lx - 10);
      c.line.setAttribute('y2', pt.ly);
      c.line.setAttribute('opacity', vis);
      c.dot.setAttribute('cx', pt.px);
      c.dot.setAttribute('cy', pt.py);
      c.dot.setAttribute('opacity', vis);
      c.label.style.left = `${lx}px`;
      c.label.style.top = `${pt.ly}px`;
      c.label.style.opacity = vis;
    }
  });

  return (
    <>
      <ambientLight intensity={1.3} />
      <directionalLight position={[3, 5, 5]} intensity={1.95} />
      <directionalLight position={[-3, 2, -5]} intensity={0.9} />
      <pointLight ref={glow} position={[-4, -1, 4]} intensity={1.2} distance={24} decay={0} color={ACCENT} />

      <group ref={pivot}>
        <group ref={shoe}>
          {PARTS.map((name) => (
            <group
              key={name}
              ref={(el) => {
                parts.current[name] = el;
              }}
            >
              <primitive object={sneaker.nodes[name]} />
            </group>
          ))}
        </group>

        <group ref={hoodieGroup} visible={false} scale={0.62} rotation={[0, 0.6, 0]}>
          <primitive object={hoodie.scene} />
        </group>

        <group ref={ballGroup} visible={false} scale={1.25}>
          <primitive object={ball.scene} />
        </group>
      </group>

      <primitive object={ring.group} />
    </>
  );
}

export default function SneakerScene(props) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 35, near: 0.1, far: 50, position: [0, 0.3, 7.6] }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Story {...props} />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URLS.sneaker);
useGLTF.preload(MODEL_URLS.hoodie);
useGLTF.preload(MODEL_URLS.ball);
