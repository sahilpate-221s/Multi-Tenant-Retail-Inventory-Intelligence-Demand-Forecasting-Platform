import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════════
   WAREHOUSE SHELF RACK — Metallic shelving unit with items
   ═══════════════════════════════════════════════════════════════ */
function WarehouseRack({
  position,
  mouseX,
  mouseY,
  scrollProgress,
}: {
  position: [number, number, number];
  mouseX: number;
  mouseY: number;
  scrollProgress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const basePos = useMemo(() => new THREE.Vector3(...position), [position]);
  const currentPos = useRef(new THREE.Vector3(...position));
  const currentRot = useRef(0);

  useFrame(() => {
    if (!groupRef.current) return;
    const mx = mouseX * 2.5;
    const my = mouseY * 1.5;
    const dx = basePos.x - mx;
    const dy = basePos.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const repulsion = Math.max(0, 1 - dist / 5) * 0.25;

    const targetX = basePos.x + dx * repulsion * 0.4;
    const targetY = basePos.y - scrollProgress * 0.8;
    const targetZ = basePos.z + repulsion * 0.1;

    currentPos.current.x += (targetX - currentPos.current.x) * 0.025;
    currentPos.current.y += (targetY - currentPos.current.y) * 0.025;
    currentPos.current.z += (targetZ - currentPos.current.z) * 0.025;
    groupRef.current.position.copy(currentPos.current);

    currentRot.current += (mouseX * 0.15 - currentRot.current) * 0.02;
    groupRef.current.rotation.y = currentRot.current;
  });

  const uprightMat = useMemo(
    () => ({ color: "#3a3a44", roughness: 0.35, metalness: 0.85 }),
    []
  );
  const shelfMat = useMemo(
    () => ({ color: "#2a2a32", roughness: 0.4, metalness: 0.75 }),
    []
  );
  const boxColors = useMemo(
    () => ["#5a4a30", "#4a3e28", "#6b5838", "#3d3425"],
    []
  );

  return (
    <group ref={groupRef} position={position}>
      {/* 4 vertical uprights */}
      {[
        [-0.6, 0, -0.3],
        [0.6, 0, -0.3],
        [-0.6, 0, 0.3],
        [0.6, 0, 0.3],
      ].map((pos, i) => (
        <mesh key={`upright-${i}`} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.04, 2.4, 0.04]} />
          <meshStandardMaterial {...uprightMat} />
        </mesh>
      ))}

      {/* 4 horizontal shelves */}
      {[-0.8, -0.2, 0.4, 1.0].map((y, i) => (
        <mesh key={`shelf-${i}`} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.24, 0.03, 0.64]} />
          <meshStandardMaterial {...shelfMat} />
        </mesh>
      ))}

      {/* Items on shelves — small boxes */}
      {[
        { pos: [-0.3, -0.55, 0], size: [0.28, 0.22, 0.24] as [number, number, number], ci: 0 },
        { pos: [0.15, -0.55, 0.05], size: [0.22, 0.18, 0.2] as [number, number, number], ci: 1 },
        { pos: [0.4, -0.55, -0.08], size: [0.18, 0.24, 0.22] as [number, number, number], ci: 2 },
        { pos: [-0.2, 0.06, 0], size: [0.34, 0.2, 0.26] as [number, number, number], ci: 3 },
        { pos: [0.25, 0.06, 0.05], size: [0.2, 0.16, 0.2] as [number, number, number], ci: 0 },
        { pos: [-0.1, 0.66, 0], size: [0.26, 0.22, 0.22] as [number, number, number], ci: 1 },
        { pos: [0.3, 0.66, -0.05], size: [0.3, 0.18, 0.24] as [number, number, number], ci: 2 },
      ].map((item, i) => (
        <mesh
          key={`item-${i}`}
          position={item.pos as [number, number, number]}
          castShadow
        >
          <boxGeometry args={item.size} />
          <meshStandardMaterial
            color={boxColors[item.ci]}
            roughness={0.72}
            metalness={0.08}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CRATE STACK — Stacked shipping crates in pyramid formation
   ═══════════════════════════════════════════════════════════════ */
function CrateStack({
  position,
  mouseX,
  mouseY,
  scrollProgress,
}: {
  position: [number, number, number];
  mouseX: number;
  mouseY: number;
  scrollProgress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const basePos = useMemo(() => new THREE.Vector3(...position), [position]);
  const currentPos = useRef(new THREE.Vector3(...position));

  useFrame(() => {
    if (!groupRef.current) return;
    const mx = mouseX * 2.5;
    const my = mouseY * 1.5;
    const dx = basePos.x - mx;
    const dy = basePos.y - my;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const repulsion = Math.max(0, 1 - dist / 5) * 0.3;

    const targetX = basePos.x + dx * repulsion * 0.3;
    const targetY = basePos.y - scrollProgress * 1.0;

    currentPos.current.x += (targetX - currentPos.current.x) * 0.03;
    currentPos.current.y += (targetY - currentPos.current.y) * 0.03;
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y += 0.0006;
  });

  const crateMat = useMemo(
    () => ({ roughness: 0.65, metalness: 0.12 }),
    []
  );

  return (
    <group ref={groupRef} position={position}>
      {/* Bottom row — 2 crates */}
      <mesh position={[-0.28, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.4, 0.45]} />
        <meshStandardMaterial color="#544a38" {...crateMat} />
      </mesh>
      <mesh position={[0.28, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.4, 0.45]} />
        <meshStandardMaterial color="#5e5240" {...crateMat} />
      </mesh>
      {/* Top row — 1 crate offset */}
      <mesh position={[0, 0.42, 0.02]} castShadow>
        <boxGeometry args={[0.48, 0.38, 0.43]} />
        <meshStandardMaterial color="#4a4030" {...crateMat} />
      </mesh>
      {/* Shipping label strips on front crate */}
      <mesh position={[-0.28, 0.05, 0.226]} castShadow={false}>
        <planeGeometry args={[0.3, 0.08]} />
        <meshBasicMaterial color="#d4a853" opacity={0.6} transparent />
      </mesh>
      <mesh position={[0.28, -0.05, 0.226]} castShadow={false}>
        <planeGeometry args={[0.25, 0.04]} />
        <meshBasicMaterial color="#97979d" opacity={0.4} transparent />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SCANNER BEAM — Sweeping amber laser line (radar sweep)
   ═══════════════════════════════════════════════════════════════ */
function ScannerBeam({
  position,
  mouseX,
  scrollProgress,
}: {
  position: [number, number, number];
  mouseX: number;
  scrollProgress: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseY = position[1];

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.y = t * 0.5 + mouseX * 0.3;
    meshRef.current.position.y = baseY + Math.sin(t * 0.8) * 0.15 - scrollProgress * 0.4;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.25 + Math.sin(t * 2.5) * 0.12;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[6, 0.015]} />
      <meshBasicMaterial
        color="#d4a853"
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════════════════════
   HOLO RING — Floating holographic data ring with orbiting nodes
   ═══════════════════════════════════════════════════════════════ */
function HoloRing({
  position,
  mouseX,
  mouseY,
  scrollProgress,
}: {
  position: [number, number, number];
  mouseX: number;
  mouseY: number;
  scrollProgress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const basePos = useMemo(() => new THREE.Vector3(...position), [position]);
  const currentPos = useRef(new THREE.Vector3(...position));
  const nodeCount = 8;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    const targetY = basePos.y + Math.sin(t * 0.6) * 0.12 - scrollProgress * 0.6;
    currentPos.current.x += (basePos.x + mouseX * 0.3 - currentPos.current.x) * 0.02;
    currentPos.current.y += (targetY - currentPos.current.y) * 0.025;
    currentPos.current.z += (basePos.z - currentPos.current.z) * 0.02;
    groupRef.current.position.copy(currentPos.current);

    groupRef.current.rotation.y = t * 0.3;
    groupRef.current.rotation.x = mouseY * 0.15;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Main torus ring */}
      <mesh>
        <torusGeometry args={[0.7, 0.012, 16, 64]} />
        <meshStandardMaterial
          color="#d4a853"
          emissive="#d4a853"
          emissiveIntensity={0.6}
          roughness={0.3}
          metalness={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Second thinner ring — offset */}
      <mesh rotation={[0.3, 0, 0.5]}>
        <torusGeometry args={[0.85, 0.006, 12, 48]} />
        <meshStandardMaterial
          color="#97979d"
          emissive="#97979d"
          emissiveIntensity={0.3}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Orbiting data nodes */}
      {Array.from({ length: nodeCount }).map((_, i) => {
        const angle = (i / nodeCount) * Math.PI * 2;
        const r = 0.7;
        return (
          <mesh
            key={`node-${i}`}
            position={[
              Math.cos(angle) * r,
              Math.sin(angle) * 0.05,
              Math.sin(angle) * r,
            ]}
          >
            <sphereGeometry args={[0.03, 12, 12]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? "#4aba7a" : "#d4a853"}
              emissive={i % 3 === 0 ? "#4aba7a" : "#d4a853"}
              emissiveIntensity={1.2}
            />
          </mesh>
        );
      })}

      {/* Central hologram point */}
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color="#d4a853"
          emissive="#d4a853"
          emissiveIntensity={2.0}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CONVEYOR TRACK — Animated belt with sliding packages
   ═══════════════════════════════════════════════════════════════ */
function ConveyorTrack({
  position,
  mouseX,
  scrollProgress,
}: {
  position: [number, number, number];
  mouseX: number;
  scrollProgress: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pkgRefs = useRef<THREE.Mesh[]>([]);
  const basePos = useMemo(() => new THREE.Vector3(...position), [position]);
  const currentPos = useRef(new THREE.Vector3(...position));
  const pkgCount = 4;

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    const targetY = basePos.y - scrollProgress * 0.5;
    currentPos.current.x += (basePos.x - currentPos.current.x) * 0.03;
    currentPos.current.y += (targetY - currentPos.current.y) * 0.03;
    groupRef.current.position.copy(currentPos.current);
    groupRef.current.rotation.y = mouseX * 0.1;

    // Slide packages along the belt
    for (let i = 0; i < pkgRefs.current.length; i++) {
      const pkg = pkgRefs.current[i];
      if (!pkg) continue;
      const offset = (i / pkgCount) * 3.0;
      const progress = ((t * 0.35 + offset) % 3.0) - 1.5;
      pkg.position.x = progress;
      // Slight bob
      pkg.position.y = 0.14 + Math.sin(t * 2 + i) * 0.01;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Belt surface */}
      <mesh receiveShadow>
        <boxGeometry args={[3.2, 0.06, 0.5]} />
        <meshStandardMaterial color="#252530" roughness={0.6} metalness={0.5} />
      </mesh>

      {/* Belt side rails */}
      <mesh position={[0, 0.06, 0.27]}>
        <boxGeometry args={[3.2, 0.06, 0.03]} />
        <meshStandardMaterial color="#3a3a44" roughness={0.3} metalness={0.85} />
      </mesh>
      <mesh position={[0, 0.06, -0.27]}>
        <boxGeometry args={[3.2, 0.06, 0.03]} />
        <meshStandardMaterial color="#3a3a44" roughness={0.3} metalness={0.85} />
      </mesh>

      {/* Belt roller ends */}
      <mesh position={[-1.6, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 16]} />
        <meshStandardMaterial color="#4a4a55" roughness={0.25} metalness={0.9} />
      </mesh>
      <mesh position={[1.6, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.5, 16]} />
        <meshStandardMaterial color="#4a4a55" roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Sliding packages */}
      {Array.from({ length: pkgCount }).map((_, i) => (
        <mesh
          key={`pkg-${i}`}
          ref={(el) => { if (el) pkgRefs.current[i] = el; }}
          position={[0, 0.14, 0]}
          castShadow
        >
          <boxGeometry args={[0.22, 0.16, 0.2]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? "#544a38" : "#4a4030"}
            roughness={0.7}
            metalness={0.08}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN EXPORT — InventoryObjects composition
   ═══════════════════════════════════════════════════════════════ */
interface InventoryObjectsProps {
  mouseX: number;
  mouseY: number;
  scrollProgress: number;
  fastMoverCount: number;
  slowMoverCount: number;
}

/**
 * Renders warehouse-specific 3D objects: shelf rack, crate stacks,
 * scanner beam, holographic data ring, and conveyor track.
 * Objects react to mouse position and scroll progress.
 */
function InventoryObjects({
  mouseX,
  mouseY,
  scrollProgress,
  fastMoverCount: _fastMoverCount,
  slowMoverCount: _slowMoverCount,
}: InventoryObjectsProps) {
  return (
    <group>
      {/* Central warehouse shelf rack */}
      <WarehouseRack
        position={[-1.0, 0, 0]}
        mouseX={mouseX}
        mouseY={mouseY}
        scrollProgress={scrollProgress}
      />

      {/* Crate stack — right side */}
      <CrateStack
        position={[1.6, -0.95, 0.5]}
        mouseX={mouseX}
        mouseY={mouseY}
        scrollProgress={scrollProgress}
      />

      {/* Second smaller crate stack — back left */}
      <CrateStack
        position={[-2.4, -0.95, -0.8]}
        mouseX={mouseX}
        mouseY={mouseY}
        scrollProgress={scrollProgress}
      />

      {/* Scanner beam — sweeping across scene */}
      <ScannerBeam
        position={[0, 0.3, 0]}
        mouseX={mouseX}
        scrollProgress={scrollProgress}
      />

      {/* Holographic data ring — floating above center */}
      <HoloRing
        position={[0.8, 1.6, -0.3]}
        mouseX={mouseX}
        mouseY={mouseY}
        scrollProgress={scrollProgress}
      />

      {/* Conveyor track — front, lower */}
      <ConveyorTrack
        position={[0.3, -1.35, 1.2]}
        mouseX={mouseX}
        scrollProgress={scrollProgress}
      />
    </group>
  );
}

export default InventoryObjects;
