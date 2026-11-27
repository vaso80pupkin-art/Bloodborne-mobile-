function unlockAchievement(id){
  if(unlockedAchievements[id]) return;
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  if(!ach) return;
  unlockedAchievements[id] = true;
  sfx('ach');
  const popup = $('achPopup');
  if(!popup) return;
  $('achIcon').textContent = ach.icon;
  $('achName').textContent = ach.name;
  popup.classList.add('show');
  clearTimeout(popup._t);
  popup._t = setTimeout(()=>popup.classList.remove('show'), 3500);
  SaveSystem.save();
}
function discoverBestiary(id){
  if(discoveredBestiary[id]) return;
  discoveredBestiary[id] = true;
  SaveSystem.save();
}
function notify(t, rally, beast, frenzy){
  const n = $('notif');
  if(!n) return;
  n.classList.remove('show','notif-long');
  n.style.removeProperty('top');
  n.style.removeProperty('left');
  n.style.removeProperty('right');
  n.textContent = t;
  n.classList.toggle('rally',!!rally);
  n.classList.toggle('beast',!!beast);
  n.classList.toggle('frenzy',!!frenzy);
  const messageRect=n.getBoundingClientRect();
  const bars=Array.from(document.querySelectorAll('.stam-bg,.frenzy-bg')).map(bar=>bar.getBoundingClientRect()).filter(rect=>rect.width>0&&rect.height>0);
  const overlapsBars=String(t).length>28&&bars.some(rect=>{
    return messageRect.left<rect.right&&messageRect.right>rect.left&&messageRect.top<rect.bottom&&messageRect.bottom>rect.top;
  });
  n.classList.toggle('notif-long',overlapsBars);
  if(overlapsBars){
    const minimap=document.querySelector('.minimap'), mapRect=minimap&&minimap.getBoundingClientRect();
    n.style.left=Math.ceil(mapRect&&mapRect.width?mapRect.right+10:135)+'px';
    n.style.right='12px';
    n.style.top=Math.ceil(Math.max(...bars.map(rect=>rect.bottom))+8)+'px';
  }
  n.classList.add('show');
  clearTimeout(n._t);
  n._t = setTimeout(()=>n.classList.remove('show'),1800);
}
function showSpecialMessage(text, dur=2800){
  const ov = $('preyOverlay'), tx = $('preyText');
  if(!ov || !tx) return;
  tx.textContent = text;
  tx.style.animation = 'none'; void tx.offsetWidth;
  tx.style.animation = 'preyPulse 0.8s ease-out';
  ov.classList.add('show');
  clearTimeout(ov._t);
  ov._t = setTimeout(()=>ov.classList.remove('show'), dur);
}
function showTutorial(t,dur=2500){
  const el = $('tutorial');
  if(!el) return;
  el.textContent = t; el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'),dur);
}
function showBloodstainHint(text, dur=1800){
  const el = $('bloodstainHint');
  if(!el) return;
  el.textContent = text; el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'), dur);
}

