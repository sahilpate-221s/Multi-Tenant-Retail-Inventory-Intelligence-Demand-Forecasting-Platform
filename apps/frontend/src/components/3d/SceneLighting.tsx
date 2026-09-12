/**
 * Cinematic lighting rig for the inventory scene.
 * Warm key light + neutral rim + amber under-light + volumetric spot.
 * No purple, no blue, no neon.
 */
function SceneLighting() {
  return (
    <>
      {/* Key light — warm high-intensity directional from upper right */}
      <directionalLight
        position={[5, 8, 4]}
        intensity={2.4}
        color="#fff3dd"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={30}
        shadow-camera-near={0.1}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.001}
      />

      {/* Rim light — crisp neutral edge light from behind-left */}
      <directionalLight
        position={[-5, 4, -4]}
        intensity={0.9}
        color="#d0d4de"
      />

      {/* Warm amber under-light — defines lower silhouette */}
      <directionalLight
        position={[1, -3, 3]}
        intensity={0.6}
        color="#d4a853"
      />

      {/* Volumetric amber spot light — dramatic warehouse lighting effect */}
      <spotLight
        position={[0, 5, 2]}
        angle={0.5}
        penumbra={0.8}
        intensity={2.5}
        color="#d4a853"
        distance={15}
        decay={2}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />

      {/* Central warm point light illuminating object cluster */}
      <pointLight
        position={[0, 1.5, 2]}
        intensity={2.0}
        distance={10}
        decay={2}
        color="#f3cb75"
      />

      {/* Secondary fill point light — behind rack */}
      <pointLight
        position={[-2, 0.5, -1]}
        intensity={0.8}
        distance={8}
        decay={2}
        color="#e8d8b0"
      />

      {/* Balanced ambient light — ensures surface textures are visible */}
      <ambientLight intensity={0.3} color="#d8d7d4" />
    </>
  );
}

export default SceneLighting;
