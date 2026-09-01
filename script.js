import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const canvas = document.getElementById('bg-canvas');
const homeSection = document.getElementById('home');
const scene = new THREE.Scene();

function getSize() {
  return {
    width: homeSection.clientWidth,
    height: homeSection.clientHeight  
  };
}

const { width: initWidth, height: initHeight } = getSize();

const camera = new THREE.PerspectiveCamera(
  50,
  initWidth / initHeight,
  0.1,
  1000
);

camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true
});

renderer.setSize(initWidth, initHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const ambient = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(3, 5, 2);
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2);
scene.add(hemiLight);

const loader = new GLTFLoader();
let model;
let baseFitDistance = 0;
let baseModelY = 0;

function getXOffsetRatio() {
  return window.innerWidth <= 768 ? 0 : 0.70;
}

function applyModelOffset() {
  if (!model || !baseFitDistance) return;
  model.position.x = baseFitDistance * getXOffsetRatio();
}

loader.load(
  'pirate_patrick.glb',
  (gltf) => {
    model = gltf.scene;
    scene.add(model);

    model.traverse((child) => {
      if (child.isMesh) {
        console.log(
          'Mesh:',
          child.name,
          '| Material:',
          child.material,
          '| Visible:',
          child.visible
        );

        if (child.material) {
          child.material.side = THREE.DoubleSide;
        }
      }
    });

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    model.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fitDistance =
      maxDim / (2 * Math.tan((Math.PI * camera.fov) / 360));

    baseFitDistance = fitDistance;

    const CAMERA_DISTANCE_MULTIPLIER = 1.8;

    const MODEL_Y_OFFSET = 0.2;
    model.position.y += fitDistance * MODEL_Y_OFFSET;
    baseModelY = model.position.y;

    const MODEL_ROTATION_Y = -0.5; 
    model.rotation.y = MODEL_ROTATION_Y;

    applyModelOffset();

    camera.position.set(
      0,
      0,
      fitDistance * CAMERA_DISTANCE_MULTIPLIER
    );

    camera.near = fitDistance / 100;
    camera.far = fitDistance * 100;
    camera.updateProjectionMatrix();

    console.log(
      'Model size:',
      size.x.toFixed(2),
      size.y.toFixed(2),
      size.z.toFixed(2),
      '| Camera distance:',
      (fitDistance * CAMERA_DISTANCE_MULTIPLIER).toFixed(2)
    );
  },
  (xhr) => {
    console.log(
      `Loading model: ${(xhr.loaded / xhr.total * 100).toFixed(0)}%`
    );
  },
  (error) => {
    console.error(
      'Error loading pirate_patrick.glb:',
      error
    );
  }
);

const clock = new THREE.Clock();

const FLOAT_AMPLITUDE = 0.06; 
const FLOAT_SPEED = 2.0;     

function animate() {
  requestAnimationFrame(animate);

  if (model && baseFitDistance) {
    const t = clock.getElapsedTime();
    const bobOffset = Math.sin(t * FLOAT_SPEED) * FLOAT_AMPLITUDE * baseFitDistance;
    model.position.y = baseModelY + bobOffset;
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  const { width, height } = getSize();

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

  applyModelOffset();
});

(function () {
  const canvas = document.getElementById('particle-bg');
  const ctx = canvas.getContext('2d');

  let width, height;
  let particles = [];

  const PARTICLE_DENSITY = 14000; 
  const MAX_LINK_DISTANCE = 140;  
  const DOT_SPEED = 1.00;         
  const DOT_RADIUS_MIN = 1.5;
  const DOT_RADIUS_MAX = 3;
  const DOT_COLOR = 'rgba(100, 99, 99, 0.9)';
  const LINE_COLOR = '150,150,150';  
  const BG_COLOR = '#fafafa';        

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
  }

  function createParticles() {
    const count = Math.floor((width * height) / PARTICLE_DENSITY);
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * DOT_SPEED,
        vy: (Math.random() - 0.5) * DOT_SPEED,
        r: Math.random() * (DOT_RADIUS_MAX - DOT_RADIUS_MIN) + DOT_RADIUS_MIN
      });
    }
  }

  function update() {
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x <= 0 || p.x >= width) p.vx *= -1;
      if (p.y <= 0 || p.y >= height) p.vy *= -1;
    }
  }

  function draw() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i];
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MAX_LINK_DISTANCE) {
          const opacity = (1 - dist / MAX_LINK_DISTANCE) * 0.5;
          ctx.strokeStyle = `rgba(${LINE_COLOR},${opacity.toFixed(2)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = DOT_COLOR;
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function animate() {
    update();
    draw();
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });

  resize();
  createParticles();
  animate();
})();