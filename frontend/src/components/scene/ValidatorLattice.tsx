import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { type Group, type Mesh } from "three";

import type { AuditPhase } from "../../types/patent";

interface ValidatorLatticeProps {
  phase: AuditPhase;
  reducedMotion: boolean;
}

const validatorPositions: [number, number, number][] = [
  [-2.75, 1.42, -0.9],
  [-3.3, 0.12, -0.25],
  [-2.75, -1.2, -0.8],
  [-1.25, -1.62, -0.6],
  [-0.85, 1.58, -0.95],
];

const shieldAnchor: [number, number, number] = [1.1, 0.18, -1.04];

function phaseColor(phase: AuditPhase, index: number): string {
  if (phase === "failed") {
    return "#ff6d7a";
  }
  if (phase === "finalized") {
    return "#7df2a5";
  }
  if (phase === "vote-reveal") {
    return index % 2 === 0 ? "#ffbd5c" : "#70e8ff";
  }
  if (phase === "validator-replay" || phase === "leader-analysis") {
    return index % 2 === 0 ? "#5cf1dc" : "#8a7dff";
  }
  return "#70e8ff";
}

function ValidatorNode({
  index,
  position,
  phase,
  reducedMotion,
}: {
  index: number;
  position: [number, number, number];
  phase: AuditPhase;
  reducedMotion: boolean;
}) {
  const meshRef = useRef<Mesh>(null);
  const color = phaseColor(phase, index);

  useFrame((state) => {
    if (!meshRef.current) {
      return;
    }
    const motionScale = reducedMotion ? 0.08 : 1;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.1 + index) * 0.12 * motionScale;
    meshRef.current.scale.setScalar(pulse);
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.1, 1]} />
        <meshBasicMaterial color={color} transparent opacity={0.96} />
      </mesh>
      <mesh scale={1.8}>
        <sphereGeometry args={[0.1, 12, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

export function ValidatorLattice({
  phase,
  reducedMotion,
}: ValidatorLatticeProps) {
  const latticeRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (latticeRef.current && !reducedMotion) {
      latticeRef.current.rotation.y -= delta * 0.025;
    }
  });

  return (
    <group ref={latticeRef}>
      {validatorPositions.map((position, index) => (
        <group key={position.join("-")}>
          <ValidatorNode
            index={index}
            position={position}
            phase={phase}
            reducedMotion={reducedMotion}
          />
          <Line
            points={[position, shieldAnchor]}
            color={phaseColor(phase, index)}
            transparent
            opacity={phase === "idle" ? 0.24 : 0.52}
            lineWidth={0.7}
          />
        </group>
      ))}
      <Line
        points={[validatorPositions[0], validatorPositions[1], validatorPositions[2], validatorPositions[3], validatorPositions[4], validatorPositions[0]]}
        color="#587083"
        transparent
        opacity={0.2}
        lineWidth={0.5}
      />
    </group>
  );
}
