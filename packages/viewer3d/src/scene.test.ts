import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildScene, type GarmentLayer } from './scene.js';
import { rectangle } from '../test/fixtures.js';

const garment: GarmentLayer = {
  mesh: rectangle(0, 80, 30, 100),
  color: '#c9c2b6',
  tightColor: '#b42318',
  tightZones: [{ fromMm: 900, toMm: 1000 }],
};

function meshesOf(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((o) => o instanceof THREE.Mesh && meshes.push(o));
  return meshes;
}

describe('scène avec vêtement', () => {
  it('sans vêtement : le corps seul', () => {
    expect(meshesOf(buildScene([rectangle(0, 0, 20, 170)], '#e9e4dc').scene)).toHaveLength(1);
  });

  it('avec vêtement : un second maillage, transparent, teinté dans la zone trop juste', () => {
    const { scene } = buildScene([rectangle(0, 0, 20, 170)], '#e9e4dc', garment);
    const meshes = meshesOf(scene);
    expect(meshes).toHaveLength(2);
    const material = meshes[1]?.material as THREE.MeshStandardMaterial;
    expect(material.transparent).toBe(true);
    expect(material.vertexColors).toBe(true);
    const colors = meshes[1]?.geometry.getAttribute('color');
    const alert = new THREE.Color('#b42318');
    const fabric = new THREE.Color('#c9c2b6');
    // Sommets 0 et 1 à 80 cm (hors zone) ; 2 et 3 à 100 cm (dans la zone, 1000 mm).
    expect(colors?.getX(0)).toBeCloseTo(fabric.r);
    expect(colors?.getY(0)).toBeCloseTo(fabric.g);
    expect(colors?.getX(2)).toBeCloseTo(alert.r);
    expect(colors?.getY(2)).toBeCloseTo(alert.g);
  });
});

describe('scène avec vêtement drapé', () => {
  const layer = {
    name: 'front',
    positions: Float32Array.of(0, 80, 0, 30, 80, 0, 30, 100, 0),
    normals: new Float32Array(0),
    index: Uint32Array.of(0, 1, 2),
    tight: [false, false, true],
  };
  const draped = { layers: [layer], color: '#c9c2b6', tightColor: '#b42318' };

  it('ajoute une maille par pièce, teintée sur les sommets serrés', () => {
    const { scene } = buildScene([rectangle(0, 0, 20, 170)], '#e9e4dc', undefined, draped);
    const meshes = meshesOf(scene);
    expect(meshes).toHaveLength(2);
    const colors = meshes[1]?.geometry.getAttribute('color');
    expect(colors?.getX(0)).toBeCloseTo(new THREE.Color('#c9c2b6').r);
    expect(colors?.getX(2)).toBeCloseTo(new THREE.Color('#b42318').r);
  });

  it('libère géométries et matériaux au démontage', () => {
    const { scene, dispose } = buildScene([rectangle(0, 0, 20, 170)], '#e9e4dc', undefined, draped);
    const mesh = meshesOf(scene)[1] as THREE.Mesh;
    let geometryDisposed = 0;
    let materialDisposed = 0;
    mesh.geometry.addEventListener('dispose', () => geometryDisposed++);
    (mesh.material as THREE.Material).addEventListener('dispose', () => materialDisposed++);
    dispose();
    expect([geometryDisposed, materialDisposed]).toEqual([1, 1]);
  });
});
