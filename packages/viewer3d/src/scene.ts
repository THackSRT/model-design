import * as THREE from 'three';
import { boundsOf, cameraDistance } from './framing.js';
import { type TightBand, tightVertices } from './garment-colors.js';
import type { DrapedLayer } from './glb.js';

export interface MeshData {
  positions: Float32Array;
  normals?: Float32Array;
  index: Uint32Array | Uint16Array;
}

/** Vêtement porté : maillage (cm), couleurs lues dans les jetons par l'appelant, zones trop justes. */
export interface GarmentLayer {
  mesh: MeshData;
  color: string;
  /** Teinte d'alerte des zones trop justes. */
  tightColor: string;
  tightZones: readonly TightBand[];
}

/** Vêtement drapé lu d'un GLB (lu par readDrapedGlb, déjà en cm) : une couche par pièce, zones serrées par sommet. */
export interface DrapedGarmentLayer {
  layers: readonly DrapedLayer[];
  color: string;
  /** Teinte d'alerte des sommets à aisance négative. */
  tightColor: string;
}

const FOV = 30;
const GARMENT_OPACITY = 0.9;

/** Vêtement : couleur par sommet (tissu, ou alerte dans une zone trop juste), légère transparence. */
function toGarmentMesh(layer: GarmentLayer): THREE.Mesh {
  const mesh = toMesh(layer.mesh, new THREE.MeshStandardMaterial());
  const base = new THREE.Color(layer.color);
  const alert = new THREE.Color(layer.tightColor);
  const colors = tightVertices(layer.mesh.positions, layer.tightZones).flatMap((tight) =>
    (tight ? alert : base).toArray(),
  );
  mesh.geometry.setAttribute('color', new THREE.BufferAttribute(Float32Array.from(colors), 3));
  mesh.material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: GARMENT_OPACITY,
  });
  return mesh;
}

function garmentMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: GARMENT_OPACITY,
  });
}

/** Une maille par pièce drapée ; couleur par sommet, alerte là où l'aisance est négative. */
function toDrapedMeshes(draped: DrapedGarmentLayer): THREE.Mesh[] {
  const base = new THREE.Color(draped.color);
  const alert = new THREE.Color(draped.tightColor);
  return draped.layers.map((layer) => {
    const data: MeshData = {
      positions: layer.positions,
      index: layer.index,
      ...(layer.normals.length > 0 ? { normals: layer.normals } : {}),
    };
    const mesh = toMesh(data, garmentMaterial());
    const colors = layer.tight.flatMap((tight) => (tight ? alert : base).toArray());
    mesh.geometry.setAttribute('color', new THREE.BufferAttribute(Float32Array.from(colors), 3));
    return mesh;
  });
}

function toMesh(data: MeshData, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.index, 1));
  if (data.normals) geometry.setAttribute('normal', new THREE.BufferAttribute(data.normals, 3));
  else geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

/** Construit la scène : maillages centrés, lumières douces, caméra cadrée sur la hauteur. */
export function buildScene(
  meshes: MeshData[],
  color: string,
  garment?: GarmentLayer,
  draped?: DrapedGarmentLayer,
) {
  const scene = new THREE.Scene();
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  const group = new THREE.Group();
  for (const data of meshes) group.add(toMesh(data, material));
  const garmentMesh = garment ? toGarmentMesh(garment) : undefined;
  if (garmentMesh) group.add(garmentMesh);
  const drapedMeshes = draped ? toDrapedMeshes(draped) : [];
  group.add(...drapedMeshes);
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
  const dispose = () => {
    material.dispose();
    garmentMesh?.geometry.dispose();
    (garmentMesh?.material as THREE.Material | undefined)?.dispose();
    for (const m of drapedMeshes) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
  };
  return { scene, camera, pivot, bounds, dispose };
}
