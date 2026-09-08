import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from '../lib/motion';
import { heroSignals } from './signals';
import { CLUSTER_W } from './heroLayout';
import { asset } from '../lib/asset';

/* ------------------------------------------------------------------ data
   Positions are the logo artwork's own geometry (coin radius = 1).
   `layer` = paint order (0 front). Each layer has its own depth, so coins never intersect. */
export interface CoinDef { id: string; color: string; tex: string; x: number; y: number; layer: number }
export const COINS: CoinDef[] = [
  { id: 'blue',   color: '#2f749e', tex: asset('/img/coins/coin-blue.png'),   x: -2.16, y: 0.62,  layer: 0 },
  { id: 'yellow', color: '#e7a621', tex: asset('/img/coins/coin-yellow.png'), x: -1.16, y: -0.61, layer: 1 },
  { id: 'black',  color: '#2f2d28', tex: asset('/img/coins/coin-black.png'),  x: 0.01,  y: 0.60,  layer: 2 },
  { id: 'green',  color: '#3e863d', tex: asset('/img/coins/coin-green.png'),  x: 1.01,  y: -0.62, layer: 3 },
  { id: 'red',    color: '#bc3b2a', tex: asset('/img/coins/coin-red.png'),    x: 2.16,  y: 0.60,  layer: 4 },
];
const CAM_Z = 24, FOV = 18;
const R = 1, T = 0.16, SEG = 128;
const Z_GAP_REST = 1.0;           // depth between layers at rest → tilt up to ~0.38 rad without clipping
const Z_GAP_FLIP = 2.4;           // extra depth while the coins flip during the morph
const TILT_X = 0.26, TILT_Y = 0.32;

const smooth = (t: number) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

/** shallow dome: curvature turns the thin environment strips into crisp bands gliding over the enamel */
function domeGeometry(radius: number, sagitta: number, seg = 64) {
  const g = new THREE.PlaneGeometry(radius * 2, radius * 2, seg, seg);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / radius, y = pos.getY(i) / radius;
    pos.setZ(i, sagitta * (1 - Math.min(1, x * x + y * y)));
  }
  g.computeVertexNormals();
  return g;
}

