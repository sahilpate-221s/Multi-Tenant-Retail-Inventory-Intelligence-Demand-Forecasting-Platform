import { useEffect, useRef, useState, Suspense, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, MeshTransmissionMaterial, Stars } from "@react-three/drei";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════════════════
   3D COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/** Camera that responds to mouse movement */
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
        <torusGeometry args={[radius, 0.008, 16, 100]} />
        <meshStandardMaterial
          color="#d4a853"
          emissive="#d4a853"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh rotation={[0.4, 0, 0.6]}>
        <torusGeometry args={[radius * 1.15, 0.005, 12, 80]} />
        <meshStandardMaterial
          color="#6b8cc7"
          emissive="#6b8cc7"
          emissiveIntensity={0.4}
          transparent
          opacity={0.35}
        />
      </mesh>
      <mesh rotation={[0.8, 0.3, 0.2]}>
        <torusGeometry args={[radius * 0.85, 0.004, 12, 60]} />
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
            <sphereGeometry args={[0.025, 12, 12]} />
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
        <icosahedronGeometry args={[0.65, 8]} />
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

/** Glass sphere with refraction */
function GlassSphere({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.8}>
      <mesh position={position}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <MeshTransmissionMaterial
          backside
          samples={6}
          resolution={512}
          transmission={0.95}
          roughness={0.05}
          thickness={0.5}
          ior={1.5}
          chromaticAberration={0.06}
          anisotropy={0.1}
          distortion={0.15}
          distortionScale={0.3}
          temporalDistortion={0.2}
          color="#d4a853"
        />
      </mesh>
    </Float>
  );
}

