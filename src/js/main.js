import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CanvasBuffer } from './CanvasBuffer.js';

// 1. Buffer de Pintura Panorámico (2048x1024)
const buffer = new CanvasBuffer(2048, 1024);
const canvasTexture = new THREE.CanvasTexture(buffer.canvas);
canvasTexture.colorSpace = THREE.SRGBColorSpace;
canvasTexture.generateMipmaps = false;
canvasTexture.minFilter = THREE.LinearFilter;
canvasTexture.magFilter = THREE.LinearFilter;

buffer.onTextureLoaded = () => {
  canvasTexture.needsUpdate = true;
};

// 2. Escena, Cámara y Renderizador
const container = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.2, 7.5);

const renderer = new THREE.WebGLRenderer({ canvas: container, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// -----------------------------------------------------------------
// 3. CIELO DIURNO (HDRI) Y LUZ SOLAR DIRECTA
// -----------------------------------------------------------------
const rgbeLoader = new RGBELoader();
const skyHdrUrl = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_06_puresky_1k.hdr';

rgbeLoader.load(skyHdrUrl, (hdrTexture) => {
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = hdrTexture;
  // NO se asigna a scene.environment para prevenir reflejos de espejo
});

// Luz solar diurna brillante y directa
const sunLight = new THREE.DirectionalLight(0xfffaed, 2.5);
sunLight.position.set(8, 12, 10);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

// -----------------------------------------------------------------
// 4. MAPAS PBR MATE (RELIEVE Y RUGOSIDAD CERO BRILLO)
// -----------------------------------------------------------------
const textureLoader = new THREE.TextureLoader();

const brickNormalMap = textureLoader.load(
  'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/red_brick_plaster_01/red_brick_plaster_01_nor_gl_1k.jpg'
);
brickNormalMap.wrapS = THREE.RepeatWrapping;
brickNormalMap.wrapT = THREE.RepeatWrapping;
brickNormalMap.repeat.set(3, 1.5);

// -----------------------------------------------------------------
// 5. ESTRUCTURA Y MODELADO DEL MURO 3D (GLTFLOADER + MESH 3D)
// -----------------------------------------------------------------
const wallGroup = new THREE.Group();
scene.add(wallGroup);

// Material 100% MATE sin reflejos (roughness=1.0, metalness=0.0, envMapIntensity=0.0)
const wallMat = new THREE.MeshStandardMaterial({
  map: canvasTexture,
  normalMap: brickNormalMap,
  normalScale: new THREE.Vector2(1.8, 1.8),
  roughness: 1.0,
  metalness: 0.0,
  envMapIntensity: 0.0
});

// Muro Frontal Principal (Lienzo Interactivo de Grafiti)
const wallGeo = new THREE.PlaneGeometry(10.0, 5.0);
const wallMesh = new THREE.Mesh(wallGeo, wallMat);
wallMesh.position.z = 0;
wallGroup.add(wallMesh);

// Carga de Modelo 3D GLTF/GLB de Muro
const gltfLoader = new GLTFLoader();
const wallGltfUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/BrickWall/glTF-Binary/BrickWall.glb';

gltfLoader.load(wallGltfUrl, (gltf) => {
  const gltfWall = gltf.scene;
  gltfWall.position.set(0, 0, -0.05);
  gltfWall.scale.set(3.5, 2.5, 1.0);

  gltfWall.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.roughness = 1.0;
      child.material.metalness = 0.0;
      child.material.envMapIntensity = 0.0;
    }
  });

  wallGroup.add(gltfWall);
}, undefined, () => {});

// Remate 3D Superior de Ladrillo Sobresaliente
const brickPillarMat = new THREE.MeshStandardMaterial({
  color: 0x8a3828,
  normalMap: brickNormalMap,
  roughness: 1.0,
  metalness: 0.0,
  envMapIntensity: 0.0
});

const topCoping = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.35, 0.8), brickPillarMat);
topCoping.position.set(0, 2.68, 0.08);
wallGroup.add(topCoping);