function updateHUD(){
  if(!$('hpFill')) return;
  $('hpFill').style.width = (player.hp/player.maxHp*100)+'%';
  $('hpText').textContent = Math.round(player.hp)+'/'+player.maxHp;
  $('rallyFill').style.width = player.rallyMaxHp > 0 ? (player.rallyHp/player.maxHp*100)+'%' : '0%';
  $('beastFill').style.width = player.beastCharge+'%';
  $('stamFill').style.width = (player.stamina/player.maxStamina*100)+'%';
  $('frenzyFill').style.width = player.frenzy+'%';
  $('echoesNum').textContent = player.echoes;
  $('insightNum').textContent = player.insight;
  $('shardsNum').textContent = player.bloodShards;
  $('vialNum').textContent = player.vials;
  $('bulletNum').textContent = player.bullets;
  $('levelBox').textContent = 'LV '+player.level + (player.ngPlus > 0 ? ' • NG+'+player.ngPlus : '');
  const dur = player.weaponDurability;
  $('durabilityNum').textContent = Math.round(dur)+'%';
  if(dur < 25) $('durabilityBox').classList.add('danger'); else $('durabilityBox').classList.remove('danger');
  if(player.ngPlus > 0) $('ngBox').classList.add('show'); else $('ngBox').classList.remove('show');

  const v = $('vignette');
  if(player.hp/player.maxHp < 0.3) v.classList.add('danger'); else v.classList.remove('danger');
  if(player.beastMode) v.classList.add('beast-mode'); else v.classList.remove('beast-mode');
  if(player.beastMode) $('beastBox').classList.add('show'); else $('beastBox').classList.remove('show');
  if(player.frenzyActive) $('frenzyOverlay').classList.add('active'); else $('frenzyOverlay').classList.remove('active');

  $('toolMolotovCount').textContent = player.tools.molotov;
  $('toolKnifeCount').textContent = player.tools.knife;
  $('toolFirepaperCount').textContent = player.tools.firepaper;
  if(player.firePaperTimer > 0) $('toolFirepaper').classList.add('fire-active');
  else $('toolFirepaper').classList.remove('fire-active');
}
function updateCombo(){
  if(player.comboCount > 1){
    $('comboBox').classList.add('show');
    $('comboNum').textContent = player.comboCount;
  } else $('comboBox').classList.remove('show');
  if(player.comboCount > player.maxCombo) player.maxCombo = player.comboCount;
  if(player.comboCount >= 10) unlockAchievement('combo_10');
}

function spawnDmg(pos, value, type='normal'){
  if(!camera) return;
  const v = pos.clone(); v.project(camera);
  const x = (v.x*0.5+0.5)*innerWidth;
  const y = (-v.y*0.5+0.5)*innerHeight;
  const el = document.createElement('div');
  el.className = 'dmg'+(type!=='normal'?' '+type:'');
  el.textContent = (type==='heal'||type==='rally'?'+':'')+Math.round(value);
  el.style.left = x+'px'; el.style.top = y+'px';
  $('dmgContainer').appendChild(el);
  setTimeout(()=>el.remove(),1200);
}
function disposeTransientEffectResources(root){
  if(!root) return;
  const geometries=new Set(),materials=new Set();
  const disposeNode=node=>{
    if(node.geometry&&!geometries.has(node.geometry)){geometries.add(node.geometry);node.geometry.dispose();}
    if(node.material){
      const list=Array.isArray(node.material)?node.material:[node.material];
      list.forEach(material=>{if(material&&!materials.has(material)){materials.add(material);material.dispose();}});
    }
  };
  if(typeof root.traverse==='function') root.traverse(disposeNode);
  else disposeNode(root);
}
function spawnBlood(pos,count=15,color=0x880000){
  if(!scene) return;
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(count*3);
  const v = [];
  for(let i=0;i<count;i++){
    p[i*3]=pos.x; p[i*3+1]=pos.y; p[i*3+2]=pos.z;
    v.push({x:(Math.random()-0.5)*0.4,y:Math.random()*0.5+0.1,z:(Math.random()-0.5)*0.4});
  }
  geo.setAttribute('position',new THREE.BufferAttribute(p,3));
  const mat = new THREE.PointsMaterial({color,size:0.2,transparent:true,opacity:1,depthWrite:false});
  const pts = new THREE.Points(geo,mat);
  scene.add(pts);
  bloodParticles.push({mesh:pts,velocities:v,life:1,maxLife:1});
}
function damageFlash(){
  const f = $('dmgFlash');
  if(!f) return;
  f.classList.add('show');
  setTimeout(()=>f.classList.remove('show'),130);
}
function perfectDodgeFlash(){
  const f = $('perfectDodge');
  if(!f) return;
  f.classList.add('show');
  setTimeout(()=>f.classList.remove('show'),250);
}

