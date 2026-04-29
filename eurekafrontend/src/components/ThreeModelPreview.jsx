import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { loadModelFromUrl } from '../utils/modelLoaderUtils.js';
import { Box, CircularProgress } from '@mui/material';

const ThreeModelPreview = ({ src, extension, style }) => {
  const canvasRef = useRef(null);
  const mountedRef = useRef(true);
  const animFrameRef = useRef(null);
  const rendererRef = useRef(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    mountedRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas || !src) return;

    const width = canvas.parentElement.clientWidth || 400;
    const height = 300;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf5f5f5, 1);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    camera.position.set(2, 1.5, 2);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 2, 3);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight2.position.set(-1, -1, -2);
    scene.add(dirLight2);

    // Controls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;

    // Animation loop
    const animate = () => {
      if (!mountedRef.current) return;
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    // Load model
    loadModelFromUrl(src, extension)
      .then((model) => {
        if (!mountedRef.current) return;

        // Auto-center e auto-scale
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 2 / maxDim;
          model.scale.multiplyScalar(scale);
        }
        model.position.sub(center.multiplyScalar(model.scale.x));

        scene.add(model);

        // Posiziona camera in base alla dimensione
        const distance = 3;
        camera.position.set(distance, distance * 0.7, distance);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

        setLoading(false);
        animate();
      })
      .catch((error) => {
        console.error('ThreeModelPreview: error loading model:', error);
        if (mountedRef.current) setLoading(false);
      });

    // Start animation even while loading (for controls)
    animate();

    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, [src, extension]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 300, ...style }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {loading && (
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'rgba(245, 245, 245, 0.8)'
        }}>
          <CircularProgress size={32} />
        </Box>
      )}
    </Box>
  );
};

export default ThreeModelPreview;
