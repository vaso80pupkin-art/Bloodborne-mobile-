function initScene(){
  if(sceneInitialized) return;
  sceneInitialized = true;
  const c = $('canvas-container');
  if(!c){ console.error('[BB] canvas-container not found'); return; }

  scene = new THREE.Scene();
  scene.background = new THREE.Color(BASE_SKY_LANDSCAPE);
  scene.fog = new THREE.FogExp2(BASE_SKY_LANDSCAPE, 0.028);

  camera = new THREE.PerspectiveCamera(62, innerWidth/innerHeight, 0.1, 1000);
  camera.position.set(0, 4, 8);

  renderer = new THREE.WebGLRenderer({antialias:false, powerPreference:'high-performance'});
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  if(THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  c.appendChild(renderer.domElement);

  lightingRefs.ambient = new THREE.AmbientLight(0x223344, 0.22);
  scene.add(lightingRefs.ambient);
  lightingRefs.hemi = new THREE.HemisphereLight(0x334455, 0x0a0510, 0.32);
  scene.add(lightingRefs.hemi);

  lightingRefs.moon = new THREE.DirectionalLight(0x7088bb, 0.55);
  lightingRefs.moon.position.set(-20, 40, -50);
  lightingRefs.moon.castShadow = true;
  lightingRefs.moon.shadow.camera.left = -34; lightingRefs.moon.shadow.camera.right = 34;
  lightingRefs.moon.shadow.camera.top = 34; lightingRefs.moon.shadow.camera.bottom = -34;
  lightingRefs.moon.shadow.camera.near = 0.5; lightingRefs.moon.shadow.camera.far = 130;
  lightingRefs.moon.shadow.bias = -0.0005;
  lightingRefs.moon.shadow.normalBias = 0.025;
  lightingRefs.moon.shadow.radius = 3.5;
  scene.add(lightingRefs.moon.target);
  scene.add(lightingRefs.moon);

  lightingRefs.rim = new THREE.DirectionalLight(0x9aa9c4, 0.28);
  lightingRefs.rim.position.set(10, 15, -20);
  scene.add(lightingRefs.rim.target);
  scene.add(lightingRefs.rim);

  lightingRefs.fill = new THREE.DirectionalLight(0x445577, 0.18);
  lightingRefs.fill.position.set(5, 10, 25);
  scene.add(lightingRefs.fill);

  lightingRefs.moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(34, 64, 48),
    new THREE.MeshBasicMaterial({color:0xd9e4f1, map:createMoonTexture(), fog:false})
  );
  lightingRefs.moonMesh.position.set(-30, 80, -200);
  scene.add(lightingRefs.moonMesh);
  lightingRefs.glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map:createMoonGlowTexture(), color:0xc8d8ee, transparent:true, opacity:0.28,
    depthWrite:false, fog:false, blending:THREE.AdditiveBlending
  }));
  lightingRefs.glow.scale.set(126,126,1);
  lightingRefs.glow.position.copy(lightingRefs.moonMesh.position);
  scene.add(lightingRefs.glow);

  applyGraphicsQuality(graphicsQuality,{persist:false,saveGame:false});
  addEventListener('resize', handleRendererResize);

  createRain();
  minimapCtx = $('minimapCanvas').getContext('2d');
  if(player.availableGems.length === 0) player.availableGems = [...BLOOD_GEMS];
  applyBrightness();
}

let graphicsComposer=null,graphicsSSAOPass=null,graphicsBloomPass=null,graphicsFXAAPass=null;
let graphicsPipelineBroken=false;
let graphicsShadowAnchor=null;
const graphicsLightWorldPosition=new THREE.Vector3();