function createBloodStain(x, z, echoes, loc, floorY=0){
  if(!scene) return;
  removeBloodStain();
  bloodStain = { x, z, echoes, loc, floorY };
  const g = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 16),
    new THREE.MeshBasicMaterial({color:0x660000, transparent:true, opacity:0.85, depthWrite:false})
  );
  disc.rotation.x = -Math.PI/2;
  disc.position.y = 0.02;
  g.add(disc);
  const light = new THREE.PointLight(0xdd2222, 1.2, 6, 2);
  light.position.y = 0.5;
  g.add(light);
  g.position.set(x, floorY, z);
  scene.add(g);
  bloodStainMesh = g;
}
function removeBloodStain(){
  if(bloodStainMesh && scene){ scene.remove(bloodStainMesh); disposeTransientEffectResources(bloodStainMesh); }
  bloodStainMesh = null;
  bloodStain = null;
}
function checkBloodStainPickup(){
  if(!bloodStain || !bloodStainMesh || !hunter) return;
  if(bloodStain.loc !== currentLocation) return;
  const d = hunter.position.distanceTo(new THREE.Vector3(bloodStain.x,bloodStain.floorY||0,bloodStain.z));
  if(d < 2.2){
    player.echoes += bloodStain.echoes;
    showBloodstainHint('+'+bloodStain.echoes+' 💀 ОТГОЛОСКОВ ВОССТАНОВЛЕНО');
    sfx('insight');
    removeBloodStain();
    updateHUD();
    SaveSystem.save();
  }
}

function addRally(amount){
  player.rallyHp = Math.min(player.maxHp, player.rallyHp + amount);
  player.rallyMaxHp = Math.max(player.rallyMaxHp, player.rallyHp);
  player.rallyTimer = 4.0;
}
function recoverFromRally(){
  if(player.rallyHp <= 0 || !hunter) return;
  const recover = Math.min(player.rallyHp, 15);
  player.hp = Math.min(player.maxHp, player.hp + recover);
  player.rallyHp -= recover;
  if(player.rallyHp <= 0.01){ player.rallyHp = 0; player.rallyMaxHp = 0; }
  sfx('rally');
  notify('RALLY +'+Math.round(recover),true);
  spawnDmg(hunter.position.clone().setY(2.5), recover, 'rally');
  updateHUD();
}
function activateBeastMode(){
  if(player.beastMode || player.beastCharge < 100) return;
  player.beastMode = true; player.beastTimer = 10; player.beastCharge = 0;
  sfx('beast');
  notify('⚡ BEAST MODE ACTIVATED ⚡',false,true);
  unlockAchievement('beast_mode');
  updateHUD();
}
function startFrenzy(){
  if(player.frenzyActive) return;
  player.frenzyActive = true;
  player.frenzyPulseTimer = 4.0;
  player.hp = Math.max(1, player.hp - player.maxHp * 0.3);
  sfx('frenzy');
  notify('⚠ FRENZY! БЕЗУМИЕ', false, false, true);
  showSpecialMessage('FRENZY', 2000);
  unlockAchievement('frenzy');
  updateHUD();
}

function spawnAttackTrail(){
  if(!hunter || !scene) return;
  const geo = new THREE.RingGeometry(1.8, 7.5, 24, 1, -Math.PI*0.55, Math.PI*1.1);
  let color = 0xddbb55;
  if(player.firePaperTimer > 0) color = 0xdd5522;
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.85,
    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI/2;
  m.position.copy(hunter.position);
  m.position.y += 1.5;
  m.rotation.y = hunter.rotation.y - Math.PI/2;
  scene.add(m);
  attackTrails.push({mesh:m, life:0.35, maxLife:0.35});
}
function spawnParryIndicator(enemy){
  if(!scene) return;
  const geo = new THREE.RingGeometry(enemy.radius*1.3, enemy.radius*1.5, 24);
  const mat = new THREE.MeshBasicMaterial({color: 0xdddd33, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false});
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = -Math.PI/2;
  m.position.copy(enemy.mesh.position);
  m.position.y += 0.1;
  scene.add(m);
  parryIndicators.push({mesh:m, enemy, life:0.4, maxLife:0.4});
}

