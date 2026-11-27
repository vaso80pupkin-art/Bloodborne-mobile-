function fitVisualModel(source, targetHeight, maxFootprint, cloneSkinned=false, cloneMaterials=false){
  if(!source) return null;
  const clone = cloneSkinned && THREE.SkeletonUtils && THREE.SkeletonUtils.clone
    ? THREE.SkeletonUtils.clone(source)
    : source.clone(true);
  clone.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const byHeight = targetHeight / Math.max(size.y, 0.001);
  const byFootprint = maxFootprint > 0
    ? maxFootprint / Math.max(size.x, size.z, 0.001)
    : Infinity;
  const scale = Math.min(byHeight, byFootprint);
  clone.scale.setScalar(scale);
  clone.position.set(-center.x*scale, -bounds.min.y*scale, -center.z*scale);
  if(cloneMaterials) clone.traverse(node=>{
    if(node.isMesh && node.material){
      node.material = Array.isArray(node.material) ? node.material.map(material=>material.clone()) : node.material.clone();
    }
  });
  clone.traverse(node=>{
    if(node.isMesh){ node.castShadow = true; node.receiveShadow = true; }
  });
  clone.userData.visualHeight = size.y*scale;
  clone.updateMatrixWorld(true);
  return clone;
}

function updateHunterAxes(){
  // Оси качания в системе координат самой модели (с учётом её поворота)
  const up = new THREE.Vector3(0,1,0);
  const yaw = hunterModelYaw || 0;
  hunterSwingAxis = new THREE.Vector3(-1,0,0).applyAxisAngle(up,-yaw); // + угол = конечность идёт вперёд
  hunterFwdAxis   = new THREE.Vector3(0,0,1).applyAxisAngle(up,-yaw);
}

function rotateHunterModel(){
  hunterModelYaw = (((hunterModelYaw || 0) + Math.PI/2) % (Math.PI*2));
  try{ localStorage.setItem('bb_hunter_yaw', String(hunterModelYaw)); }catch(e){}
  if(hunterYawGroup) hunterYawGroup.rotation.y = hunterModelYaw;
  updateHunterAxes();
}

window.addEventListener('keydown',event=>{
  if(!event.repeat && event.key && event.key.toLowerCase()==='t'){
    modelFlip=!modelFlip;
    hunterModelYaw=hunterRig?Math.PI/2+(modelFlip?Math.PI:0):(modelFlip?Math.PI:0);
    try{ localStorage.setItem('bb_hunter_yaw',String(hunterModelYaw)); }catch(e){}
    if(hunterYawGroup) hunterYawGroup.rotation.y=hunterModelYaw;
    updateHunterAxes();
  }
});

function setupHunterClips(){
  const clips = hunterModelClips || [];
  const find = re => clips.find(c => re.test(c.name)) || null;
  hunterClipMap = {
    idle: find(/idle|stand|breath|wait/i),
    walk: find(/walk/i),
    run: find(/run|sprint|jog/i),
    dodge: find(/dodge|roll|evade|step|jump/i),
    attacks: clips.filter(c => /attack|slash|swing|strike|chop|hit|combat|saw/i.test(c.name))
  };
  if(!hunterClipMap.idle) hunterClipMap.idle = clips.find(c => c !== hunterClipMap.walk && c !== hunterClipMap.run) || clips[0] || null;
}

function playHunterClip(clip, once=false, timeScale=1, fade=0.15){
  if(!clip || !hunterMixer) return;
  const next = hunterMixer.clipAction(clip);
  const prev = hunterCurrentAction;
  if(prev === next && !once){ next.timeScale = timeScale; return; }
  next.reset();
  next.enabled = true;
  next.timeScale = timeScale;
  next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
  next.clampWhenFinished = once;
  next.play();
  if(prev && prev !== next) prev.crossFadeTo(next, fade, false);
  hunterCurrentAction = next;
}

let hunterRig = null;
let hunterRigActionState = null;
function startHunterRigAction(action,duration){
  if(!hunterRig || (action!=='shoot' && action!=='heal')) return;
  const actionDuration=Number.isFinite(duration)&&duration>0?duration:(action==='shoot'?0.3:0.6);
  hunterRigActionState={action,elapsed:0,duration:actionDuration};
}
function updateHunterRig(dt,speed=0){
  if(!hunterRig) return;
  const step=Number.isFinite(dt)?Math.max(0,dt):0;
  let action='idle',t=0;
  if(player.isDodging){
    hunterRigActionState=null;
    action='dodge';
    t=Math.min(1,Math.max(0,player.dodgeTime/0.2));
  }else if(player.isAttacking){
    hunterRigActionState=null;
    action='attack';
    t=Math.min(1,Math.max(0,player.attackTime/0.34));
  }else if(hunterRigActionState){
    const state=hunterRigActionState;
    state.elapsed=Math.min(state.duration,state.elapsed+step);
    action=state.action;
    t=state.duration?state.elapsed/state.duration:1;
    if(state.elapsed>=state.duration) hunterRigActionState=null;
  }
  hunterRig.update(step,{speed:Number.isFinite(speed)?Math.max(0,speed):0,action,t});
}

function mountHunterModel(){
  if(!hunter || !hunterModelSource || hunterVisual) return;
  // cloneSkinned=true: корректно клонирует модели со скелетом
  const modelRoot = new THREE.Group();
  modelRoot.name = 'hunter-model-root';
  let model = null;
  if(hunterRig){
    modelRoot.scale.setScalar(2);
    modelRoot.add(hunterRig.root);
    hunterRig.root.updateMatrixWorld(true);
    const rigBounds=new THREE.Box3().setFromObject(hunterRig.parts[0]);
    const rigCenter=rigBounds.getCenter(new THREE.Vector3());
    hunterRig.root.position.x-=rigCenter.x;
    hunterRig.root.position.z-=rigCenter.z;
    model = modelRoot;
  }else{
    model = fitVisualModel(hunterModelSource, 10.5, 5.8, true);
    if(!model) return;
    modelRoot.add(model);
  }
  const height = hunterRig ? hunterRig.height : (model.userData.visualHeight || 10.5);

  // Автоподбор поворота, если игрок ещё не выбирал его вручную:
  // у человека в обычной позе ширина (плечи) больше глубины. Если модель вытянута по Z — она смотрит вбок.
  if(hunterModelYaw === null){
    if(hunterRig){
      // В rig локальный перед модели направлен по -X, поэтому +90° совмещает его с +Z игры.
      hunterModelYaw = Math.PI/2 + (modelFlip ? Math.PI : 0);
    }else{
      const box = new THREE.Box3().setFromObject(model), sz = new THREE.Vector3();
      box.getSize(sz);
      hunterModelYaw = sz.z > sz.x*1.15 ? -Math.PI/2 : 0;
      console.log('[BB] Размер модели охотника', sz.x.toFixed(2), sz.y.toFixed(2), sz.z.toFixed(2), '→ поворот', hunterModelYaw);
    }
  }
  updateHunterAxes();

  hunterMotionPivot.position.y = height * 0.5;
  hunterVisualRoot.position.y = -height * 0.5;
  hunterVisualRoot.children.forEach(child=>{ child.visible = false; });
  if(hunterRig){
    if(hunterParts.weapon) hunterParts.weapon.visible = false;
    if(hunterParts.gun) hunterParts.gun.visible = false;
  }

  // hunterVisual (наклоны/покачивание из цикла) → hunterYawGroup (поворот «лицом вперёд») → model
  hunterYawGroup = new THREE.Group();
  hunterYawGroup.rotation.y = hunterModelYaw;
  hunterYawGroup.add(modelRoot);
  const visual = new THREE.Group();
  visual.add(hunterYawGroup);
  visual.userData.visualHeight = height;
  hunterVisualRoot.add(visual);
  hunterVisual = visual;
  hunterVisualBaseY = 0;
  hunterVisualHeight = height;

  let hasSkin = false;
  model.traverse(n => { if(n.isSkinnedMesh) hasSkin = true; });
  console.log('[BB] Анимации в hunter.glb:', (hunterModelClips||[]).map(c=>c.name), '| skinned:', hasSkin);

  if(hunterRig){
    hunterMixer=null;
    hunterModelRig=null;
    hunterAnimMode='none';
  }else if(hunterModelClips && hunterModelClips.length){
    hunterMixer = new THREE.AnimationMixer(model);
    setupHunterClips();
    hunterAnimMode = (hunterClipMap.walk || hunterClipMap.run) ? 'clips' : 'body';
    if(hunterAnimMode === 'body') playHunterClip(hunterClipMap.idle);
  } else if(hasSkin){
    hunterAnimMode = 'body';     // скелет есть, а клипов нет — не трогаем кости, анимируем тело целиком
  } else {
    hunterModelRig = buildHunterModelRig(model, height);
    const r = hunterModelRig;
    hunterAnimMode = (r.legs.length || r.arms.length) ? 'parts' : 'body';
  }
  console.log('[BB] Режим анимации охотника:', hunterAnimMode);
  cameraDistance = 11.5;
  cameraHeight = 7.8;
  camera.fov = 58;
  camera.updateProjectionMatrix();
}

