import { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import SceneLighting from "./SceneLighting";
import InventoryObjects from "./InventoryObjects";
import { checkPrefersReducedMotion } from "../../lib/motionUtils";

interface CameraControllerProps {
  mouseX: number;
  mouseY: number;
  scrollProgress: number;
}

/** Subtly moves camera based on cursor + scroll */
function CameraController({ mouseX, mouseY, scrollProgress }: CameraControllerProps) {
  const { camera } = useThree();
  const currentPos = useRef({ x: 0, y: 3, z: 7 });

  useFrame(() => {
    const targetX = mouseX * 0.4;
    const targetY = 3 - scrollProgress * 1.5 + mouseY * 0.2;
    const targetZ = 7 - scrollProgress * 1.0;

    currentPos.current.x += (targetX - currentPos.current.x) * 0.02;
    currentPos.current.y += (targetY - currentPos.current.y) * 0.02;
    currentPos.current.z += (targetZ - currentPos.current.z) * 0.02;

    camera.position.set(
      currentPos.current.x,
      currentPos.current.y,
      currentPos.current.z
    );
    camera.lookAt(0, 0, 0);
  });

  return null;
}

interface InventorySceneProps {
  mouseX: number;
  mouseY: number;
  scrollProgress: number;
  fastMoverCount: number;
  slowMoverCount: number;
}

/** Inner scene content — rendered within Canvas */
function SceneContent({
  mouseX,
  mouseY,
  scrollProgress,
  fastMoverCount,
  slowMoverCount,
}: InventorySceneProps) {
  return (
    <>
      <CameraController
        mouseX={mouseX}
        mouseY={mouseY}
        scrollProgress={scrollProgress}
      />
      <SceneLighting />

      {/* Ground plane — dark surface for shadow catching */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color="#0c0c0e"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Warehouse spatial grid */}
      <gridHelper args={[24, 24, "#303038", "#16161a"]} position={[0, -1.49, 0]} />

      <InventoryObjects
        mouseX={mouseX}
        mouseY={mouseY}
        scrollProgress={scrollProgress}
        fastMoverCount={fastMoverCount}
        slowMoverCount={slowMoverCount}
      />
    </>
  );
}

/**
 * Main 3D inventory scene canvas.
 * Lazy-loaded, demand-driven rendering, performance-conscious.
 */
function InventoryScene({
  mouseX,
  mouseY,
  scrollProgress,
  fastMoverCount,
  slowMoverCount,
}: InventorySceneProps) {
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Delay scene initialization slightly for smoother page load
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Check for reduced motion or mobile
  const [shouldRender3D, setShouldRender3D] = useState(() => {
    if (typeof window === "undefined") return false;
    const isMobile = window.innerWidth < 768;
    return !checkPrefersReducedMotion() && !isMobile;
  });

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setShouldRender3D(!checkPrefersReducedMotion() && !isMobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!shouldRender3D) {
    // Fallback: layered dark surfaces with subtle gradient
    return (
      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden"
        style={{ height: "420px" }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 40% 40%, rgba(212,168,83,0.04) 0%, transparent 70%),
              radial-gradient(ellipse 40% 60% at 70% 60%, rgba(58,58,61,0.3) 0%, transparent 70%),
              linear-gradient(180deg, #141416 0%, #0c0c0e 100%)
            `,
          }}
        />
        {/* Abstract inventory shapes as CSS elements */}
        <div className="absolute inset-0 flex items-center justify-center gap-6 opacity-30">
          <div
            className="w-24 h-20 rounded-sm"
            style={{
              background: "#1a1a1d",
              border: "1px solid #262629",
              transform: "rotate(-3deg) translateY(-10px)",
            }}
          />
          <div
            className="w-16 h-14 rounded-sm"
            style={{
              background: "rgba(42,42,45,0.6)",
              border: "1px solid #303035",
              backdropFilter: "blur(8px)",
              transform: "rotate(2deg) translateY(5px)",
            }}
          />
          <div
            className="w-20 h-16 rounded-sm"
            style={{
              background: "#212124",
              border: "1px solid #262629",
              transform: "rotate(-1deg) translateY(-15px)",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-lg overflow-hidden"
      style={{ height: "420px" }}
    >
      {isReady && (
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.4,
          }}
          camera={{ position: [0, 2.7, 6.6], fov: 42, near: 0.1, far: 60 }}
          style={{ background: "transparent" }}
        >
          <color attach="background" args={["#0c0c0e"]} />
          <fog attach="fog" args={["#0c0c0e", 14, 30]} />

          <Suspense fallback={null}>
            <SceneContent
              mouseX={mouseX}
              mouseY={mouseY}
              scrollProgress={scrollProgress}
              fastMoverCount={fastMoverCount}
              slowMoverCount={slowMoverCount}
            />
          </Suspense>
        </Canvas>
      )}

      {/* Gradient overlays for scene blending */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 opacity-75"
        style={{
          background: "linear-gradient(to top, #0c0c0e 0%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-10 opacity-60"
        style={{
          background: "linear-gradient(to bottom, #0c0c0e 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

export default InventoryScene;
