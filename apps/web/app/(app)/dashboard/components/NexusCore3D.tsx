'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface NexusCore3DProps {
  level?: number;
  streakDays?: number;
  className?: string;
}

export const NexusCore3D: React.FC<NexusCore3DProps> = ({
  level = 1,
  streakDays = 0,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 220;
    const height = container.clientHeight || 220;

    // 1. Cena e Câmera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.z = 10;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 3. Luzes
    const ambientLight = new THREE.AmbientLight(0x8257e5, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00e5ff, 2.8, 25);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const backLight = new THREE.PointLight(0xf59e0b, 1.5, 25);
    backLight.position.set(-5, -5, -3);
    scene.add(backLight);

    // 4. Artefato Central (Nexus Crystal)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Prisma Octaédrico de Obsidiana
    const crystalGeo = new THREE.OctahedronGeometry(2.2, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f17,
      emissive: 0x8257e5,
      emissiveIntensity: 0.45,
      roughness: 0.1,
      metalness: 0.85,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    coreGroup.add(crystal);

    // Wireframe de Borda de Neon
    const wireGeo = new THREE.OctahedronGeometry(2.25, 0);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    coreGroup.add(wire);

    // Anel Giroscópico Holográfico
    const gyroGeo = new THREE.TorusGeometry(3.2, 0.04, 16, 64);
    const gyroMat = new THREE.MeshBasicMaterial({
      color: 0xa379ff,
      transparent: true,
      opacity: 0.6,
    });
    const gyroRing = new THREE.Mesh(gyroGeo, gyroMat);
    gyroRing.rotation.x = Math.PI / 3;
    coreGroup.add(gyroRing);

    // Shards Flutuantes
    const shardsGroup = new THREE.Group();
    const shardGeo = new THREE.TetrahedronGeometry(0.25, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00e5ff,
      emissiveIntensity: 0.6,
    });

    const shardCount = 8;
    const shards: THREE.Mesh[] = [];
    for (let i = 0; i < shardCount; i++) {
      const angle = (i / shardCount) * Math.PI * 2;
      const dist = 3.6;
      const shard = new THREE.Mesh(shardGeo, shardMat);
      shard.position.set(Math.cos(angle) * dist, Math.sin(angle * 2) * 0.8, Math.sin(angle) * dist);
      shardsGroup.add(shard);
      shards.push(shard);
    }
    coreGroup.add(shardsGroup);

    // 5. Loop de Renderização 60 FPS
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rotação suave contínua
      coreGroup.rotation.y = elapsed * 0.45;
      coreGroup.rotation.x = Math.sin(elapsed * 0.3) * 0.2;
      gyroRing.rotation.z = elapsed * 0.8;
      gyroRing.rotation.y = Math.cos(elapsed * 0.4) * 0.5;

      // Pulsação suave dos shards
      shardsGroup.rotation.y = -elapsed * 0.3;
      shards.forEach((s, idx) => {
        s.position.y = Math.sin(elapsed * 2 + idx) * 0.6;
        s.rotation.x += 0.02;
        s.rotation.y += 0.03;
      });

      renderer.render(scene, camera);
    };

    animate();

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      crystalGeo.dispose();
      crystalMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      gyroGeo.dispose();
      gyroMat.dispose();
      shardGeo.dispose();
      shardMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [level, streakDays]);

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center pointer-events-none select-none ${className}`}
      style={{ width: '180px', height: '180px' }}
      aria-hidden="true"
    />
  );
};
