// ============================================================
// HIGH-LEVEL: Visual inspiration & references
// ============================================================

/* -------------------------
   Utility helpers
   ------------------------- */
   const $ = (s, ctx=document) => ctx.querySelector(s);
   const $$ = (s, ctx=document) => Array.from(ctx.querySelectorAll(s));
   
   /* -------------------------
      Smooth custom cursor (halo + dot) with lerp
      ------------------------- */
   const cursorHalo = $('#cursorHalo');
   const cursorDot = $('#cursorDot');
   let mouse = {x: window.innerWidth/2, y:window.innerHeight/2};
   let pos = {hx:mouse.x, hy:mouse.y, dx:mouse.x, dy:mouse.y};
   
   window.addEventListener('mousemove', (e)=>{ 
       mouse.x=e.clientX; 
       mouse.y=e.clientY; 
       cursorHalo.style.opacity = '1';
   });
   window.addEventListener('touchstart', (e)=>{ 
       if(e.touches && e.touches[0]) { 
           mouse.x=e.touches[0].clientX; 
           mouse.y=e.touches[0].clientY; 
       } 
   }, {passive:true});
   
   function lerp(a,b,t){return a+(b-a)*t;}
   function animateCursor(){
       pos.hx = lerp(pos.hx, mouse.x, 0.18);
       pos.hy = lerp(pos.hy, mouse.y, 0.18);
       pos.dx = lerp(pos.dx, mouse.x, 0.35);
       pos.dy = lerp(pos.dy, mouse.y, 0.35);
       cursorHalo.style.transform = `translate(${pos.hx}px, ${pos.hy}px) translate(-50%,-50%)`;
       cursorDot.style.transform = `translate(${pos.dx}px, ${pos.dy}px) translate(-50%,-50%)`;
       requestAnimationFrame(animateCursor);
   }
   animateCursor();
   
   /* Hover / interactive scaling */
   $$('.tab, #asteroidContainer, .panel, button').forEach(el=>{
       el.addEventListener('mouseenter', ()=> {
           cursorHalo.style.transform = cursorHalo.style.transform.replace(/\s*scale\([^)]+\)/,'') + ' scale(1.45)';
           cursorHalo.style.opacity = '1';
       });
       el.addEventListener('mouseleave', ()=> {
           cursorHalo.style.transform = cursorHalo.style.transform.replace(/\s*scale\([^)]+\)/,'');
       });
   });
   
   /* Interaction sound (subtle) - Fixed AudioContext */
   const AudioCtx = window.AudioContext || window.webkitAudioContext;
   let audioCtx = null;
   let audioInitialized = false;
   
   function initAudio() {
       if (!audioCtx) {
           audioCtx = new AudioCtx();
       }
       audioInitialized = true;
   }
   
   function playClick(freq=520, duration=0.06, vol=0.08){
       try {
           if (!audioInitialized) {
               initAudio();
           }
           if (audioCtx && audioCtx.state === 'suspended') {
               audioCtx.resume();
           }
           const o = audioCtx.createOscillator();
           const g = audioCtx.createGain();
           o.type = 'sine';
           o.frequency.value = freq;
           g.gain.value = vol;
           o.connect(g); 
           g.connect(audioCtx.destination);
           o.start();
           o.stop(audioCtx.currentTime + duration);
       } catch(e) { 
           console.log('Audio not available:', e);
       }
   }
   
   // Initialize audio on first user interaction
   document.addEventListener('click', function initAudioOnClick() {
       if (!audioInitialized) {
           initAudio();
           playClick(440, 0.01, 0.005);
       }
       document.removeEventListener('click', initAudioOnClick);
   }, { once: true });
   
   /* -------------------------
      Intro fade on load
      ------------------------- */
   window.addEventListener('load', ()=>{
       setTimeout(()=>{
           $$('.intro-fade').forEach((el,i)=>{
               setTimeout(()=> el.classList.add('visible'), i*80);
           });
       }, 90);
   });
   
   /* -------------------------
      Panel ripple effect
      ------------------------- */
   const panel = $('#infoPanel');
   panel.addEventListener('pointerdown', (e)=>{
       const r = document.createElement('div');
       r.className = 'ripple';
       const rect = panel.getBoundingClientRect();
       const size = Math.max(rect.width, rect.height) * 1.2;
       r.style.width = r.style.height = size + 'px';
       r.style.left = (e.clientX - rect.left - size/2) + 'px';
       r.style.top  = (e.clientY - rect.top  - size/2) + 'px';
       panel.appendChild(r);
       // animate and remove
       r.animate([{ transform:'scale(0)', opacity:0.45 }, { transform:'scale(1.0)', opacity:0}], { duration:680, easing:'cubic-bezier(.2,.9,.2,1)'});
       setTimeout(()=> r.remove(), 700);
       playClick(420, 0.05, 0.05);
   });
   
   /* -------------------------
      Simple toast
      ------------------------- */
   const toast = $('#toast');
   function showToast(msg, t=2200){
       toast.textContent = msg;
       toast.style.opacity = '1';
       toast.style.transform = 'translateY(0)';
       setTimeout(()=> { toast.style.opacity = '0'; toast.style.transform = 'translateY(-8px)'; }, t);
   }
   
   /* -------------------------
      Tabs (GSAP-enhanced) - single handler (deduplicated)
      ------------------------- */
   const tabs = $$('.tab');
   const panes = $$('.content-pane');
   tabs.forEach(btn=>{
       btn.addEventListener('click', ()=>{
           const id = btn.dataset.tab;
           tabs.forEach(t=>t.classList.remove('active'));
           btn.classList.add('active');
           panes.forEach(p=>{
               if(p.id === id){
                   p.classList.add('show');
                   // Use GSAP for smooth transition
                   gsap.fromTo(p, 
                       {y:18, opacity:0}, 
                       {duration:0.6, y:0, opacity:1, ease:'expo.out'}
                   );
               } else {
                   p.classList.remove('show');
                   // Reset other panes
                   p.style.opacity = 0;
                   p.style.transform = 'translateY(18px)';
               }
           });
           playClick(640,0.04,0.04);
       });
   });
   
   /* =========================
      THREE.JS — Background particles + Asteroid object
      ========================= */
   
   const canvas = document.getElementById('bgCanvas');
   const renderer = new THREE.WebGLRenderer({ 
       canvas, 
       antialias:true, 
       alpha:true, 
       powerPreference:'high-performance' 
   });
   renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
   renderer.setSize(window.innerWidth, window.innerHeight);
   renderer.shadowMap.enabled = true;
   renderer.shadowMap.type = THREE.PCFSoftShadowMap;
   
   /* Scenes: we use one scene with layers (0 = background particles, 1 = asteroid) */
   const scene = new THREE.Scene();
   scene.fog = new THREE.FogExp2(0x05051a, 0.002);
   
   /* Camera - positioned to focus on the asteroid */
   const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);
   camera.position.set(0, 0, 8);
   
   // Store original camera position for reset
   const originalCameraPos = { x: 0, y: 0, z: 8 };
   
   /* Clock */
   const clock = new THREE.Clock();
   
   /* Ambient lighting */
   scene.add(new THREE.AmbientLight(0xffffff, 0.4));
   
   /* Directional rim lights to sculpt the asteroid */
   const rim1 = new THREE.DirectionalLight(0x667eea, 1.0); 
   rim1.position.set(5, 3, 5); 
   rim1.castShadow = true;
   rim1.shadow.mapSize.width = 1024;
   rim1.shadow.mapSize.height = 1024;
   scene.add(rim1);
   
   const rim2 = new THREE.DirectionalLight(0xf093fb, 0.6); 
   rim2.position.set(-5, -2, 3); 
   scene.add(rim2);
   
   /* Point light for additional depth */
   const pointLight = new THREE.PointLight(0xffffff, 0.3, 100);
   pointLight.position.set(2, 2, 5);
   scene.add(pointLight);
   
   /* ------------ FLOATING STARS Particle System -------------- */
   const particleCount = Math.min(8000, Math.round((window.innerWidth * window.innerHeight) / 800));
   const particlesGeo = new THREE.BufferGeometry();
   
   // Create arrays for particle attributes
   const positions = new Float32Array(particleCount * 3);
   const seeds = new Float32Array(particleCount);
   const colors = new Float32Array(particleCount * 3);
   const sizes = new Float32Array(particleCount);
   const speeds = new Float32Array(particleCount);
   const directions = new Float32Array(particleCount * 3); // x, y, z direction for each particle
   
   // Create a color palette for stars
   const starColors = [
       new THREE.Color(0x7eb6ff), // Blue-white
       new THREE.Color(0xffd7b4), // Yellow-white  
       new THREE.Color(0xff9e7d), // Orange
       new THREE.Color(0xbfd1ff), // Light blue
       new THREE.Color(0xffffff)  // White
   ];
   
   for(let i=0;i<particleCount;i++){
       const idx = i*3;
       
       // Random positions throughout 3D space
       positions[idx+0] = (Math.random() - 0.5) * 400;  // Wider distribution
       positions[idx+1] = (Math.random() - 0.5) * 300;
       positions[idx+2] = (Math.random() - 0.5) * 400;
       
       seeds[i] = Math.random();
       
       // Assign random colors from our palette
       const color = starColors[Math.floor(Math.random() * starColors.length)];
       colors[idx+0] = color.r;
       colors[idx+1] = color.g;
       colors[idx+2] = color.b;
       
       // Vary sizes for more interesting composition
       sizes[i] = 0.3 + Math.random() * 2.5;
       
       // Vary animation speeds
       speeds[i] = 0.1 + Math.random() * 0.8;
       
       // Random floating directions (normalized)
       const dirX = (Math.random() - 0.5) * 2;
       const dirY = (Math.random() - 0.5) * 2;
       const dirZ = (Math.random() - 0.5) * 2;
       const length = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ);
       
       directions[idx+0] = dirX / length;
       directions[idx+1] = dirY / length;
       directions[idx+2] = dirZ / length;
   }
   
   particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
   particlesGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
   particlesGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
   particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
   particlesGeo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
   particlesGeo.setAttribute('direction', new THREE.BufferAttribute(directions, 3));
   
   // Enhanced shader material with floating motion
   const particleMat = new THREE.ShaderMaterial({
       uniforms: {
           uTime: { value:0 },
           uMouse: { value: new THREE.Vector2(0, 0) },
           uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
       },
       vertexShader: `
           attribute float seed;
           attribute float size;
           attribute float speed;
           attribute vec3 color;
           attribute vec3 direction;
           
           uniform float uTime;
           uniform vec2 uMouse;
           uniform vec2 uResolution;
           
           varying float vSeed;
           varying vec3 vColor;
           varying float vAlpha;
           
           void main(){
               vSeed = seed;
               vColor = color;
               
               // Start with original position
               vec3 pos = position;
               
               // Calculate floating movement
               float t = uTime * speed;
               
               // Main floating motion in assigned direction
               vec3 floatOffset = direction * t * 0.5;
               
               // Add subtle wandering motion (perlin-like noise)
               float wanderX = sin(t * 0.7 + seed * 100.0) * 0.3;
               float wanderY = cos(t * 0.5 + seed * 150.0) * 0.3;
               float wanderZ = sin(t * 0.9 + seed * 200.0) * 0.3;
               vec3 wanderOffset = vec3(wanderX, wanderY, wanderZ);
               
               // Combine movements
               pos += floatOffset + wanderOffset;
               
               // Boundary check - wrap around if too far
               float boundary = 250.0;
               if (abs(pos.x) > boundary) pos.x = -sign(pos.x) * boundary * 0.9;
               if (abs(pos.y) > boundary) pos.y = -sign(pos.y) * boundary * 0.9;
               if (abs(pos.z) > boundary) pos.z = -sign(pos.z) * boundary * 0.9;
               
               // Mouse interaction - gentle push away from cursor
               vec2 screenPos = (gl_Position.xy / gl_Position.w) * 0.5 + 0.5;
               screenPos *= uResolution;
               float mouseDist = distance(uMouse, screenPos);
               float mouseInfluence = max(0.0, 1.0 - mouseDist / 300.0);
               
               vec2 pushDir = normalize(pos.xy - uMouse);
               pos.xy += pushDir * mouseInfluence * 2.0;
               
               // Twinkling effect
               float twinkle = 0.5 + 0.5 * sin(t * 8.0 + seed * 50.0);
               vAlpha = twinkle;
               
               // Calculate final position
               vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
               
               // Dynamic point size based on distance and twinkling
               float pointSize = size * (1.0 + twinkle * 0.3) * (250.0 / -mvPosition.z);
               gl_PointSize = pointSize;
               
               gl_Position = projectionMatrix * mvPosition;
           }
       `,
       fragmentShader: `
           precision mediump float;
           
           varying float vSeed;
           varying vec3 vColor;
           varying float vAlpha;
           
           void main(){
               vec2 coord = gl_PointCoord - vec2(0.5);
               float r = length(coord);
               
               // Create a soft circular glow
               float softEdge = 1.0 - smoothstep(0.0, 0.5, r);
               float glow = 1.0 - smoothstep(0.3, 0.8, r);
               
               // Combine for a star-like appearance
               float brightness = softEdge * 0.9 + glow * 0.6;
               
               // Add subtle color variation based on seed
               vec3 finalColor = vColor * (0.7 + 0.6 * vSeed);
               
               // Final color with alpha from twinkling and shape
               gl_FragColor = vec4(finalColor, brightness * vAlpha);
           }
       `,
       transparent: true,
       depthWrite: false,
       blending: THREE.AdditiveBlending
   });
   
   const particlePoints = new THREE.Points(particlesGeo, particleMat);
   particlePoints.frustumCulled = false;
   scene.add(particlePoints);
   
   // Create floating dust particles for additional depth
   const dustCount = 5000;
   const dustGeo = new THREE.BufferGeometry();
   const dustPositions = new Float32Array(dustCount * 3);
   const dustSeeds = new Float32Array(dustCount);
   
   for(let i=0;i<dustCount;i++){
       const idx = i*3;
       dustPositions[idx+0] = (Math.random() - 0.5) * 600;
       dustPositions[idx+1] = (Math.random() - 0.5) * 400;
       dustPositions[idx+2] = (Math.random() - 0.5) * 600;
       dustSeeds[i] = Math.random();
   }
   
   dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
   dustGeo.setAttribute('seed', new THREE.BufferAttribute(dustSeeds, 1));
   
   const dustMat = new THREE.PointsMaterial({
       color: 0x88aaff,
       size: 0.8,
       transparent: true,
       opacity: 0.4,
       blending: THREE.AdditiveBlending
   });
   
   const dustPoints = new THREE.Points(dustGeo, dustMat);
   scene.add(dustPoints);
   
   // Add occasional shooting stars
   function createShootingStar() {
       const geometry = new THREE.BufferGeometry();
       const positions = new Float32Array(6);
       
       // Random start position (edge of view)
       const startRadius = 150;
       const startAngle = Math.random() * Math.PI * 2;
       positions[0] = Math.cos(startAngle) * startRadius;
       positions[1] = Math.sin(startAngle) * startRadius;
       positions[2] = (Math.random() - 0.5) * 100;
       
       // End position (traveling across view)
       const travelDistance = 100 + Math.random() * 50;
       const travelAngle = startAngle + (Math.random() - 0.5) * 1.0;
       positions[3] = Math.cos(travelAngle) * (startRadius - travelDistance);
       positions[4] = Math.sin(travelAngle) * (startRadius - travelDistance);
       positions[5] = positions[2] + (Math.random() - 0.5) * 30;
       
       geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
       
       const material = new THREE.LineBasicMaterial({
           color: 0xaaccff,
           transparent: true,
           opacity: 0,
           linewidth: 1
       });
       
       const shootingStar = new THREE.Line(geometry, material);
       scene.add(shootingStar);
       
       // Animate the shooting star
       const duration = 0.8 + Math.random() * 0.7;
       gsap.to(material, {
           opacity: 1,
           duration: duration * 0.2,
           ease: "power2.out",
           onComplete: () => {
               gsap.to(material, {
                   opacity: 0,
                   duration: duration * 0.8,
                   ease: "power2.in",
                   onComplete: () => {
                       scene.remove(shootingStar);
                       geometry.dispose();
                       material.dispose();
                   }
               });
           }
       });
       
       // Schedule next shooting star
       setTimeout(createShootingStar, 2000 + Math.random() * 5000);
   }
   
   // Start shooting stars after a delay
   setTimeout(createShootingStar, 3000);
   
   /* ------------ Asteroid mesh - positioned in the center of left area -------------- */
   const asteroidGroup = new THREE.Group();
   asteroidGroup.position.set(-3, 0, 0);
   scene.add(asteroidGroup);
   
   // Create more detailed asteroid geometry
   const ico = new THREE.IcosahedronGeometry(1.8, 3);
   const posAttr = ico.attributes.position;
   const displacement = new Float32Array(posAttr.count);
   
   // Apply displacement for asteroid-like appearance
   for(let i=0;i<posAttr.count;i++){
       const vx = posAttr.getX(i), vy = posAttr.getY(i), vz = posAttr.getZ(i);
       const n1 = Math.random() * 0.4;
       const n2 = 0.1 * Math.sin(vx*4.0 + vy*3.0 + vz*6.0);
       const n3 = 0.05 * Math.cos(vx*6.0 + vy*5.0 + vz*8.0);
       const totalDisplacement = n1 + n2 + n3;
       
       displacement[i] = totalDisplacement;
       posAttr.setXYZ(i, 
           vx + totalDisplacement * vx, 
           vy + totalDisplacement * vy, 
           vz + totalDisplacement * vz
       );
   }
   ico.computeVertexNormals();
   
   // Create vertex colors based on displacement
   const asteroidColors = [];
   const color = new THREE.Color();
   for (let i = 0; i < posAttr.count; i++) {
       const d = displacement[i];
       const intensity = 0.6 + d * 0.4;
       color.setRGB(intensity * 0.5, intensity * 0.45, intensity * 0.4);
       asteroidColors.push(color.r, color.g, color.b);
   }
   ico.setAttribute('color', new THREE.Float32BufferAttribute(asteroidColors, 3));
   
   const rockMat = new THREE.MeshStandardMaterial({
       vertexColors: true,
       roughness: 0.85,
       metalness: 0.1,
       flatShading: false,
   });
   const rock = new THREE.Mesh(ico, rockMat);
   rock.castShadow = true;
   rock.receiveShadow = true;
   asteroidGroup.add(rock);
   
   // Enhanced emissive shell (glow)
   const shellGeo = ico.clone();
   const shellMat = new THREE.MeshBasicMaterial({
       color: 0x8b7d6b,
       transparent: true,
       opacity: 0.08,
       blending: THREE.AdditiveBlending,
       side: THREE.BackSide
   });
   const shell = new THREE.Mesh(shellGeo, shellMat);
   shell.scale.set(1.15, 1.15, 1.15);
   asteroidGroup.add(shell);
   
   // Add some crater-like details
   for(let i=0; i<8; i++){
       const crater = new THREE.Mesh(
           new THREE.SphereGeometry(0.15 + Math.random()*0.1, 8, 6),
           new THREE.MeshBasicMaterial({ 
               color: 0x5a4d3f, 
               transparent: true, 
               opacity: 0.3 
           })
       );
       const theta = Math.random() * Math.PI * 2;
       const phi = Math.acos(2 * Math.random() - 1);
       const radius = 1.9 + Math.random() * 0.2;
       crater.position.set(
           radius * Math.sin(phi) * Math.cos(theta),
           radius * Math.sin(phi) * Math.sin(theta),
           radius * Math.cos(phi)
       );
       asteroidGroup.add(crater);
   }
   
   /* Add gentle orbit rotation */
   asteroidGroup.rotation.set(0.3, 0.5, 0.1);
   
   // Hide loading indicator when asteroid is ready
   setTimeout(() => {
       $('#loadingIndicator').style.display = 'none';
   }, 1500);
   
   /* Hover / interact: scale / pulse */
   const asteroidContainerEl = $('#asteroidContainer');
   asteroidContainerEl.addEventListener('pointerenter', ()=> {
       gsap.to(asteroidGroup.scale, { x:1.1, y:1.1, z:1.1, duration:0.8, ease:'elastic.out(1,0.6)' });
       gsap.to(shell.material, { opacity: 0.15, duration:0.4, ease:'power2.out' });
       gsap.to(rock.material, { roughness: 0.7, duration:0.4 });
       playClick(660, 0.04, 0.06);
   });
   asteroidContainerEl.addEventListener('pointerleave', ()=> {
       gsap.to(asteroidGroup.scale, { x:1, y:1, z:1, duration:0.7, ease:'power3.out' });
       gsap.to(shell.material, { opacity: 0.08, duration:0.4, ease:'power2.out' });
       gsap.to(rock.material, { roughness: 0.85, duration:0.4 });
   });
   
   /* Clicking asteroid animation - SMOOTH VERSION */
   let isZooming = false;
   asteroidContainerEl.addEventListener('click', (ev)=> {
       if (isZooming) return; // Prevent multiple clicks during animation
       isZooming = true;
       
       // Create a smooth timeline for the zoom effect
       const zoomTimeline = gsap.timeline({
           onComplete: () => {
               isZooming = false;
           }
       });
       
       // Smooth zoom in
       zoomTimeline.to(camera.position, {
           duration: 1.2,
           x: 0.3,
           y: -0.2,
           z: 4.5,  // Closer zoom
           ease: "power2.inOut"
       })
       // Add slight camera shake for immersion
       .to(camera.position, {
           duration: 0.1,
           x: 0.35,
           y: -0.25,
           z: 4.4,
           ease: "power1.inOut",
           repeat: 1,
           yoyo: true
       })
       // Smooth zoom back out
       .to(camera.position, {
           duration: 1.2,
           x: originalCameraPos.x,
           y: originalCameraPos.y,
           z: originalCameraPos.z,
           ease: "power2.inOut",
           delay: 0.3  // Brief pause at closest point
       });
       
       // Enhanced asteroid rotation during zoom
       gsap.to(asteroidGroup.rotation, { 
           y: asteroidGroup.rotation.y + Math.PI * 1.5, // More rotation
           duration: 2.8, // Match the zoom duration
           ease: "power2.inOut"
       });
       
       // Add scale pulse during zoom
       const scaleTimeline = gsap.timeline();
       scaleTimeline.to(asteroidGroup.scale, {
           duration: 0.6,
           x: 1.15,
           y: 1.15,
           z: 1.15,
           ease: "power2.out"
       })
       .to(asteroidGroup.scale, {
           duration: 0.8,
           x: 1,
           y: 1,
           z: 1,
           ease: "elastic.out(1,0.5)"
       });
       
       // Enhanced shell glow during zoom
       gsap.to(shell.material, {
           opacity: 0.25,
           duration: 0.8,
           ease: "power2.out",
           yoyo: true,
           repeat: 1
       });
       
       showToast('Asteroid: geological sample analysis initiated');
       playClick(720, 0.06, 0.08);
   });
   
   /* Mouse interaction for particles */
   window.addEventListener('mousemove', (e)=>{
       if(particleMat && particleMat.uniforms && particleMat.uniforms.uMouse){
           // Convert mouse coordinates to normalized device coordinates
           const x = (e.clientX / window.innerWidth) * 2 - 1;
           const y = -(e.clientY / window.innerHeight) * 2 + 1;
           particleMat.uniforms.uMouse.value.set(
               (e.clientX / window.innerWidth) * 1000,
               (e.clientY / window.innerHeight) * 1000
           );
       }
   });
   
   /* Resize handler */
   function onResize(){
       renderer.setSize(window.innerWidth, window.innerHeight);
       camera.aspect = window.innerWidth / window.innerHeight;
       camera.updateProjectionMatrix();
       
       if(particleMat && particleMat.uniforms && particleMat.uniforms.uResolution){
           particleMat.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
       }
   }
   window.addEventListener('resize', onResize, {passive:true});
   onResize();
   
   /* Render loop */
   let rafId = null;
   function render(){
       const t = clock.getElapsedTime();
       if(particleMat && particleMat.uniforms) particleMat.uniforms.uTime.value = t;
       
       // Animate dust particles with gentle floating
       dustPoints.rotation.y = t * 0.005;
       dustPoints.rotation.x = Math.sin(t * 0.003) * 0.05;
       
       // Only rotate asteroid if not in zoom animation
       if (!isZooming) {
           asteroidGroup.rotation.x = 0.3 + Math.sin(t * 0.2) * 0.05;
           asteroidGroup.rotation.y += 0.004;
           asteroidGroup.rotation.z = 0.1 + Math.cos(t * 0.3) * 0.03;
       }
       
       shell.rotation.y = t * 0.1;
       if (!isZooming) {
           shell.material.opacity = 0.08 + Math.sin(t * 0.5) * 0.02;
       }
       
       renderer.render(scene, camera);
       rafId = requestAnimationFrame(render);
   }
   requestAnimationFrame(render);
   
   /* Performance hint: stop animation on hidden tabs */
   document.addEventListener('visibilitychange', ()=>{
       if(document.hidden){
           if(rafId !== null) cancelAnimationFrame(rafId);
           rafId = null;
       } else {
           if(rafId === null) requestAnimationFrame(render);
       }
   });
   
   /* -------------------------
      Small accessibility tweaks
      ------------------------- */
   tabs.forEach(t => {
       t.addEventListener('keydown', (e) => {
           if(e.key === 'Enter' || e.key === ' ') { t.click(); e.preventDefault(); }
       });
   });
   
   /* -------------------------
      Final polish: slight parallax of panel blob based on pointer
      ------------------------- */
   window.addEventListener('pointermove', (e)=>{
       const rect = panel.getBoundingClientRect();
       const cx = rect.left + rect.width / 2;
       const cy = rect.top + rect.height / 2;
       const dx = (e.clientX - cx) * 0.03;
       const dy = (e.clientY - cy) * 0.03;
   
       gsap.to(panel, {
           duration: 0.9,
           ease: 'power2.out',
           "--blob-x": dx + "px",
           "--blob-y": dy + "px"
       });
   
       const asteroidRect = asteroidContainerEl.getBoundingClientRect();
       const asteroidCenterX = asteroidRect.left + asteroidRect.width / 2;
       const asteroidCenterY = asteroidRect.top + asteroidRect.height / 2;
       const dist = Math.hypot(e.clientX - asteroidCenterX, e.clientY - asteroidCenterY);
       const tone = Math.max(0, Math.min(1, 1 - dist/(window.innerWidth*0.6)));
       
       const title = panel.querySelector('h1');
       if(title){
           gsap.to(title, { scale: 1 + tone*0.02, duration: 0.6, ease: 'power2.out' });
       }
   });
   
   /* Extra: graceful fallback for very low-power devices */
   if(navigator.hardwareConcurrency && navigator.hardwareConcurrency < 3){
       // reduce particle count
       scene.remove(particlePoints);
       scene.remove(dustPoints);
       const smallCount = 1500;
       const sg = new THREE.BufferGeometry();
       const posSmall = new Float32Array(smallCount*3);
       for(let i=0;i<smallCount;i++){
           posSmall[i*3+0] = (Math.random()-0.5) * 300;
           posSmall[i*3+1] = (Math.random()-0.5) * 200;
           posSmall[i*3+2] = (Math.random()-0.5) * 300;
       }
       sg.setAttribute('position', new THREE.BufferAttribute(posSmall,3));
       const smallMat = new THREE.PointsMaterial({ size: 2.2, color:0xbfe8ff, transparent:true, opacity:0.8 });
       const smallPoints = new THREE.Points(sg, smallMat);
       scene.add(smallPoints);
   }
   
   /* Prevent context menu accidental right-clicks that break immersion */
   window.addEventListener('contextmenu', (e)=> e.preventDefault());
   /* =========================
   Navigation Button Handler - Enhanced Glass Morphic
   ========================= */