function buildHunterModelRig(root,height){
  const rig={arms:[],legs:[],torso:[],head:[],static:[],bones:[],skeleton:null};
  if(!root || !hunterVisualRoot) return rig;
  root.updateWorldMatrix(true,true);
  const modelParts=root.children.slice();
  const skeletonRoot=new THREE.Bone();
  skeletonRoot.name='hunter-rig-root';
  root.add(skeletonRoot);
  rig.bones.push(skeletonRoot);
  const parts=modelParts.map((node,index)=>{
    if(!node.isMesh && !node.children.some(child=>child.isMesh)) return null;
    const bounds=new THREE.Box3().setFromObject(node);
    if(bounds.isEmpty()) return null;
    const worldCenter=bounds.getCenter(new THREE.Vector3());
    const worldSize=bounds.getSize(new THREE.Vector3());
    return {
      node,index,bounds,worldCenter,worldSize,
      localCenter:root.worldToLocal(worldCenter.clone()),
      actorCenter:hunterVisualRoot.worldToLocal(worldCenter.clone())
    };
  }).filter(Boolean);
  parts.forEach(part=>{
    const h=part.worldSize.y, ratio=part.actorCenter.y/height;
    let kind='static';
    if(part.index===0) kind='torso';
    else if(part.index===3 || (ratio>0.79 && h>height*0.075)) kind='head';
    else if(part.index===4 || part.index===6) kind='legs';
    else if(part.index===1 || part.index===2) kind='arms';
    const pivotPoint=part.localCenter.clone();
    if(kind==='arms' || kind==='legs'){
      const jointWorld=new THREE.Vector3(part.worldCenter.x,kind==='arms'?part.bounds.max.y:part.bounds.max.y,part.worldCenter.z);
      pivotPoint.copy(root.worldToLocal(jointWorld));
    } else if(kind==='head'){
      const jointWorld=new THREE.Vector3(part.worldCenter.x,part.bounds.min.y,part.worldCenter.z);
      pivotPoint.copy(root.worldToLocal(jointWorld));
    }
    const pivot=new THREE.Bone();
    pivot.name=`hunter-${kind}-joint-${part.index}`;
    skeletonRoot.add(pivot);
    pivot.position.copy(pivotPoint);
    part.node.position.sub(pivotPoint);
    pivot.add(part.node);
    rig.bones.push(pivot);
    const entry={pivot,index:part.index,side:Math.sign(part.actorCenter.x)||((part.index%2)?1:-1)};
    rig[kind].push(entry);
  });
  root.updateMatrixWorld(true);
  rig.skeleton=new THREE.Skeleton(rig.bones);
  rig.skeleton.calculateInverses();
  return rig;
}

function setPivotAngle(pivot, axis, angle, k){
  const a = lerp(pivot.userData.ang || 0, angle, k);
  pivot.userData.ang = a;
  pivot.quaternion.setFromAxisAngle(axis, a);
}

// Наклон/покачивание тела целиком (в системе координат «лицом по Z»)
function applyHunterBodyLean(pose, phase, attackTime, scale){
  if(!hunterYawGroup) return;
  let lean = 0, roll = 0;
  if(pose === 'walk'){ lean = 0.10; roll = Math.sin(phase)*0.05; }
  else if(pose === 'run'){ lean = 0.24; roll = Math.sin(phase)*0.08; }
  else if(pose === 'dodge'){ lean = 0.45; }
  else if(pose === 'attack'){
    if(attackTime < 0.25) lean = lerp(0, -0.28, attackTime/0.25);               // замах — откинулся назад
    else if(attackTime < 0.55) lean = lerp(-0.28, 0.50, (attackTime-0.25)/0.3); // удар — рывок вперёд
    else lean = lerp(0.50, 0, Math.min(1,(attackTime-0.55)/0.30));              // возврат
    roll = (attackTime < 0.55 ? -1 : 1) * 0.06;
  } else { lean = Math.sin(phase*0.4)*0.012; }
  hunterYawGroup.rotation.x = lerp(hunterYawGroup.rotation.x, lean*scale, 0.18);
  hunterYawGroup.rotation.z = lerp(hunterYawGroup.rotation.z, roll*scale, 0.18);
}

