import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface ReedGlassPaneProps {
  mouseX: number;
  mouseY: number;
  scrollProgress: number;
}

/**
 * Reeded glass distortion panel.
 * Uses MeshPhysicalMaterial with transmission for real refraction.
 * A vertical reed pattern is simulated via a procedural normal map.
 */
function ReedGlassPane({ mouseX, mouseY, scrollProgress }: ReedGlassPaneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const currentRot = useRef({ x: 0, y: 0 });

  // Generate a procedural reed normal map (vertical stripe pattern)
  const normalMap = useMemo(() => {
    const width = 256;
    const height = 256;
    const data = new Uint8Array(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        // Vertical reed pattern — sine wave creates cylindrical lens effect
        const reedFreq = 28;
        const phase = Math.sin((x / width) * Math.PI * reedFreq);
        const nx = phase * 0.5 + 0.5; // Normal X component (0-1, centered at 0.5)
        const ny = 0.5; // Flat Y
        const nz = Math.sqrt(1 - phase * phase * 0.25) * 0.5 + 0.5;

        data[i] = Math.floor(nx * 255);
        data[i + 1] = Math.floor(ny * 255);
        data[i + 2] = Math.floor(nz * 255);
        data[i + 3] = 255;
      }
    }

    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;

    // Subtle cursor-reactive rotation
    const targetRotY = mouseX * 0.08;
    const targetRotX = mouseY * 0.04;

    currentRot.current.x += (targetRotX - currentRot.current.x) * 0.03;
    currentRot.current.y += (targetRotY - currentRot.current.y) * 0.03;

    meshRef.current.rotation.x = currentRot.current.x;
    meshRef.current.rotation.y = currentRot.current.y + scrollProgress * 0.15;

    // Slight forward movement on scroll
    meshRef.current.position.z = 1.5 - scrollProgress * 0.5;
  });

  return (
    <mesh ref={meshRef} position={[0.5, 0.3, 1.5]}>
      <boxGeometry args={[2.5, 2.0, 0.04]} />
      <meshPhysicalMaterial
        color="#32323e"
        roughness={0.06}
        metalness={0.08}
        transmission={0.92}
        thickness={1.1}
        ior={1.54}
        transparent
        opacity={0.92}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.85, 0.15)}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export default ReedGlassPane;
