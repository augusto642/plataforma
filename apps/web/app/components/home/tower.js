import { gsap } from 'gsap';

export function mountTower(root, signal) {
const host = root.querySelector('#tower-art');
if (!host) return;
let resizeObserver;
const button = host.querySelector('.tower-motion');
const rollOutput = host.querySelector('.tower-roll');
const fallbackImage = host.querySelector('img');
const fallbackDice = [...host.querySelectorAll('.tower-fallback-dice span')];
const dieFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const demonstration = Boolean(rollOutput);
const initialPrompt = rollOutput?.textContent || 'Dois dados. Qual será o próximo resultado?';
const preference = matchMedia('(prefers-reduced-motion: reduce)');
let renderer, scene, camera, timeline, layers = [], dice = [], frame, loading = false, failed = false;
let visible = false, paused = false;
let running = false, preparing = false, showingNumeric = false, motion, initialization;

function controls() {
  const trigger = host.querySelector('#tower-throw');
  if (trigger) {
    trigger.disabled = running || preparing;
    trigger.hidden = !preference.matches && !showingNumeric;
    trigger.textContent = 'Sortear dados';
  }
  if (button && demonstration) {
    button.hidden = !running || preference.matches;
    button.textContent = paused ? 'Retomar animação da Torre' : 'Pausar animação da Torre';
    button.setAttribute('aria-pressed', String(paused));
  }
  const status = root.querySelector('#tower-status');
  if (status && demonstration) {
    status.setAttribute('aria-live', preference.matches || failed || showingNumeric ? 'polite' : 'off');
  }
}

function announce(message, output = message) {
  if (rollOutput) rollOutput.textContent = output;
  const status = root.querySelector('#tower-status');
  if (status) status.textContent = message;
}

function numericResult() {
  const values = [0, 0].map(() => 1 + Math.floor(Math.random() * 6));
  fallbackDice.forEach((die, index) => { die.textContent = dieFaces[values[index] - 1]; });
  showingNumeric = true;
  host.dataset.phase = 'static';
  controls();
  announce(`Demonstração sem movimento. Dados: ${values[0]} + ${values[1]} = ${values[0] + values[1]}. Nenhuma partida real.`,
    `Dados · ${values[0]} + ${values[1]} = ${values[0] + values[1]}`);
  sync();
}

function fallbackMotion() {
  const values = fallbackDice.map(() => 1 + Math.floor(Math.random() * 6));
  const cycle = gsap.timeline({
    paused: true,
    repeat: -1,
    repeatDelay: 1.4,
  });
  cycle.call(() => {
    host.dataset.phase = 'rolling';
    announce('Rolando os dados…');
  });
  cycle.fromTo(fallbackDice, { y: 0, rotation: 0 }, {
    keyframes: [
      { y: -38, rotation: 120, duration: .45, ease: 'power2.out' },
      { y: 0, rotation: 360, duration: .6, ease: 'bounce.out' },
    ],
    stagger: .13,
  }, 0);
  cycle.call(() => {
    fallbackDice.forEach((die, index) => { die.textContent = dieFaces[values[index] - 1]; });
    host.dataset.phase = 'settled';
    announce(`Dados · ${values.join(' + ')} = ${values[0] + values[1]}`);
  });
  cycle.call(() => { host.dataset.phase = 'tower'; }, null, '+=.35');
  cycle.to(fallbackImage, { x: 8, rotation: 2, duration: .45, ease: 'sine.inOut', repeat: 1, yoyo: true });
  cycle.call(() => {
    host.dataset.phase = 'rest';
    values.forEach((_, index) => { values[index] = 1 + Math.floor(Math.random() * 6); });
  });
  return cycle;
}

async function throwDice(automatic = false) {
  if (!demonstration || running || preparing) return;
  if (preference.matches) {
    if (!automatic) numericResult();
    return;
  }
  preparing = true;
  controls();
  announce('Preparando a demonstração automática da Torre.', 'Preparando animação…');
  if (!renderer && !failed) await initialize();
  if (signal.aborted) return;
  preparing = false;
  if (preference.matches || ((!renderer || !motion) && (!fallbackImage || fallbackDice.length !== 2))) {
    if (!automatic) numericResult();
    else {
      showingNumeric = true;
      host.dataset.phase = 'static';
      controls();
      announce(preference.matches
        ? 'Movimento reduzido ativo. Use Sortear dados para obter uma soma sem animação.'
        : 'Animação indisponível. Use Sortear dados para obter uma soma sem movimento.',
      'Demonstração sem movimento');
      sync();
    }
    return;
  }
  showingNumeric = false;
  running = true;
  timeline = renderer && !failed && motion ? motion() : fallbackMotion();
  sync();
}

function stop() {
  if (frame) cancelAnimationFrame(frame);
  frame = null;
}

function sync() {
  stop();
  const enabled = renderer && !preference.matches && !failed && !showingNumeric;
  if (renderer) renderer.domElement.hidden = !enabled;
  if (button && !demonstration) button.hidden = !enabled;
  controls();
  host.classList.toggle('has-webgl', Boolean(enabled));
  const fallback = failed && running && !preference.matches;
  host.classList.toggle('has-tower-fallback', fallback);
  const active = (enabled || fallback) && visible && !paused && !document.hidden;
  if (timeline) active ? timeline.play() : timeline.pause();
  if (enabled && active && (!demonstration || running)) {
    frame = requestAnimationFrame(draw);
  } else if (enabled) {
    renderer.render(scene, camera);
  }
}

function draw(time) {
  frame = null;
  if (demonstration) {
    if (renderer && !failed) renderer.render(scene, camera);
    if (running) frame = requestAnimationFrame(draw);
    return;
  }
  if (timeline) {
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
    return;
  }
  const t = time * .001;
  const progress = t * .55;
  const step = Math.floor(progress);
  const currentLayer = step % layers.length;
  const phase = Math.min((progress - step) * 1.6, 1);
  const eased = phase * phase * (3 - 2 * phase);
  layers.forEach((layer, index) => {
    const turns = Math.floor(step / layers.length) + (index < currentLayer ? 1 : 0);
    layer.rotation.y = (turns + (index === currentLayer ? eased : 0)) * Math.PI / 2;
  });
  dice.forEach((die, index) => {
    const turn = t * 1.5 + index * 1.4;
    die.rotation.set(turn, turn * .35, turn * .65);
    die.position.set((index ? 1.15 : -.15) + Math.sin(turn) * .12, .34 + Math.abs(Math.sin(turn)) * .08, 2.1 + Math.cos(turn) * .12);
  });
  renderer.render(scene, camera);
  frame = requestAnimationFrame(draw);
}

function initialize() {
  if (!initialization) initialization = buildScene().finally(() => { initialization = null; });
  return initialization;
}

async function buildScene() {
  if (renderer || loading || failed || preference.matches || (!visible && !preparing)) return;
  loading = true;
  try {
    const THREE = await import('three');
    if (signal.aborted || preference.matches) return;
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.append(renderer.domElement);
    scene = new THREE.Scene();
    const tallTower = Boolean(host.querySelector('.tower-roll'));
    const focusHeight = tallTower ? 1.65 : 1.4;
    camera = new THREE.PerspectiveCamera(33, 1, .1, 100);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, focusHeight, 0);
    scene.add(new THREE.HemisphereLight(0xe4f6e9, 0x151d1a, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(-3, 8, 6);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0xd9c7eb, 1.1);
    rim.position.set(3, 4, -4);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.6, 72),
      new THREE.MeshStandardMaterial({ color: 0x14231d, roughness: .88 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.02;
    scene.add(floor);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3, 3.025, 72),
      new THREE.MeshBasicMaterial({ color: 0x8dd8a7, transparent: true, opacity: .45, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .002;
    scene.add(ring);

    // Soft contact only: one shared radial texture, no shadow-map passes.
    const shadowPixels = new Uint8Array(32 * 32 * 4);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const distance = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
        shadowPixels[(y * 32 + x) * 4 + 3] = Math.round(Math.max(0, 1 - distance) ** 2 * 210);
      }
    }
    const shadowTexture = new THREE.DataTexture(shadowPixels, 32, 32);
    shadowTexture.magFilter = THREE.LinearFilter;
    shadowTexture.needsUpdate = true;
    function contactShadow(width, depth) {
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: shadowTexture, transparent: true, depthWrite: false, opacity: .8
        })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = .008;
      shadow.scale.set(width, depth, 1);
      scene.add(shadow);
      return shadow;
    }
    contactShadow(4, 3.8);

    const tower = new THREE.Group();
    const blockGeometry = new THREE.BoxGeometry(2.25, .25, .68);
    const materials = [0x93d9ab, 0x456b5c, 0x8c7caa, 0x244239].map(color =>
      new THREE.MeshStandardMaterial({ color, roughness: .52, metalness: .12 })
    );
    for (let level = 0; level < (tallTower ? 15 : 11); level++) {
      const layer = new THREE.Group();
      layer.position.y = .125 + level * .252;
      for (let position = -1; position <= 1; position++) {
        const block = new THREE.Mesh(blockGeometry, materials[(level + position + 5) % materials.length]);
        if (level % 2) {
          block.rotation.y = Math.PI / 2;
          block.position.x = position * .7;
        } else {
          block.position.z = position * .7;
        }
        layer.add(block);
      }
      layers.push(layer);
      tower.add(layer);
    }
    scene.add(tower);

    const die = new THREE.Group();
    die.add(new THREE.Mesh(
      new THREE.BoxGeometry(.68, .68, .68),
      new THREE.MeshStandardMaterial({ color: 0xe0f3e5, roughness: .45 })
    ));
    const dots = new THREE.SphereGeometry(.045, 10, 8);
    const ink = new THREE.MeshStandardMaterial({ color: 0x293f34 });
    const patterns = [
      [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]],
      [[-1, -1], [-1, 1], [1, -1], [1, 1]],
      [[-1, -1], [-1, 1], [0, 0], [1, -1], [1, 1]],
      [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]]
    ];
    const faces = [
      [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [1, 0, 0], [0, 1, 0]],
      [[1, 0, 0], [0, 0, 1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
      [[0, 1, 0], [1, 0, 0], [0, 0, 1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]
    ];
    const faceValues = [1, 6, 3, 4, 2, 5];
    faces.forEach(([normal, u, v], index) => {
      patterns[faceValues[index] - 1].forEach(([x, y]) => {
        const pip = new THREE.Mesh(dots, ink);
        pip.position.set(
          normal[0] * .34 + (u[0] * x + v[0] * y) * .14,
          normal[1] * .34 + (u[1] * x + v[1] * y) * .14,
          normal[2] * .34 + (u[2] * x + v[2] * y) * .14
        );
        die.add(pip);
      });
    });
    die.scale.setScalar(.58);
    dice = [die, die.clone()];
    dice.forEach(cube => scene.add(cube));

    if (demonstration) {
      const half = .34 * .58;
      const pipRadius = .045 * .58;
      const supportMatrix = new THREE.Matrix4();
      const shadows = dice.map(() => contactShadow(.9, .9));
      const supportHeight = cube => {
        const e = supportMatrix.makeRotationFromQuaternion(cube.quaternion).elements;
        return half * (Math.abs(e[1]) + Math.abs(e[5]) + Math.abs(e[9])) + pipRadius;
      };
      function updateShadow(cube, index, lift = 0) {
        const shadow = shadows[index];
        shadow.position.x = cube.position.x;
        shadow.position.z = cube.position.z;
        shadow.scale.setScalar(.85 + lift * .3);
        shadow.material.opacity = .85 / (1 + lift * 2);
      }
      dice.forEach((cube, index) => {
        cube.position.set(index ? 1.15 : -.5, supportHeight(cube), 2.1);
        updateShadow(cube, index);
      });
      motion = () => {
        const results = [null, null];
        const diceDuration = 3.2;
        const diceStagger = .18;
        const diceEnd = diceDuration + diceStagger;
        const towerStart = diceEnd + .65;
        const towerDuration = 1.6;
        const layerStagger = .12;
        const towerEnd = towerStart + towerDuration + (layers.length - 1) * layerStagger;
        const resultText = () => `Dados · ${results[0]} + ${results[1]} = ${results[0] + results[1]}`;
        const begin = () => {
          results.fill(null);
          host.dataset.phase = 'rolling';
          announce('Demonstração automática: os dados rolam primeiro. A Torre aguarda.', 'Rolando os dados…');
        };
        const cycle = gsap.timeline({
          data: 'nexus-tower-sequence',
          paused: true,
          onStart: begin,
          onComplete: () => {
            if (!running || preference.matches || failed) return;
            timeline = motion();
            sync();
          }
        });
        cycle.addLabel('rolling', 0);
        cycle.addLabel('settled', diceEnd);
        cycle.addLabel('tower', towerStart);
        cycle.addLabel('rest', towerEnd);
        dice.forEach((cube, index) => {
          let from, to, origin, destination, result;
          const state = { progress: 0 };
          cycle.fromTo(state, { progress: 0 }, {
            progress: 1, duration: diceDuration, ease: 'none', immediateRender: false,
            onStart: () => {
              const face = Math.floor(Math.random() * faces.length);
              result = faceValues[face];
              const orientation = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(...faces[face][0]), new THREE.Vector3(0, 1, 0)
              );
              const yaw = new THREE.Quaternion().setFromAxisAngle(
                new THREE.Vector3(0, 1, 0), Math.floor(Math.random() * 4) * Math.PI / 2
              );
              const target = new THREE.Euler().setFromQuaternion(yaw.multiply(orientation));
              from = [cube.rotation.x, cube.rotation.y, cube.rotation.z].map(angle => angle % (Math.PI * 2));
              cube.rotation.set(...from);
              to = [target.x, target.y, target.z].map((angle, axis) =>
                angle + (Math.ceil((from[axis] - angle) / (Math.PI * 2)) + 1) * Math.PI * 2
              );
              origin = cube.position.clone();
              destination = new THREE.Vector3(
                (index ? 1.15 : -.5) + (Math.random() - .5) * .28, 0, 2.05 + Math.random() * .22
              );
            },
            onUpdate: () => {
              if (!from) return;
              const p = state.progress;
              let lift = 0;
              if (p < .5) lift = Math.sin(Math.PI * p / .5) ** 2 * .55;
              else if (p < .74) lift = Math.sin(Math.PI * (p - .5) / .24) ** 2 * .12;
              else if (p < .9) lift = Math.sin(Math.PI * (p - .74) / .16) ** 2 * .028;
              const travel = 1 - (1 - p) ** 3;
              const t = Math.min(p / .9, 1);
              const tumble = t * t * t * (t * (t * 6 - 15) + 10);
              cube.rotation.set(...from.map((angle, axis) => angle + (to[axis] - angle) * tumble));
              cube.position.lerpVectors(origin, destination, travel);
              cube.position.y = supportHeight(cube) + lift;
              updateShadow(cube, index, lift);
            },
            onComplete: () => {
              results[index] = result;
            }
          }, index * diceStagger);
        });
        cycle.call(() => {
          host.dataset.phase = 'settled';
          announce('Dados parados. A Torre começa a se mover em seguida. Nenhuma partida real.', resultText());
        }, null, diceEnd);
        cycle.call(() => {
          host.dataset.phase = 'tower';
          announce('A Torre está em movimento. Os dados e o resultado permanecem parados.', resultText());
        }, null, towerStart);
        layers.forEach((layer, index) => {
          cycle.to(layer.rotation, {
            y: `+=${Math.PI / 2}`, duration: towerDuration, ease: 'sine.inOut'
          }, towerStart + index * layerStagger);
        });
        cycle.call(() => {
          host.dataset.phase = 'rest';
          announce('Movimento da Torre concluído. O próximo lançamento começa automaticamente.', resultText());
        }, null, towerEnd);
        cycle.to({}, { duration: .95 }, towerEnd);
        return cycle;
      };
    } else if (gsap) {
      const rollOutput = host.querySelector('.tower-roll');
      const results = [null, null];
      dice.forEach((cube, index) => cube.position.set(index ? 1.15 : -.5, .2, 2.1));
      timeline = gsap.timeline({ paused: true, repeat: -1, repeatRefresh: true, repeatDelay: .35 });
      layers.forEach((layer, index) => {
        timeline.to(layer.rotation, {
          y: `+=${Math.PI / 2}`,
          duration: 1.15,
          ease: 'sine.inOut'
        }, index * .42);
      });
      const halfCycle = ((layers.length - 1) * .42 + 1.15) / 2;
      timeline.to(camera.position, {
        x: 6.35, z: 7.7, duration: halfCycle, repeat: 1, yoyo: true, ease: 'sine.inOut',
        onUpdate: () => camera.lookAt(0, focusHeight, 0)
      }, 0);
      timeline.to(ring.material, {
        opacity: .7, duration: halfCycle, repeat: 1, yoyo: true, ease: 'sine.inOut'
      }, 0);
      dice.forEach((cube, index) => {
        const start = .25 + index * .22;
        const state = { progress: 0 };
        let from, to, result;
        timeline.fromTo(state, { progress: 0 }, {
          progress: 1,
          immediateRender: false,
          duration: 1.7,
          ease: 'power2.out',
          onStart: () => {
            const face = Math.floor(Math.random() * 6);
            result = faceValues[face];
            results[index] = null;
            if (rollOutput) rollOutput.textContent = 'Dados em movimento…';
            const orientation = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(...faces[face][0]), new THREE.Vector3(0, 1, 0)
            );
            const yaw = new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0), Math.floor(Math.random() * 4) * Math.PI / 2
            );
            const target = new THREE.Euler().setFromQuaternion(yaw.multiply(orientation));
            from = [cube.rotation.x, cube.rotation.y, cube.rotation.z].map(angle => angle % (Math.PI * 2));
            to = [target.x, target.y, target.z].map((angle, axis) =>
              angle + (Math.ceil((from[axis] - angle) / (Math.PI * 2)) + 2) * Math.PI * 2
            );
          },
          onUpdate: () => {
            if (!from) return;
            cube.rotation.set(...from.map((angle, axis) => angle + (to[axis] - angle) * state.progress));
          },
          onComplete: () => {
            results[index] = result;
            if (rollOutput && results.every(value => value !== null)) {
              rollOutput.textContent = `Dados: ${results[0]} + ${results[1]} = ${results[0] + results[1]} · demonstração`;
            }
          }
        }, start);
        const center = index ? 1.1 : -.5;
        timeline.to(cube.position, {
          x: () => cube.position.x > center ? center - .35 : center + .35,
          z: () => 2.05 + Math.random() * .35,
          duration: 1.7,
          ease: 'power2.out'
        }, start);
        timeline.to(cube.position, { y: .78, duration: .4, ease: 'power2.out' }, start)
          .to(cube.position, { y: .2, duration: 1.3, ease: 'bounce.out' }, start + .4);
      });
    }

    resizeObserver = new ResizeObserver(() => {
      const { clientWidth: width, clientHeight: height } = host;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.fov = host.querySelector('.tower-roll')
        ? (camera.aspect < .85 ? 39 : 31)
        : (camera.aspect < .85 ? 43 : 33);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });
    resizeObserver.observe(host);
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      failed = true;
      if (demonstration && running) {
        timeline?.kill();
        timeline = null;
        running = false;
        void throwDice(true);
      }
      sync();
    }, { signal });
    sync();
  } catch (error) {
    console.warn('Renderização 3D da Torre indisponível; usando a versão 2D.', error);
    if (timeline) {
      timeline.kill();
      timeline = null;
    }
    if (renderer) {
      renderer.domElement.remove();
      renderer.dispose();
      renderer = null;
    }
    failed = true;
    sync();
  } finally {
    loading = false;
  }
}