function updateMinimap(){
  if(!minimapCtx || !hunter) return;
  const mapWidth=minimapCtx.canvas.width,mapHeight=minimapCtx.canvas.height;
  minimapCtx.fillStyle = 'rgba(0,0,0,0.35)';
  minimapCtx.fillRect(0,0,mapWidth,mapHeight);
  const scale = Math.max(1,mapHeight-30)/STAGE_WORLD_DEPTH;
  const mapCenterX=mapWidth/2,mapCenterY=mapHeight/2;
  const offsetX = mapCenterX - ((stageBounds.minX+stageBounds.maxX)/2 + hunter.position.x)*scale;
  const offsetY = mapCenterY - ((stageBounds.minZ+stageBounds.maxZ)/2 + hunter.position.z)*scale;
  minimapCtx.fillStyle = '#686c75';
  wallColliders.forEach(w => {
    if(Math.abs((w.minY||0)-FLOOR_LEVELS[currentFloorIndex])>0.1) return;
    const x = w.minX * scale + offsetX;
    const y = w.minZ * scale + offsetY;
    minimapCtx.fillRect(x,y,Math.max(1,(w.maxX-w.minX)*scale),Math.max(1,(w.maxZ-w.minZ)*scale));
  });
  enemies.forEach(e => {
    if(Math.abs(e.mesh.position.y-FLOOR_LEVELS[currentFloorIndex])>FLOOR_HEIGHT*0.4) return;
    minimapCtx.fillStyle = e.type === 'boss' ? '#dd3333' : '#dd7733';
    const x = e.mesh.position.x * scale + offsetX;
    const y = e.mesh.position.z * scale + offsetY;
    minimapCtx.beginPath();
    minimapCtx.arc(x, y, e.type === 'boss' ? 4 : 2, 0, Math.PI * 2);
    minimapCtx.fill();
  });
  lanterns.forEach(l => {
    if(Math.abs(l.mesh.position.y-FLOOR_LEVELS[currentFloorIndex])>FLOOR_HEIGHT*0.4) return;
    minimapCtx.fillStyle = '#ddbb55';
    const x = l.mesh.position.x * scale + offsetX;
    const y = l.mesh.position.z * scale + offsetY;
    minimapCtx.beginPath();
    minimapCtx.arc(x, y, 3, 0, Math.PI * 2);
    minimapCtx.fill();
  });
  if(bloodStain && bloodStain.loc === currentLocation && Math.abs((bloodStain.floorY||0)-FLOOR_LEVELS[currentFloorIndex])<=FLOOR_HEIGHT*0.4){
    minimapCtx.fillStyle = '#dd2222';
    const x = bloodStain.x * scale + offsetX;
    const y = bloodStain.z * scale + offsetY;
    minimapCtx.beginPath();
    minimapCtx.arc(x, y, 4, 0, Math.PI * 2);
    minimapCtx.fill();
  }
  minimapCtx.fillStyle = '#33dd33';
  minimapCtx.beginPath();
  minimapCtx.arc(mapCenterX, mapCenterY, 4, 0, Math.PI * 2);
  minimapCtx.fill();
  minimapCtx.strokeStyle = '#33dd33'; minimapCtx.lineWidth = 2;
  minimapCtx.beginPath();
  const dirX = mapCenterX + Math.sin(hunter.rotation.y) * 8;
  const dirY = mapCenterY + Math.cos(hunter.rotation.y) * 8;
  minimapCtx.moveTo(mapCenterX, mapCenterY);
  minimapCtx.lineTo(dirX, dirY);
  minimapCtx.stroke();
  minimapCtx.fillStyle='#c9b983';
  minimapCtx.font='bold 10px Cinzel,serif';
  minimapCtx.textAlign='center';
  minimapCtx.fillText('ЭТАЖ '+(currentFloorIndex+1)+'/2',mapCenterX,mapHeight-5);
}

