'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface CodeGalaxy3DProps {
  className?: string;
}

export const CodeGalaxy3D: React.FC<CodeGalaxy3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 450;
    let height = container.clientHeight || 450;

    // 1. Cena e Câmera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 24;

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 3. Iluminação
    const ambientLight = new THREE.AmbientLight(0x8257e5, 0.8);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00e5ff, 2.5, 40);
    pointLight1.position.set(12, 12, 15);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xa379ff, 2.0, 40);
    pointLight2.position.set(-12, -10, 10);
    scene.add(pointLight2);

    // 4. Grupo Central (Core Holográfico)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Icosaedro Estrutural Wireframe
    const icoGeo = new THREE.IcosahedronGeometry(6.5, 2);
    const icoMat = new THREE.MeshStandardMaterial({
      color: 0x8257e5,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      roughness: 0.2,
      metalness: 0.8,
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    coreGroup.add(icoMesh);

    // Núcleo Interior Sólido com Emissão
    const innerGeo = new THREE.OctahedronGeometry(3.5, 1);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f17,
      emissive: 0x632cd6,
      emissiveIntensity: 0.6,
      roughness: 0.4,
      metalness: 0.9,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerMesh);

    // 5. Anéis Orbitais de Dados
    const ringGeo1 = new THREE.TorusGeometry(8.5, 0.05, 16, 80);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.6,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    coreGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(9.5, 0.04, 16, 80);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa379ff,
      transparent: true,
      opacity: 0.4,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    coreGroup.add(ring2);

    // 6. Nuvem de Partículas (Estrelas / Bytes)
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorA = new THREE.Color(0x8257e5);
    const colorB = new THREE.Color(0x00e5ff);

    for (let i = 0; i < particleCount; i++) {
      const radius = 9 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const mixed = colorA.clone().lerp(colorB, Math.random());
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 7. Parallax com o Mouse
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = normX * 0.4;
      targetY = normY * 0.3;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 8. Loop de Animação 60 FPS
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Rotações suaves
      coreGroup.rotation.y += 0.005;
      coreGroup.rotation.x += 0.002;
      ring1.rotation.z += 0.007;
      ring2.rotation.z -= 0.006;
      innerMesh.rotation.y -= 0.01;
      particles.rotation.y += 0.0015;

      // Parallax suavizado (LERP)
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      coreGroup.position.x = currentX * 3;
      coreGroup.position.y = currentY * 2;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize Observer
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 450;
      height = container.clientHeight || 450;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup completo
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      icoGeo.dispose();
      icoMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden pointer-events-auto ${className}`}
      style={{ minHeight: '380px' }}
      aria-label="Nexus Code Galaxy 3D - Núcleo de Inteligência e Aprendizado"
      role="img"
    />
  );
};