function poseHunterModel(pose,time=0,attackTime=0){
  if(hunterAnimMode === 'none' || !hunterVisual) return;
  const phase = player.walkTime*1.25;
  const changed = pose !== hunterPoseState;

  // ---- 1. Клипы из самого GLB ----
  if(hunterAnimMode === 'clips' && hunterClipMap){
    const m = hunterClipMap;
    if(pose === 'walk') playHunterClip(m.walk || m.run || m.idle, false, 1);
    else if(pose === 'run') playHunterClip(m.run || m.walk || m.idle, false, m.run ? 1 : 1.5);
    else if(pose === 'dodge'){
      if(changed) playHunterClip(m.dodge || m.run || m.walk || m.idle, !!m.dodge, m.dodge ? Math.max(0.5, m.dodge.duration/0.5) : 1.6, 0.08);
    } else if(pose === 'attack'){
      const restart = changed || attackTime < hunterLastAttackT - 0.001;
      if(restart){
        if(m.attacks.length){
          const clip = m.attacks[hunterAttackCombo++ % m.attacks.length];
          playHunterClip(clip, true, Math.max(0.4, clip.duration/0.85), 0.08);
        } else {
          playHunterClip(m.run || m.walk || m.idle, false, 1.6, 0.08);
        }
      }
    } else playHunterClip(m.idle, false, 1);
    if(!(pose === 'attack' && !m.attacks.length)) applyHunterBodyLean(pose, phase, attackTime, pose === 'attack' ? 0.35 : 0);
    else applyHunterBodyLean(pose, phase, attackTime, 1);
    hunterPoseState = pose; hunterLastAttackT = pose === 'attack' ? attackTime : 0;
    return;
  }

  // ---- 2. Модель, разобранная на части (ноги / руки / торс / голова) ----
  if(hunterAnimMode === 'parts' && hunterModelRig){
    const sw = hunterSwingAxis, fw = hunterFwdAxis;
    const gaitLeg = pose==='run' ? 0.85 : (pose==='walk' ? 0.55 : 0);
    const gaitArm = pose==='run' ? 0.70 : (pose==='walk' ? 0.35 : 0);
    hunterModelRig.legs.forEach((part,i)=>{
      const sgn = (i%2) ? -1 : 1;
      let target = Math.sin(phase)*sgn*gaitLeg;
      if(pose==='dodge') target = sgn*0.7;
      if(pose==='attack'){ target = sgn*(attackTime<0.55 ? 0.30 : 0.10); }
      setPivotAngle(part.pivot, sw, target, 0.22);
    });
    const strikingIdx = (player.currentAttack?.attackHand ?? player.attackHand ?? 0) % Math.max(1,hunterModelRig.arms.length);
    hunterModelRig.arms.forEach((part,i)=>{
      const sgn = (i%2) ? 1 : -1;
      let target = Math.sin(phase)*sgn*gaitArm;
      if(pose==='dodge') target = -0.5;
      if(pose==='attack'){
        const striking = i === strikingIdx;
        const back = striking ? -1.0 : -0.25, fwd = striking ? 1.7 : 0.45;
        if(attackTime < 0.25)      target = lerp(0, back, attackTime/0.25);
        else if(attackTime < 0.55) target = lerp(back, fwd, (attackTime-0.25)/0.3);
        else                       target = lerp(fwd, 0, Math.min(1,(attackTime-0.55)/0.30));
      }
      if(player.gunRecoil>0 && i===0) target = 1.3*Math.sin(Math.min(1,player.gunRecoil/0.22)*Math.PI*0.5) + 0.2;
      setPivotAngle(part.pivot, sw, target, pose==='attack' ? 0.35 : 0.18);
    });
    hunterModelRig.torso.forEach(part=>{
      let twist = pose==='run' ? Math.sin(phase)*0.05 : (pose==='walk' ? Math.sin(phase)*0.03 : Math.sin(time*1.4)*0.006);
      if(pose==='attack') twist = attackTime<0.25 ? 0.05 : -0.05;
      setPivotAngle(part.pivot, fw, twist, 0.15);
    });
    hunterModelRig.head.forEach(part=>{
      const look = pose==='attack' ? 0 : Math.sin(time*0.7)*0.04;
      part.pivot.rotation.y = lerp(part.pivot.rotation.y, look, 0.06);
    });
    applyHunterBodyLean(pose, phase, attackTime, 0.5);
    hunterPoseState = pose; hunterLastAttackT = pose === 'attack' ? attackTime : 0;
    return;
  }

  // ---- 3. Запасной вариант: анимируем модель целиком ----
  applyHunterBodyLean(pose, phase, attackTime, 1);
  hunterPoseState = pose; hunterLastAttackT = pose === 'attack' ? attackTime : 0;
}

function poseFallbackHunterAttack(attackTime){
  const active=player.currentAttack?.attackHand===1?hunterParts.leftArm:hunterParts.rightArm;
  const support=active===hunterParts.leftArm?hunterParts.rightArm:hunterParts.leftArm;
  if(!active || !support) return;
  if(attackTime<0.25){
    const p=attackTime/0.25;
    active.rotation.x=lerp(-0.35,-0.12,p);
    support.rotation.x=lerp(-0.35,-0.24,p);
  } else if(attackTime<0.55){
    const p=(attackTime-0.25)/0.3;
    active.rotation.x=lerp(-0.12,0.92,p);
    support.rotation.x=lerp(-0.24,-0.12,p);
  } else {
    const p=Math.min(1,(attackTime-0.55)/0.3);
    active.rotation.x=lerp(0.92,-0.35,p);
    support.rotation.x=lerp(-0.12,-0.35,p);
  }
}

const proceduralSkinGeometryCache=new WeakMap();

function makeProceduralBoneDefs(geometry,archetype){
  if(!geometry.boundingBox) geometry.computeBoundingBox();
  const box=geometry.boundingBox, size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
  const w=Math.max(size.x,0.001), h=Math.max(size.y,0.001), d=Math.max(size.z,0.001);
  const defs=[];
  const add=(name,parent,x,y,z)=>defs.push({name,parent,point:new THREE.Vector3(x,y,z)});
  add('root',null,center.x,center.y,center.z);

  if(archetype==='spider'){
    add('abdomen','root',center.x,box.min.y+h*0.48,center.z);
    add('head','abdomen',center.x,box.min.y+h*0.58,center.z+d*0.12);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4, dx=Math.cos(a), dz=Math.sin(a);
      const hip=`spider${i}Upper`, knee=`spider${i}Lower`;
      add(hip,'abdomen',center.x+dx*w*0.16,box.min.y+h*0.50,center.z+dz*d*0.16);
      add(knee,hip,center.x+dx*w*0.34,box.min.y+h*0.43,center.z+dz*d*0.34);
    }
  } else if(archetype==='quadruped'){
    add('pelvis','root',center.x,box.min.y+h*0.56,center.z-d*0.10);
    add('spine','pelvis',center.x,box.min.y+h*0.65,center.z);
    add('neck','spine',center.x,box.min.y+h*0.70,center.z+d*0.23);
    add('head','neck',center.x,box.min.y+h*0.77,center.z+d*0.39);
    for(const front of [true,false]) for(const side of [-1,1]){
      const name=`${front?'front':'hind'}${side>0?'Right':'Left'}`;
      const parent=front?'spine':'pelvis', z= center.z+(front?d*0.28:-d*0.27);
      add(`${name}Upper`,parent,center.x+side*w*0.30,box.min.y+h*0.52,z);
      add(`${name}Lower`,`${name}Upper`,center.x+side*w*0.34,box.min.y+h*0.27,z+(front?d*0.06:-d*0.05));
      add(`${name}Foot`,`${name}Lower`,center.x+side*w*0.36,box.min.y+h*0.035,z+(front?d*0.09:-d*0.08));
    }
  } else {
    add('pelvis','root',center.x,box.min.y+h*0.50,center.z);
    add('spine','pelvis',center.x,box.min.y+h*0.62,center.z);
    add('chest','spine',center.x,box.min.y+h*0.73,center.z);
    add('neck','chest',center.x,box.min.y+h*0.85,center.z);
    add('head','neck',center.x,box.min.y+h*0.94,center.z);
    for(const side of [-1,1]){
      const name=side>0?'right':'left';
      add(`${name}Shoulder`,'chest',center.x+side*w*0.20,box.min.y+h*0.72,center.z);
      add(`${name}Elbow`,`${name}Shoulder`,center.x+side*w*0.38,box.min.y+h*0.59,center.z+d*0.015);
      add(`${name}Hand`,`${name}Elbow`,center.x+side*w*0.44,box.min.y+h*0.46,center.z+d*0.025);
      add(`${name}Thigh`,'pelvis',center.x+side*w*0.14,box.min.y+h*0.47,center.z);
      add(`${name}Shin`,`${name}Thigh`,center.x+side*w*0.15,box.min.y+h*0.25,center.z);
      add(`${name}Foot`,`${name}Shin`,center.x+side*w*0.16,box.min.y+h*0.035,center.z+d*0.04);
    }
  }
  const indices=new Map(defs.map((def,index)=>[def.name,index]));
  defs.forEach(def=>{ def.parentIndex=def.parent===null?-1:indices.get(def.parent); });
  return {defs,box,size,center,indices};
}