button?.addEventListener('click', () => {
  if (demonstration && !running) return;
  paused = !paused;
  button.textContent = paused ? 'Retomar animação da Torre' : 'Pausar animação da Torre';
  sync();
}, { signal });
preference.addEventListener('change', () => {
  if (demonstration && preference.matches) {
    if (timeline) {
      timeline.kill();
      timeline = null;
    }
    running = false;
    gsap.set([...fallbackDice, fallbackImage].filter(Boolean), { clearProps: 'transform' });
    host.dataset.phase = 'static';
    controls();
    announce('Movimento reduzido ativo. Use Sortear dados para obter uma soma sem animação.', 'Demonstração sem movimento');
  } else if (demonstration && visible) {
    throwDice(true);
  } else if (!preference.matches) {
    initialize();
  }
  sync();
}, { signal });
document.addEventListener('visibilitychange', sync, { signal });
if (!window.IntersectionObserver || !window.ResizeObserver) {
  failed = true;
}
const visibility = window.IntersectionObserver ? new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  if (visible) {
    if (demonstration && !preference.matches) throwDice(true);
    else initialize();
  }
  sync();
}, { threshold: .05 }) : null;
if (visibility) visibility.observe(host);
else visible = true;

host.addEventListener('click', event => {
  if (event.target.closest('#tower-throw')) throwDice();
}, { signal });
if (demonstration) {
  controls();
  announce(preference.matches
    ? 'Movimento reduzido ativo. Use Sortear dados para obter uma soma sem animação.'
    : 'Ciclo automático: os dados param primeiro; depois a Torre se move e um novo lançamento começa.',
  preference.matches ? 'Demonstração sem movimento' : initialPrompt);
  if (!visibility && !preference.matches) void throwDice(true);
}

signal.addEventListener('abort', () => {
  visibility?.disconnect();
  resizeObserver?.disconnect();
  stop();
  timeline?.kill();
  scene?.traverse(object => {
    object.geometry?.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      material?.map?.dispose();
      material?.dispose();
    }
  });
  renderer?.dispose();
  renderer?.domElement.remove();
}, { once: true });
}
