import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from '../lib/motion';
import { heroSignals } from './signals';
import { CLUSTER_W } from './heroLayout';
import { asset } from '../lib/asset';

/* ------------------------------------------------------------------ data
   Positions are the logo artwork's own geometry (coin radius = 1, measured from the master file).
   `layer` is the paint order in the artwork (0 = front-most). Coins interlock like rings, so each
   layer gets its own depth and never intersects its neighbours. */
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
const Z_GAP_REST = 0.6;           // depth between consecutive layers at rest (no clipping with tilt ≤ 0.15 rad)
const Z_GAP_FLIP = 2.6;           // extra depth while the coins flip during the scroll morph

const smooth = (t: number) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };

/* ------------------------------------------------------------------ coin */
/** shallow dome for the face: curvature makes the environment reflections glide as bands instead of one flat wash */
function domeGeometry(radius: number, sagitta: number, seg = 64) {
  const g = new THREE.PlaneGeometry(radius * 2, radius * 2, seg, seg);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / radius, y = pos.getY(i) / radius;
    const r2 = Math.min(1, x * x + y * y);
    pos.setZ(i, sagitta * (1 - r2));
  }
  g.computeVertexNormals();
  return g;
}

function Coin({ def, index }: { def: CoinDef; index: number }) {
  const [tex, nrm] = useTexture([def.tex, def.tex.replace('.png', '-normal.png')]);
  const dome = useMemo(() => domeGeometry(R * 1.05, 0.06), []);
  useEffect(() => () => dome.dispose(), [dome]);
  const g = useRef<THREE.Group>(null!);
  const inner = useRef<THREE.Group>(null!);
  const intro = useRef({ t: 0 });
  useMemo(() => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; }, [tex]);

  // sharp, glossy enamel: low roughness + hard clearcoat → tight highlights from the moving key light
  const side = useMemo(() => new THREE.MeshPhysicalMaterial({ color: def.color, roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.9 }), [def.color]);
  const face = useMemo(() => new THREE.MeshPhysicalMaterial({ map: tex, normalMap: nrm, normalScale: new THREE.Vector2(0.55, 0.55), transparent: true, roughness: 0.32, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.015, clearcoatNormalMap: nrm, clearcoatNormalScale: new THREE.Vector2(0.75, 0.75), envMapIntensity: 0.9, alphaTest: 0.02 }), [tex, nrm]);
  const back = useMemo(() => new THREE.MeshPhysicalMaterial({ color: def.color, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }), [def.color]);
  const mats = useMemo(() => [side, back, back], [side, back]);
  useEffect(() => () => { side.dispose(); face.dispose(); back.dispose(); }, [side, face, back]);

  // intro: each coin arrives from its own depth layer (no crossing), spinning into place
  useEffect(() => {
    const o = intro.current; o.t = 0;
    const tw = gsap.to(o, { t: 1, duration: 1.7, ease: 'expo.out', delay: 0.1 + index * 0.1 });
    return () => { tw.kill(); };
  }, [index]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const p = heroSignals.scroll;
    const it = intro.current.t;
    // flip window during the morph (staggered per coin)
    const f0 = 0.08 + index * 0.07, f1 = f0 + 0.5;
    const flip = smooth((p - f0) / (f1 - f0));
    const spread = Math.sin(Math.PI * Math.min(1, Math.max(0, (p - 0.02) / 0.9)));
    const zGap = Z_GAP_REST + Z_GAP_FLIP * spread;
    const zc = (2 - def.layer) * zGap;                       // layer 0 front (+z), layer 4 back
    const k = (CAM_Z - zc) / CAM_Z;                          // perspective compensation → exact logo layout on screen
    const grp = g.current, inn = inner.current;
    // rest position (+ intro approach from far back / offset)
    const ax = def.x * k, ay = def.y * k;
    const ix = ax + (1 - it) * (def.x * 0.6), iy = ay - (1 - it) * (2.2 + index * 0.3), iz = zc - (1 - it) * 14;
    grp.position.set(ix, iy, iz);
    grp.scale.setScalar(k * (0.7 + 0.3 * it));
    // orientation: intro tumble → rest tilt (pointer + slow breathing) → scroll flip
    const tiltX = -heroSignals.py * 0.11 + Math.sin(t * 0.7 + index) * 0.035;
    const tiltY = heroSignals.px * 0.13 + Math.cos(t * 0.55 + index * 1.1) * 0.04;
    inn.rotation.x = tiltX + (1 - it) * -1.2;
    inn.rotation.y = tiltY + (1 - it) * 2.4 + flip * Math.PI * 2;
    inn.rotation.z = (1 - it) * 0.4;
  });

  return (
    <group ref={g}>
      <group ref={inner}>
        <mesh material={mats} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[R, R, T, SEG, 1, false]} />
        </mesh>
        {/* the sprite covers 400/420 of its own width → circle radius 1.05 puts the painted edge exactly on the rim */}
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
    const wpp = worldH / size.height;                        // world units per css px at z = 0
    const s = (c.w * wpp) / CLUSTER_W;
    g.current.position.set((c.cx - size.width / 2) * wpp, (size.height / 2 - c.cy) * wpp, 0);
    g.current.scale.setScalar(s);
  });
  return <group ref={g}>{COINS.map((c, i) => <Coin key={c.id} def={c} index={i} />)}</group>;
}

/* ------------------------------------------------------------------ lights
   Sharp shine = mirror-like clearcoat reflecting a high-contrast environment (thin bright strips),
   and the environment rotates slowly so the reflections glide across the enamel. */
function Rig() {
  const key = useRef<THREE.PointLight>(null!);
  const scene = useThree(s => s.scene);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    key.current.position.set(Math.sin(t * 0.4) * 8, 6 + Math.cos(t * 0.3) * 2, 12);
    scene.environmentRotation.set(0, t * 0.32, 0);
  });
  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight intensity={0.55} color="#ffffff" groundColor="#dfe6f0" />
      <pointLight ref={key} intensity={140} distance={70} decay={2} color="#ffffff" />
      <Environment resolution={512}>
        {/* soft white dome so the enamel stays bright */}
        <Lightformer intensity={0.9} form="rect" color="#f4f7fb" position={[0, 0, -12]} scale={[40, 40, 1]} />
        {/* thin hot strips → crisp specular bands */}
        <Lightformer intensity={14} form="rect" color="#ffffff" position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[1.4, 30, 1]} />
        <Lightformer intensity={10} form="rect" color="#ffffff" position={[7, 3, 4]} rotation-y={-Math.PI / 2} scale={[0.9, 12, 1]} />
        <Lightformer intensity={10} form="rect" color="#e8f1ff" position={[-7, -2, 4]} rotation-y={Math.PI / 2} scale={[0.9, 12, 1]} />
        <Lightformer intensity={18} form="circle" color="#ffffff" position={[3, 8, 6]} scale={[1.1, 1.1, 1]} />
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
