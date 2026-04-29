import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

/**
 * Estrae l'estensione da un file URL o path.
 * Es: "/uploads/123456.glb" → "glb"
 */
export function getFileExtension(fileUrl) {
  if (!fileUrl) return '';
  const cleanUrl = fileUrl.split('?')[0].split('#')[0];
  const parts = cleanUrl.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Wrappa un modello FBX/OBJ in un Group con normalizzazione scala.
 * Il modello interno viene scalato, il Group esterno riceve il transform della mappa.
 * Così applyTransformToModel (che setta scale sul root) non sovrascrive la normalizzazione.
 */
function wrapAndNormalize(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim > 10) {
    const scale = 1 / maxDim;
    model.scale.setScalar(scale);
  }

  // Rotazione per allineare asse Y-up (FBX) con Z-up (mappa)
  model.rotation.x = Math.PI / 2;

  const wrapper = new THREE.Group();
  wrapper.add(model);
  return wrapper;
}

/**
 * Assicura che tutti i mesh abbiano materiali compatibili con il contesto WebGL condiviso.
 * FBX usa MeshPhongMaterial che potrebbe non renderizzare nel contesto MapLibre.
 * Converte a MeshStandardMaterial e forza visibilita.
 */
function ensureVisibleMaterials(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;

    const fixMaterial = (mat) => {
      const color = (mat && mat.color) ? mat.color.clone() : new THREE.Color(0xcccccc);
      const opacity = (mat && mat.opacity != null) ? mat.opacity : 1.0;

      if (mat && mat.dispose) mat.dispose();

      const newMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide,
        transparent: opacity < 1.0,
        opacity,
      });
      newMat.needsUpdate = true;
      return newMat;
    };

    if (Array.isArray(child.material)) {
      child.material = child.material.map(fixMaterial);
    } else {
      child.material = fixMaterial(child.material);
    }
  });
}

/**
 * Carica un modello 3D dall'URL, selezionando il loader in base all'estensione.
 * Per FBX e OBJ fa fetch manuale dei dati per evitare problemi con URL senza estensione
 * (Three.js FileLoader determina il responseType dall'URL).
 * Ritorna Promise<THREE.Object3D>.
 */
export function loadModelFromUrl(url, extension, { onProgress } = {}) {
  const ext = (extension || 'glb').toLowerCase();

  switch (ext) {
    case 'glb':
    case 'gltf': {
      return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(url, (gltf) => resolve(gltf.scene), onProgress, reject);
      });
    }
    case 'obj': {
      return fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status} loading OBJ`);
          return res.text();
        })
        .then(text => {
          const manager = new THREE.LoadingManager();
          manager.onError = () => {};
          const loader = new OBJLoader(manager);
          const obj = loader.parse(text);
          ensureVisibleMaterials(obj);
          return wrapAndNormalize(obj);
        });
    }
    case 'fbx': {
      return fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status} loading FBX`);
          return res.arrayBuffer();
        })
        .then(buffer => {
          const manager = new THREE.LoadingManager();
          manager.onError = () => {};
          const loader = new FBXLoader(manager);
          const fbx = loader.parse(buffer, '');
          if (fbx.animations && fbx.animations.length > 0) {
            fbx.animations = [];
          }
          ensureVisibleMaterials(fbx);
          return wrapAndNormalize(fbx);
        });
    }
    default:
      return Promise.reject(new Error(`Formato 3D non supportato: .${ext}`));
  }
}