function proceduralSkinGeometry(sourceGeometry,archetype){
  let cache=proceduralSkinGeometryCache.get(sourceGeometry);
  if(!cache){ cache=new Map(); proceduralSkinGeometryCache.set(sourceGeometry,cache); }
  if(cache.has(archetype)) return cache.get(archetype);
  const geometry=sourceGeometry;
  const blueprint=makeProceduralBoneDefs(geometry,archetype);
  const position=geometry.attributes.position;
  const count=position.count, skinIndices=new Uint8Array(count*4), skinWeights=new Uint8Array(count*4);
  const {box,size,center,indices}=blueprint;
  const w=Math.max(size.x,0.001),h=Math.max(size.y,0.001),d=Math.max(size.z,0.001);
  const clamp01=v=>Math.max(0,Math.min(1,v));
  const setPair=(i,a,b,t)=>{
    const o=i*4, ia=indices.get(a)??0, ib=indices.get(b)??ia, blend=clamp01(t);
    skinIndices[o]=ia; skinIndices[o+1]=ib; skinWeights[o]=Math.round((1-blend)*255); skinWeights[o+1]=Math.round(blend*255);
    skinWeights[o+2]=0; skinWeights[o+3]=0;
  };
  for(let i=0;i<count;i++){
    const p=position.getX(i), y=position.getY(i), z=position.getZ(i);
    const ny=clamp01((y-box.min.y)/h);
    if(archetype==='spider'){
      const nx=(p-center.x)/(w*0.5), nz=(z-center.z)/(d*0.5);
      const radius=Math.sqrt(nx*nx+nz*nz);
      if(radius>0.31){
        let angle=Math.atan2(nz,nx); if(angle<0) angle+=Math.PI*2;
        const leg=Math.round(angle/(Math.PI/4))%8;
        setPair(i,`spider${leg}Upper`,`spider${leg}Lower`,(radius-0.28)/0.38);
      } else if(ny>0.58) setPair(i,'abdomen','head',(ny-0.58)/0.22);
      else setPair(i,'root','abdomen',ny/0.7);
    } else if(archetype==='quadruped'){
      const nx=(p-center.x)/(w*0.5), nz=(z-center.z)/d;
      if(ny<0.53 && (Math.abs(nx)>0.30 || Math.abs(nz)>0.30)){
        const front=nz>0.02, side=nx>0?'Right':'Left', limb=`${front?'front':'hind'}${side}`;
        if(ny>0.25) setPair(i,`${limb}Upper`,`${limb}Lower`,(0.53-ny)/0.28);
        else setPair(i,`${limb}Lower`,`${limb}Foot`,(0.25-ny)/0.22);
      } else if(ny>0.68 && nz>0.12) setPair(i,'neck','head',(ny-0.68)/0.18);
      else if(ny>0.57) setPair(i,'spine','neck',(ny-0.57)/0.18);
      else setPair(i,'pelvis','spine',(ny-0.40)/0.25);
    } else {
      const nx=(p-center.x)/(w*0.5), side=nx>=0?'right':'left';
      if(ny>0.84) setPair(i,'neck','head',(ny-0.84)/0.13);
      else if(ny>0.48 && Math.abs(nx)>0.28){
        if(ny>0.65) setPair(i,'chest',`${side}Shoulder`,Math.abs(nx));
        else if(ny>0.57) setPair(i,`${side}Shoulder`,`${side}Elbow`,(0.66-ny)/0.10);
        else setPair(i,`${side}Elbow`,`${side}Hand`,(0.57-ny)/0.10);
      } else if(ny<0.50 && Math.abs(nx)>0.13){
        if(ny>0.26) setPair(i,`${side}Thigh`,`${side}Shin`,(0.50-ny)/0.24);
        else setPair(i,`${side}Shin`,`${side}Foot`,(0.26-ny)/0.22);
      } else if(ny<0.55) setPair(i,'pelvis','spine',(ny-0.38)/0.22);
      else if(ny<0.77) setPair(i,'spine','chest',(ny-0.55)/0.22);
      else setPair(i,'chest','neck',(ny-0.75)/0.12);
    }
  }
  geometry.setAttribute('skinIndex',new THREE.Uint8BufferAttribute(skinIndices,4));
  geometry.setAttribute('skinWeight',new THREE.Uint8BufferAttribute(skinWeights,4,true));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const result={geometry,blueprint};
  cache.set(archetype,result);
  return result;
}

function createProceduralSkeleton(visual,archetype){
  if(!visual) return null;
  const meshes=[];
  visual.traverse(node=>{if(node.isMesh && !node.isSkinnedMesh) meshes.push(node);});
  const rigs=[];
  meshes.forEach(source=>{
    if(!source.geometry || !source.geometry.attributes.position) return;
    const cached=proceduralSkinGeometry(source.geometry,archetype);
    const parent=source.parent;
    const skinMaterial=Array.isArray(source.material)
      ? source.material.map(material=>{const clone=material.clone();clone.skinning=true;return clone;})
      : source.material.clone();
    if(!Array.isArray(skinMaterial)) skinMaterial.skinning=true;
    const skin=new THREE.SkinnedMesh(cached.geometry,skinMaterial);
    skin.name=source.name; skin.position.copy(source.position); skin.quaternion.copy(source.quaternion); skin.scale.copy(source.scale);
    skin.castShadow=source.castShadow; skin.receiveShadow=source.receiveShadow; skin.renderOrder=source.renderOrder;
    skin.frustumCulled=false;
    const {defs}=cached.blueprint, bones=[], byName=new Map();
    defs.forEach((def,index)=>{
      const bone=new THREE.Bone(); bone.name=def.name;
      if(def.parentIndex>=0){
        bones[def.parentIndex].add(bone);
        bone.position.copy(def.point).sub(defs[def.parentIndex].point);
      } else bone.position.copy(def.point);
      bones.push(bone); byName.set(def.name,bone);
    });
    parent.add(skin); parent.remove(source);
    skin.add(bones[0]); skin.updateMatrixWorld(true);
    const skeleton=new THREE.Skeleton(bones); skeleton.calculateInverses();
    skin.bind(skeleton,skin.matrixWorld);
    rigs.push({root:bones[0],bones,byName,skeleton,archetype,baseRootPosition:bones[0].position.clone(),phase:Math.random()*Math.PI*2});
  });
  return rigs.length?{archetype,meshes:rigs}:null;
}