function isMobileGraphicsDevice(){
  return (window.matchMedia&&window.matchMedia('(pointer: coarse)').matches)||Math.min(innerWidth,innerHeight)<600;
}
function getGraphicsProfile(){
  const mobile=isMobileGraphicsDevice(),low=graphicsQuality==='low',ultra=graphicsQuality==='ultra';
  return {
    mobile,low,ultra,
    pixelRatioLimit:low?(mobile?0.65:0.85):ultra?(mobile?1.45:2.0):(mobile?0.9:1.25),
    shadowMapSize:low?512:ultra?2048:(mobile?768:1024),
    pointShadowMapSize:mobile?512:768,
    anisotropy:ultra?(mobile?8:16):4,
    shadowsEnabled:!low,
    dustMoteLimit:low?12:(mobile?32:80),
    useSSAO:ultra,
    useBloom:ultra,
    ssaoKernelRadius:mobile?8:11,
    bloomStrength:mobile?0.34:0.52
  };
}
function getGraphicsPixelRatio(profile=getGraphicsProfile()){
  return Math.max(0.65,Math.min(window.devicePixelRatio||1,profile.pixelRatioLimit));
}

const cinematicGradeShader={
  uniforms:{tDiffuse:{value:null}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D tDiffuse;varying vec2 vUv;void main(){vec4 source=texture2D(tDiffuse,vUv);vec3 color=max(source.rgb,vec3(0.0));float luminance=dot(color,vec3(0.2126,0.7152,0.0722));vec3 coolShadows=vec3(0.91,0.96,1.08);vec3 warmHighlights=vec3(1.07,0.98,0.88);vec3 tint=mix(coolShadows,warmHighlights,smoothstep(0.08,0.78,luminance));color*=mix(vec3(1.0),tint,0.16);float gradedLuma=dot(color,vec3(0.2126,0.7152,0.0722));color=mix(vec3(gradedLuma),color,1.06);gl_FragColor=vec4(color,source.a);}`
};

function disposeGraphicsPipeline(){
  if(!graphicsComposer)return;
  const composer=graphicsComposer,disposedMaterials=new Set();
  composer.passes.forEach(pass=>{
    if(pass&&typeof pass.dispose==='function')pass.dispose();
    if(!pass)return;
    Object.keys(pass).forEach(key=>{
      const value=pass[key],list=Array.isArray(value)?value:[value];
      list.forEach(item=>{
        if(item&&item.isMaterial&&!disposedMaterials.has(item)){
          disposedMaterials.add(item);item.dispose();
        }
      });
    });
  });
  if(composer.copyPass&&composer.copyPass.material&&!disposedMaterials.has(composer.copyPass.material))composer.copyPass.material.dispose();
  if(composer.renderTarget1)composer.renderTarget1.dispose();
  if(composer.renderTarget2)composer.renderTarget2.dispose();
  graphicsComposer=null;graphicsSSAOPass=null;graphicsBloomPass=null;graphicsFXAAPass=null;
}

function updateFXAAResolution(){
  if(!renderer||!graphicsFXAAPass)return;
  const size=renderer.getDrawingBufferSize(new THREE.Vector2());
  graphicsFXAAPass.uniforms.resolution.value.set(1/Math.max(1,size.x),1/Math.max(1,size.y));
}

function buildGraphicsPipeline(){
  if(!renderer||!scene||!camera)return;
  disposeGraphicsPipeline();graphicsPipelineBroken=false;
  const profile=getGraphicsProfile();
  if(profile.low)return;
  try{
    if(!THREE.EffectComposer||!THREE.RenderPass||!THREE.ShaderPass||!THREE.FXAAShader||!THREE.GammaCorrectionShader){
      throw new Error('Не загружены необходимые postprocessing addons Three.js r128.');
    }
    const composer=new THREE.EffectComposer(renderer);
    if(profile.useSSAO&&THREE.SSAOPass&&THREE.SSAOShader&&THREE.SimplexNoise){
      const ssao=new THREE.SSAOPass(scene,camera,innerWidth,innerHeight);
      ssao.kernelRadius=profile.ssaoKernelRadius;
      ssao.minDistance=0.003;
      ssao.maxDistance=0.13;
      composer.addPass(ssao);graphicsSSAOPass=ssao;
    }else{
      if(profile.useSSAO)console.warn('[BB] SSAO недоступен; используется безопасный render pass.');
      composer.addPass(new THREE.RenderPass(scene,camera));
    }
    if(profile.useBloom&&THREE.UnrealBloomPass&&THREE.LuminosityHighPassShader){
      const bloom=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),profile.bloomStrength,0.55,0.72);
      composer.addPass(bloom);graphicsBloomPass=bloom;
    }
    composer.addPass(new THREE.ShaderPass(cinematicGradeShader));
    const fxaa=new THREE.ShaderPass(THREE.FXAAShader);
    composer.addPass(fxaa);graphicsFXAAPass=fxaa;
    composer.addPass(new THREE.ShaderPass(THREE.GammaCorrectionShader));
    graphicsComposer=composer;
    updateFXAAResolution();
  }catch(error){
    disposeGraphicsPipeline();graphicsPipelineBroken=true;
    console.warn('[BB] Postprocessing отключён; используется прямой WebGL render.',error);
  }
}

function handleRendererResize(){
  if(!renderer||!camera)return;
  camera.aspect=innerWidth/Math.max(1,innerHeight);camera.updateProjectionMatrix();
  const ratio=getGraphicsPixelRatio();
  renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);
  if(graphicsComposer){graphicsComposer.setPixelRatio(ratio);graphicsComposer.setSize(innerWidth,innerHeight);}
  updateFXAAResolution();
}

function applyGraphicsQuality(quality,options={}){
  const next=quality==='ultra'?'ultra':quality==='low'?'low':'medium',changed=graphicsQuality!==next;
  graphicsQuality=next;
  if(options.persist!==false){try{localStorage.setItem(GRAPHICS_QUALITY_KEY,next);}catch(e){}}
  if(renderer){
    const profile=getGraphicsProfile(),ratio=getGraphicsPixelRatio(profile);
    renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);
    renderer.shadowMap.enabled=profile.shadowsEnabled;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    if(lightingRefs.moon){
      const shadow=lightingRefs.moon.shadow;
      lightingRefs.moon.castShadow=profile.shadowsEnabled;
      if(shadow.map){shadow.map.dispose();shadow.map=null;}
      shadow.mapSize.set(profile.shadowMapSize,profile.shadowMapSize);
      shadow.radius=profile.ultra?3.5:2.2;shadow.needsUpdate=true;
      shadow.camera.updateProjectionMatrix();
    }
    graphicsPointLights.forEach(light=>{
      light.castShadow=false;
      if(light.shadow.map){light.shadow.map.dispose();light.shadow.map=null;}
      light.shadow.mapSize.set(profile.pointShadowMapSize,profile.pointShadowMapSize);
      light.shadow.radius=profile.ultra?2.5:1.5;
    });
    activeGraphicsShadowPointLight=null;
    buildGraphicsPipeline();
    if(window._rainMesh)createRain();
    if(profile.low&&Array.isArray(dustMotes)){
      while(dustMotes.length>profile.dustMoteLimit){
        const mote=dustMotes.pop();
        if(mote&&mote.mesh){scene.remove(mote.mesh);mote.mesh.geometry?.dispose();mote.mesh.material?.dispose();}
      }
    }
    if(typeof applyBrightness==='function')applyBrightness();
  }
  if(options.saveGame!==false&&changed&&typeof SaveSystem!=='undefined')SaveSystem.save();
  if(typeof updateGraphicsQualityControls==='function')updateGraphicsQualityControls();
  return changed;
}

function setGraphicsMode(mode,options={}){
  if(!GRAPHICS_MODES.includes(mode))return false;
  graphicsMode=mode;
  try{
    localStorage.setItem(GRAPHICS_MODE_KEY,mode);
    if(mode!=='auto')localStorage.setItem(GRAPHICS_QUALITY_KEY,mode);
  }catch(e){}
  const targetQuality=mode==='auto'?'medium':mode;
  if(graphicsQuality!==targetQuality)applyGraphicsQuality(targetQuality,{persist:false,saveGame:false});
  else if(typeof updateGraphicsQualityControls==='function')updateGraphicsQualityControls();
  graphicsAutoResetMonitor();
  if(mode!=='auto')hideGraphicsAutoNotice();
  if(options.saveGame!==false&&typeof SaveSystem!=='undefined')SaveSystem.save();
  return true;
}

let graphicsAutoLastTime=0,graphicsAutoWindowMs=0,graphicsAutoWindowFrames=0,graphicsAutoSlowWindows=0,graphicsAutoStartAt=0;
function graphicsAutoResetMonitor(){graphicsAutoLastTime=0;graphicsAutoWindowMs=0;graphicsAutoWindowFrames=0;graphicsAutoSlowWindows=0;graphicsAutoStartAt=0;}
function hideGraphicsAutoNotice(){
  const notice=document.getElementById('autoQualityNotice');
  if(notice)notice.classList.remove('show');
  if(notice&&notice._hideTimer){clearTimeout(notice._hideTimer);notice._hideTimer=0;}
}
function showGraphicsAutoNotice(){
  const notice=document.getElementById('autoQualityNotice');
  if(!notice)return;
  notice.classList.add('show');
  if(notice._hideTimer)clearTimeout(notice._hideTimer);
  notice._hideTimer=setTimeout(()=>notice.classList.remove('show'),12000);
  const restore=document.getElementById('autoQualityRestoreBtn');
  if(restore&&!restore._autoQualitySetup){
    restore._autoQualitySetup=true;
    restore.addEventListener('click',()=>setGraphicsMode('medium'));
  }
}
function updateGraphicsAutoQuality(){
  if(graphicsMode!=='auto'||gameMode!==GameMode.PLAYING||document.visibilityState==='hidden'){
    graphicsAutoResetMonitor();return;
  }
  const now=performance.now();
  if(!graphicsAutoStartAt){graphicsAutoStartAt=now+5000;graphicsAutoLastTime=0;return;}
  if(now<graphicsAutoStartAt)return;
  if(!graphicsAutoLastTime){graphicsAutoLastTime=now;return;}
  const elapsed=now-graphicsAutoLastTime;graphicsAutoLastTime=now;
  if(elapsed>2500){graphicsAutoWindowMs=0;graphicsAutoWindowFrames=0;graphicsAutoSlowWindows=0;return;}
  graphicsAutoWindowMs+=elapsed;graphicsAutoWindowFrames++;
  if(graphicsAutoWindowMs<2000)return;
  const fps=graphicsAutoWindowFrames*1000/graphicsAutoWindowMs;
  graphicsAutoSlowWindows=fps<22?graphicsAutoSlowWindows+1:0;
  graphicsAutoWindowMs=0;graphicsAutoWindowFrames=0;
  if(graphicsAutoSlowWindows>=2&&graphicsQuality!=='low'){
    graphicsAutoSlowWindows=0;
    applyGraphicsQuality('low',{persist:false,saveGame:false});
    showGraphicsAutoNotice();
  }
}

function registerGraphicsPointLight(light){
  if(!light||!light.isPointLight)return;
  light.castShadow=false;
  if(!graphicsPointLights.includes(light))graphicsPointLights.push(light);
}
function clearGraphicsPointLights(){
  if(activeGraphicsShadowPointLight){
    activeGraphicsShadowPointLight.castShadow=false;
    if(activeGraphicsShadowPointLight.shadow.map){activeGraphicsShadowPointLight.shadow.map.dispose();activeGraphicsShadowPointLight.shadow.map=null;}
  }
  graphicsPointLights.length=0;activeGraphicsShadowPointLight=null;
}
function updateGraphicsLighting(){
  if(!hunter||!lightingRefs.moon)return;
  const x=Math.round(hunter.position.x/8)*8,z=Math.round(hunter.position.z/8)*8,y=hunter.position.y;
  if(!graphicsShadowAnchor||graphicsShadowAnchor.x!==x||graphicsShadowAnchor.y!==y||graphicsShadowAnchor.z!==z){
    if(!graphicsShadowAnchor)graphicsShadowAnchor=new THREE.Vector3();
    graphicsShadowAnchor.set(x,y,z);
    lightingRefs.moon.target.position.set(x,y+1.4,z);
    lightingRefs.moon.position.set(x-27,y+48,z-34);
    lightingRefs.moon.target.updateMatrixWorld();
    lightingRefs.moon.shadow.camera.updateProjectionMatrix();
    lightingRefs.moon.shadow.needsUpdate=true;
    if(lightingRefs.rim){
      lightingRefs.rim.position.set(x+15,y+19,z-24);
      lightingRefs.rim.target.position.set(x,y+1.2,z);
      lightingRefs.rim.target.updateMatrixWorld();
    }
  }
  const shouldCast=graphicsQuality==='ultra'&&gameMode===GameMode.PLAYING;
  let nearest=null,nearestDistance=18*18;
  if(shouldCast){
    for(const light of graphicsPointLights){
      if(!light||!light.parent||light.intensity<=0.04)continue;
      light.getWorldPosition(graphicsLightWorldPosition);
      const distance=graphicsLightWorldPosition.distanceToSquared(hunter.position);
      if(distance<nearestDistance){nearestDistance=distance;nearest=light;}
    }
  }
  if(nearest!==activeGraphicsShadowPointLight){
    if(activeGraphicsShadowPointLight){
      activeGraphicsShadowPointLight.castShadow=false;
      if(activeGraphicsShadowPointLight.shadow.map){activeGraphicsShadowPointLight.shadow.map.dispose();activeGraphicsShadowPointLight.shadow.map=null;}
    }
    activeGraphicsShadowPointLight=nearest;
    if(nearest){
      nearest.shadow.mapSize.set(getGraphicsProfile().pointShadowMapSize,getGraphicsProfile().pointShadowMapSize);
      nearest.shadow.camera.near=0.15;nearest.shadow.camera.far=Math.max(12,nearest.distance||22);
      nearest.shadow.camera.updateProjectionMatrix();
      nearest.shadow.bias=-0.0007;nearest.shadow.normalBias=0.035;nearest.shadow.radius=2.5;
      nearest.castShadow=true;
    }
  }
}

function renderGameFrame(){
  updateGraphicsLighting();
  if(graphicsComposer&&!graphicsPipelineBroken){
    try{graphicsComposer.render();return;}
    catch(error){
      graphicsPipelineBroken=true;disposeGraphicsPipeline();
      console.warn('[BB] Сбой postprocessing; переключение на прямой рендер.',error);
    }
  }
  renderer.render(scene,camera);
}

function createMoonTexture(){
  const canvas=document.createElement('canvas'); canvas.width=1024; canvas.height=512;
  const ctx=canvas.getContext('2d');
  const base=ctx.createLinearGradient(0,0,1024,512);
  base.addColorStop(0,'#aeb9c8'); base.addColorStop(0.48,'#e0e5e9'); base.addColorStop(1,'#929eaf');
  ctx.fillStyle=base; ctx.fillRect(0,0,1024,512);
  let seed=918273;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/4294967296;};
  for(let i=0;i<5200;i++){
    const x=rand()*1024,y=rand()*512,r=.35+rand()*2.2;
    ctx.fillStyle=rand()>.52?'rgba(49,60,76,0.075)':'rgba(255,255,255,0.11)';
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  for(let i=0;i<74;i++){
    const x=rand()*1024,y=34+rand()*444,r=4+Math.pow(rand(),1.7)*29,shade=80+Math.floor(rand()*42);
    const crater=ctx.createRadialGradient(x-r*.2,y-r*.22,r*.06,x,y,r);
    crater.addColorStop(0,`rgba(${shade-14},${shade-7},${shade+5},0.36)`);
    crater.addColorStop(.66,`rgba(${shade},${shade+7},${shade+17},0.25)`);
    crater.addColorStop(.82,'rgba(247,249,251,0.38)'); crater.addColorStop(1,'rgba(62,72,88,0.26)');
    ctx.fillStyle=crater; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(245,248,252,0.28)'; ctx.lineWidth=Math.max(1,r*.055);
    ctx.beginPath(); ctx.arc(x-r*.05,y-r*.05,r*.78,Math.PI*1.03,Math.PI*1.84); ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  if(THREE.sRGBEncoding!==undefined) texture.encoding=THREE.sRGBEncoding;
  return texture;
}

function createMoonGlowTexture(){
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  const glow=ctx.createRadialGradient(128,128,16,128,128,128);
  glow.addColorStop(0,'rgba(215,229,248,0.55)'); glow.addColorStop(.22,'rgba(190,210,240,0.28)');
  glow.addColorStop(.55,'rgba(150,180,220,0.09)'); glow.addColorStop(1,'rgba(120,155,205,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,256,256);
  const texture=new THREE.CanvasTexture(canvas);
  if(THREE.sRGBEncoding!==undefined) texture.encoding=THREE.sRGBEncoding;
  return texture;
}

function createRain(){
  if(!scene) return;
  if(window._rainMesh){
    scene.remove(window._rainMesh);
    window._rainMesh.geometry.dispose();
    window._rainMesh.material.dispose();
    window._rainMesh=null;
  }
  const rainGeo = new THREE.BufferGeometry();
  const profile=getGraphicsProfile();
  const rainCount = profile.low?(profile.mobile?140:300):(profile.mobile?420:1000);
  const positions = new Float32Array(rainCount * 6);
  rainDrops = [];
  for(let i=0;i<rainCount;i++){
    const k = i*6;
    const x = (Math.random()-0.5) * 100;
    const y = Math.random() * 50;
    const z = (Math.random()-0.5) * 100;
    const length = 0.35 + Math.random()*0.65;
    positions[k] = x; positions[k+1] = y; positions[k+2] = z;
    positions[k+3] = x+0.08; positions[k+4] = y-length; positions[k+5] = z+0.03;
    rainDrops.push({velocity:-1.4-Math.random()*0.8,length});
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rainMat = new THREE.LineBasicMaterial({color:0x91a1b2,transparent:true,opacity:0.24,depthWrite:false});
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  rain.visible=currentLocation!==2;
  scene.add(rain);
  window._rainMesh = rain;
}
function spawnDustMotes(count=80){
  if(!scene) return;
  const profile=getGraphicsProfile();
  const moteCount = Math.min(count,profile.dustMoteLimit);
  for(let i=0;i<moteCount;i++){
    const geo = new THREE.SphereGeometry(0.02+Math.random()*0.035, 4, 4);
    const mat = new THREE.MeshBasicMaterial({color:0xaeb3bd, transparent:true, opacity:0.20});
    const m = new THREE.Mesh(geo, mat);
    const floorY=FLOOR_LEVELS[Math.floor(Math.random()*FLOOR_LEVELS.length)];
    m.position.set(stageBounds.minX+Math.random()*STAGE_WORLD_WIDTH,floorY+0.5+Math.random()*9,stageBounds.minZ+Math.random()*STAGE_WORLD_DEPTH);
    scene.add(m);
    dustMotes.push({mesh:m, vy:0.05+Math.random()*0.1, vx:(Math.random()-0.5)*0.08, vz:(Math.random()-0.5)*0.08, phase:Math.random()*Math.PI*2});
  }
}

function createHunter(){
  if(hunter || !scene) return;
  hunter = new THREE.Group();
  hunterMotionPivot = new THREE.Group();
  hunterMotionPivot.position.y = 1.4;
  hunter.add(hunterMotionPivot);
  hunterVisualRoot = new THREE.Group();
  hunterVisualRoot.position.y = -1.4;
  hunterMotionPivot.add(hunterVisualRoot);
  const coatMat = new THREE.MeshStandardMaterial({color:0x3a2818, roughness:0.8, metalness:0.15});
  const leatherMat = new THREE.MeshStandardMaterial({color:0x4a3e30, roughness:0.85, metalness:0.1});
  const metalMat = new THREE.MeshStandardMaterial({color:0xc8c8d0, metalness:0.9, roughness:0.2});
  const clothMat = new THREE.MeshStandardMaterial({color:0x1e1408, roughness:0.95});

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.5,1.3,16),coatMat);
  torso.position.y = 1.25; torso.castShadow = true; hunterVisualRoot.add(torso);
  hunterParts.torso = torso;
  const coatBack = new THREE.Mesh(new THREE.BoxGeometry(0.95,1.7,0.2),coatMat);
  coatBack.position.set(0,0.65,-0.6); coatBack.rotation.x = 0.3; coatBack.castShadow = true;
  hunterVisualRoot.add(coatBack); hunterParts.coatBack = coatBack;
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.12,1.1,0.05),clothMat);
  strap.position.set(0.12,1.45,0.45); strap.rotation.z = 0.5; hunterVisualRoot.add(strap);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.15,0.08),metalMat);
  buckle.position.set(0.12,1.45,0.49); buckle.rotation.z = 0.5; hunterVisualRoot.add(buckle);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.52,0.15,16),leatherMat);
  belt.position.y = 0.72; hunterVisualRoot.add(belt);
  const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.08),metalMat);
  beltBuckle.position.set(0,0.72,0.5); hunterVisualRoot.add(beltBuckle);
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.35,0.2),leatherMat);
  pouch.position.set(-0.45,0.58,0.22); pouch.rotation.y = -0.3; hunterVisualRoot.add(pouch);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.45,16), new THREE.MeshStandardMaterial({color:0x8a7868, roughness:0.85}));
  head.position.y = 2.15; head.castShadow = true; hunterVisualRoot.add(head);
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.85,0.85,0.08,20),leatherMat);
  hatBrim.scale.set(1,1,0.9); hatBrim.position.y = 2.42; hatBrim.castShadow = true; hunterVisualRoot.add(hatBrim);
  const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.45,0.55,16),leatherMat);
  hatTop.position.y = 2.72; hatTop.castShadow = true; hunterVisualRoot.add(hatTop);
  const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.12,0.62,14),coatMat);
  rightArm.position.set(0.48,1.75,0.25); rightArm.rotation.x = -0.35; rightArm.castShadow = true;
  hunterVisualRoot.add(rightArm); hunterParts.rightArm = rightArm;

  const weapon = new THREE.Group();
  weapon.position.set(0.52,1.38,0.48); weapon.rotation.x = -Math.PI/3;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.065,0.75,14),leatherMat);
  handle.rotation.x = Math.PI/2; weapon.add(handle);
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16,0.07,0.12),metalMat);
  guard.position.set(0,0.38,0); weapon.add(guard);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22,1.2,0.07),metalMat);
  blade.position.set(0,0.95,0); blade.rotation.x = Math.PI/2; blade.castShadow = true; weapon.add(blade);
  for(let i=0;i<10;i++){
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.055,0.18,8),metalMat);
    t.position.set(-0.035,0.58+i*0.12,0.09); t.rotation.z = Math.PI/2.5; t.castShadow = true; weapon.add(t);
  }
  hunterParts.weaponBlade = blade;
  hunterVisualRoot.add(weapon); hunterParts.weapon = weapon;
  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.12,0.62,14),coatMat);
  leftArm.position.set(-0.48,1.75,0.25); leftArm.rotation.x = -0.35; leftArm.castShadow = true;
  hunterVisualRoot.add(leftArm); hunterParts.leftArm = leftArm;
  const gun = new THREE.Group();
  gun.position.set(-0.52,1.38,0.48); gun.rotation.x = -Math.PI/2;
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.14,0.16,0.42),metalMat);
  gunBody.castShadow = true; gun.add(gunBody);
  const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.55,14),metalMat);
  gunBarrel.rotation.x = Math.PI/2; gunBarrel.position.z = 0.48; gunBarrel.castShadow = true; gun.add(gunBarrel);
  hunterVisualRoot.add(gun); hunterParts.gun = gun;
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.14,1.15,14),leatherMat);
  leftLeg.position.set(-0.22,0.52,0); leftLeg.castShadow = true; hunterVisualRoot.add(leftLeg);
  hunterParts.leftLeg = leftLeg;
  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.14,1.15,14),leatherMat);
  rightLeg.position.set(0.22,0.52,0); rightLeg.castShadow = true; hunterVisualRoot.add(rightLeg);
  hunterParts.rightLeg = rightLeg;
  scene.add(hunter);
  if(player.weaponMode === 1){
    blade.geometry.dispose();
    blade.geometry = new THREE.BoxGeometry(0.1,1.6,0.06);
    blade.position.y = 1.15;
    $('btnTransform').classList.add('active');
  }
}