// Bloque 3D Trasero para profundidad real
const wallBackMesh = new THREE.Mesh(new THREE.BoxGeometry(10.2, 5.0, 0.6), brickPillarMat);
wallBackMesh.position.z = -0.31;
wallGroup.add(wallBackMesh);

// Base Inferior de Ladrillos
const bottomBase = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.25, 0.8), brickPillarMat);
bottomBase.position.set(0, -2.62, 0.08);
wallGroup.add(bottomBase);

// Suelo de Adoquines Urbano
const groundGeo = new THREE.PlaneGeometry(30, 20);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x6e382d, roughness: 1.0, metalness: 0.0, envMapIntensity: 0.0 });
const groundMesh = new THREE.Mesh(groundGeo, groundMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -2.7;
scene.add(groundMesh);

// -----------------------------------------------------------------
// 6. MÁSCARA Y PLANTILLAS INTERACTIVAS
// -----------------------------------------------------------------
const stencilGeo = new THREE.PlaneGeometry(1.8, 1.8);
const previewMat = new THREE.MeshBasicMaterial({
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide
});
const previewMesh = new THREE.Mesh(stencilGeo, previewMat);
previewMesh.position.z = 0.05;
wallGroup.add(previewMesh);

let placedStencils = [];
let currentTool = 'm';
let currentColor = '#ff0055';
let isPainting = false;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentUV = null;
let lastUV = null;

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

  wallGroup.add(mesh);

  placedStencils.push({
    type: currentTool,
    uvX: currentUV.x,
    uvY: currentUV.y,
    mesh: mesh
  });
}

function liftStencils() {
  placedStencils.forEach(s => wallGroup.remove(s.mesh));
  placedStencils = [];
}

// -----------------------------------------------------------------
// 7. EVENTOS Y PROGRESO DE REBELIÓN
// -----------------------------------------------------------------
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

function updateUIProgress() {
  const { completedCount, total, allDone } = buffer.getRebellionProgress();
  const pct = Math.floor((completedCount / total) * 100);

  if (progressFill) progressFill.style.width = `${pct}%`;

  if (allDone) {
    if (progressText) {
      progressText.innerHTML = '<strong style="color: #ffff00;">¡REBELIÓN COMPLETA! MTV UNLEASHED ⚡</strong>';
    }
    buffer.triggerMTVReveal();
  } else {
    if (progressText) {
      progressText.innerText = `Cubre los carteles corporativos (${completedCount}/${total})`;
    }
  }
}

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
  updateUIProgress();
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

    const localPoint = wallGroup.worldToLocal(point.clone());
    previewMesh.position.x = localPoint.x;
    previewMesh.position.y = localPoint.y;
  } else {
    currentUV = null;
  }
}

window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#ui')) return;

  if (currentTool === 'spray') {
    isPainting = true;
    updateMouseUV(e);
    lastUV = currentUV ? { ...currentUV } : null;
  } else {
    placeStencilAtCurrentUV();
  }
  
  updateMouseUV(e);
});

window.addEventListener('pointermove', (e) => {
  updateMouseUV(e);

  const rotX = (e.clientY / window.innerHeight - 0.5) * 0.08;
  const rotY = (e.clientX / window.innerWidth - 0.5) * 0.08;
  wallGroup.rotation.x = rotX;
  wallGroup.rotation.y = rotY;
});

window.addEventListener('pointerup', () => {
  isPainting = false;
  lastUV = null;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -----------------------------------------------------------------
// 8. BUCLE DE RENDERIZADO
// -----------------------------------------------------------------
let lastSprayTime = 0;

function animate(time) {
  requestAnimationFrame(animate);

  if (isPainting && currentUV && currentTool === 'spray') {
    if (time - lastSprayTime > 16) {
      const startUV = lastUV || currentUV;
      buffer.sprayPaint(startUV, currentUV, currentColor, 65, placedStencils);
      updateUIProgress();
      canvasTexture.needsUpdate = true;
      lastSprayTime = time;
      lastUV = { ...currentUV };
    }
  }

  renderer.render(scene, camera);
}

animate(0);