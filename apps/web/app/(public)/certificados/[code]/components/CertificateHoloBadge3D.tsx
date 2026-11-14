'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CertificateHoloBadge3DProps {
  code: string;
  className?: string;
}

export const CertificateHoloBadge3D: React.FC<CertificateHoloBadge3DProps> = ({
  code,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 280;

    // 1. Cena e Câmera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.z = 11;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    // 3. Luzes
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const goldLight = new THREE.PointLight(0xf59e0b, 3.0, 30);
    goldLight.position.set(6, 6, 8);
    scene.add(goldLight);

    const cyanLight = new THREE.PointLight(0x00e5ff, 2.0, 30);
    cyanLight.position.set(-6, -6, 5);
    scene.add(cyanLight);

    // 4. Selo / Medalhão 3D
    const badgeGroup = new THREE.Group();
    scene.add(badgeGroup);

    // Moldura Hexagonal Dourada (Cilindro de 6 lados)
    const medalGeo = new THREE.CylinderGeometry(3.2, 3.2, 0.35, 6);
    const medalMat = new THREE.MeshStandardMaterial({
      color: 0x121624,
      roughness: 0.2,
      metalness: 0.9,
    });
    const medal = new THREE.Mesh(medalGeo, medalMat);
    medal.rotation.x = Math.PI / 2;
    badgeGroup.add(medal);

    // Borda Externa Dourada
    const borderGeo = new THREE.TorusGeometry(3.35, 0.12, 16, 6);
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
      roughness: 0.15,
      metalness: 0.95,
    });
    const border = new THREE.Mesh(borderGeo, borderMat);
    badgeGroup.add(border);

    // Emblema Central Criptográfico (Estrela Icosaédrica)
    const starGeo = new THREE.IcosahedronGeometry(1.6, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0x8257e5,
      emissive: 0x632cd6,
      emissiveIntensity: 0.5,
      wireframe: true,
      roughness: 0.1,
      metalness: 0.9,
    });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.z = 0.25;
    badgeGroup.add(star);

    // Anel de Verificação Holográfica
    const holoRingGeo = new THREE.RingGeometry(2.3, 2.45, 48);
    const holoRingMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const holoRing = new THREE.Mesh(holoRingGeo, holoRingMat);
    holoRing.position.z = 0.22;
    badgeGroup.add(holoRing);

    // 5. Interação com Cursor (Tilt Suave)
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = normX * 0.6;
      targetRotX = -normY * 0.6;
    };

    window.addEventListener('mousemove', handlePointerMove);

    // 6. Loop de Animação 60 FPS
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rotação suave base + tilt do cursor
      currentRotX += (targetRotX - currentRotX) * 0.08;
      currentRotY += (targetRotY - currentRotY) * 0.08;

      badgeGroup.rotation.y = currentRotY + Math.sin(elapsed * 0.8) * 0.15;
      badgeGroup.rotation.x = currentRotX + Math.cos(elapsed * 0.6) * 0.1;

      // Anéis internos giram continuamente
      star.rotation.z = elapsed * 0.4;
      holoRing.rotation.z = -elapsed * 0.6;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handlePointerMove);

      medalGeo.dispose();
      medalMat.dispose();
      borderGeo.dispose();
      borderMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      holoRingGeo.dispose();
      holoRingMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [code]);

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center cursor-pointer select-none ${className}`}
      style={{ width: '220px', height: '220px' }}
      title={`Selo Criptográfico 3D de Autenticidade: ${code}`}
      aria-label="Selo Criptográfico 3D de Autenticidade"
      role="img"
    />
  );
};