/** Floating warehouse boxes that orbit gently */
function FloatingBoxes() {
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
          <mesh position={b.pos} castShadow>
            <boxGeometry args={b.size} />
            <meshStandardMaterial
              color={b.color}
              roughness={0.7}
              metalness={0.15}
            />
            {/* Amber shipping label */}
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

/** Particle field in 3D space */
function ParticleCloud() {
  const ref = useRef<THREE.Points>(null);
  const count = 300;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 14;

    const isAmber = Math.random() < 0.3;
    if (isAmber) {
      colors[i * 3] = 0.83;
      colors[i * 3 + 1] = 0.66;
      colors[i * 3 + 2] = 0.33;
    } else {
      colors[i * 3] = 0.6;
      colors[i * 3 + 1] = 0.6;
      colors[i * 3 + 2] = 0.65;
    }
  }

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
      <gridHelper args={[30, 30, "#303038", "#18181c"]} position={[0, -1.5, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.51, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0a0c" roughness={0.95} metalness={0.05} />
      </mesh>
    </>
  );
}

/** Full 3D scene */
function HeroScene({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  return (
    <>
      <MouseCamera mouseX={mouseX} mouseY={mouseY} />

      <ambientLight intensity={0.2} color="#d8d7d4" />
      <directionalLight position={[5, 8, 4]} intensity={2} color="#fff3dd" castShadow />
      <directionalLight position={[-5, 4, -4]} intensity={0.7} color="#d0d4de" />
      <pointLight position={[0, 2, 2]} intensity={2.5} distance={10} decay={2} color="#f3cb75" />
      <spotLight position={[0, 6, 0]} angle={0.5} penumbra={0.8} intensity={2} color="#d4a853" distance={15} decay={2} />

      <Stars radius={50} depth={50} count={1500} factor={2} saturation={0} fade speed={0.5} />
      <fog attach="fog" args={["#0a0a0c", 12, 28]} />

      <CoreOrb />
      <DataRing />
      <FloatingBoxes />
      <ScannerBeam />
      <ParticleCloud />
      <GroundGrid />

      <GlassSphere position={[-1.8, 1.2, 0.5]} />
      <GlassSphere position={[2.0, 0.8, -0.8]} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BACKGROUND PARTICLES — lightweight canvas for below-the-fold sections
═══════════════════════════════════════════════════════════════════════════ */
function BackgroundParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = 0;
    let H = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.parentElement?.clientWidth ?? window.innerWidth;
      H = canvas.parentElement?.clientHeight ?? window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 50;
    type P = { x: number; y: number; vx: number; vy: number; r: number; amber: boolean };
    const dots: P[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * (W || 1400),
      y: Math.random() * (H || 3000),
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.2 + 0.3,
      amber: Math.random() < 0.25,
    }));

    const LINK = 120;
    const render = () => {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = W; else if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; else if (d.y > H) d.y = 0;
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK) {
            const a = (1 - dist / LINK) * 0.1;
            ctx.strokeStyle = (dots[i].amber || dots[j].amber)
              ? `rgba(212,168,83,${a})` : `rgba(255,255,255,${a * 0.4})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
          }
        }
      }
      for (const d of dots) {
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = d.amber ? "rgba(212,168,83,0.5)" : "rgba(255,255,255,0.15)";
        ctx.fill();
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   2D UI COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

/** Scroll-reveal wrapper */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(28px)",
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Animated counter */
function AnimatedCounter({
  target,
  suffix = "",
  duration = 1800,
  started,
}: {
  target: number;
  suffix?: string;
  duration?: number;
  started: boolean;
}) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);
  return <span>{value.toLocaleString()}{suffix}</span>;
}

/** Clean Modern Section Header */
function SectionHeader({
  badge,
  title,
  subtitle,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-14 text-center max-w-2xl mx-auto">
      {badge && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(212,168,83,0.08)] border border-[rgba(212,168,83,0.2)] mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853]" />
          <span className="text-[11px] font-medium tracking-wider uppercase text-[#d4a853]">
            {badge}
          </span>
        </div>
      )}
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#f4f4f5]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-sm text-[#97979d] leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Animated floating glow orb */
function FloatingGlow({ color, size, top, left, delay = 0 }: { color: string; size: number; top: string; left: string; delay?: number }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size, top, left,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(60px)",
        animation: `floatGlow 8s ease-in-out ${delay}s infinite alternate`,
      }}
    />
  );
}

/** Top-tier custom StockPilot brand emblem with aerodynamic pilot delta-wing and glowing gold typography */
export function StockPilotLogo({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className={`flex items-center gap-2.5 select-none group ${className}`}>
      {/* Pilot Delta Wing Emblem */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105 group-hover:border-[#d4a853]/60`}
        style={{
          background: "linear-gradient(135deg, rgba(30,28,34,0.9), rgba(14,14,18,0.95))",
          border: "1px solid rgba(212,168,83,0.35)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 0 14px rgba(212,168,83,0.15), inset 0 1px 1px rgba(255,255,255,0.12)",
        }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 transition-transform duration-300 group-hover:scale-110"
        >
          <defs>
            <linearGradient id="sp-gold-grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fae099" />
              <stop offset="60%" stopColor="#d4a853" />
              <stop offset="100%" stopColor="#a37629" />
            </linearGradient>
            <linearGradient id="sp-gold-grad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fae099" />
              <stop offset="100%" stopColor="#d4a853" />
            </linearGradient>
          </defs>

          {/* Left Swept Delta Wing */}
          <path
            d="M16 5L6 23L16 19.5L16 5Z"
            fill="url(#sp-gold-grad1)"
            opacity="0.88"
          />

          {/* Right Swept Wing Facet */}
          <path
            d="M16 5L26 23L16 19.5L16 5Z"
            fill="url(#sp-gold-grad2)"
          />

          {/* Center Navigation Diamond Vector */}
          <path
            d="M16 8.5L19.2 19L16 17L12.8 19L16 8.5Z"
            fill="#ffffff"
            opacity="0.95"
          />

          {/* Pilot Beacon Indicator */}
          <circle cx="16" cy="24.5" r="1.5" fill="#f5cf7b" />
        </svg>
      </div>

      {/* Modern Wordmark */}
      <div className="flex items-center">
        <span className={`${textSizes[size]} font-bold tracking-[0.2em] text-[#f4f4f5]`}>
          STOCK
        </span>
        <span
          className={`${textSizes[size]} font-black tracking-[0.2em] ml-0.5`}
          style={{
            background: "linear-gradient(135deg, #fce8b3 0%, #d4a853 60%, #b3852b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          PILOT
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [consoleTab, setConsoleTab] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const features = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Predictive Demand Engine",
      desc: "Machine learning models forecast demand shifts up to 90 days out, ingesting seasonality, promotions, and SKU velocities.",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Automated Anomaly Alerts",
      desc: "Catch sudden spikes in demand, supplier bottlenecks, and inventory drift before stockouts impact revenue.",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M4 7h16" />
        </svg>
      ),
      title: "Dead Stock Elimination",
      desc: "Identify slow-moving inventory before holding costs accumulate, and generate smart markdown and liquidation strategies.",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "Supplier Insight & Lead Times",
      desc: "Monitor vendor reliability, lead-time variance, and automatically buffer purchase orders to prevent stockout gaps.",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: "Natural Language AI Copilot",
      desc: "Ask inventory questions in plain English: 'Which SKUs will sell out this month?', 'What should I restock today?', or simulate promotions.",
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: "What-If Restock Simulator",
      desc: "Stress-test supply disruptions, tariff changes, and volume shifts before committing working capital to purchase orders.",
    },
  ];

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden" style={{ background: "#0a0a0c" }}>

      {/* ════════════════════════════════════════════════════════════════════
          NAVBAR — Full-Featured Modern SaaS Header
      ════════════════════════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
        style={{
          background: "rgba(10,10,12,0.75)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Brand Logo */}
        <Link to="/" className="select-none">
          <StockPilotLogo size="sm" />
        </Link>

        {/* Navigation Page Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#97979d]">
          <a href="#features" className="hover:text-[#e8e6e3] transition-colors">
            Features
          </a>
          <a href="#dashboard" className="hover:text-[#e8e6e3] transition-colors">
            Dashboard
          </a>
          <a href="#how-it-works" className="hover:text-[#e8e6e3] transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="hover:text-[#e8e6e3] transition-colors">
            Pricing
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            id="nav-login-btn"
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#97979d] hover:text-[#e8e6e3] transition-colors"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            id="nav-register-btn"
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#0c0c0e] transition-all hover:scale-[1.03] active:scale-100"
            style={{
              background: "linear-gradient(135deg, #d4a853, #f5cf7b)",
              boxShadow: "0 0 20px rgba(212,168,83,0.25)",
            }}
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          HERO — Unrestricted 3D Viewport + Clean, High-Converting Hero
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full min-h-screen overflow-hidden flex flex-col justify-center">
        {/* 3D Canvas — unblocked, fills entire viewport */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <Canvas
            shadows
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.2,
            }}
            camera={{ position: [0, 2.2, 6], fov: 45, near: 0.1, far: 60 }}
            style={{ background: "#0a0a0c" }}
          >
            <Suspense fallback={null}>
              <HeroScene mouseX={mousePos.x} mouseY={mousePos.y} />
            </Suspense>
          </Canvas>
        </div>

        {/* Ambient atmospheric gradients — ensures text contrast while preserving 3D visibility */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(10,10,12,0.88) 0%, rgba(10,10,12,0.6) 45%, rgba(10,10,12,0.2) 75%, rgba(10,10,12,0.5) 100%), linear-gradient(180deg, rgba(10,10,12,0.5) 0%, transparent 40%, rgba(10,10,12,0.95) 100%)",
          }}
        />

        {/* Hero Content — Clean & Elegant */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 pt-28 pb-16 pointer-events-none">
          <div
            className="max-w-2xl text-left pointer-events-auto transition-all duration-700"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(24px)",
            }}
          >
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(212,168,83,0.08)] border border-[rgba(212,168,83,0.25)] mb-6 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4a853] animate-pulse" />
              <span className="text-xs font-medium text-[#d4a853]">
                Autonomous Inventory Intelligence
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-[#f4f4f5]">
              Predict demand.<br />
              Prevent stockouts.<br />
              <span
                style={{
                  background: "linear-gradient(90deg, #d4a853 0%, #f7dc99 50%, #d4a853 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Eliminate dead stock.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-base md:text-lg text-[#a1a1aa] leading-relaxed">
              AI-driven demand forecasts, anomaly detection, and automated restock planning — unified into one high-performance operating system.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                id="hero-register-btn"
                className="px-8 py-3.5 rounded-xl text-sm font-semibold text-[#0c0c0e] transition-all hover:scale-[1.04] active:scale-100 flex items-center gap-2 shadow-[0_0_30px_rgba(212,168,83,0.35)]"
                style={{ background: "linear-gradient(135deg, #d4a853, #f5cf7b)" }}
              >
                <span>Start Free Trial</span>
                <span className="text-base">→</span>
              </Link>
              <a
                href="#dashboard"
                id="hero-demo-btn"
                className="px-6 py-3.5 rounded-xl text-sm font-medium text-[#e8e6e3] hover:bg-white/5 transition-all border border-white/10 backdrop-blur-md"
              >
                View Dashboard Preview
              </a>
            </div>

            {/* Simple Trust Micro-Copy */}
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-[#71717a]">
              <span>✓ No credit card required</span>
              <span>•</span>
              <span>✓ 14-day free trial</span>
              <span>•</span>
              <span>✓ Quick CSV & API import</span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          REMAINING SECTIONS WRAPPER — with particle background
      ════════════════════════════════════════════════════════════════════ */}
      <div className="relative">
        {/* Animated particle background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <BackgroundParticles />
          <FloatingGlow color="rgba(212,168,83,0.05)" size={500} top="5%" left="20%" delay={0} />
          <FloatingGlow color="rgba(107,140,199,0.04)" size={400} top="25%" left="70%" delay={2} />
          <FloatingGlow color="rgba(212,168,83,0.04)" size={350} top="50%" left="10%" delay={4} />
          <FloatingGlow color="rgba(74,186,122,0.03)" size={300} top="70%" left="60%" delay={1} />
          <FloatingGlow color="rgba(212,168,83,0.05)" size={450} top="90%" left="40%" delay={3} />
        </div>

        {/* ════════════════════════════════════════════════════════════════════
            STATS / METRICS
        ════════════════════════════════════════════════════════════════════ */}
        <section ref={statsRef} className="relative z-10 py-20 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <div
              className="h-px mb-14"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(212,168,83,0.25), transparent)",
                opacity: statsVisible ? 1 : 0,
                transition: "opacity 0.6s ease",
              }}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "SKUs Monitored", target: 250000, suffix: "+" },
                { label: "Forecast Accuracy", target: 99, suffix: "%", dur: 1200 },
                { label: "Stockouts Prevented", target: 12400, suffix: "+" },
                { label: "Lead-Time Saved", target: 3, suffix: " Days", dur: 1000 },
              ].map((s, i) => (
                <Reveal key={s.label} delay={i * 90}>
                  <div
                    className="p-6 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:border-[#d4a853]/30"
                    style={{
                      background: "rgba(14,14,18,0.7)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      backdropFilter: "blur(16px)",
                    }}
                  >
                    <div
                      className="text-3xl md:text-4xl font-bold tracking-tight my-2 tabular-nums"
                      style={{
                        background: "linear-gradient(135deg, #f4f4f5 0%, #d4a853 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                      }}
                    >
                      <AnimatedCounter target={s.target} suffix={s.suffix} duration={s.dur ?? 1800} started={statsVisible} />
                    </div>

                    <p className="text-xs font-medium text-[#97979d]">
                      {s.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
            <div
              className="h-px mt-14"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(212,168,83,0.25), transparent)",
                opacity: statsVisible ? 1 : 0,
                transition: "opacity 0.6s ease 300ms",
              }}
            />
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            FEATURES GRID
        ════════════════════════════════════════════════════════════════════ */}
        <section id="features" className="relative z-10 py-20 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <SectionHeader
                badge="Platform Capabilities"
                title="Everything you need to master your inventory"
                subtitle="Eliminate spreadsheets and guesswork with high-precision forecasting and automated intelligence."
              />
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <Reveal key={f.title} delay={i * 70}>
                  <div
                    className="p-6 rounded-2xl flex flex-col justify-between h-full transition-all duration-300 hover:border-[#d4a853]/40 hover:-translate-y-1 group"
                    style={{
                      background: "rgba(14,14,18,0.65)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      backdropFilter: "blur(16px)",
                    }}
                  >
                    <div>
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-[#d4a853] mb-5 transition-transform group-hover:scale-110"
                        style={{
                          background: "rgba(212,168,83,0.1)",
                          border: "1px solid rgba(212,168,83,0.25)",
                        }}
                      >
                        {f.icon}
                      </div>

                      <h3 className="text-base font-bold text-[#f4f4f5] tracking-tight mb-2 group-hover:text-[#f7dc99] transition-colors">
                        {f.title}
                      </h3>
                      <p className="text-xs text-[#97979d] leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            INTERACTIVE DASHBOARD PREVIEW — Expanded Height Cockpit
        ════════════════════════════════════════════════════════════════════ */}
        <section id="dashboard" className="relative z-10 py-24 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <SectionHeader
                badge="Cockpit Preview"
                title="Real-time visibility and automated decision control"
                subtitle="A unified command center tracking machine-learning demand curves, active restock queues, and catalog health."
              />
            </Reveal>

            <Reveal delay={80}>
              <div
                className="rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)] border border-white/10"
                style={{
                  background: "rgba(12,12,16,0.92)",
                  backdropFilter: "blur(24px)",
                }}
              >
                {/* Window Header */}
                <div
                  className="flex flex-wrap items-center justify-between px-6 py-4 gap-4"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(18,18,24,0.6)" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#d45a4a]/80 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-[#d4a853]/80 inline-block" />
                      <span className="w-3 h-3 rounded-full bg-[#4aba7a]/80 inline-block" />
                    </div>
                    <div className="h-4 w-px bg-white/10 mx-1" />
                    <span className="text-xs font-semibold text-[#f4f4f5] tracking-wide">
                      StockPilot Cockpit
                    </span>
                    <span className="text-xs text-[#71717a] hidden sm:inline">
                      / North America Central Hub
                    </span>
                  </div>

                  {/* Right side status & time controls */}
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[rgba(74,186,122,0.1)] border border-[rgba(74,186,122,0.25)] text-[11px] text-[#4aba7a]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4aba7a] animate-pulse" />
                      <span>Live Sync Active</span>
                    </div>

                    {/* Interactive Tabs */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-[rgba(24,24,32,0.8)] border border-white/5">
                      {[
                        { id: 0, label: "Demand Forecast" },
                        { id: 1, label: "Restock Queue" },
                        { id: 2, label: "Dead Stock Sentinel" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setConsoleTab(tab.id)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            consoleTab === tab.id
                              ? "bg-[#d4a853]/20 text-[#f5cf7b] border border-[#d4a853]/30 shadow-sm"
                              : "text-[#71717a] hover:text-[#e8e6e3]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4-Column Top KPI Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
                  {/* KPI 1 */}
                  <div className="p-5 bg-[#0e0e14] flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                        30-Day Revenue Forecast
                      </div>
                      <div className="text-2xl font-bold text-[#f4f4f5] mt-1 tabular-nums">
                        $284,920
                      </div>
                      <div className="mt-1 text-xs text-[#4aba7a] flex items-center gap-1 font-medium">
                        <span>↑ 14.8%</span>
                        <span className="text-[#71717a]">vs. previous cycle</span>
                      </div>
                    </div>
                    <svg className="mt-3 w-full h-9" viewBox="0 0 160 36">
                      <defs>
                        <linearGradient id="kpi-grad-1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d4a853" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#d4a853" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <polygon fill="url(#kpi-grad-1)" points="0,32 20,26 40,28 60,18 80,22 100,12 120,16 140,8 160,4 160,36 0,36" />
                      <polyline fill="none" stroke="#d4a853" strokeWidth="2" strokeLinecap="round" points="0,32 20,26 40,28 60,18 80,22 100,12 120,16 140,8 160,4" />
                    </svg>
                  </div>

                  {/* KPI 2 */}
                  <div className="p-5 bg-[#0e0e14] flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                        Urgent Restock Triggers
                      </div>
                      <div className="text-2xl font-bold text-[#f5cf7b] mt-1 tabular-nums">
                        3 SKUs At Risk
                      </div>
                      <div className="mt-1 text-xs text-[#d45a4a] flex items-center gap-1 font-medium">
                        <span>● Critical: &lt;48h buffer</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-end gap-1.5 h-9">
                      {[35, 20, 58, 28, 70, 24, 46, 32, 54, 85].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm transition-all"
                          style={{
                            height: `${h * 0.4}px`,
                            background: i === 4 || i === 9 ? "#d45a4a" : i % 2 === 0 ? "rgba(212,168,83,0.6)" : "rgba(255,255,255,0.1)",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* KPI 3 */}
                  <div className="p-5 bg-[#0e0e14] flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                        Turnover Velocity
                      </div>
                      <div className="text-2xl font-bold text-[#f4f4f5] mt-1 tabular-nums">
                        6.8x / year
                      </div>
                      <div className="mt-1 text-xs text-[#4aba7a] font-medium">
                        +38% vs. industry standard
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] text-[#71717a] mb-1">
                        <span>Efficiency Target</span>
                        <span className="text-[#f5cf7b]">85%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#1b1b24] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#d4a853] to-[#f5cf7b]"
                          style={{ width: "85%" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* KPI 4 */}
                  <div className="p-5 bg-[#0e0e14] flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] text-[#71717a] uppercase tracking-wider font-semibold">
                        Trapped Capital Recovered
                      </div>
                      <div className="text-2xl font-bold text-[#4aba7a] mt-1 tabular-nums">
                        $64,300
                      </div>
                      <div className="mt-1 text-xs text-[#71717a]">
                        18 dead stock items resolved
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex-1 bg-[#1b1b24] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#4aba7a] h-full rounded-full" style={{ width: "72%" }} />
                      </div>
                      <span className="text-[10px] font-semibold text-[#4aba7a] tabular-nums">72%</span>
                    </div>
                  </div>
                </div>

                {/* ── Main Centerpiece: Tall Dynamic Forecasting Chart ── */}
                <div className="p-6 md:p-8 bg-[#0b0b0f] border-b border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-[#f4f4f5]">
                          AI Predictive Velocity & Restock Thresholds
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#d4a853]/15 text-[#f5cf7b] border border-[#d4a853]/30">
                          95% Confidence Interval
                        </span>
                      </div>
                      <p className="text-xs text-[#71717a] mt-0.5">
                        Historical sales demand merged with automated supplier lead-time triggers.
                      </p>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-[#d4a853] inline-block" />
                        <span className="text-[#97979d]">Actual Demand</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-[#38bdf8] border-b border-dashed border-[#38bdf8] inline-block" />
                        <span className="text-[#97979d]">ML Forecast</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-0.5 bg-[#f87171] inline-block" />
                        <span className="text-[#97979d]">Safety Threshold</span>
                      </div>
                    </div>
                  </div>

                  {/* Tall High-Resolution Graph */}
                  <div className="relative w-full h-64 md:h-72 rounded-xl bg-[rgba(15,15,20,0.7)] p-4 border border-white/5 overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 900 240" preserveAspectRatio="none">
                      <defs>
                        {/* Forecast confidence band gradient */}
                        <linearGradient id="forecastArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="actualArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d4a853" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#d4a853" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Gridlines */}
                      <line x1="0" y1="40" x2="900" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                      <line x1="0" y1="90" x2="900" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                      <line x1="0" y1="140" x2="900" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                      <line x1="0" y1="190" x2="900" y2="190" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

                      {/* Critical Safety Stock Threshold line */}
                      <line x1="0" y1="165" x2="900" y2="165" stroke="#f87171" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.65" />
                      <text x="12" y="160" fill="#f87171" fontSize="10" fontWeight="600" opacity="0.8">
                        CRITICAL SAFETY BUFFER: 350 UNITS
                      </text>

                      {/* Actual historical area fill */}
                      <polygon
                        fill="url(#actualArea)"
                        points="0,150 70,140 140,145 210,120 280,130 350,85 420,50 490,95 560,110 560,220 0,220"
                      />

                      {/* Forecast confidence envelope */}
                      <polygon
                        fill="url(#forecastArea)"
                        points="560,110 630,70 700,55 770,75 840,40 900,30 900,120 840,115 770,145 700,135 630,130 560,110"
                      />

                      {/* Actual historical line */}
                      <path
                        d="M0,150 L70,140 L140,145 L210,120 L280,130 L350,85 L420,50 L490,95 L560,110"
                        fill="none"
                        stroke="#d4a853"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Forecast projected trajectory */}
                      <path
                        d="M560,110 L630,95 L700,90 L770,105 L840,75 L900,60"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Peak Anomaly Pulse Circle */}
                      <circle cx="420" cy="50" r="5" fill="#f5cf7b" stroke="#0e0e14" strokeWidth="2" />
                      <circle cx="420" cy="50" r="10" fill="none" stroke="#d4a853" strokeWidth="1.5" opacity="0.6" className="animate-ping" />

                      {/* Restock PO Trigger Circle */}
                      <circle cx="560" cy="110" r="5" fill="#38bdf8" stroke="#0e0e14" strokeWidth="2" />
                    </svg>

                    {/* Interactive Marker Callouts */}
                    <div
                      className="absolute hidden md:block px-3 py-1.5 rounded-lg bg-[#1a1712] border border-[#d4a853]/40 shadow-xl pointer-events-none"
                      style={{ top: "18%", left: "41%" }}
                    >
                      <div className="text-[10px] font-bold text-[#f5cf7b]">Flash Sale Spike</div>
                      <div className="text-[9px] text-[#97979d]">+142% Velocity · 1,420 units/day</div>
                    </div>

                    <div
                      className="absolute hidden md:block px-3 py-1.5 rounded-lg bg-[#0e1622] border border-[#38bdf8]/40 shadow-xl pointer-events-none"
                      style={{ top: "42%", left: "58%" }}
                    >
                      <div className="text-[10px] font-bold text-[#38bdf8]">Automated PO #4912 Triggered</div>
                      <div className="text-[9px] text-[#97979d]">Lead Time: 4 days · +2,400 units arriving</div>
                    </div>

                    {/* Timeline Axis */}
                    <div className="absolute bottom-2 left-4 right-4 flex justify-between text-[10px] text-[#71717a] font-mono">
                      <span>Aug 15</span>
                      <span>Aug 22</span>
                      <span>Aug 29</span>
                      <span>Sep 05</span>
                      <span className="text-[#d4a853]">Today (Sep 16)</span>
                      <span className="text-[#38bdf8]">Sep 23 (Projected)</span>
                      <span className="text-[#38bdf8]">Sep 30</span>
                    </div>
                  </div>
                </div>

                {/* ── Lower Cockpit: Dual Column Execution & Catalog Matrix ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-white/5">
                  {/* Left Column: Automated Restock Action Queue */}
                  <div className="lg:col-span-5 p-6 bg-[#0e0e14]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#d4a853]" />
                        <h5 className="text-xs font-bold text-[#f4f4f5] uppercase tracking-wider">
                          Restock Action Queue
                        </h5>
                      </div>
                      <span className="text-[11px] text-[#d4a853] font-medium">3 Pending Actions</span>
                    </div>

                    <div className="space-y-3">
                      {/* Action Item 1 */}
                      <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-white/5 hover:border-[#d4a853]/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-[#f4f4f5]">Sony WH-1000XM5 (Black)</span>
                            <div className="text-[11px] text-[#d45a4a] font-medium mt-0.5">
                              ● Stock: 14 units left (1.8 days buffer)
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#d45a4a]/20 text-[#f87171] border border-[#d45a4a]/30">
                            Urgent PO
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
                          <span className="text-[#71717a]">Lead time: 5 days</span>
                          <button className="px-2.5 py-1 rounded bg-[#d4a853]/20 hover:bg-[#d4a853]/30 text-[#f5cf7b] border border-[#d4a853]/40 font-medium text-[10px] transition-colors">
                            Dispatch PO (+250 Units)
                          </button>
                        </div>
                      </div>

                      {/* Action Item 2 */}
                      <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-white/5 hover:border-[#38bdf8]/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-[#f4f4f5]">Keychron Q1 Wireless Keyboard</span>
                            <div className="text-[11px] text-[#38bdf8] font-medium mt-0.5">
                              ● Supplier Bottleneck (+3.2 days transit)
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">
                            In Transit
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
                          <span className="text-[#71717a]">Carrier: Apex Freight</span>
                          <span className="text-[10px] text-[#e8e6e3] font-medium">ETA: Tomorrow 11:30</span>
                        </div>
                      </div>

                      {/* Action Item 3 */}
                      <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-white/5 hover:border-[#4aba7a]/30 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-[#f4f4f5]">Nomad Leather Desk Pad</span>
                            <div className="text-[11px] text-[#d4a853] font-medium mt-0.5">
                              ● Stagnant Velocity (45 days no sale)
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#d4a853]/20 text-[#f5cf7b] border border-[#d4a853]/30">
                            Dead Stock
                          </span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-white/5">
                          <span className="text-[#71717a]">Holding cost: $210/mo</span>
                          <button className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-[#e8e6e3] font-medium text-[10px] transition-colors">
                            Apply Markdown -15%
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Live SKU Health Table */}
                  <div className="lg:col-span-7 p-6 bg-[#0e0e14]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#4aba7a]" />
                        <h5 className="text-xs font-bold text-[#f4f4f5] uppercase tracking-wider">
                          Monitored Catalog Health Matrix
                        </h5>
                      </div>
                      <span className="text-[11px] text-[#71717a]">48 Active SKUs tracked</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-[10px] uppercase font-semibold text-[#71717a]">
                            <th className="pb-2.5 font-medium">SKU / Product</th>
                            <th className="pb-2.5 font-medium">Category</th>
                            <th className="pb-2.5 font-medium">Stock Level</th>
                            <th className="pb-2.5 font-medium">Run-Out Est.</th>
                            <th className="pb-2.5 font-medium text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                          <tr>
                            <td className="py-3">
                              <div className="font-semibold text-[#f4f4f5]">Sony WH-1000XM5</div>
                              <div className="text-[10px] text-[#71717a]">SKU-9821</div>
                            </td>
                            <td className="py-3 text-[#97979d]">Audio & Peripherals</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#f87171] font-bold">14</span>
                                <div className="w-14 bg-[#1b1b24] h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[#f87171] h-full rounded-full" style={{ width: "12%" }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-[#f87171] font-medium">1.8 Days</td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#d45a4a]/20 text-[#f87171] border border-[#d45a4a]/30">
                                Stockout Risk
                              </span>
                            </td>
                          </tr>

                          <tr>
                            <td className="py-3">
                              <div className="font-semibold text-[#f4f4f5]">Ergonomic Task Chair V2</div>
                              <div className="text-[10px] text-[#71717a]">SKU-4412</div>
                            </td>
                            <td className="py-3 text-[#97979d]">Furniture</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#4aba7a] font-bold">184</span>
                                <div className="w-14 bg-[#1b1b24] h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[#4aba7a] h-full rounded-full" style={{ width: "82%" }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-[#97979d]">44 Days</td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4aba7a]/20 text-[#4aba7a] border border-[#4aba7a]/30">
                                Optimal
                              </span>
                            </td>
                          </tr>

                          <tr>
                            <td className="py-3">
                              <div className="font-semibold text-[#f4f4f5]">Keychron Q1 Mechanical</div>
                              <div className="text-[10px] text-[#71717a]">SKU-3304</div>
                            </td>
                            <td className="py-3 text-[#97979d]">Hardware</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#38bdf8] font-bold">42</span>
                                <div className="w-14 bg-[#1b1b24] h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[#38bdf8] h-full rounded-full" style={{ width: "38%" }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-[#97979d]">8 Days</td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#38bdf8]/20 text-[#38bdf8] border border-[#38bdf8]/30">
                                PO In Transit
                              </span>
                            </td>
                          </tr>

                          <tr>
                            <td className="py-3">
                              <div className="font-semibold text-[#f4f4f5]">USB-C 100W Braided Cable</div>
                              <div className="text-[10px] text-[#71717a]">SKU-7193</div>
                            </td>
                            <td className="py-3 text-[#97979d]">Accessories</td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#f5cf7b] font-bold">1,420</span>
                                <div className="w-14 bg-[#1b1b24] h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-[#d4a853] h-full rounded-full" style={{ width: "95%" }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-[#97979d]">140+ Days</td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#d4a853]/20 text-[#f5cf7b] border border-[#d4a853]/30">
                                Surplus Risk
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            HOW IT WORKS
        ════════════════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="relative z-10 py-20 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <SectionHeader
                badge="Workflow"
                title="Three simple steps to perfect stock"
                subtitle="Go from inventory guesswork to automated, high-precision replenishment."
              />
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {[
                {
                  step: "01",
                  title: "Connect your inventory",
                  desc: "Import your product catalog and sales history via one-click CSV upload, Shopify, or our REST API.",
                },
                {
                  step: "02",
                  title: "AI predicts demand curves",
                  desc: "Machine learning models train on your sales patterns, calculating seasonal velocity and supplier lead-time buffers.",
                },
                {
                  step: "03",
                  title: "Act with confidence",
                  desc: "Receive automated restock recommendations, anomaly notifications, and clear dead-stock alerts directly on your dashboard.",
                },
              ].map((pipe, i) => (
                <Reveal key={pipe.step} delay={i * 100}>
                  <div
                    className="p-7 rounded-2xl flex flex-col justify-between h-full border border-white/5 hover:border-[#d4a853]/30 transition-all"
                    style={{ background: "rgba(14,14,18,0.65)", backdropFilter: "blur(14px)" }}
                  >
                    <div>
                      <span
                        className="text-4xl font-extrabold"
                        style={{
                          background: "linear-gradient(135deg, #d4a853, #f5cf7b)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        {pipe.step}
                      </span>
                      <h3 className="text-lg font-bold text-[#f4f4f5] mt-4 mb-2">{pipe.title}</h3>
                      <p className="text-xs text-[#97979d] leading-relaxed">{pipe.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════
            PRICING SECTION
        ════════════════════════════════════════════════════════════════════ */}
        <section id="pricing" className="relative z-10 py-24 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <Reveal>
              <SectionHeader
                badge="Pricing Plans"
                title="Simple, transparent pricing for growing teams"
                subtitle="Start with a 14-day trial. Upgrade, downgrade, or cancel at any time."
              />
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
              {[
                {
                  name: "Starter",
                  desc: "Best for emerging brands and single-store retailers.",
                  price: "$49",
                  period: "/month",
                  popular: false,
                  features: [
                    "Up to 2,500 active SKUs",
                    "Daily ML demand forecasts",
                    "Spike & anomaly alerts",
                    "Dead-stock identification",
                    "CSV & Shopify integration",
                    "Standard email support",
                  ],
                  cta: "Start 14-day trial",
                  link: "/register",
                },
                {
                  name: "Growth",
                  desc: "For scaling multi-channel brands and high-turnover retailers.",
                  price: "$149",
                  period: "/month",
                  popular: true,
                  features: [
                    "Up to 25,000 active SKUs",
                    "Real-time inventory sync",
                    "Multi-warehouse lead-time tracking",
                    "Automated restock simulator",
                    "Supplier reliability scoring",
                    "StockPilot AI copilot access",
                    "Priority 24/7 support",
                  ],
                  cta: "Start Free Trial",
                  link: "/register",
                },
                {
                  name: "Enterprise",
                  desc: "For multi-warehouse operations, 3PLs, and global logistics hubs.",
                  price: "Custom",
                  period: "",
                  popular: false,
                  features: [
                    "Unlimited SKUs & warehouses",
                    "Custom machine learning models",
                    "Dedicated solutions architect",
                    "Custom ERP & EDI integrations",
                    "99.99% Uptime SLA guarantee",
                    "SOC-2 Type II compliance reports",
                    "Dedicated account manager",
                  ],
                  cta: "Contact Enterprise Sales",
                  link: "/register",
                },
              ].map((tier, i) => (
                <Reveal key={tier.name} delay={i * 90}>
                  <div
                    className={`p-8 rounded-2xl flex flex-col justify-between h-full relative transition-all duration-300 ${
                      tier.popular
                        ? "border border-[#d4a853] shadow-[0_0_40px_rgba(212,168,83,0.15)] bg-[#121217]"
                        : "border border-white/5 bg-[#0e0e12] hover:border-white/15"
                    }`}
                  >
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase text-[#0c0c0e] bg-gradient-to-r from-[#d4a853] to-[#f5cf7b]">
                        Most Popular
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-bold text-[#f4f4f5]">{tier.name}</h3>
                      <p className="text-xs text-[#97979d] mt-1 mb-6 leading-relaxed">{tier.desc}</p>

                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-4xl font-extrabold text-[#f4f4f5]">{tier.price}</span>
                        {tier.period && <span className="text-xs text-[#97979d]">{tier.period}</span>}
                      </div>

                      <div className="space-y-3 pt-6 border-t border-white/5">
                        {tier.features.map((feat) => (
                          <div key={feat} className="flex items-center gap-2.5 text-xs text-[#d1d1d6]">
                            <svg className="w-4 h-4 text-[#d4a853] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5">
                      <Link
                        to={tier.link}
                        className={`w-full py-3 rounded-xl text-xs font-semibold text-center block transition-all ${
                          tier.popular
                            ? "bg-gradient-to-r from-[#d4a853] to-[#f5cf7b] text-[#0c0c0e] hover:scale-[1.02] shadow-[0_0_20px_rgba(212,168,83,0.25)]"
                            : "bg-white/5 text-[#e8e6e3] hover:bg-white/10"
                        }`}
                      >
                        {tier.cta}
                      </Link>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>



        {/* ════════════════════════════════════════════════════════════════════
            BOTTOM CTA
        ════════════════════════════════════════════════════════════════════ */}
        <section className="relative z-10 py-28 px-6 md:px-12">
          <div className="max-w-3xl mx-auto text-center relative">
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(212,168,83,0.08) 0%, transparent 70%)",
                filter: "blur(60px)",
              }}
            />
            <Reveal>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#f4f4f5] tracking-tight mb-4">
                Ready to take complete control of your inventory?
              </h2>
            </Reveal>
            <Reveal delay={60}>
              <p className="text-sm text-[#97979d] mb-8 max-w-lg mx-auto leading-relaxed">
                Connect your store in under two minutes. Experience proactive demand forecasting with zero commitment.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <Link
                to="/register"
                id="bottom-cta-btn"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-[#0c0c0e] transition-all hover:scale-[1.04] active:scale-100 shadow-[0_0_35px_rgba(212,168,83,0.3)]"
                style={{ background: "linear-gradient(135deg, #d4a853, #f5cf7b)" }}
              >
                <span>Get Started for Free</span>
                <span>→</span>
              </Link>
            </Reveal>
            <Reveal delay={160}>
              <div className="mt-5">
                <Link
                  to="/login"
                  id="bottom-login-link"
                  className="text-xs text-[#71717a] hover:text-[#d4a853] transition-colors"
                >
                  Already have an account? Sign in here
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

      {/* Close the particle background wrapper */}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          LARGE RICH FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 bg-[#08080a] border-t border-white/5 pt-16 pb-12 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          {/* Main 5-Column Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-white/5">
            {/* Column 1: Brand & Bio */}
            <div className="col-span-2">
              <Link to="/" className="select-none inline-block">
                <StockPilotLogo size="md" />
              </Link>
              <p className="mt-4 text-xs text-[#97979d] leading-relaxed max-w-sm">
                StockPilot is the intelligent inventory management platform. We help retailers, warehouses, and brands predict demand, eliminate stockouts, and unlock trapped working capital with machine learning.
              </p>
              
              {/* System Status Pill */}
              <div className="mt-5 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(74,186,122,0.08)] border border-[rgba(74,186,122,0.25)] text-[11px] text-[#4aba7a]">
                <span className="w-2 h-2 rounded-full bg-[#4aba7a] animate-pulse" />
                <span>All Systems Operational</span>
              </div>
            </div>

            {/* Column 2: Product */}
            <div>
              <h4 className="text-xs font-semibold text-[#f4f4f5] uppercase tracking-wider mb-4">
                Product
              </h4>
              <ul className="space-y-2.5 text-xs text-[#97979d]">
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Demand Forecasting</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Anomaly Alerts</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Dead Stock Analyzer</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Restock Simulator</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Supplier Tracking</a></li>
                <li><a href="#dashboard" className="hover:text-[#d4a853] transition-colors">Live Dashboard</a></li>
                <li><a href="#pricing" className="hover:text-[#d4a853] transition-colors">Pricing & Plans</a></li>
              </ul>
            </div>

            {/* Column 3: Solutions */}
            <div>
              <h4 className="text-xs font-semibold text-[#f4f4f5] uppercase tracking-wider mb-4">
                Solutions
              </h4>
              <ul className="space-y-2.5 text-xs text-[#97979d]">
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">E-Commerce Brands</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Retail & Multi-Store</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Wholesale & B2B</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">3PL & Fulfillment</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Fast Fashion & Apparel</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Electronics & Hardware</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Enterprise Supply Chain</a></li>
              </ul>
            </div>

            {/* Column 4: Resources & Company */}
            <div>
              <h4 className="text-xs font-semibold text-[#f4f4f5] uppercase tracking-wider mb-4">
                Resources & Company
              </h4>
              <ul className="space-y-2.5 text-xs text-[#97979d]">
                <li><a href="#how-it-works" className="hover:text-[#d4a853] transition-colors">How It Works</a></li>
                <li><a href="#dashboard" className="hover:text-[#d4a853] transition-colors">Live Simulation</a></li>
                <li><Link to="/login" className="hover:text-[#d4a853] transition-colors">Operator Sign In</Link></li>
                <li><Link to="/register" className="hover:text-[#d4a853] transition-colors">Create Account</Link></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Documentation</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">API Reference</a></li>
                <li><a href="#features" className="hover:text-[#d4a853] transition-colors">Security & Privacy</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#5c5c64] gap-4">
            <p>© 2024 StockPilot Technologies, Inc. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-[#97979d] cursor-pointer transition-colors">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-[#97979d] cursor-pointer transition-colors">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-[#97979d] cursor-pointer transition-colors">Security</span>
              <span>•</span>
              <span className="hover:text-[#97979d] cursor-pointer transition-colors">Cookie Preferences</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