/** stylised glint: a hard-edged diagonal band (plus a thin trailing line) sweeping the face every few seconds */
function withGlint(mat: THREE.MeshPhysicalMaterial, seed: number) {
  const u = { uTime: { value: 0 }, uSeed: { value: seed } };
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = u.uTime; shader.uniforms.uSeed = u.uSeed;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uSeed;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec2 p = vMapUv - 0.5;
          float disc = 1.0 - smoothstep(0.47, 0.485, length(p));
          float d = dot(p, normalize(vec2(1.0, 1.15)));
          float cyc = fract(uTime * 0.16 + uSeed);
          float off = mix(-1.6, 1.6, cyc);
          float main = 1.0 - smoothstep(0.030, 0.038, abs(d - off));
          float trail = 1.0 - smoothstep(0.009, 0.014, abs(d - off + 0.075));
          float g = clamp(main + 0.55 * trail, 0.0, 1.0) * disc;
          totalEmissiveRadiance += vec3(1.0, 0.98, 0.92) * g * 0.95;
        }`);
  };
  mat.customProgramCacheKey = () => 'glint';
  return u;
}

/* ------------------------------------------------------------------ coin */
function Coin({ def, index }: { def: CoinDef; index: number }) {
  const [tex, nrm] = useTexture([def.tex, def.tex.replace('.png', '-normal.png')]);
  const dome = useMemo(() => domeGeometry(R * 1.05, 0.05), []);
  const g = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const intro = useRef({ t: 0, r: 0 });
  useMemo(() => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; }, [tex]);

  // matte-ish base (no broad sheen) + mirror clearcoat (sharp reflections of thin strips) + edge-only normals
  const side = useMemo(() => new THREE.MeshPhysicalMaterial({ color: def.color, roughness: 0.5, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.45 }), [def.color]);
  const face = useMemo(() => new THREE.MeshPhysicalMaterial({ map: tex, normalMap: nrm, normalScale: new THREE.Vector2(1.15, 1.15), transparent: true, roughness: 0.62, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.0, clearcoatNormalMap: nrm, clearcoatNormalScale: new THREE.Vector2(1.4, 1.4), envMapIntensity: 0.4, alphaTest: 0.02 }), [tex, nrm]);
  const glint = useMemo(() => withGlint(face, index * 0.19), [face, index]);
  const back = useMemo(() => new THREE.MeshPhysicalMaterial({ color: def.color, roughness: 0.5, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 0.45 }), [def.color]);
  const mats = useMemo(() => [side, back, back], [side, back]);
  useEffect(() => () => { side.dispose(); face.dispose(); back.dispose(); dome.dispose(); }, [side, face, back, dome]);

  // intro: coins DROP from above and settle with a bounce, spinning into place (each on its own depth layer)
  useEffect(() => {
    const o = intro.current; o.t = 0; o.r = 0;
    const tl = gsap.timeline({ delay: 0.15 + index * 0.12 });
    tl.to(o, { t: 1, duration: 1.5, ease: 'bounce.out' }, 0).to(o, { r: 1, duration: 1.4, ease: 'expo.out' }, 0);
    return () => { tl.kill(); };
  }, [index]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = heroSignals.scroll;
    const { t: it, r: ir } = intro.current;
    glint.uTime.value = t;
    const f0 = 0.06 + index * 0.07, f1 = f0 + 0.5;
    const flip = smooth((p - f0) / (f1 - f0));
    const spread = Math.sin(Math.PI * Math.min(1, Math.max(0, (p - 0.02) / 0.9)));
    const zGap = Z_GAP_REST + Z_GAP_FLIP * spread;
    const zc = (2 - def.layer) * zGap;
    const k = (CAM_Z - zc) / CAM_Z;                          // perspective compensation → exact logo layout
    const grp = g.current, inn = inner.current;
    // pointer parallax: front layers move more (real depth feel), never enough to cross a neighbour
    const par = (2 - def.layer) * 0.09;
    const ax = def.x * k + heroSignals.px * par, ay = def.y * k - heroSignals.py * par * 0.7;
    const drop = (1 - it) * (6.5 + index * 0.4);
    grp.position.set(ax + (1 - ir) * (def.x * 0.15), ay + drop, zc);
    grp.scale.setScalar(k * (0.85 + 0.15 * ir));
    // orientation: intro tumble → rest tilt (strong pointer + slow breathing) → morph flip
    const tiltX = -heroSignals.py * TILT_X + Math.sin(t * 0.7 + index) * 0.03;
    const tiltY = heroSignals.px * TILT_Y + Math.cos(t * 0.55 + index * 1.1) * 0.035;
    inn.rotation.x = tiltX + (1 - ir) * -1.6;
    inn.rotation.y = tiltY + (1 - ir) * 2.2 + flip * Math.PI * 2;
    inn.rotation.z = (1 - ir) * 0.5;
  });

  return (
    <group ref={g}>
      <group ref={inner}>
        <mesh material={mats} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R, R, T, SEG, 1, false]} />
        </mesh>
        <mesh material={face} geometry={dome} position={[0, 0, T / 2 + 0.003]} />
        <mesh position={[0, 0, T / 2 - 0.004]} material={side}>
          <torusGeometry args={[R - 0.035, 0.035, 24, SEG]} />
        </mesh>
        <mesh position={[0, 0, -T / 2 + 0.004]} material={side}>
          <torusGeometry args={[R - 0.035, 0.035, 24, SEG]} />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ cluster: placed from the DOM layout */
function Cluster() {
  const g = useRef<THREE.Group>(null!);
  const { camera, size } = useThree();
  useFrame(() => {
    const c = heroSignals.cluster;
    if (!heroSignals.ready || !c.w) return;
    const cam = camera as THREE.PerspectiveCamera;
    const worldH = 2 * CAM_Z * Math.tan((cam.fov * Math.PI) / 360);
    const wpp = worldH / size.height;
    g.current.position.set((c.cx - size.width / 2) * wpp, (size.height / 2 - c.cy) * wpp, 0);
    g.current.scale.setScalar((c.w * wpp) / CLUSTER_W);
  });
  return <group ref={g}>{COINS.map((c, i) => <Coin key={c.id} def={c} index={i} />)}</group>;
}

/* ------------------------------------------------------------------ lights
   No broad sheen: a dim even environment for body colour, plus a few very thin, very bright strips
   that the mirror clearcoat reflects as crisp lines; the environment rotates so the lines travel. */
function Rig() {
  const key = useRef<THREE.PointLight>(null!);
  const scene = useThree(s => s.scene);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    key.current.position.set(Math.sin(t * 0.4) * 8, 6 + Math.cos(t * 0.3) * 2, 12);
    scene.environmentRotation.set(0, t * 0.28, 0);
  });
  return (
    <>
      <ambientLight intensity={0.85} />
      <hemisphereLight intensity={0.6} color="#ffffff" groundColor="#c9d0e6" />
      <pointLight ref={key} intensity={60} distance={70} decay={2} color="#ffffff" />
      <Environment resolution={512}>
        <Lightformer intensity={0.22} form="rect" color="#ffffff" position={[0, 0, -12]} scale={[40, 40, 1]} />
        <Lightformer intensity={9} form="rect" color="#ffffff" position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[0.25, 30, 1]} />
        <Lightformer intensity={6} form="rect" color="#ffffff" position={[7, 2, 4]} rotation-y={-Math.PI / 2} scale={[0.18, 12, 1]} />
        <Lightformer intensity={6} form="rect" color="#e8f1ff" position={[-7, -1, 4]} rotation-y={Math.PI / 2} scale={[0.18, 12, 1]} />
      </Environment>
    </>
  );
}

/* ------------------------------------------------------------------ canvas */
export function CoinsCanvas({ className }: { className?: string }) {
  const [active, setActive] = useState(true);
  const wrap = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { heroSignals.visible = e.isIntersecting; setActive(e.isIntersecting); }, { threshold: 0.02 });
    io.observe(wrap.current);
    const onVis = () => setActive(document.visibilityState === 'visible' && heroSignals.visible);
    document.addEventListener('visibilitychange', onVis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  return (
    <div ref={wrap} className={className} aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        frameloop={active ? 'always' : 'never'}
        camera={{ position: [0, 0, CAM_Z], fov: FOV, near: 1, far: 80 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; }}
      >
        <Suspense fallback={null}>
          <Rig />
          <Cluster />
        </Suspense>
      </Canvas>
    </div>
  );
}
