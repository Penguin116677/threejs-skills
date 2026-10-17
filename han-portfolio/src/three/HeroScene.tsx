import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer, MeshDistortMaterial, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'

export interface HeroSceneProps {
  /** Pause rendering entirely (hero scrolled out of view / tab hidden). */
  paused: boolean
  reducedMotion: boolean
  compact: boolean
  /** Called when the GPU can't keep up — parent swaps to the CSS fallback. */
  onPerformanceFail: () => void
}

/**
 * Cinematic hero: a liquid-chrome sculpture wrapped by an ember glass ring,
 * a few floating satellites and a light particle field.
 * Lighting is fully procedural (Lightformers baked once into an env map),
 * so no HDR files are downloaded.
 */
export default function HeroScene({ paused, reducedMotion, compact, onPerformanceFail }: HeroSceneProps) {
  const [dpr, setDpr] = useState<number>(compact ? 1.25 : 1.6)

  return (
    <Canvas
      dpr={dpr}
      frameloop={paused ? 'never' : reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 0, compact ? 8.4 : 7.6], fov: 35 }}
      gl={{ antialias: !compact, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
      aria-hidden="true"
    >
      <PerformanceMonitor
        bounds={() => [36, 58]}
        flipflops={3}
        onDecline={() => setDpr((d) => Math.max(1, d - 0.3))}
        onFallback={onPerformanceFail}
      />

      <ambientLight intensity={0.15} />
      <directionalLight position={[4, 3, 5]} intensity={1.4} color="#ffd2b0" />
      <pointLight position={[-3, -1.5, 2]} intensity={18} color="#ff6a00" distance={9} />

      <Rig enabled={!reducedMotion && !compact}>
        <Sculpture reducedMotion={reducedMotion} compact={compact} />
        <Satellites reducedMotion={reducedMotion} />
        <Particles count={compact ? 110 : 260} reducedMotion={reducedMotion} />
      </Rig>

      {/* Procedural studio: soft grey base + softboxes, baked once into the env map */}
      <Environment frames={1} resolution={compact ? 128 : 256}>
        <color attach="background" args={['#1a1b20']} />
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[14, 6, 1]} />
        <Lightformer form="rect" intensity={7} color="#ff6a00" position={[-6, 0.5, 0]} rotation-y={Math.PI / 2} scale={[10, 3.5, 1]} />
        <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[6, 1, 1]} rotation-y={-Math.PI / 2} scale={[8, 1.2, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#ffd9bd" position={[0, 0, 7]} scale={[12, 2, 1]} />
        <Lightformer form="ring" intensity={3} color="#b8ff6a" position={[3, 3, -5]} scale={2} />
        <Lightformer form="rect" intensity={1.4} color="#ff8a3a" position={[0, -6, 0]} rotation-x={-Math.PI / 2} scale={[14, 6, 1]} />
      </Environment>
    </Canvas>
  )
}

/** Gentle cursor parallax on desktop — eases toward the pointer, never snaps. */
function Rig({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame((state, delta) => {
    if (!group.current) return
    const k = 1 - Math.exp(-delta * 2.2)
    const tx = enabled ? state.pointer.y * -0.18 : 0
    const ty = enabled ? state.pointer.x * 0.28 : 0
    group.current.rotation.x += (tx - group.current.rotation.x) * k
    group.current.rotation.y += (ty - group.current.rotation.y) * k
  })
  return <group ref={group}>{children}</group>
}

function Sculpture({ reducedMotion, compact }: { reducedMotion: boolean; compact: boolean }) {
  const core = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (reducedMotion) return
    if (core.current) {
      core.current.rotation.y += delta * 0.18
      core.current.rotation.z += delta * 0.05
    }
    if (ring.current) ring.current.rotation.z -= delta * 0.12
  })

  return (
    <Float speed={reducedMotion ? 0 : 1.1} rotationIntensity={0.25} floatIntensity={0.6} floatingRange={[-0.12, 0.12]}>
      <group position={[compact ? 0 : 0.4, compact ? 0.15 : 0.05, 0]} scale={compact ? 0.92 : 0.8}>
        {/* Liquid chrome core */}
        <mesh ref={core} scale={1.32}>
          <icosahedronGeometry args={[1, compact ? 14 : 28]} />
          <MeshDistortMaterial
            color="#dfe2e8"
            metalness={1}
            roughness={0.16}
            envMapIntensity={1.6}
            distort={0.42}
            speed={reducedMotion ? 0 : 1.15}
          />
        </mesh>

        {/* Illuminated ember glass ring */}
        <group rotation={[1.15, 0.25, 0]}>
          <mesh ref={ring}>
            <torusGeometry args={[2.05, 0.035, 16, compact ? 96 : 180]} />
            <meshStandardMaterial color="#ff6a00" emissive="#ff5a00" emissiveIntensity={2.4} roughness={0.3} toneMapped={false} />
          </mesh>
          <mesh>
            <torusGeometry args={[2.32, 0.006, 8, 160]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
          </mesh>
        </group>
      </group>
    </Float>
  )
}

function Satellites({ reducedMotion }: { reducedMotion: boolean }) {
  const speed = reducedMotion ? 0 : 1.6
  return (
    <>
      <Float speed={speed} floatIntensity={1.4} rotationIntensity={1.2}>
        <mesh position={[-2.2, 1.45, -0.6]} scale={0.3}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#e9ecf2" metalness={1} roughness={0.12} />
        </mesh>
      </Float>
      <Float speed={speed * 0.8} floatIntensity={1.1} rotationIntensity={0.6}>
        <mesh position={[2.6, -1.45, 0.4]} scale={0.2}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshPhysicalMaterial color="#ff8a3a" metalness={0.1} roughness={0.08} clearcoat={1} emissive="#ff4d00" emissiveIntensity={0.6} />
        </mesh>
      </Float>
      <Float speed={speed * 1.2} floatIntensity={1.6} rotationIntensity={2}>
        <mesh position={[2.1, 1.75, -1.4]} scale={0.16} rotation={[0.4, 0.2, 0.8]}>
          <torusKnotGeometry args={[1, 0.32, 96, 12]} />
          <meshStandardMaterial color="#d0d4dc" metalness={1} roughness={0.18} />
        </mesh>
      </Float>
      <Float speed={speed * 0.6} floatIntensity={0.9}>
        <mesh position={[-1.9, -1.8, 0.9]} scale={0.07}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color="#b8ff6a" toneMapped={false} />
        </mesh>
      </Float>
    </>
  )
}

function Particles({ count, reducedMotion }: { count: number; reducedMotion: boolean }) {
  const points = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    // Deterministic pseudo-random so SSR/hydration & re-mounts look identical
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) {
      const r = 2.6 + rand() * 3.2
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.4
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.8
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta) - 1.5
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [count])

  useFrame((_, delta) => {
    if (!reducedMotion && points.current) points.current.rotation.y += delta * 0.025
  })

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial size={0.028} color="#ffb27a" transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}
