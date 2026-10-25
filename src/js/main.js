import * as THREE from 'three';
import { CanvasBuffer } from './CanvasBuffer.js';

// 1. Instanciar Buffer de Pintura y Textura 3D
const buffer = new CanvasBuffer(2048, 2048);
const canvasTexture = new THREE.CanvasTexture(buffer.canvas);
canvasTexture.colorSpace = THREE.SRGBColorSpace;

// 2. Escena, Cámara y Renderer 3D
const container = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 7);

const renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Iluminación
const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(5, 5, 4);
scene.add(dirLight);

// 3. Malla 3D del Afiche Suizo
const geometry = new THREE.PlaneGeometry(5.5, 5.5);
const material = new THREE.MeshStandardMaterial({
  map: canvasTexture,
  roughness: 0.4,
  metalness: 0.05
});

const wallMesh = new THREE.Mesh(geometry, material);
scene.add(wallMesh);

// 4. Malla para la Vista Previa del Stencil bajo el Cursor
const stencilGeo = new THREE.PlaneGeometry(1.8, 1.8);
const previewMat = new THREE.MeshBasicMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide
});
const previewMesh = new THREE.Mesh(stencilGeo, previewMat);
previewMesh.position.z = 0.05;
scene.add(previewMesh);

// -----------------------------------------------------------------
// SISTEMA DE PLANTILLAS COLOCADAS EN LA PARED
// -----------------------------------------------------------------
let placedStencils = [];
let currentTool = 'm';
let currentColor = '#ff0055';
let isPainting = false;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentUV = null;

function updatePreviewMesh() {
  if (currentTool === 'spray') {
    previewMesh.visible = false;
  } else {
    previewMesh.visible = true;
    const pCanvas = buffer.getStencilPreviewCanvas(currentTool);
    previewMesh.material.map = new THREE.CanvasTexture(pCanvas);
    previewMesh.material.map.colorSpace = THREE.SRGBColorSpace;
    previewMesh.material.needsUpdate = true;
  }
}

updatePreviewMesh();

function placeStencilAtCurrentUV() {
  if (!currentUV || currentTool === 'spray') return;

  const pCanvas = buffer.getStencilPreviewCanvas(currentTool);
  const tex = new THREE.CanvasTexture(pCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const placedMat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(stencilGeo, placedMat);
  mesh.position.x = previewMesh.position.x;
  mesh.position.y = previewMesh.position.y;
  mesh.position.z = 0.02 + placedStencils.length * 0.002;
  mesh.rotation.copy(wallMesh.rotation);

  scene.add(mesh);

  placedStencils.push({
    type: currentTool,
    uvX: currentUV.x,
    uvY: currentUV.y,
    mesh: mesh
  });
}

function liftStencils() {
  placedStencils.forEach(s => scene.remove(s.mesh));
  placedStencils = [];
}

// -----------------------------------------------------------------
// EVENTOS DE LA INTERFAZ
// -----------------------------------------------------------------

document.querySelectorAll('.btn[data-stencil]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.btn[data-stencil]').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentTool = e.target.getAttribute('data-stencil');
    updatePreviewMesh();
  });
});

document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', (e) => {
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    e.target.classList.add('active');
    currentColor = e.target.getAttribute('data-color');
  });
});

document.getElementById('btn-lift').addEventListener('click', () => {
  liftStencils();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  liftStencils();
  buffer.resetToCorporateGrid();
  canvasTexture.needsUpdate = true;
});

function updateMouseUV(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(wallMesh);

  if (intersects.length > 0 && intersects[0].uv) {
    currentUV = intersects[0].uv;
    const point = intersects[0].point;

    previewMesh.position.x = point.x;
    previewMesh.position.y = point.y;
  } else {
    currentUV = null;
  }
}

window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#ui')) return;

  if (currentTool === 'spray') {
    // Solo activa el flujo de pintura si la herramienta es Aerosol Libre
    isPainting = true;
  } else {
    // Si es un stencil, unicamente se fija en la pared sin pintar
    placeStencilAtCurrentUV();
  }
  
  updateMouseUV(e);
});

window.addEventListener('pointermove', (e) => {
  updateMouseUV(e);

  const rotX = (e.clientY / window.innerHeight - 0.5) * 0.18;
  const rotY = (e.clientX / window.innerWidth - 0.5) * 0.18;
  wallMesh.rotation.x = rotX;
  wallMesh.rotation.y = rotY;
  previewMesh.rotation.x = rotX;
  previewMesh.rotation.y = rotY;

  placedStencils.forEach(s => {
    s.mesh.rotation.x = rotX;
    s.mesh.rotation.y = rotY;
  });
});

window.addEventListener('pointerup', () => isPainting = false);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -----------------------------------------------------------------
// BUCLE DE RENDERIZADO
// -----------------------------------------------------------------
let lastSprayTime = 0;

function animate(time) {
  requestAnimationFrame(animate);

  if (isPainting && currentUV && currentTool === 'spray') {
    if (time - lastSprayTime > 16) {
      buffer.sprayPaint(currentUV.x, currentUV.y, currentColor, 140, placedStencils);
      canvasTexture.needsUpdate = true;
      lastSprayTime = time;
    }
  }

  renderer.render(scene, camera);
}

animate(0);