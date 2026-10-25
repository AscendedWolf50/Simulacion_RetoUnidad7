import * as THREE from 'three';
import { CanvasBuffer } from './CanvasBuffer.js';

// 1. Instanciar Buffer 2D y Textura de Three.js
const buffer = new CanvasBuffer(2048, 2048);
const canvasTexture = new THREE.CanvasTexture(buffer.canvas);
canvasTexture.colorSpace = THREE.SRGBColorSpace;

// 2. Configurar Escena, Cámara y Renderizador 3D
const container = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 7);

const renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Iluminación
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 5, 4);
scene.add(dirLight);

// 3. Malla 3D del lienzo
const geometry = new THREE.PlaneGeometry(5.5, 5.5);
const material = new THREE.MeshStandardMaterial({
  map: canvasTexture,
  roughness: 0.35,
  metalness: 0.1
});

const wallMesh = new THREE.Mesh(geometry, material);
scene.add(wallMesh);

// 4. Lógica de Interacción
let currentStencil = 'm';
let isPainting = false;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.querySelectorAll('.btn[data-stencil]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn[data-stencil]').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentStencil = e.target.getAttribute('data-stencil');
  });
});

document.getElementById('btn-clear').addEventListener('click', () => {
  buffer.resetToCorporateGrid();
  canvasTexture.needsUpdate = true;
});

function paint(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(wallMesh);

  if (intersects.length > 0 && intersects[0].uv) {
    const uv = intersects[0].uv;
    buffer.drawStencil(currentStencil, uv.x, uv.y);
    canvasTexture.needsUpdate = true;
  }
}

window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#ui')) return;
  isPainting = true;
  paint(e);
});

window.addEventListener('pointermove', (e) => {
  if (isPainting) paint(e);

  // Paraje de inclinación 3D según posición del cursor
  const rotX = (e.clientY / window.innerHeight - 0.5) * 0.22;
  const rotY = (e.clientX / window.innerWidth - 0.5) * 0.22;
  wallMesh.rotation.x = rotX;
  wallMesh.rotation.y = rotY;
});

window.addEventListener('pointerup', () => isPainting = false);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Bucle de renderizado
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();