function animateProceduralSkeleton(modelRig,pose,time,attackTime=0,attackHand=0,rollProgress=0){
  if(!modelRig) return;
  const clamp01=v=>Math.max(0,Math.min(1,v));
  modelRig.meshes.forEach(rig=>{
    const bones=rig.byName, set=(name,x=0,y=0,z=0,blend=0.24)=>{
      const bone=bones.get(name); if(!bone) return;
      bone.rotation.x=lerp(bone.rotation.x,x,blend);
      bone.rotation.y=lerp(bone.rotation.y,y,blend);
      bone.rotation.z=lerp(bone.rotation.z,z,blend);
    };
    const moving=pose==='walk'||pose==='run', running=pose==='run';
    const phase=time*(running?13:8.5)+rig.phase;
    const amp=running?0.82:0.52;
    rig.bones.forEach(bone=>{
      if(bone!==rig.root){ set(bone.name,0,0,0,0.15); }
    });
    if(rig.archetype==='spider'){
      for(let i=0;i<8;i++){
        const gait=moving?Math.sin(phase+(i%2?Math.PI:0))*amp*0.55:Math.sin(time*1.6+i+rig.phase)*0.07;
        set(`spider${i}Upper`,0,gait,0.08*Math.sin(phase+i),0.30);
        set(`spider${i}Lower`,0,-gait*0.65,0.12+Math.max(0,gait)*0.45,0.30);
        if(pose==='attack') set(`spider${i}Upper`,0,Math.sin(time*15+i)*0.35,0.32,0.32);
      }
      set('head',pose==='attack'?-0.10:Math.sin(time*1.4)*0.015,0,0,0.12);
    } else if(rig.archetype==='quadruped'){
      for(const front of [true,false]) for(const side of ['Left','Right']){
        const name=`${front?'front':'hind'}${side}`;
        const offset=(front===(side==='Right'))?0:Math.PI;
        const gait=moving?Math.sin(phase+offset)*amp:0;
        set(`${name}Upper`,gait,0,0,0.28);
        set(`${name}Lower`,Math.max(0,-gait)*0.65+(pose==='attack'&&front?0.4:0),0,0,0.28);
        set(`${name}Foot`,-Math.max(0,gait)*0.25,0,0,0.20);
      }
      set('head',pose==='attack'?-0.30:(moving?0.04:0),0,moving?Math.sin(phase)*0.025:0,0.22);
      set('spine',0,0,moving?Math.sin(phase*2)*0.025:0,0.18);
    } else {
      const leftPhase=Math.sin(phase), rightPhase=Math.sin(phase+Math.PI);
      set('leftThigh',moving?leftPhase*amp:0); set('rightThigh',moving?rightPhase*amp:0);
      set('leftShin',moving?Math.max(0,-leftPhase)*amp*0.8:0); set('rightShin',moving?Math.max(0,-rightPhase)*amp*0.8:0);
      set('leftFoot',moving?-Math.max(0,leftPhase)*0.18:0); set('rightFoot',moving?-Math.max(0,rightPhase)*0.18:0);
      set('leftShoulder',moving?-rightPhase*amp*0.65:0); set('rightShoulder',moving?-leftPhase*amp*0.65:0);
      set('leftElbow',moving?0.12+Math.max(0,leftPhase)*0.18:0); set('rightElbow',moving?0.12+Math.max(0,rightPhase)*0.18:0);
      if(pose==='attack'){
        const side=attackHand===0?'right':'left', other=side==='right'?'left':'right';
        const swing=attackTime<0.28?lerp(0,-1.05,clamp01(attackTime/0.28)):attackTime<0.62?lerp(-1.05,1.38,(attackTime-0.28)/0.34):lerp(1.38,0,clamp01((attackTime-0.62)/0.28));
        set(`${side}Shoulder`,swing,0,0,0.48); set(`${side}Elbow`,attackTime<0.35?0.2:-0.38,0,0,0.42);
        set(`${other}Shoulder`,-swing*0.22,0,0,0.35); set('chest',0,side==='right'?-0.16:0.16,0,0.28);
      }
      set('spine',0,moving?Math.sin(phase)*0.025:0,pose==='hit'?0.16:0,0.15);
    }
    if(pose==='hit') set('root',0,0,0.12,0.35);
    if(pose==='roll'){
      const root=rig.root, target=-Math.PI*2*clamp01(rollProgress);
      root.rotation.x=lerp(root.rotation.x,target,0.85);
      set('leftThigh',0.75); set('rightThigh',0.75); set('leftShoulder',-0.8); set('rightShoulder',-0.8);
    } else {
      rig.root.rotation.x=lerp(rig.root.rotation.x,0,0.25);
      rig.root.position.y=rig.baseRootPosition.y+(moving?Math.abs(Math.sin(phase*2))*(running?0.018:0.009):Math.sin(time*1.5+rig.phase)*0.003);
    }
  });
}

function spiderClipForState(enemy){
  const clips = enemy.modelClips || [];
  if(!clips.length) return null;
  const find = pattern=>clips.find(clip=>pattern.test(clip.name));
  if(enemy.state === 'attack') return find(/attack|action|hit/i) || find(/idle/i) || clips[0];
  if(enemy.state === 'chase' || enemy.state === 'returning') return find(/walk|run|move/i) || find(/idle/i) || clips[0];
  return find(/idle|stand/i) || clips[0];
}