const detectionButton = document.getElementById('detectionButton');

detectionButton.addEventListener('click', () => {
    // Enhanced click feedback with glass morphic effects
    const timeline = gsap.timeline();
    
    timeline.to(detectionButton, {
        scale: 0.95,
        duration: 0.1,
        ease: "power2.inOut",
        background: "linear-gradient(135deg, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.35) 50%, rgba(0, 0, 0, 0.45) 100%)",
        borderColor: "rgba(255, 255, 255, 0.4)"
    })
    .to(detectionButton, {
        scale: 1,
        duration: 0.3,
        ease: "elastic.out(1, 0.5)",
        background: "linear-gradient(135deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.15) 50%, rgba(0, 0, 0, 0.25) 100%)",
        borderColor: "rgba(255, 255, 255, 0.2)"
    });
    
    // Enhanced sound effect
    playClick(620, 0.1, 0.08);
    
    // Show loading toast
    showToast('🚀 Launching Asteroid Detection System...', 1800);
    
    // Add a ripple effect
    const ripple = document.createElement('div');
    ripple.style.cssText = `
        position: absolute;
        top: 50%; left: 50%;
        width: 100px; height: 100px;
        background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        pointer-events: none;
        z-index: 1;
    `;
    detectionButton.appendChild(ripple);
    
    gsap.to(ripple, {
        scale: 3,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
        onComplete: () => ripple.remove()
    });
    
    // Navigate after a short delay for better UX
    setTimeout(() => {
        window.location.href = 'Detection of asteroids 3.html';
    }, 1000);
});

