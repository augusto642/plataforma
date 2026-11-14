'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Tower3DSceneProps {
  currentSquare: number;
  totalSquares?: number;
  floor: number;
  onSelectSquare?: (square: number) => void;
}

export const Tower3DScene: React.FC<Tower3DSceneProps> = ({
  currentSquare,
  totalSquares = 30,
  floor,
  onSelectSquare,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 550;

    // 1. Cena e Câmera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07090e);
    scene.fog = new THREE.FogExp2(0x07090e, 0.025);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 15, 32);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Luzes
    const ambientLight = new THREE.AmbientLight(0x4f46e5, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 25, 15);
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x818cf8, 2, 50);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // 3. Torre Central (Cilindro Base Obelisco)
    const towerCoreGeo = new THREE.CylinderGeometry(3.5, 4.5, 32, 24, 1, true);
    const towerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
      wireframe: true,
    });
    const towerCore = new THREE.Mesh(towerCoreGeo, towerCoreMat);
    towerCore.position.y = 12;
    scene.add(towerCore);

    // 4. Espiral de Casas (Plataformas 3D)
    const platformsGroup = new THREE.Group();
    scene.add(platformsGroup);

    const radius = 9;
    const heightStep = 0.8;
    const angleStep = 0.38;

    const platformGeo = new THREE.CylinderGeometry(1.1, 1.2, 0.4, 6);
    const platforms: THREE.Mesh[] = [];

    for (let i = 0; i <= totalSquares; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = i * heightStep;

      const isCurrent = i === currentSquare;
      const isGuardian = i === totalSquares;

      let color = 0x3b82f6; // padrão código (azul)
      if (isGuardian) color = 0xf59e0b; // guardião (dourado)
      else if (i % 5 === 0) color = 0x8b5cf6; // quiz / minigame (roxo)

      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        metalness: 0.7,
        emissive: isCurrent ? 0x6366f1 : 0x000000,
        emissiveIntensity: isCurrent ? 0.8 : 0,
      });

      const platform = new THREE.Mesh(platformGeo, mat);
      platform.position.set(x, y, z);
      platform.userData = { squareIndex: i };
      platformsGroup.add(platform);
      platforms.push(platform);
    }

    // 5. Marcador do Jogador (Pino Cristal Fluorescente)
    const markerGroup = new THREE.Group();
    const crystalGeo = new THREE.OctahedronGeometry(0.7, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.9,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.y = 1.4;
    markerGroup.add(crystal);

    // Anel de pulso sob o jogador
    const ringGeo = new THREE.RingGeometry(0.7, 0.9, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    markerGroup.add(ring);

    scene.add(markerGroup);

    // Atualiza posição do jogador
    const updateMarkerPosition = (sq: number) => {
      const angle = sq * angleStep;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = sq * heightStep;
      markerGroup.position.set(x, y, z);
      // Foca a câmera verticalmente próxima da casa do jogador
      camera.lookAt(0, Math.max(8, y + 2), 0);
    };

    updateMarkerPosition(currentSquare);

    // 6. Animação de Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotação suave da torre
      platformsGroup.rotation.y = elapsedTime * 0.05;
      towerCore.rotation.y = -elapsedTime * 0.03;

      // Animação de flutuação e pulso do cristal do jogador
      crystal.rotation.y = elapsedTime * 2;
      crystal.position.y = 1.4 + Math.sin(elapsedTime * 4) * 0.15;
      ring.scale.setScalar(1 + Math.sin(elapsedTime * 3) * 0.2);

      // Acompanha a rotação da plataforma para o marcador ficar preso à casa
      const playerAngle = currentSquare * angleStep + platformsGroup.rotation.y;
      const px = Math.cos(playerAngle) * radius;
      const pz = Math.sin(playerAngle) * radius;
      const py = currentSquare * heightStep;
      markerGroup.position.set(px, py, pz);

      renderer.render(scene, camera);
    };

    animate();

    // 7. Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [currentSquare, totalSquares, floor]);

  return (
    <div className="relative w-full h-[550px] rounded-2xl overflow-hidden bg-[#07090E] border border-slate-800 shadow-2xl">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
          Andar {floor} · Casa {currentSquare} / {totalSquares}
        </span>
      </div>
    </div>
  );
};
