import * as THREE from 'three';
import { boundsOf, cameraDistance } from './framing.js';

export interface MeshData {
  positions: Float32Array;
  normals?: Float32Array;
  index: Uint32Array | Uint16Array;
}

const FOV = 30;

function toMesh(data: MeshData, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.index, 1));
  if (data.normals) geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  else geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

/** Construit la scène : maillages centrés, lumières douces, caméra cadrée sur la hauteur. */
export function buildScene(meshes: MeshData[], color: string) {
  const scene = new THREE.Scene();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const group = new THREE.Group();
  for (const data of meshes) group.add(toMesh(data, material));
  const bounds = boundsOf(meshes.map((m) => m.positions));
  const center = bounds.min.map((v, i) => (v + (bounds.max[i] ?? v)) / 2) as [
    number,
    number,
    number,
  ];
  group.position.set(-center[0], -center[1], -center[2]);
  const pivot = new THREE.Group();
  pivot.add(group);
  scene.add(pivot, new THREE.HemisphereLight(0xffffff, 0x8a8076, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(1, 2, 3);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10000);
  camera.position.set(0, 0, cameraDistance(bounds, FOV));
  return { scene, camera, pivot, dispose: () => material.dispose() };
}
