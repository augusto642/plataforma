'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ImmersionRadar3DProps {
  workersActive?: number;
  className?: string;
}

export const ImmersionRadar3D: React.FC<ImmersionRadar3DProps> = ({
  workersActive = 4,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 300;

    // 1. Cena e Câmera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4, 18);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Luzes
    const ambientLight = new THREE.AmbientLight(0x8257e5, 1.0);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00e5ff, 2.5, 30);
    pointLight.position.set(5, 8, 8);
    scene.add(pointLight);

    // 4. Grupo Radar
    const radarGroup = new THREE.Group();
    scene.add(radarGroup);

    // Anéis Concêntricos Cibernéticos
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x8257e5,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    const ringGeo1 = new THREE.RingGeometry(4.5, 4.6, 48);
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2;
    radarGroup.add(ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const ringGeo2 = new THREE.RingGeometry(7.0, 7.1, 64);
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    radarGroup.add(ring2);

    // Núcleo Central de Processamento
    const coreGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x07090e,
      emissive: 0x8257e5,
      emissiveIntensity: 0.7,
      roughness: 0.3,
      metalness: 0.8,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    radarGroup.add(core);

    // Nós de Competências Mineradas (Planetas Satélites)
    const stacks = [
      { name: 'Front-end', color: 0x00e5ff, dist: 4.5, speed: 0.8 },
      { name: 'Back-end', color: 0x8257e5, dist: 5.6, speed: -0.6 },
      { name: 'DevOps & CI', color: 0x10b981, dist: 6.8, speed: 0.5 },
      { name: 'IA & Dados', color: 0xf59e0b, dist: 7.6, speed: -0.4 },
    ];

    const nodeGeo = new THREE.SphereGeometry(0.45, 12, 12);
    const nodes: Array<{ mesh: THREE.Mesh; dist: number; speed: number; angle: number }> = [];

    stacks.forEach((s, idx) => {
      const mat = new THREE.MeshStandardMaterial({
        color: s.color,
        emissive: s.color,
        emissiveIntensity: 0.8,
      });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      const angle = (idx / stacks.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * s.dist, 0, Math.sin(angle) * s.dist);
      radarGroup.add(mesh);
      nodes.push({ mesh, dist: s.dist, speed: s.speed, angle });
    });

    // Feixes de Linha Conectores (RAG Search Rays)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xa379ff,
      transparent: true,
      opacity: 0.45,
    });
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(nodes.length * 6);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    radarGroup.add(lines);

    // 5. Loop de Animação 60 FPS
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rotação suave do radar
      radarGroup.rotation.y = elapsed * 0.15;
      radarGroup.rotation.x = 0.35 + Math.sin(elapsed * 0.2) * 0.05;

      // Movimentação orbital dos nós
      const positions = lines.geometry.attributes.position.array as Float32Array;

      nodes.forEach((n, idx) => {
        const curAngle = n.angle + elapsed * n.speed * 0.5;
        const x = Math.cos(curAngle) * n.dist;
        const z = Math.sin(curAngle) * n.dist;
        const y = Math.sin(elapsed * 2 + idx) * 0.4;
        n.mesh.position.set(x, y, z);

        // Atualiza feixes do centro até o nó
        positions[idx * 6] = 0;
        positions[idx * 6 + 1] = 0;
        positions[idx * 6 + 2] = 0;
        positions[idx * 6 + 3] = x;
        positions[idx * 6 + 4] = y;
        positions[idx * 6 + 5] = z;
      });

      lines.geometry.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animate();

    // 6. Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);

      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      nodeGeo.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [workersActive]);

  return (
    <div
      ref={mountRef}
      className={`relative w-full flex items-center justify-center overflow-hidden pointer-events-none select-none ${className}`}
      style={{ height: '260px' }}
      aria-label="Radar 3D de Pesquisa de Mercado Tech"
      role="img"
    />
  );
};