function applyBrightness(){
  if(!scene || !renderer) return;
  const skyBase = gameMode === GameMode.MENU ? BASE_SKY_MENU : (gameMode === GameMode.DREAM ? BASE_SKY_DREAM : currentSkyColor);
  const sky = new THREE.Color(skyBase).multiplyScalar(Math.max(0.1, skyBrightness));
  scene.background = sky;
  if(scene.fog){
    scene.fog.color.copy(sky);
    if(gameMode === GameMode.PLAYING) scene.fog.density = currentFogDensity;
  }
  const mood = LOCATION_MOODS[currentLocation] || LOCATION_MOODS[0];
  const moodLight = gameMode === GameMode.PLAYING ? (mood.brightness ?? 1) : 1;
  const lightMood = (gameMode === GameMode.PLAYING ? mood : LOCATION_MOODS[0]).lighting || LOCATION_MOODS[0].lighting;
  const gb = Math.max(0.2, gameBrightness) * moodLight;
  if(lightingRefs.ambient){lightingRefs.ambient.color.setHex(lightMood.ambient);lightingRefs.ambient.intensity = 0.27 * gb;}
  if(lightingRefs.hemi){lightingRefs.hemi.color.setHex(lightMood.hemiSky);lightingRefs.hemi.groundColor.setHex(lightMood.hemiGround);lightingRefs.hemi.intensity = 0.36 * gb;}
  if(lightingRefs.moon){lightingRefs.moon.color.setHex(lightMood.moon);lightingRefs.moon.intensity = 0.62 * gb;}
  if(lightingRefs.rim){lightingRefs.rim.color.setHex(lightMood.rim);lightingRefs.rim.intensity = 0.37 * gb;}
  if(lightingRefs.fill){lightingRefs.fill.color.setHex(lightMood.fill);lightingRefs.fill.intensity = 0.20 * gb;}
  if(lightingRefs.moonMesh) lightingRefs.moonMesh.material.color.copy(new THREE.Color(0xd9e4f1).multiplyScalar(Math.max(0.45, skyBrightness)));
  if(lightingRefs.glow)     lightingRefs.glow.material.opacity = 0.28 * skyBrightness;
  renderer.toneMappingExposure = 0.96 * gb;
}


