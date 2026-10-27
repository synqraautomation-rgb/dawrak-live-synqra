import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { soundEngine } from '../../lib/audio';
import { SlidersHorizontal, ChevronDown, ChevronUp, Compass, RotateCcw, Sparkles } from 'lucide-react';

export const HeroScene3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [activePalette, setActivePalette] = useState<'cyan' | 'emerald' | 'cobalt' | 'violet'>('cyan');
  const [gyroActive, setGyroActive] = useState<boolean>(false);

  // References to communicate with Three.js loop without re-triggering React mounts
  const speedRef = useRef(1);
  const paletteRef = useRef('cyan');
  const gyroRef = useRef(false);
  const resetTriggerRef = useRef(0);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    paletteRef.current = activePalette;
  }, [activePalette]);

  useEffect(() => {
    gyroRef.current = gyroActive;
  }, [gyroActive]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 420;

    // Detect Software WebGL guard
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Renderer Setup with PBR Color Pipeline
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Scene & Studio Environment Reflection (RoomEnvironment + PMREMGenerator)
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b14, 0.04);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 50);
    camera.position.set(0, 0.4, 4.4);

    // 4. Lighting Rig
    const warmKeyLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    warmKeyLight.position.set(4, 5, 3.5);
    warmKeyLight.castShadow = !isSoftwareGl;
    if (warmKeyLight.castShadow) {
      warmKeyLight.shadow.bias = -0.0005;
      warmKeyLight.shadow.normalBias = 0.02;
    }
    scene.add(warmKeyLight);

    const coolFillLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.4);
    scene.add(coolFillLight);

    const cyanRimLight = new THREE.PointLight(0x06b6d4, 3.5, 12);
    cyanRimLight.position.set(-4, -2, 2);
    scene.add(cyanRimLight);

    // 5. Composite 3-12 Part Procedural Model: Futuristic Quantum Queue Token (THREE.Group)
    const heroGroup = new THREE.Group();
    heroGroup.position.set(0, 0.1, 0);
    scene.add(heroGroup);

    // Part 1: Outer Primary Silhouette - Heavy Orbital Chronometer Ring (Torus)
    const outerRingGeo = new THREE.TorusGeometry(1.22, 0.14, 32, 100);
    const outerRingMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      metalness: 0.92,
      roughness: 0.16,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    heroGroup.add(outerRing);

    // Part 2: Secondary Read - Inner Counter-Rotating Gyroscope Ring
    const innerRingGeo = new THREE.TorusGeometry(0.92, 0.07, 24, 80);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.85,
      roughness: 0.32,
      wireframe: false
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = Math.PI / 3;
    heroGroup.add(innerRing);

    // Part 3: Secondary Read - High-Refractive Central Medical Beacon Nucleus
    const coreNucleusGeo = new THREE.IcosahedronGeometry(0.48, 2);
    const coreNucleusMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.65,
      roughness: 0.08,
      metalness: 0.95
    });
    const coreNucleus = new THREE.Mesh(coreNucleusGeo, coreNucleusMat);
    heroGroup.add(coreNucleus);

    // Part 4: Inner Core Glow Sphere
    const innerSphereGeo = new THREE.SphereGeometry(0.28, 32, 32);
    const innerSphereMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });
    const innerSphere = new THREE.Mesh(innerSphereGeo, innerSphereMat);
    heroGroup.add(innerSphere);

    // Parts 5 & 6: Top and Bottom Knurled Magnetic Emitter Caps
    const emitterCapGeo = new THREE.CylinderGeometry(0.24, 0.32, 0.15, 24);
    const emitterCapMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.95,
      roughness: 0.2
    });
    const topCap = new THREE.Mesh(emitterCapGeo, emitterCapMat);
    topCap.position.y = 0.58;
    heroGroup.add(topCap);

    const bottomCap = topCap.clone();
    bottomCap.position.y = -0.58;
    bottomCap.rotation.z = Math.PI;
    heroGroup.add(bottomCap);

    // Parts 7 to 10: Four Orbiting Telemetry Micro-Nodes (Instanced or grouped)
    const nodeGroup = new THREE.Group();
    heroGroup.add(nodeGroup);
    const nodeGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.9
    });

    const nodeDist = 1.6;
    for (let i = 0; i < 4; i++) {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      const angle = (i * Math.PI) / 2;
      node.position.set(Math.cos(angle) * nodeDist, Math.sin(angle) * 0.4, Math.sin(angle) * nodeDist);
      nodeGroup.add(node);
    }

    // Part 11: Contact Shadow Grounding Disc (bottom-center flush with ground)
    const shadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    // Procedural canvas radial shadow texture
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const radGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    radGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
    radGrad.addColorStop(0.35, 'rgba(2, 132, 199, 0.22)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = radGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowTex.colorSpace = THREE.SRGBColorSpace;
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.6
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.55;
    scene.add(shadowMesh);

    // Part 12: Floating Ambient Particles Field
    const particleCount = 60;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      posArray[i] = (Math.random() - 0.5) * 6;
      posArray[i + 1] = (Math.random() - 0.5) * 6;
      posArray[i + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Interaction State with Exponential Damping
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    let isDragging = false;
    let prevTouchX = 0;
    let prevTouchY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = x * 0.8;
      targetRotationX = -y * 0.6;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevTouchX = e.touches[0].clientX;
        prevTouchY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - prevTouchX;
        const deltaY = e.touches[0].clientY - prevTouchY;
        targetRotationY += deltaX * 0.012;
        targetRotationX += deltaY * 0.012;
        prevTouchX = e.touches[0].clientX;
        prevTouchY = e.touches[0].clientY;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (gyroRef.current && e.gamma !== null && e.beta !== null) {
        targetRotationY = (e.gamma / 45) * 0.7;
        targetRotationX = ((e.beta - 45) / 45) * 0.5;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('deviceorientation', handleOrientation);

    // Dynamic Color Palette Switcher
    const updatePaletteColors = (palette: string) => {
      if (palette === 'emerald') {
        outerRingMat.color.setHex(0x059669);
        innerRingMat.color.setHex(0x34d399);
        coreNucleusMat.color.setHex(0x10b981);
        cyanRimLight.color.setHex(0x10b981);
      } else if (palette === 'cobalt') {
        outerRingMat.color.setHex(0x1d4ed8);
        innerRingMat.color.setHex(0x60a5fa);
        coreNucleusMat.color.setHex(0x2563eb);
        cyanRimLight.color.setHex(0x3b82f6);
      } else if (palette === 'violet') {
        outerRingMat.color.setHex(0x7c3aed);
        innerRingMat.color.setHex(0xc084fc);
        coreNucleusMat.color.setHex(0x9333ea);
        cyanRimLight.color.setHex(0xa855f7);
      } else {
        // Cyan Default
        outerRingMat.color.setHex(0x0284c7);
        innerRingMat.color.setHex(0x10b981);
        coreNucleusMat.color.setHex(0x38bdf8);
        cyanRimLight.color.setHex(0x06b6d4);
      }
    };

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop with Exponential Damping & Clock
    let frameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime() * speedRef.current;

      // Update palette on the fly
      updatePaletteColors(paletteRef.current);

      // Check reset trigger
      if (resetTriggerRef.current > 0) {
        targetRotationX = 0;
        targetRotationY = 0;
        resetTriggerRef.current = 0;
      }

      // Smooth exponential damping: 1 - Math.exp(-k * dt)
      const dampFactor = 1 - Math.exp(-7 * delta);
      currentRotationX += (targetRotationX - currentRotationX) * dampFactor;
      currentRotationY += (targetRotationY - currentRotationY) * dampFactor;

      // Idle Rotation + Physics Parallax
      heroGroup.rotation.x = currentRotationX + Math.sin(elapsed * 0.8) * 0.08;
      heroGroup.rotation.y = currentRotationY + elapsed * 0.45;

      innerRing.rotation.y = -elapsed * 0.9;
      nodeGroup.rotation.y = elapsed * 1.2;
      nodeGroup.rotation.x = Math.sin(elapsed * 0.5) * 0.3;

      coreNucleus.rotation.z = elapsed * 0.6;
      coreNucleus.position.y = Math.sin(elapsed * 1.5) * 0.06;
      innerSphere.position.y = Math.sin(elapsed * 1.5) * 0.06;

      particles.rotation.y = elapsed * 0.04 + currentRotationY * 0.15;
      particles.rotation.x = currentRotationX * 0.15;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('resize', handleResize);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      innerRingGeo.dispose();
      innerRingMat.dispose();
      coreNucleusGeo.dispose();
      coreNucleusMat.dispose();
      innerSphereGeo.dispose();
      innerSphereMat.dispose();
      emitterCapGeo.dispose();
      emitterCapMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[380px] sm:h-[480px] lg:h-[540px] flex items-center justify-center select-none touch-none">
      <div
        ref={mountRef}
        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
      />

      {/* ERGONOMIC COLLAPSIBLE BOTTOM 3D CONTROL DOCK */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-auto max-w-[94vw] flex flex-col items-center">
        {/* Toggle Drawer Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playClickSound();
            setIsControlsOpen(!isControlsOpen);
          }}
          className="mb-1.5 px-3 py-1 rounded-full bg-slate-900/90 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1.5 shadow-lg shadow-black/40 hover:bg-slate-800 transition-all cursor-pointer"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>{isControlsOpen ? 'إخفاء تحكم 3D' : 'تحكم مجسم 3D'}</span>
          {isControlsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>

        {/* Collapsible Dock */}
        {isControlsOpen && (
          <div className="px-4 py-2.5 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl flex items-center gap-3 sm:gap-4 transition-all">
            {/* Speed Multiplier */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">السرعة:</span>
              {[0.5, 1, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    soundEngine.playClickSound();
                    setSpeedMultiplier(s);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                    speedMultiplier === s
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {/* Color Palette Swatches */}
            <div className="flex items-center gap-1.5">
              {[
                { id: 'cyan', color: 'bg-cyan-500' },
                { id: 'emerald', color: 'bg-emerald-500' },
                { id: 'cobalt', color: 'bg-blue-600' },
                { id: 'violet', color: 'bg-purple-600' }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playClickSound();
                    setActivePalette(p.id as typeof activePalette);
                  }}
                  className={`w-4 h-4 rounded-full ${p.color} cursor-pointer transition-transform ${
                    activePalette === p.id ? 'scale-125 ring-2 ring-white/80' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={p.id}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-slate-800" />

            {/* Reset Angle Button */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClickSound();
                resetTriggerRef.current = 1;
              }}
              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="إعادة ضبط الزاوية"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Gyroscope Orientation Toggle */}
            <button
              type="button"
              onClick={() => {
                soundEngine.playClickSound();
                if (typeof DeviceOrientationEvent !== 'undefined' && typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
                  (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission().then((res) => {
                    if (res === 'granted') setGyroActive(true);
                  }).catch(() => {});
                } else {
                  setGyroActive(!gyroActive);
                }
              }}
              className={`p-1 rounded-lg cursor-pointer ${
                gyroActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800 text-slate-400'
              }`}
              title="تفعيل الدوران بحساس حركة الهاتف"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Ambient Lighting Backdrop */}
      <div className="absolute inset-0 -z-10 bg-radial from-cyan-500/15 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />
    </div>
  );
};
