import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type Points } from "three";

interface ParticleFieldProps {
  reducedMotion: boolean;
}

export function ParticleField({ reducedMotion }: ParticleFieldProps) {
  const pointsRef = useRef<Points>(null);
  const positions = useMemo(() => {
    const data = new Float32Array(420 * 3);
    for (let index = 0; index < 420; index += 1) {
      const stride = index * 3;
      const column = index % 21;
      const row = Math.floor(index / 21);
      data[stride] = ((column / 20) * 2 - 1) * 6.7 + Math.sin(row * 0.8) * 0.22;
      data[stride + 1] = ((row / 19) * 2 - 1) * 3.4;
      data[stride + 2] = -2.6 - (index % 9) * 0.36;
    }
    return data;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current || reducedMotion) {
      return;
    }
    pointsRef.current.rotation.y += delta * 0.008;
    pointsRef.current.position.y = Math.sin(Date.now() * 0.00018) * 0.04;
  });

  return (
    <points ref={pointsRef} position={[0, 0, -1]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#7197a6"
        size={0.014}
        sizeAttenuation
        transparent
        opacity={0.34}
      />
    </points>
  );
}
