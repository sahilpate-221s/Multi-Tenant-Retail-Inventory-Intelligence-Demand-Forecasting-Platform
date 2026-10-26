import { useRef, Suspense, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Stars } from "@react-three/drei";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   3D HERO SCENE COMPONENTS (Optimized for High Frame Rate & Instant Load)
═══════════════════════════════════════════════════════════════════════════ */

/** Camera that responds smoothly to mouse movement */
function MouseCamera({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const { camera } = useThree();
  const pos = useRef({ x: 0, y: 2.2, z: 6 });

  useFrame(() => {
    pos.current.x += (mouseX * 0.6 - pos.current.x) * 0.02;
    pos.current.y += (2.2 + mouseY * 0.3 - pos.current.y) * 0.02;
    camera.position.set(pos.current.x, pos.current.y, pos.current.z);
    camera.lookAt(0, 0.3, 0);
  });

  return null;
}

/** Orbiting amber torus ring with data nodes */
function DataRing({ radius = 1.8, nodeCount = 12 }: { radius?: number; nodeCount?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.15;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.08;
  });

  return (
    <group ref={ref} position={[0, 0.5, 0]}>
      <mesh>
        <torusGeometry args={[radius, 0.008, 16, 80]} />
        <meshStandardMaterial
          color="#d4a853"
          emissive="#d4a853"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh rotation={[0.4, 0, 0.6]}>
        <torusGeometry args={[radius * 1.15, 0.005, 12, 60]} />
        <meshStandardMaterial
          color="#6b8cc7"
          emissive="#6b8cc7"
          emissiveIntensity={0.4}
          transparent
          opacity={0.35}
        />
      </mesh>
      <mesh rotation={[0.8, 0.3, 0.2]}>
        <torusGeometry args={[radius * 0.85, 0.004, 12, 50]} />
        <meshStandardMaterial
          color="#4aba7a"
          emissive="#4aba7a"
          emissiveIntensity={0.4}
          transparent
          opacity={0.3}
        />
      </mesh>
      {Array.from({ length: nodeCount }).map((_, i) => {
        const angle = (i / nodeCount) * Math.PI * 2;
        const colors = ["#d4a853", "#4aba7a", "#6b8cc7", "#d45a4a"];
        const color = colors[i % colors.length];
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              Math.sin(angle) * 0.08,
              Math.sin(angle) * radius,
            ]}
          >
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** Central glowing orb with distortion */
function CoreOrb() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.2;
    ref.current.rotation.z = clock.getElapsedTime() * 0.15;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={ref} position={[0, 0.5, 0]}>
        <icosahedronGeometry args={[0.65, 4]} />
        <MeshDistortMaterial
          color="#d4a853"
          emissive="#d4a853"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.8}
          distort={0.25}
          speed={2}
          transparent
          opacity={0.85}
        />
      </mesh>
    </Float>
  );
}

/** Refractive glass sphere (Optimized with standard Physical Transmission for instant shader compile) */
function GlassSphere({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.8}>
      <mesh position={position}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshPhysicalMaterial
          roughness={0.08}
          transmission={0.92}
          thickness={0.5}
          ior={1.45}
          color="#d4a853"
          transparent
          opacity={0.85}
        />
      </mesh>
    </Float>
  );
}

/** Floating warehouse boxes that orbit gently */
function FloatingBoxes({ isMobile }: { isMobile: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.05;
  });

  const boxes = [
    { pos: [-2.5, 0.2, -1] as [number, number, number], size: [0.3, 0.22, 0.25] as [number, number, number], color: "#5a4a30", speed: 1.2 },
    { pos: [2.3, 0.8, -0.5] as [number, number, number], size: [0.25, 0.18, 0.2] as [number, number, number], color: "#4a3e28", speed: 1.8 },
    { pos: [-1.8, 1.4, 0.6] as [number, number, number], size: [0.2, 0.15, 0.18] as [number, number, number], color: "#6b5838", speed: 1.5 },
    { pos: [1.5, -0.2, 1.2] as [number, number, number], size: [0.28, 0.2, 0.22] as [number, number, number], color: "#3d3425", speed: 2.0 },
    { pos: [0.5, 1.8, -1.5] as [number, number, number], size: [0.18, 0.14, 0.16] as [number, number, number], color: "#544a38", speed: 1.3 },
    { pos: [-0.8, -0.5, 1.8] as [number, number, number], size: [0.22, 0.17, 0.2] as [number, number, number], color: "#5e5240", speed: 1.7 },
  ];

  return (
    <group ref={groupRef}>
      {boxes.map((b, i) => (
        <Float key={i} speed={b.speed} rotationIntensity={0.4} floatIntensity={0.6}>
          <mesh position={b.pos} castShadow={!isMobile}>
            <boxGeometry args={b.size} />
            <meshStandardMaterial
              color={b.color}
              roughness={0.7}
              metalness={0.15}
            />
            {i % 2 === 0 && (
              <mesh position={[0, 0, b.size[2] / 2 + 0.001]}>
                <planeGeometry args={[b.size[0] * 0.6, b.size[1] * 0.3]} />
                <meshBasicMaterial color="#d4a853" opacity={0.5} transparent />
              </mesh>
            )}
          </mesh>
        </Float>
      ))}
    </group>
  );
}

