import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreeGlobalBackground: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect Software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: false, // Opaque so canvas provides the full background
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Scene & Fog Setup (Theme Reactive)
    const scene = new THREE.Scene();
    const isInitiallyDark = document.documentElement.classList.contains('dark');
    scene.background = new THREE.Color(isInitiallyDark ? 0x030712 : 0xf8fafc);
    scene.fog = new THREE.FogExp2(isInitiallyDark ? 0x030712 : 0xf1f5f9, 0.025);

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    camera.position.set(0, 4.5, 13);
    camera.lookAt(0, 0, 0);

    // 4. Lighting Rig
    const ambientLight = new THREE.AmbientLight(isInitiallyDark ? 0x0ea5e9 : 0x38bdf8, 0.65);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(
      isInitiallyDark ? 0x38bdf8 : 0x0284c7, 
      isInitiallyDark ? 0x030712 : 0xffffff, 
      1.1
    );
    scene.add(hemiLight);

    // Dynamic Cursor Tracking Light
    const cursorLight = new THREE.PointLight(0x06b6d4, 6.0, 26, 1.2);
    cursorLight.position.set(0, 3, 4);
    scene.add(cursorLight);

    // Secondary Accent Light (Emerald / Teal)
    const accentLight = new THREE.PointLight(0x10b981, 3.5, 30, 1.4);
    accentLight.position.set(7, -1, -5);
    scene.add(accentLight);

    // 5. Massive 3D Mathematical Synaptic Wave Surface
    const gridCols = isSoftwareGl ? 40 : 70;
    const gridRows = isSoftwareGl ? 30 : 55;
    const planeGeo = new THREE.PlaneGeometry(42, 32, gridCols, gridRows);
    planeGeo.rotateX(-Math.PI / 2.3);

    const posAttr = planeGeo.attributes.position;
    const origY = new Float32Array(posAttr.count);
    const origX = new Float32Array(posAttr.count);
    const origZ = new Float32Array(posAttr.count);

    for (let i = 0; i < posAttr.count; i++) {
      origX[i] = posAttr.getX(i);
      origY[i] = posAttr.getY(i);
      origZ[i] = posAttr.getZ(i);
    }

    const waveMaterial = new THREE.MeshStandardMaterial({
      color: isInitiallyDark ? 0x0284c7 : 0x0284c7,
      emissive: isInitiallyDark ? 0x034a75 : 0x38bdf8,
      emissiveIntensity: isInitiallyDark ? 0.45 : 0.2,
      wireframe: true,
      roughness: 0.25,
      metalness: 0.85,
      transparent: true,
      opacity: isInitiallyDark ? 0.42 : 0.25
    });
    const waveMesh = new THREE.Mesh(planeGeo, waveMaterial);
    waveMesh.position.set(0, -2.8, -3);
    scene.add(waveMesh);

    // 6. Futuristic Orbital Medical Ring (Visible in distance, reacts strongly to scroll)
    const ringGeo = new THREE.TorusGeometry(7.5, 0.12, 24, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: isInitiallyDark ? 0.35 : 0.18
    });
    const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
    orbitalRing.position.set(0, 0, -14);
    orbitalRing.rotation.x = Math.PI / 3.5;
    scene.add(orbitalRing);

    const ringGeo2 = new THREE.TorusGeometry(5.2, 0.08, 16, 80);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      wireframe: true,
      transparent: true,
      opacity: isInitiallyDark ? 0.3 : 0.15
    });
    const orbitalRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    orbitalRing2.position.set(0, 0, -14);
    orbitalRing2.rotation.y = Math.PI / 4;
    scene.add(orbitalRing2);

    // 7. Floating Synaptic Nodes / Quantum Medical Particles
    const particleCount = isSoftwareGl ? 140 : 320;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 44;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 22;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 28;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Particle Texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(56, 189, 248, 1)');
      grad.addColorStop(0.35, 'rgba(6, 182, 212, 0.7)');
      grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(pCanvas);
    particleTexture.colorSpace = THREE.SRGBColorSpace;

    const particleMaterial = new THREE.PointsMaterial({
      color: isInitiallyDark ? 0x38bdf8 : 0x0284c7,
      size: 0.42,
      map: particleTexture,
      transparent: true,
      opacity: isInitiallyDark ? 0.75 : 0.45,
      blending: isInitiallyDark ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(particleGeo, particleMaterial);
    scene.add(particles);

    // 8. Interaction & Scroll Tracking
    const target = {
      mouseX: 0,
      mouseY: 0,
      currentMouseX: 0,
      currentMouseY: 0,
      scrollY: window.scrollY || 0,
      targetScrollY: window.scrollY || 0,
      scrollVelocity: 0,
      lastScrollY: window.scrollY || 0
    };

    const handlePointerMove = (e: MouseEvent) => {
      target.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      target.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleScroll = () => {
      const currentS = window.scrollY || document.documentElement.scrollTop || 0;
      target.targetScrollY = currentS;
      target.scrollVelocity = Math.abs(currentS - target.lastScrollY);
      target.lastScrollY = currentS;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // Listen to Theme changes via MutationObserver on html class
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      scene.background = new THREE.Color(isDark ? 0x030712 : 0xf8fafc);
      if (scene.fog) {
        scene.fog.color.set(isDark ? 0x030712 : 0xf1f5f9);
      }
      waveMaterial.opacity = isDark ? 0.42 : 0.25;
      ringMat.opacity = isDark ? 0.35 : 0.18;
      ringMat2.opacity = isDark ? 0.3 : 0.15;
      particleMaterial.opacity = isDark ? 0.75 : 0.45;
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    // 9. Animation Loop
    let frameId = 0;
    let clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 8);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 60);
        }
      };
      frameId = window.setTimeout(poll, 8);
    }

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Exponential damping
      target.currentMouseX += (target.mouseX - target.currentMouseX) * 0.055;
      target.currentMouseY += (target.mouseY - target.currentMouseY) * 0.055;
      target.scrollY += (target.targetScrollY - target.scrollY) * 0.07;
      target.scrollVelocity *= 0.92;

      // Cursor light tracking
      cursorLight.position.x = target.currentMouseX * 13;
      cursorLight.position.y = target.currentMouseY * 5 + 3.2;
      cursorLight.position.z = 4.5 + target.currentMouseY * 2;

      // PROMINENT SCROLL REACTION:
      // As user scrolls down the page, camera smoothly travels and tilts through 3D space
      const scrollFactor = target.scrollY * 0.0035;
      const scrollWaveBoost = Math.min(target.scrollVelocity * 0.03, 1.8);

      camera.position.x = target.currentMouseX * 2.2;
      camera.position.y = 4.5 - (scrollFactor * 0.8) + (target.currentMouseY * 1.2);
      camera.position.z = 13 - Math.sin(scrollFactor * 0.4) * 3;
      camera.rotation.x = -0.15 + (target.currentMouseY * 0.08) - (scrollFactor * 0.04);
      camera.rotation.y = -target.currentMouseX * 0.12;

      // Orbital Rings Rotation with Scroll Reaction
      orbitalRing.rotation.z = elapsed * 0.15 + scrollFactor * 0.5;
      orbitalRing.rotation.x = (Math.PI / 3.5) + Math.sin(scrollFactor) * 0.2;
      orbitalRing2.rotation.z = -elapsed * 0.2 - scrollFactor * 0.7;

      // Undulate 3D Wave Surface
      const pos = planeGeo.attributes.position;
      const timeFactor = elapsed * 1.25;

      for (let i = 0; i < pos.count; i++) {
        const ox = origX[i];
        const oz = origZ[i];
        
        // Multi-harmonic bio-sine wave with scroll amplitude boost
        const wave1 = Math.sin(ox * 0.25 + timeFactor) * (0.8 + scrollWaveBoost);
        const wave2 = Math.cos(oz * 0.28 + timeFactor * 0.85) * (0.7 + scrollWaveBoost * 0.5);
        const wave3 = Math.sin((ox + oz) * 0.18 + timeFactor * 1.4) * 0.4;
        
        // Interactive cursor ripple
        const dx = ox - target.currentMouseX * 9;
        const dz = oz - (target.currentMouseY * -4.5);
        const dist = Math.sqrt(dx * dx + dz * dz);
        const cursorPerturb = Math.max(0, 1.3 - dist * 0.16) * Math.sin(dist * 1.3 - elapsed * 4.5);

        pos.setY(i, origY[i] + wave1 + wave2 + wave3 + cursorPerturb);
      }
      pos.needsUpdate = true;

      // Particle Cloud Movement
      particles.rotation.y = elapsed * 0.035 + scrollFactor * 0.2;
      particles.rotation.x = Math.sin(elapsed * 0.02) * 0.06 + target.currentMouseY * 0.06;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(animate);
      } else {
        frameId = requestAnimationFrame(animate);
      }
    };

    animate();

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      observer.disconnect();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      planeGeo.dispose();
      waveMaterial.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMaterial.dispose();
      particleTexture.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    />
  );
};
