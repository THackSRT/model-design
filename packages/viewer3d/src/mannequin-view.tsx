import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildScene, type GarmentLayer, type MeshData } from './scene.js';

export interface MannequinViewProps {
  meshes: MeshData[];
  /** Couleur du corps, lue dans les jetons de design par l'appelant. */
  color: string;
  label: string;
  /** Message affiché à la place de la vue sans WebGL (traduit par l'appelant). */
  webglUnavailableLabel: string;
  /** Vêtement porté, dessiné par-dessus le corps ; absent : corps seul. */
  garment?: GarmentLayer;
}

function attachRotation(canvas: HTMLCanvasElement, pivot: THREE.Object3D, render: () => void) {
  let last: number | undefined;
  const down = (e: PointerEvent) => (last = e.clientX);
  const up = () => (last = undefined);
  const move = (e: PointerEvent) => {
    if (last === undefined) return;
    pivot.rotation.y += (e.clientX - last) * 0.01;
    last = e.clientX;
    render();
  };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointerup', up);
  canvas.addEventListener('pointermove', move);
  return () => {
    canvas.removeEventListener('pointerdown', down);
    window.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointermove', move);
  };
}

function mount(
  canvas: HTMLCanvasElement,
  meshes: MeshData[],
  color: string,
  garment?: GarmentLayer,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const { scene, camera, pivot, dispose } = buildScene(meshes, color, garment);
  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const detach = attachRotation(canvas, pivot, render);
  return () => {
    detach();
    observer.disconnect();
    dispose();
    renderer.dispose();
  };
}

function hasWebGL(): boolean {
  const probe = document.createElement('canvas');
  return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
}

/** Mannequin en 3D : glisser pour tourner. Sans WebGL, un message remplace la vue. */
export function MannequinView({
  meshes,
  color,
  label,
  webglUnavailableLabel,
  garment,
}: MannequinViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webgl] = useState(hasWebGL);
  useEffect(() => {
    if (!webgl || !canvasRef.current || meshes.length === 0) return;
    return mount(canvasRef.current, meshes, color, garment);
  }, [webgl, meshes, color, garment]);
  if (!webgl) return <p role="status">{webglUnavailableLabel}</p>;
  return (
    <canvas
      ref={canvasRef}
      aria-label={label}
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    />
  );
}