let stagePlanOpenedFromPlaying=false;
function getStagePlanNodePosition(index,floor,canvas){
  const col=index%ROOM_COLS,row=Math.floor(index/ROOM_COLS);
  return {x:155+col*((canvas.width-250)/(ROOM_COLS-1)),y:floor===0?canvas.height-150-row*58:150+row*58};
}
function drawStagePlan(){
  const canvas=$('stagePlanCanvas'),ctx=canvas&&canvas.getContext('2d');
  if(!ctx)return;
  const plan=STAGE_ROUTE_PLANS[currentLocation]||STAGE_ROUTE_PLANS[0];
  const width=canvas.width,height=canvas.height;
  ctx.clearRect(0,0,width,height);
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#182832');sky.addColorStop(0.48,'#0d1820');sky.addColorStop(1,'#11151b');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  ctx.strokeStyle='rgba(137,166,176,.10)';ctx.lineWidth=1;
  for(let x=35;x<width;x+=45){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke();}
  for(let y=25;y<height;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  ctx.font='bold 13px Arial,sans-serif';ctx.fillStyle='#8ea4ad';ctx.textAlign='left';ctx.fillText('ВЕРХНИЙ ЯРУС · +17',32,34);ctx.fillText('НИЖНИЙ ЯРУС · 0',32,height-24);
  if(currentLocation===2){ctx.fillStyle='#9eb5bb';ctx.fillText('СРЕДНЯЯ ГАЛЕРЕЯ · +8 (визуальный подъярус)',32,height/2+4);ctx.strokeStyle='rgba(145,175,184,.34)';ctx.lineWidth=2;ctx.setLineDash([12,8]);ctx.beginPath();ctx.moveTo(28,height/2);ctx.lineTo(width-28,height/2);ctx.stroke();ctx.setLineDash([]);}
  const drawEdge=(a,b,floor,index)=>{
    const p1=getStagePlanNodePosition(a,floor,canvas),p2=getStagePlanNodePosition(b,floor,canvas),primary=index<4;
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=primary?'#d7bd78':'#6da3b8';ctx.lineWidth=primary?7:3;ctx.lineCap='round';ctx.setLineDash(primary?[]:[9,7]);ctx.stroke();ctx.setLineDash([]);
  };
  plan.floors.forEach((floorPlan,floor)=>floorPlan.edges.forEach((edge,index)=>drawEdge(edge[0],edge[1],floor,index)));
  [[0,0,0,1],[2,0,2,1],[4,0,4,1]].forEach(([a,f1,b,f2],index)=>{
    const p1=getStagePlanNodePosition(a,f1,canvas),p2=getStagePlanNodePosition(b,f2,canvas);
    ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.strokeStyle=index===1?'#bc594f':'#b99568';ctx.lineWidth=3;ctx.setLineDash([5,6]);ctx.stroke();ctx.setLineDash([]);
  });
  for(let floor=0;floor<2;floor++){
    for(let index=0;index<ROOMS_PER_FLOOR;index++){
      const p=getStagePlanNodePosition(index,floor,canvas),label=(plan.floors[floor].labels||{})[index]||`комната ${String(index+1).padStart(2,'0')}`;
      const active=floor===currentFloorIndex&&index===roomAtWorldPosition(hunter?.position.x||0,hunter?.position.z||0);
      ctx.beginPath();ctx.arc(p.x,p.y,active?17:13,0,Math.PI*2);ctx.fillStyle=active?'#9de073':floor===currentFloorIndex?'#d7bd78':'#51636d';ctx.fill();ctx.strokeStyle=active?'#e9ffd1':'#dbe2e2';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#071016';ctx.font='bold 10px Arial,sans-serif';ctx.textAlign='center';ctx.fillText(String(index+1),p.x,p.y+3.5);
      ctx.fillStyle=active?'#e8f6db':'#b9c5ca';ctx.font='11px Arial,sans-serif';ctx.textAlign='center';ctx.fillText(label,p.x,p.y+(floor===0?30:-22));
    }
  }
  ctx.fillStyle='#bc594f';ctx.font='bold 12px Arial,sans-serif';ctx.textAlign='left';ctx.fillText('обязательный вертикальный гейт',width-275,height/2-10);ctx.fillStyle='#a7b7be';ctx.font='11px Arial,sans-serif';ctx.fillText('лестницы / лифт / переход',width-275,height/2+10);
  (plan.landmarks||[]).forEach(([label,node,floor],index)=>{const p=getStagePlanNodePosition(node,floor,canvas);ctx.fillStyle=index%2?'#d5a36f':'#d98566';ctx.beginPath();ctx.arc(p.x+(index%2?19:-19),p.y-((floor?1:-1)*16),4,0,Math.PI*2);ctx.fill();});
}
function openStagePlan(){
  const overlay=$('stagePlanOverlay');if(!overlay)return;
  stagePlanOpenedFromPlaying=gameMode===GameMode.PLAYING;
  if(stagePlanOpenedFromPlaying)gameMode=GameMode.PAUSED;
  $('stagePlanTitle').textContent=(STAGE_ROUTE_PLANS[currentLocation]||STAGE_ROUTE_PLANS[0]).title;
  $('stagePlanSubtitle').textContent=currentLocation===2?'2 игровых этажа · 3 визуальных яруса · мосты, лестницы, цепь и ветвления':`Этаж ${currentFloorIndex+1}/2 · ветки, вертикальные связи и обязательные гейты`;
  drawStagePlan();overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');
}
function closeStagePlan(){
  const overlay=$('stagePlanOverlay');if(!overlay)return;
  overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');
  if(stagePlanOpenedFromPlaying&&gameMode===GameMode.PAUSED)gameMode=GameMode.PLAYING;
  stagePlanOpenedFromPlaying=false;
}
function setupStagePlanAtlas(){
  if(setupStagePlanAtlas._done)return;setupStagePlanAtlas._done=true;
  const minimap=$('minimapCanvas'),close=$('stagePlanClose'),overlay=$('stagePlanOverlay');
  if(minimap)minimap.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openStagePlan();});
  if(close)close.addEventListener('click',closeStagePlan);
  if(overlay)overlay.addEventListener('click',e=>{if(e.target===overlay)closeStagePlan();});
  window.addEventListener('resize',()=>{if(overlay&&overlay.classList.contains('show'))drawStagePlan();});
}
