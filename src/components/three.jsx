import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Sparkles, ContactShadows } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// --- geometry helpers -------------------------------------------------------

function starShape(outer = 1, inner = 0.42, points = 5) {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function checkShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.62, 0.04);
  s.lineTo(-0.2, -0.38);
  s.lineTo(0.62, 0.44);
  s.lineTo(0.48, 0.58);
  s.lineTo(-0.2, -0.1);
  s.lineTo(-0.48, 0.18);
  s.closePath();
  return s;
}

const extrude = { depth: 0.32, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 6, curveSegments: 12 };

// --- meshes -----------------------------------------------------------------

export function LoneStar({ color = "#FFB020", scale = 1, spin = 0.5, ...props }) {
  const ref = useRef();
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(starShape(), extrude);
    g.center();
    return g;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * spin;
  });
  return (
    <mesh ref={ref} geometry={geo} scale={scale} castShadow {...props}>
      <meshPhysicalMaterial color={color} metalness={0.55} roughness={0.18} clearcoat={1} clearcoatRoughness={0.1} emissive={color} emissiveIntensity={0.12} />
    </mesh>
  );
}

function Pin({ color = "#FF4D5E" }) {
  const ref = useRef();
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.8;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.72, 48, 48]} />
        <meshPhysicalMaterial color={color} roughness={0.2} metalness={0.2} clearcoat={1} />
      </mesh>
      <mesh position={[0, -0.45, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.62, 1.2, 48]} />
        <meshPhysicalMaterial color={color} roughness={0.2} metalness={0.2} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.45, 0.62]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={[0, -1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.05, 16, 64]} />
        <meshStandardMaterial color="#4F8CFF" emissive="#4F8CFF" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function ToolBox() {
  const ref = useRef();
  useFrame((s) => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.6) * 0.6 + 0.4;
    ref.current.rotation.x = 0.25;
  });
  return (
    <group ref={ref}>
      <RoundedBox args={[1.9, 1.1, 1.0]} radius={0.14} smoothness={6}>
        <meshPhysicalMaterial color="#1E4FD8" roughness={0.25} clearcoat={1} />
      </RoundedBox>
      <RoundedBox args={[2.0, 0.22, 1.08]} radius={0.08} position={[0, 0.3, 0]}>
        <meshPhysicalMaterial color="#FF4D5E" roughness={0.25} clearcoat={1} />
      </RoundedBox>
      <mesh position={[0, 0.82, 0]}>
        <torusGeometry args={[0.38, 0.07, 16, 48, Math.PI]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
      </mesh>
      <RoundedBox args={[0.34, 0.2, 0.06]} radius={0.04} position={[0, 0.05, 0.53]}>
        <meshStandardMaterial color="#FFB020" metalness={0.8} roughness={0.2} />
      </RoundedBox>
    </group>
  );
}

function Coins() {
  const ref = useRef();
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.7;
  });
  return (
    <group ref={ref} rotation={[0.3, 0, 0]}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[Math.sin(i) * 0.06, -0.8 + i * 0.24, Math.cos(i) * 0.06]}>
          <cylinderGeometry args={[0.8, 0.8, 0.2, 64]} />
          <meshPhysicalMaterial color="#FFB020" metalness={0.85} roughness={0.22} clearcoat={1} />
        </mesh>
      ))}
      <group position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <LoneStar scale={0.42} spin={0} color="#FFF3C4" />
      </group>
    </group>
  );
}

function Check() {
  const ref = useRef();
  const geo = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(checkShape(), { ...extrude, depth: 0.2 });
    g.center();
    return g;
  }, []);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = Math.sin(s.clock.elapsedTime * 1.2) * 0.5;
  });
  return (
    <group ref={ref}>
      <mesh>
        <torusGeometry args={[1.15, 0.12, 24, 96]} />
        <meshPhysicalMaterial color="#22C55E" roughness={0.15} clearcoat={1} emissive="#22C55E" emissiveIntensity={0.2} />
      </mesh>
      <mesh geometry={geo} scale={1.05}>
        <meshPhysicalMaterial color="#ffffff" roughness={0.2} clearcoat={1} />
      </mesh>
    </group>
  );
}

const variants = { star: LoneStar, pin: Pin, tools: ToolBox, coins: Coins, check: Check };

// A small self-contained 3D hero used inside screens.
export function Hero3D({ variant = "star", height = 220, sparkle = "#ffffff", className = "" }) {
  const Comp = variants[variant] || LoneStar;
  return (
    <div className={className} style={{ height }}>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <pointLight position={[-4, -2, 2]} intensity={30} color="#4F8CFF" />
        <pointLight position={[3, -3, 2]} intensity={20} color="#FF4D5E" />
        <Float speed={2.2} rotationIntensity={0.6} floatIntensity={1.1}>
          <Comp />
        </Float>
        <Sparkles count={40} scale={[5, 4, 2]} size={2.5} speed={0.4} color={sparkle} />
        <ContactShadows position={[0, -1.7, 0]} opacity={0.35} scale={6} blur={2.6} far={3} />
      </Canvas>
    </div>
  );
}

// --- desktop backdrop -------------------------------------------------------

function Drifter({ position, color, shape, speed }) {
  const ref = useRef();
  useFrame((s, dt) => {
    if (!ref.current) return;
    ref.current.rotation.x += dt * speed * 0.4;
    ref.current.rotation.y += dt * speed * 0.6;
    // gentle parallax towards the pointer
    ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, position[0] + s.pointer.x * 0.6, 0.03);
    ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, position[1] + s.pointer.y * 0.4, 0.03);
  });
  return (
    <Float speed={speed * 2} floatIntensity={1.4}>
      <mesh ref={ref} position={position}>
        {shape === "ico" && <icosahedronGeometry args={[0.6, 0]} />}
        {shape === "torus" && <torusKnotGeometry args={[0.38, 0.13, 128, 16]} />}
        {shape === "box" && <boxGeometry args={[0.8, 0.8, 0.8]} />}
        {shape === "sphere" && <sphereGeometry args={[0.5, 48, 48]} />}
        <meshPhysicalMaterial color={color} roughness={0.15} metalness={0.3} clearcoat={1} flatShading={shape === "ico"} />
      </mesh>
    </Float>
  );
}

export function Backdrop() {
  const items = useMemo(
    () => [
      { position: [-9.8, 1.2, -4], color: "#4F8CFF", shape: "ico", speed: 0.8 },
      { position: [6.2, -2.4, -1], color: "#FF4D5E", shape: "torus", speed: 0.6 },
      { position: [-4.6, -3.8, -3], color: "#FFB020", shape: "sphere", speed: 0.9 },
      { position: [6.8, 2.9, -3], color: "#22C55E", shape: "box", speed: 0.5 },
      { position: [-10.5, -3.5, -5], color: "#A855F7", shape: "torus", speed: 0.7 },
      { position: [9, 0.2, -6], color: "#06B6D4", shape: "ico", speed: 0.7 },
    ],
    []
  );
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 9], fov: 50 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 6, 5]} intensity={2} />
      <pointLight position={[-6, -3, 3]} intensity={60} color="#4F8CFF" />
      <pointLight position={[6, 3, 3]} intensity={40} color="#FF4D5E" />
      {items.map((it, i) => (
        <Drifter key={i} {...it} />
      ))}
      <group position={[-4.6, 3.4, -3]}>
        <Float speed={1.5} floatIntensity={2}>
          <LoneStar scale={0.9} spin={0.4} />
        </Float>
      </group>
      <Sparkles count={160} scale={[22, 12, 6]} size={2} speed={0.3} color="#cfe0ff" />
    </Canvas>
  );
}
