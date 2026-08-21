import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { Shape, type Group, type Mesh } from "three";

import type { AuditPhase } from "../../types/patent";

interface HolographicShieldProps {
  phase: AuditPhase;
  reducedMotion: boolean;
}

const phaseColors: Record<AuditPhase, string> = {
  idle: "#70e8ff",
  preparing: "#a486ff",
  "leader-analysis": "#8a7dff",
  "validator-replay": "#5cf1dc",
  "vote-reveal": "#ffbd5c",
  finalized: "#7df2a5",
  failed: "#ff6d7a",
};

export function HolographicShield({
  phase,
  reducedMotion,
}: HolographicShieldProps) {
  const groupRef = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);
  const color = phaseColors[phase];
  const shieldGeometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0, 1.55);
    shape.lineTo(0.98, 1.08);
    shape.lineTo(0.86, -0.15);
    shape.quadraticCurveTo(0.66, -1.05, 0, -1.54);
    shape.quadraticCurveTo(-0.66, -1.05, -0.86, -0.15);
    shape.lineTo(-0.98, 1.08);
    shape.closePath();
    return shape;
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current || !coreRef.current) {
      return;
    }
    const motionScale = reducedMotion ? 0.08 : 1;
    groupRef.current.rotation.y += delta * 0.12 * motionScale;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.42) * 0.035;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.028 * motionScale;
    coreRef.current.scale.setScalar(pulse);
  });

  return (
    <group ref={groupRef} position={[1.85, 0.18, -1.2]} rotation={[0.1, -0.2, 0]}>
      <mesh>
        <extrudeGeometry
          args={[
            shieldGeometry,
            {
              depth: 0.16,
              bevelEnabled: true,
              bevelSegments: 3,
              bevelSize: 0.05,
              bevelThickness: 0.05,
            },
          ]}
        />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.28}
          metalness={0.74}
          roughness={0.16}
          transparent
          opacity={0.2}
          side={2}
        />
        <Edges color={color} linewidth={1.4} />
      </mesh>
      <mesh ref={coreRef} position={[0, 0.04, 0.16]}>
        <icosahedronGeometry args={[0.58, 2]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.34} />
      </mesh>
      <mesh position={[0, 0.04, 0.13]} scale={[0.54, 0.88, 0.14]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0.04]}>
        <torusGeometry args={[1.26, 0.012, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.62} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, -0.08]} scale={0.78}>
        <torusGeometry args={[1.26, 0.01, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.38} />
      </mesh>
    </group>
  );
}