// Enhanced hover effects
detectionButton.addEventListener('mouseenter', () => {
    cursorHalo.style.transform = cursorHalo.style.transform.replace(/\s*scale\([^)]+\)/,'') + ' scale(1.45)';
    cursorHalo.style.opacity = '1';
    
    // Subtle glow effect
    gsap.to(detectionButton, {
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.3)",
        duration: 0.3
    });
});

detectionButton.addEventListener('mouseleave', () => {
    cursorHalo.style.transform = cursorHalo.style.transform.replace(/\s*scale\([^)]+\)/,'');
    
    // Reset glow
    gsap.to(detectionButton, {
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.2)",
        duration: 0.3
    });
});

// Make sure the button fades in with other elements
window.addEventListener('load', () => {
    setTimeout(() => {
        const buttonContainer = document.querySelector('.navigation-button-container');
        if (buttonContainer) {
            buttonContainer.classList.add('visible');
        }
    }, 300);
});

// Add parallax effect to button based on mouse movement
window.addEventListener('mousemove', (e) => {
    const buttonRect = detectionButton.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;
    
    const moveX = (e.clientX - buttonCenterX) * 0.02;
    const moveY = (e.clientY - buttonCenterY) * 0.02;
    
    gsap.to(detectionButton, {
        x: moveX,
        y: moveY,
        duration: 1.5,
        ease: "power2.out"
    });
});