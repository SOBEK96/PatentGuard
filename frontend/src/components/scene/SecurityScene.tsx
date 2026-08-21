import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { AuditPhase } from "../../types/patent";
import { HolographicShield } from "./HolographicShield";
import { ParticleField } from "./ParticleField";
import { ValidatorLattice } from "./ValidatorLattice";

interface SecuritySceneProps {
  phase: AuditPhase;
}

function SceneFallback() {
  return <div className="scene-fallback" aria-hidden="true" />;
}

function ResponsiveAssembly({ phase, reducedMotion }: SecuritySceneProps & { reducedMotion: boolean }) {
  const viewportWidth = useThree((state) => state.viewport.width);
  const isCompact = viewportWidth < 7;
  const groupRef = useRef<Group>(null);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current = {
        x: (event.clientX / window.innerWidth - 0.5) * 2,
        y: (event.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  useFrame(() => {
    if (!groupRef.current || reducedMotion) {
      return;
    }
    groupRef.current.rotation.y +=
      (pointerRef.current.x * 0.08 - groupRef.current.rotation.y) * 0.035;
    groupRef.current.rotation.x +=
      (-pointerRef.current.y * 0.05 - groupRef.current.rotation.x) * 0.035;
  });

  return (
    <group
      ref={groupRef}
      position={isCompact ? [-1.5, 0.7, 0] : [0, 0, 0]}
      scale={isCompact ? 0.82 : 1}
    >
      <ValidatorLattice phase={phase} reducedMotion={reducedMotion} />
      <HolographicShield phase={phase} reducedMotion={reducedMotion} />
    </group>
  );
}

export function SecurityScene({ phase }: SecuritySceneProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="security-scene" aria-hidden="true">
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 6.8], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        fallback={<SceneFallback />}
      >
        <color attach="background" args={["#05070b"]} />
        <fog attach="fog" args={["#05070b", 5, 13]} />
        <ambientLight intensity={0.8} />
        <pointLight position={[2, 2, 2]} color="#70e8ff" intensity={4} distance={8} />
        <pointLight position={[-3, -1, 1]} color="#8a7dff" intensity={3} distance={7} />
        <ParticleField reducedMotion={reducedMotion} />
        <ResponsiveAssembly phase={phase} reducedMotion={reducedMotion} />
      </Canvas>
      <div className="scene-vignette" />
      <div className="scene-grid" />
      <div className="scene-scanline" />
    </div>
  );
}