function setSpiderAnimation(enemy, force=false){
  if(!enemy.modelMixer || !enemy.modelClips) return;
  const clip = spiderClipForState(enemy);
  if(!clip || (!force && enemy.modelActionName === clip.name)) return;
  const next = enemy.modelMixer.clipAction(clip);
  const previous = enemy.modelCurrentAction;
  next.reset();
  next.enabled = true;
  if(enemy.state === 'attack' && /attack|action|hit/i.test(clip.name)){
    next.setLoop(THREE.LoopOnce, 1);
    next.clampWhenFinished = true;
  } else {
    next.setLoop(THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = false;
  }
  next.play();
  if(previous && previous !== next) previous.crossFadeTo(next, 0.18, false);
  enemy.modelCurrentAction = next;
  enemy.modelActionName = clip.name;
}

function setEnemyModelLayers(enemy,keepProceduralLimbs){
  const limbs=new Set(keepProceduralLimbs?(enemy.legs||[]).map(part=>part.hip):[]);
  enemy.mesh.children.forEach(child=>{
    const isHud=child===enemy.hpBar.bg || child===enemy.hpBar.fill;
    child.visible=isHud || limbs.has(child);
  });
}

function attachSpiderModel(enemy){
  if(!enemy || enemy.type !== 'spider') return;
  const bundle = spiderModelBundle || spiderFallbackBundle;
  if(!bundle || (enemy.modelRoot && enemy.modelBundle === bundle)) return;
  queueEnemyModelAttachment(enemy,'spider');
}

function attachSpiderModelNow(enemy){
  if(!enemy || enemy.type !== 'spider') return;
  const bundle = spiderModelBundle || spiderFallbackBundle;
  if(!bundle || (enemy.modelRoot && enemy.modelBundle === bundle)) return;
  if(enemy.modelRoot){
    if(enemy.modelMixer) enemy.modelMixer.stopAllAction();
    enemy.mesh.remove(enemy.modelRoot);
  }
  const clips = bundle.animations || [];
  const visual = fitVisualModel(bundle.scene, 4.35, 8.4, clips.length > 0);
  if(!visual) return;
  setEnemyModelLayers(enemy,false);
  enemy.mesh.add(visual);
  enemy.proceduralRig=clips.length?null:createProceduralSkeleton(visual,'spider');
  if(!clips.length && !enemy.proceduralRig) setEnemyModelLayers(enemy,true);
  enemy.modelRoot = visual;
  enemy.modelBaseY = visual.position.y;
  enemy.modelBaseZ = visual.position.z;
  enemy.modelBaseScaleY = visual.scale.y;
  enemy.modelVisualHeight = visual.userData.visualHeight || 4.35;
  enemy.visualModelKey = 'spider';
  enemy.hpBar.bg.position.y = enemy.modelVisualHeight + 0.6;
  enemy.hpBar.fill.position.y = enemy.modelVisualHeight + 0.6;
  enemy.modelBundle = bundle;
  enemy.modelClips = clips;
  enemy.modelMixer = clips.length ? new THREE.AnimationMixer(visual) : null;
  enemy.modelCurrentAction = null;
  enemy.modelActionName = '';
  setSpiderAnimation(enemy, true);
}

function attachHunterEnemyModel(enemy){
  if(!enemy || enemy.modelRoot) return;
  const bundle = hunterEnemyBundle || extraModelBundles.skullHunter;
  if(!bundle){ requestEnemyVisualModel('skullHunter'); return; }
  const isShadowBoss = enemy.type === 'boss';
  const visual = fitVisualModel(bundle.scene, isShadowBoss ? 6.4 : 2.75, isShadowBoss ? 6.8 : 1.85, false, isShadowBoss);
  if(!visual) return;
  setEnemyModelLayers(enemy,false);
  enemy.mesh.add(visual);
  enemy.proceduralRig=createProceduralSkeleton(visual,'humanoid');
  if(!enemy.proceduralRig) setEnemyModelLayers(enemy,true);
  enemy.modelRoot = visual;
  enemy.modelBaseY = visual.position.y;
  enemy.modelBaseZ = visual.position.z;
  enemy.modelBaseScaleY = visual.scale.y;
  enemy.modelVisualHeight = visual.userData.visualHeight || (isShadowBoss ? 6.4 : 2.75);
  enemy.visualModelKey = 'skullHunter';
  enemy.hpBar.bg.position.y = enemy.modelVisualHeight + 0.65;
  enemy.hpBar.fill.position.y = enemy.modelVisualHeight + 0.65;
  if(isShadowBoss){
    enemy.material = findEmissiveMaterial(visual);
    if(enemy.phase2 && enemy.material) enemy.material.emissive.setHex(0x440000);
  }
}

let enemyModelAttachQueue=[];
let enemyModelAttachScheduled=false;
function scheduleEnemyModelAttachment(){
  if(enemyModelAttachScheduled||!enemyModelAttachQueue.length) return;
  enemyModelAttachScheduled=true;
  window.setTimeout(processEnemyModelAttachment,16);
}
function queueEnemyModelAttachment(enemy,key){
  if(!enemy||!key||!enemies.includes(enemy)||enemyModelAttachQueue.some(item=>item.enemy===enemy)) return;
  if(key==='spider'){
    const bundle=spiderModelBundle||spiderFallbackBundle;
    if(!bundle||(enemy.modelRoot&&enemy.modelBundle===bundle)) return;
  } else if(enemy.modelRoot) return;
  enemyModelAttachQueue.push({enemy,key});
  scheduleEnemyModelAttachment();
}
function queueEnemyModelAttachments(key){
  enemies.forEach(enemy=>{if(enemy.visualModelKey===key) queueEnemyModelAttachment(enemy,key);});
}
function processEnemyModelAttachment(){
  enemyModelAttachScheduled=false;
  while(enemyModelAttachQueue.length){
    const item=enemyModelAttachQueue.shift(),enemy=item&&item.enemy,key=item&&item.key;
    if(!enemy||!key||!enemies.includes(enemy)) continue;
    if(key==='spider'){
      const bundle=spiderModelBundle||spiderFallbackBundle;
      if(!bundle||(enemy.modelRoot&&enemy.modelBundle===bundle)) continue;
    } else if(enemy.modelRoot) continue;
    try{
      if(key==='spider') attachSpiderModelNow(enemy);
      else if(key==='skullHunter') attachHunterEnemyModel(enemy);
      else attachConfiguredEnemyModel(enemy,key);
    }
    catch(error){
      setEnemyModelLayers(enemy,true);
      console.warn('[BB] Не удалось подключить модель врага '+key+'; оставлена процедурная модель.',error);
    }
    break;
  }
  scheduleEnemyModelAttachment();
}
function clearEnemyModelAttachQueue(){enemyModelAttachQueue.length=0;}

const ENEMY_MODEL_ASSETS = {
  paladin: {path:'./MOB/optimized/beast_low.glb',height:4.4,footprint:5.4},
  moonPresence: {path:'./MOB/optimized/moon_presence_low.glb',height:8.5,footprint:11.5,fallback:'paladin'}
};

function findEmissiveMaterial(root){
  let found=null;
  root.traverse(node=>{
    if(found || !node.isMesh || !node.material) return;
    const materials=Array.isArray(node.material)?node.material:[node.material];
    found=materials.find(material=>material && material.emissive) || null;
  });
  return found;
}

function attachConfiguredEnemyModel(enemy,key){
  if(!enemy || enemy.modelRoot) return;
  const asset=ENEMY_MODEL_ASSETS[key], bundle=extraModelBundles[key];
  if(!asset || !bundle) return;
  const boss=enemy.type==='boss';
  let height=asset.height, footprint=asset.footprint;
  if(key==='paladin' && boss){ height=8.2; footprint=9.8; }
  const clips=bundle.animations||[];
  const visual=fitVisualModel(bundle.scene,height,footprint,clips.length>0,boss);
  if(!visual) return;
  setEnemyModelLayers(enemy,false);
  enemy.mesh.add(visual);
  const rigType=key==='moonPresence'?'spider':'humanoid';
  enemy.proceduralRig=clips.length?null:createProceduralSkeleton(visual,rigType);
  if(!clips.length&&!enemy.proceduralRig) setEnemyModelLayers(enemy,true);
  enemy.modelRoot=visual;
  enemy.modelBaseY=visual.position.y;
  enemy.modelBaseZ=visual.position.z;
  enemy.modelBaseScaleY=visual.scale.y;
  enemy.modelVisualHeight=visual.userData.visualHeight || height;
  enemy.visualModelKey=key;
  enemy.hpBar.bg.position.y=enemy.modelVisualHeight+(boss?0.85:0.55);
  enemy.hpBar.fill.position.y=enemy.modelVisualHeight+(boss?0.85:0.55);
  enemy.modelClips=clips;
  enemy.modelMixer=clips.length?new THREE.AnimationMixer(visual):null;
  enemy.modelCurrentAction=null;
  enemy.modelActionName='';
  if(enemy.modelMixer) setSpiderAnimation(enemy,true);
  if(boss){
    enemy.material=findEmissiveMaterial(visual);
    if(enemy.phase2 && enemy.material) enemy.material.emissive.setHex(0x440000);
  }
}

function requestEnemyVisualModel(key){
  if(!modelLoader) return;
  if(key==='skullHunter'){
    if(!enemies.some(enemy=>enemy.visualModelKey==='skullHunter')) return;
    if(hunterEnemyBundle){ queueEnemyModelAttachments('skullHunter'); return; }
    if(hunterModelSource){
      hunterEnemyBundle={scene:hunterModelSource,animations:hunterModelClips||[]};
      extraModelBundles.skullHunter=hunterEnemyBundle;
      queueEnemyModelAttachments('skullHunter');
      return;
    }
    if(hunterEnemyLoadStarted) return;
    hunterEnemyLoadStarted=true;
    modelLoader.load('./hunter_light.glb',gltf=>{
      hunterEnemyBundle=gltf; extraModelBundles.skullHunter=gltf;
      queueEnemyModelAttachments('skullHunter');
    },undefined,error=>console.warn('[BB] Не удалось загрузить модель охотника/Тени Ярнама.',error));
    return;
  }
  if(key==='moonPresence'){
    const fallbackKey=ENEMY_MODEL_ASSETS.moonPresence.fallback;
    if(extraModelBundles[fallbackKey]){
      extraModelBundles.moonPresence=extraModelBundles[fallbackKey];
      queueEnemyModelAttachments('moonPresence');
    } else {
      const waiting=extraModelFallbacks[fallbackKey]||(extraModelFallbacks[fallbackKey]=[]);
      if(!waiting.includes('moonPresence')) waiting.push('moonPresence');
      requestEnemyVisualModel(fallbackKey);
    }
    return;
  }
  const asset=ENEMY_MODEL_ASSETS[key];
  if(!asset) return;
  if(extraModelBundles[key]){
    queueEnemyModelAttachments(key);
    return;
  }
  if(extraModelLoads[key]) return;
  extraModelLoads[key]=true;
  modelLoader.load(asset.path,gltf=>{
    extraModelBundles[key]=gltf;
    queueEnemyModelAttachments(key);
    (extraModelFallbacks[key]||[]).forEach(alias=>{
      extraModelBundles[alias]=gltf;
      queueEnemyModelAttachments(alias);
    });
  },undefined,error=>{
    console.warn('[BB] Не удалось загрузить модель врага '+key+'.',error);
    if(asset.fallback){
      const fallbackKey=asset.fallback;
      if(extraModelBundles[fallbackKey]){
        extraModelBundles[key]=extraModelBundles[fallbackKey];
        queueEnemyModelAttachments(key);
      } else {
        const waiting=extraModelFallbacks[fallbackKey]||(extraModelFallbacks[fallbackKey]=[]);
        if(!waiting.includes(key)) waiting.push(key);
        requestEnemyVisualModel(fallbackKey);
      }
    }
  });
}

function updateEnemyVisual(enemy, dt, time){
  if(enemy.proceduralRig){
    const moving=enemy.state==='chase'||enemy.state==='returning';
    const pose=enemy.stunned>0?'hit':(enemy.state==='attack'?'attack':(moving?(enemy.speed>0.09?'run':'walk'):'idle'));
    const rollProgress=enemy.state==='roll'?Math.min(1,enemy.stateTime/0.7):0;
    animateProceduralSkeleton(enemy.proceduralRig,pose,time+(enemy.animPhase||0),enemy.stateTime,Math.floor((enemy.lastAttackStartTime||0)*2)%2,rollProgress);
  }
  if(enemy.modelMixer){
    setSpiderAnimation(enemy);
    enemy.modelMixer.timeScale = enemy.stunned > 0 ? 0.15 : 1;
    enemy.modelMixer.update(dt);
    return;
  }
  if(!enemy.modelRoot) return;
  const moving = enemy.state === 'chase' || enemy.state === 'returning';
  const gait = time * (enemy.type === 'hunter' ? 10 : 12) + (enemy.animPhase || 0);
  const isLarge = enemy.type==='boss' || enemy.type==='beast';
  const breath=Math.sin(time*(isLarge?1.15:1.8)+(enemy.animPhase||0));
  const stride=Math.sin(gait);
  const bob = moving ? Math.abs(stride)*(isLarge?0.19:0.14) : breath*(isLarge?0.11:0.07);
  enemy.modelRoot.position.y = enemy.modelBaseY + bob;
  const attacking=enemy.state==='attack';
  const attackPhase=attacking?(enemy.stateTime<enemy.attackWindup?-0.12:(enemy.stateTime<enemy.attackWindup+0.2?0.16:-0.025)):0;
  const attackLean=attacking?(enemy.type==='boss'?-0.025:-0.07)+attackPhase:(moving&&isLarge?0.025:0);
  enemy.modelRoot.rotation.x = lerp(enemy.modelRoot.rotation.x, attackLean, 0.2);
  const sway=moving?stride*(isLarge?0.026:0.038):breath*0.014;
  enemy.modelRoot.rotation.z=lerp(enemy.modelRoot.rotation.z,sway,0.14);
  enemy.modelRoot.rotation.y=lerp(enemy.modelRoot.rotation.y,attacking?Math.sin(enemy.stateTime*8)*0.035:0,0.14);
  const pulse=attacking?1.02:1+breath*(moving?0.006:0.012);
  enemy.modelRoot.scale.y=enemy.modelBaseScaleY*pulse;
  enemy.modelRoot.position.z=enemy.modelBaseZ+(attacking?(enemy.stateTime<enemy.attackWindup?-0.10:0.18):-0.08*Math.max(0,stride));
}

function loadVisualAssets(){
  if(visualAssetsStarted || !THREE.GLTFLoader) return;
  visualAssetsStarted = true;
  modelLoader = new THREE.GLTFLoader();
  if(typeof MeshoptDecoder !== 'undefined' && modelLoader.setMeshoptDecoder){
    modelLoader.setMeshoptDecoder(MeshoptDecoder);
  }
  hunterEnemyLoadStarted=true;
  modelLoader.load('./hunter_light.glb', gltf=>{
    const enemyScene = gltf.scene.clone(true);
    hunterRig = typeof HunterRig !== 'undefined' ? HunterRig.build(gltf.scene) : null;
    hunterModelSource = hunterRig ? enemyScene : gltf.scene;
    hunterModelClips = gltf.animations || [];
    hunterRigActionState=null;
    hunterEnemyBundle=hunterRig ? {scene:enemyScene,animations:hunterModelClips} : gltf;
    extraModelBundles.skullHunter=hunterEnemyBundle;
    mountHunterModel();
    queueEnemyModelAttachments('skullHunter');
  }, undefined, error=>{
    hunterEnemyLoadStarted=false;
    console.warn('[BB] Не удалось загрузить 3D-модель охотника; используется запасная модель.', error);
  });
  modelLoader.load('./MOB/optimized/spider_low.glb', gltf=>{
    spiderModelBundle = gltf;
    enemies.filter(enemy=>enemy.type === 'spider').forEach(attachSpiderModel);
  }, undefined, error=>{
    console.warn('[BB] Не удалось загрузить анимированную модель паука.', error);
    loadSpiderFallbackModel();
  });
  const queuedKeys=new Set(enemies.map(enemy=>enemy.visualModelKey).filter(key=>key&&key!=='spider'));
  queuedKeys.forEach(requestEnemyVisualModel);
}

function loadSpiderFallbackModel(){
  if(spiderFallbackLoadStarted || spiderModelBundle || !modelLoader) return;
  spiderFallbackLoadStarted = true;
  modelLoader.load('./MOB/spider/Spider_Model.glb', gltf=>{
    spiderFallbackBundle = gltf;
    enemies.filter(enemy=>enemy.type === 'spider').forEach(attachSpiderModel);
  }, undefined, error=>{
    console.warn('[BB] Не удалось загрузить запасную модель паука.', error);
  });
}

function loadHunterEnemyModel(){
  requestEnemyVisualModel('skullHunter');
}

function createSurfaceTextures(){
  if(surfaceTextures) return surfaceTextures;
  const makeSurfaceSet=kind=>{
    const size=256,wall=kind==='wall',stoneW=wall?64:32,stoneH=32;
    const albedoCanvas=document.createElement('canvas'),heightCanvas=document.createElement('canvas'),roughnessCanvas=document.createElement('canvas');
    [albedoCanvas,heightCanvas,roughnessCanvas].forEach(canvas=>{canvas.width=canvas.height=size;});
    const albedo=albedoCanvas.getContext('2d'),height=heightCanvas.getContext('2d'),roughness=roughnessCanvas.getContext('2d');
    albedo.fillStyle=wall?'#202024':'#1d2023';albedo.fillRect(0,0,size,size);
    height.fillStyle='#454545';height.fillRect(0,0,size,size);
    roughness.fillStyle='#eeeeee';roughness.fillRect(0,0,size,size);
    let seed=wall?0x48a17d:0x91c63b;
    const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let row=0;row<8;row++){
      const offset=row%2?stoneW/2:0;
      for(let x=-stoneW;x<size+stoneW;x+=stoneW){
        const sx=x+offset,inset=wall?3:2,sw=stoneW-inset*2,sh=stoneH-inset*2,shade=Math.floor(random()*18);
        const base=wall?42+shade:46+shade,tint=wall?[base,base-2,base+2]:[base,base+1,base+2];
        const stone=albedo.createLinearGradient(sx+inset,row*stoneH+inset,sx+stoneW-inset,row*stoneH+stoneH-inset);
        stone.addColorStop(0,`rgb(${tint[0]+11},${tint[1]+10},${tint[2]+12})`);
        stone.addColorStop(0.48,`rgb(${tint[0]},${tint[1]},${tint[2]})`);
        stone.addColorStop(1,`rgb(${tint[0]-8},${tint[1]-7},${tint[2]-6})`);
        albedo.fillStyle=stone;albedo.fillRect(sx+inset,row*stoneH+inset,sw,sh);
        const relief=157+shade;
        const bevel=height.createLinearGradient(sx+inset,row*stoneH+inset,sx+stoneW-inset,row*stoneH+stoneH-inset);
        bevel.addColorStop(0,`rgb(${Math.min(220,relief+34)},${Math.min(220,relief+34)},${Math.min(220,relief+34)})`);
        bevel.addColorStop(0.18,`rgb(${relief},${relief},${relief})`);
        bevel.addColorStop(1,`rgb(${relief-45},${relief-45},${relief-45})`);
        height.fillStyle=bevel;height.fillRect(sx+inset,row*stoneH+inset,sw,sh);
        const rough=194+Math.floor(random()*50);roughness.fillStyle=`rgb(${rough},${rough},${rough})`;roughness.fillRect(sx+inset,row*stoneH+inset,sw,sh);
        albedo.strokeStyle='rgba(115,109,102,.28)';albedo.lineWidth=1;albedo.strokeRect(sx+inset+0.5,row*stoneH+inset+0.5,sw-1,sh-1);
        height.strokeStyle='rgba(76,76,76,.92)';height.lineWidth=1;height.strokeRect(sx+inset+0.5,row*stoneH+inset+0.5,sw-1,sh-1);
        for(let pit=0;pit<7;pit++){
          const px=sx+inset+3+random()*Math.max(1,sw-6),py=row*stoneH+inset+3+random()*Math.max(1,sh-6),pitSize=1+random()*2.5;
          albedo.fillStyle='rgba(4,5,7,.3)';albedo.fillRect(px,py,pitSize,pitSize);
          height.fillStyle='rgba(45,45,45,.78)';height.fillRect(px,py,pitSize,pitSize);
          roughness.fillStyle='rgba(255,255,255,.9)';roughness.fillRect(px,py,pitSize,pitSize);
        }
      }
    }
    const heightPixels=height.getImageData(0,0,size,size).data,normalCanvas=document.createElement('canvas');
    normalCanvas.width=normalCanvas.height=size;
    const normalContext=normalCanvas.getContext('2d'),normalPixels=normalContext.createImageData(size,size),strength=wall?1.25:1.7;
    const sample=(x,y)=>heightPixels[((Math.max(0,Math.min(size-1,y))*size)+Math.max(0,Math.min(size-1,x)))*4]/255;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const dx=(sample(x+1,y)-sample(x-1,y))*strength,dy=(sample(x,y+1)-sample(x,y-1))*strength;
      let nx=-dx,ny=-dy,nz=1;const inv=1/Math.sqrt(nx*nx+ny*ny+nz*nz);nx*=inv;ny*=inv;nz*=inv;
      const index=(y*size+x)*4;normalPixels.data[index]=Math.round((nx*0.5+0.5)*255);normalPixels.data[index+1]=Math.round((ny*0.5+0.5)*255);normalPixels.data[index+2]=Math.round((nz*0.5+0.5)*255);normalPixels.data[index+3]=255;
    }
    normalContext.putImageData(normalPixels,0,0);
    const makeTexture=(canvas,isColor=false)=>{
      const texture=new THREE.CanvasTexture(canvas);texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
      texture.anisotropy=renderer?Math.min(getGraphicsProfile().anisotropy,renderer.capabilities.getMaxAnisotropy()):1;
      if(isColor&&THREE.sRGBEncoding!==undefined)texture.encoding=THREE.sRGBEncoding;
      return texture;
    };
    return {map:makeTexture(albedoCanvas,true),bumpMap:makeTexture(heightCanvas),normalMap:makeTexture(normalCanvas),roughnessMap:makeTexture(roughnessCanvas)};
  };
  const wall=makeSurfaceSet('wall'),floor=makeSurfaceSet('floor');
  surfaceTextures={wall:wall.map,wallBump:wall.bumpMap,wallNormal:wall.normalMap,wallRoughness:wall.roughnessMap,
    floor:floor.map,floorBump:floor.bumpMap,floorNormal:floor.normalMap,floorRoughness:floor.roughnessMap};
  return surfaceTextures;
}