/** Sweeping scanner beam */
function ScannerBeam() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.4;
    ref.current.position.y = 0.5 + Math.sin(t * 0.7) * 0.2;
    (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 2) * 0.08;
  });

  return (
    <mesh ref={ref} position={[0, 0.5, 0]}>
      <planeGeometry args={[8, 0.012]} />
      <meshBasicMaterial
        color="#d4a853"
        transparent
        opacity={0.2}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/** Particle field in 3D space with adaptive particle count */
function ParticleCloud({ isMobile }: { isMobile: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const count = isMobile ? 120 : 250;

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;

      const isAmber = Math.random() < 0.3;
      if (isAmber) {
        col[i * 3] = 0.83;
        col[i * 3 + 1] = 0.66;
        col[i * 3 + 2] = 0.33;
      } else {
        col[i * 3] = 0.6;
        col[i * 3 + 1] = 0.6;
        col[i * 3 + 2] = 0.65;
      }
    }
    return { positions: pos, colors: col };
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.015;
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.05) * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

/** Ground grid */
function GroundGrid() {
  return (
    <>
      <gridHelper args={[30, 24, "#303038", "#18181c"]} position={[0, -1.5, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.51, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.95} metalness={0.05} />
      </mesh>
    </>
  );
}

/** Full 3D Scene */
function HeroScene({ mouseX, mouseY, isMobile }: { mouseX: number; mouseY: number; isMobile: boolean }) {
  return (
    <>
      <MouseCamera mouseX={mouseX} mouseY={mouseY} />

      <ambientLight intensity={0.25} color="#d8d7d4" />
      <directionalLight position={[5, 8, 4]} intensity={2} color="#fff3dd" castShadow={!isMobile} />
      <directionalLight position={[-5, 4, -4]} intensity={0.7} color="#d0d4de" />
      <pointLight position={[0, 2, 2]} intensity={2.5} distance={10} decay={2} color="#f3cb75" />
      <spotLight position={[0, 6, 0]} angle={0.5} penumbra={0.8} intensity={2} color="#d4a853" distance={15} decay={2} />

      <Stars radius={45} depth={45} count={isMobile ? 500 : 1200} factor={2} saturation={0} fade speed={0.4} />
      <fog attach="fog" args={["#0a0a0c", 12, 28]} />

      <CoreOrb />
      <DataRing />
      <FloatingBoxes isMobile={isMobile} />
      <ScannerBeam />
      <ParticleCloud isMobile={isMobile} />
      <GroundGrid />

      <GlassSphere position={[-1.8, 1.2, 0.5]} />
      <GlassSphere position={[2.0, 0.8, -0.8]} />
    </>
  );
}

interface LandingHero3DProps {
  mouseX: number;
  mouseY: number;
}

export default function LandingHero3D({ mouseX, mouseY }: LandingHero3DProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    // Smooth fade-in once canvas is mounted
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`w-full h-full transition-opacity duration-1000 ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas
        shadows={!isMobile}
        dpr={isMobile ? 1 : [1, 1.25]}
        gl={{
          antialias: !isMobile,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        camera={{ position: [0, 2.2, 6], fov: 45, near: 0.1, far: 60 }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <HeroScene mouseX={mouseX} mouseY={mouseY} isMobile={isMobile} />
        </Suspense>
      </Canvas>
    </div>
  );
}
