'use client';

type ConfettiOptions = {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
};

export async function fireConfetti(options?: ConfettiOptions): Promise<void> {
  if (typeof window === 'undefined') return;

  const particleCount = options?.particleCount ?? 120;
  const spread = options?.spread ?? 80;
  const origin = options?.origin ?? { y: 0.6 };
  const colors = options?.colors ?? ['#00B37E', '#8257E5', '#0070F3', '#FFA116', '#04D361'];

  // Check if window.confetti is globally available
  const getConfetti = () => (typeof window !== 'undefined' ? (window as unknown as { confetti?: (opts: ConfettiOptions) => void }).confetti : undefined);
  
  let confettiFn = getConfetti();
  if (typeof confettiFn === 'function') {
    confettiFn({ particleCount, spread, origin, colors });
    return;
  }

  // Try dynamically loading canvas-confetti CDN if needed
  try {
    if (!document.getElementById('canvas-confetti-script')) {
      const script = document.createElement('script');
      script.id = 'canvas-confetti-script';
      script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
      script.async = true;
      document.head.appendChild(script);

      await new Promise((resolve) => {
        script.onload = resolve;
        script.onerror = resolve;
      });
    }

    confettiFn = getConfetti();
    if (typeof confettiFn === 'function') {
      confettiFn({ particleCount, spread, origin, colors });
      return;
    }
  } catch {
    // Fallback below
  }

  // Fallback direct HTML5 canvas particle explosion
  createCanvasParticleBurst(colors, particleCount);
}

function createCanvasParticleBurst(colors: string[], count: number) {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    alpha: number;
    rotation: number;
    vRot: number;
  }> = [];

  const startX = canvas.width / 2;
  const startY = canvas.height * 0.6;

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI) + Math.PI; // upward burst
    const speed = Math.random() * 12 + 5;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: Math.sin(angle) * speed - 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      alpha: 1,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
    });
  }

  let frames = 0;
  const maxFrames = 100;

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // gravity
      p.vx *= 0.98; // drag
      p.rotation += p.vRot;
      p.alpha = Math.max(0, 1 - frames / maxFrames);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });

    frames++;
    if (frames < maxFrames) {
      requestAnimationFrame(render);
    } else {
      document.body.removeChild(canvas);
    }
  }

  requestAnimationFrame(render);
}