function getLanternGlowMaterial(){
  if(lanternGlowMaterial) return lanternGlowMaterial;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(64,64,2,64,64,64);
  glow.addColorStop(0,'rgba(255,248,205,1)');
  glow.addColorStop(0.12,'rgba(255,205,112,.88)');
  glow.addColorStop(0.38,'rgba(214,111,39,.28)');
  glow.addColorStop(1,'rgba(132,45,14,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0,0,128,128);
  const texture = new THREE.CanvasTexture(canvas);
  if(THREE.sRGBEncoding !== undefined) texture.encoding = THREE.sRGBEncoding;
  lanternGlowMaterial = new THREE.SpriteMaterial({map:texture,color:0xffedc6,transparent:true,opacity:0.66,depthWrite:false,blending:THREE.AdditiveBlending,fog:false});
  return lanternGlowMaterial;
}

function addCobblePatch(width,depth,cx,cz,y,ceiling=false,segmentSpacing=3){
  if(width<0.5 || depth<0.5) return;
  const surfaces=createSurfaceTextures();
  const palette=getLocationVisualPalette(currentLocation);
  const geo=new THREE.PlaneGeometry(width,depth,Math.max(1,Math.min(96,Math.ceil(width/segmentSpacing))),Math.max(1,Math.min(72,Math.ceil(depth/segmentSpacing))));
  const pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++) pos.setZ(i,(Math.random()-0.5)*0.035);
  geo.computeVertexNormals();
  const mat=new THREE.MeshStandardMaterial({
    color:ceiling?palette.ceiling:palette.floor,map:surfaces.floor,normalMap:surfaces.floorNormal,
    normalScale:new THREE.Vector2(0.52,0.52),roughnessMap:surfaces.floorRoughness,
    roughness:ceiling?0.93:0.84,metalness:ceiling?0.015:0.025,
    side:ceiling?THREE.DoubleSide:THREE.FrontSide
  });
  const floor=new THREE.Mesh(geo,mat);
  floor.rotation.x=-Math.PI/2;
  floor.position.set(cx,y,cz);
  floor.receiveShadow=true;
  floor.userData.isCeiling=ceiling;
  scene.add(floor); floorMeshes.push(floor);
}
