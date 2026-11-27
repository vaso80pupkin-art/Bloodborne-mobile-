let cancelActiveAttackCharge = null;

function loadDream(){
  clearWorld();
  gameMode = GameMode.DREAM;
  currentFloorIndex=0;
  currentSkyColor = BASE_SKY_DREAM;
  currentFogDensity = 0.02;
  scene.background = new THREE.Color(currentSkyColor).multiplyScalar(skyBrightness);
  scene.fog = new THREE.FogExp2(currentSkyColor, currentFogDensity);
  scene.fog.color.copy(scene.background);
  createCobblestoneFloor(50,-25,-25);
  for(let i=-5;i<=5;i++){
    createGothicWall(i*5,2.0,-25,5,4,0.5,true);
    createGothicWall(i*5,2.0,25,5,4,0.5,true);
    createGothicWall(-25,2.0,i*5,0.5,4,5,true);
    createGothicWall(25,2.0,i*5,0.5,4,5,true);
  }
  workshop = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({color:0x3a2818,roughness:0.95});
  const base = new THREE.Mesh(new THREE.BoxGeometry(8,1,8),stoneMat);
  base.position.y = 0.5; base.receiveShadow = true; workshop.add(base);
  for(let px=-1;px<=1;px+=2) for(let pz=-1;pz<=1;pz+=2){
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.4,5,12),stoneMat);
    p.position.set(px*3.5,3,pz*3.5); p.castShadow = true; workshop.add(p);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7,3,4),stoneMat);
  roof.position.y = 7; roof.rotation.y = Math.PI/4; workshop.add(roof);
  scene.add(workshop);

  doll = new THREE.Group();
  const dressMat = new THREE.MeshStandardMaterial({color:0x5a4a7a,roughness:0.9,emissive:0x1a1030,emissiveIntensity:0.5});
  const skinMat = new THREE.MeshStandardMaterial({color:0xccbca0,roughness:0.8});
  const hairMat = new THREE.MeshStandardMaterial({color:0xd8d0c0,roughness:0.9});
  const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.6,1.5,12),dressMat);
  dress.position.y = 0.75; dress.castShadow = true; doll.add(dress);
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.3,0.6,12),dressMat);
  t.position.y = 1.8; doll.add(t);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.22,16,16),skinMat);
  h.position.y = 2.3; doll.add(h);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.24,16,16),hairMat);
  hair.position.y = 2.32; doll.add(hair);
  const dollGlow = new THREE.PointLight(0x8866dd, 2.2, 10, 2);
  dollGlow.position.set(0, 1.5, 0); doll.add(dollGlow);
  doll.position.set(3,0,2); scene.add(doll);

  waystone = new THREE.Group();
  const wStoneMat = new THREE.MeshStandardMaterial({color:0x2a2a48, roughness:0.95, metalness:0.15, emissive:0x2812aa, emissiveIntensity:0.6});
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.2,1.5,0.5,8), wStoneMat);
  pedestal.position.y = 0.25; pedestal.castShadow = true; waystone.add(pedestal);
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9,2.8,0.5), wStoneMat);
  pillar.position.y = 1.9; pillar.castShadow = true; waystone.add(pillar);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.8,0.7,4), wStoneMat);
  top.position.y = 3.6; top.castShadow = true; waystone.add(top);
  const runeLight = new THREE.PointLight(0x8899dd, 3, 12, 2);
  runeLight.position.set(0, 2, 0.5); waystone.add(runeLight);
  waystone.position.set(-6, 0, -3); scene.add(waystone);

  const dreamLight1 = new THREE.PointLight(0x7755dd, 1.6, 25, 2);
  dreamLight1.position.set(3, 4, 2); scene.add(dreamLight1);
  envObjects.push({mesh:dreamLight1});
  const dreamLight2 = new THREE.PointLight(0x5566dd, 1.6, 25, 2);
  dreamLight2.position.set(-6, 4, -3); scene.add(dreamLight2);
  envObjects.push({mesh:dreamLight2});

  if(hunter){
    hunter.position.set(0,0,5);
    hunter.rotation.y = Math.PI;
    hunter.rotation.x = 0;
  }
  camera.position.set(0,Math.max(4.5,hunterVisualHeight*0.9),Math.max(8,hunterVisualHeight*1.4));
  $('dreamUI').classList.add('active');
  $('controls').style.display = 'none';
  $('gameHUD').style.display = 'block';
  $('toolHotbar').classList.remove('show');
  updateDreamUI();
  sfx('dream');
  applyBrightness();
}

function statRowsHTML(includeCost){
  const s = player.stats;
  const cost = levelCost();
  const remain = player.echoes - cost;
  const wpnBonus = (player.weaponLevel * 8);
  let gemBonus = '';
  player.bloodGems.forEach((gem, i) => {
    if(gem) gemBonus += `<div class="stat-row"><span class="label">САМОЦВЕТ ${i+1}</span><span class="value">${gem.icon} ${gem.name}</span></div>`;
  });
  let html = `
    <div class="stat-row"><span class="label">УРОВЕНЬ</span><span class="value">${player.level}</span></div>
    <div class="stat-row"><span class="label">ОТГОЛОСКИ</span><span class="value">${player.echoes}</span></div>
    <div class="stat-row"><span class="label">ПРОНИЦАТ.</span><span class="value">${player.insight}</span></div>
    <div class="stat-row"><span class="label">ОСКОЛКИ</span><span class="value">${player.bloodShards}</span></div>
    <div class="stat-row"><span class="label">ОРУЖИЕ</span><span class="value">+${player.weaponLevel} (+${wpnBonus}%)</span></div>
    <div class="stat-row"><span class="label">ПРОЧНОСТЬ</span><span class="value">${Math.round(player.weaponDurability)}%</span></div>
    <div class="stat-row"><span class="label">ЖИВУЧЕСТЬ</span><span class="value">${s.vig}</span></div>
    <div class="stat-row"><span class="label">ВЫНОСЛИВОСТЬ</span><span class="value">${s.end}</span></div>
    <div class="stat-row"><span class="label">СИЛА</span><span class="value">${s.str}</span></div>
    <div class="stat-row"><span class="label">МАСТЕРСТВО</span><span class="value">${s.skl}</span></div>
    <div class="stat-row"><span class="label">КРОВАВЫЙ</span><span class="value">${s.blt}</span></div>
    ${gemBonus}
  `;
  if(includeCost){
    const can = player.echoes >= cost;
    html += `
      <div class="stat-row cost-row"><span class="label">💰 СТОИМОСТЬ</span><span class="value" style="color:${can?'#55dd77':'#dd5555'}">${cost}</span></div>
      <div class="stat-row cost-row"><span class="label">➡ ОСТАНЕТСЯ</span><span class="value" style="color:${remain>=0?'#ddb800':'#dd4444'}">${remain >= 0 ? remain : '— не хватает ' + (-remain)}</span></div>
    `;
  }
  return html;
}
function updateDreamUI(){
  $('dreamStats').innerHTML = statRowsHTML(true);
  const cost = levelCost();
  ['btnLevelVig','btnLevelEnd','btnLevelStr','btnLevelSkl','btnLevelBlt'].forEach(id=>{ $(id).disabled = player.echoes < cost; });
}
function updateLanternUI(){
  $('lanternStats').innerHTML = statRowsHTML(true);
  const cost = levelCost();
  ['btnLantLevelVig','btnLantLevelEnd','btnLantLevelStr','btnLantLevelSkl','btnLantLevelBlt'].forEach(id=>{ $(id).disabled = player.echoes < cost; });
}
function levelCost(){ return Math.floor(500 + player.level*player.level*3); }
function levelUp(stat){
  const cost = levelCost();
  if(player.echoes < cost){ notify('НЕДОСТАТОЧНО ОТГОЛОСКОВ'); return; }
  player.echoes -= cost;
  player.level++;
  player.stats[stat]++;
  if(stat==='vig'){ player.maxHp = 100+player.stats.vig*8; player.hp = player.maxHp; }
  else if(stat==='end'){ player.maxStamina = 100+player.stats.end*5; player.stamina = player.maxStamina; }
  else if(stat==='blt'){ player.maxBullets = 15 + player.stats.blt*2; player.bullets = player.maxBullets; }
  sfx('levelup');
  notify('УРОВЕНЬ '+player.level);
  updateDreamUI();
  updateLanternUI();
  updateHUD();
  SaveSystem.save();
}
function leaveDream(){
  $('dreamUI').classList.remove('active');
  $('controls').style.display = 'flex';
  $('gameHUD').style.display = 'block';
  $('toolHotbar').classList.add('show');
  loadLocation(currentLocation);
  updateHUD();
  startAmbient();
}

function openWeaponMenu(){ $('weaponMenu').classList.add('active'); sfx('doll'); updateWeaponUI(); }
function closeWeaponMenu(){ $('weaponMenu').classList.remove('active'); }
function updateWeaponUI(){
  const lvl = player.weaponLevel;
  const wpnName = player.weaponMode === 1 ? 'ПИЛА-КОПЬЁ' : 'ПИЛА-ТЕСАК';
  $('weaponNameDisplay').innerHTML = wpnName + ' <span class="weapon-plus">+' + lvl + '</span>';
  $('weaponBarFill').style.width = (lvl / WEAPON_MAX_LEVEL * 100) + '%';
  $('weaponBarLabel').textContent = '+' + lvl + ' / +' + WEAPON_MAX_LEVEL;
  const dmgBonus = lvl * 8;
  const nextBonus = (lvl+1) * 8;
  const maxed = lvl >= WEAPON_MAX_LEVEL;
  const repairCost = weaponRepairCost();
  const damaged = player.weaponDurability < player.maxWeaponDurability;
  const canRepair = damaged && player.echoes >= repairCost;
  const shardCost = maxed ? 0 : WEAPON_SHARD_COSTS[lvl];
  const can = !maxed && player.bloodShards >= shardCost;
  let html = `
    <div class="stat-row"><span class="label">УРОВЕНЬ ОРУЖИЯ</span><span class="value">+${lvl}</span></div>
    <div class="stat-row"><span class="label">БОНУС УРОНА</span><span class="value">+${dmgBonus}%</span></div>
    <div class="stat-row"><span class="label">ПРОЧНОСТЬ</span><span class="value" style="color:${damaged?'#dd6666':'#55dd77'}">${Math.round(player.weaponDurability)}%</span></div>
    <div class="stat-row"><span class="label">КРОВАВЫЕ ОСКОЛКИ</span><span class="value" style="color:#dd88aa">${player.bloodShards}</span></div>
  `;
  if(maxed){
    html += `<div class="stat-row cost-row"><span class="label">⭐ МАКСИМАЛЬНЫЙ УРОВЕНЬ</span><span class="value">+${WEAPON_MAX_LEVEL}</span></div>`;
  } else {
    html += `
      <div class="stat-row cost-row"><span class="label">💎 СТОИМОСТЬ</span><span class="value" style="color:${can?'#55dd77':'#dd5555'}">${shardCost} осколков</span></div>
      <div class="stat-row cost-row"><span class="label">➡ БОНУС ПОСЛЕ</span><span class="value">+${nextBonus}% <span style="color:#666">(+8%)</span></span></div>
    `;
  }
  html += damaged
    ? `<div class="stat-row cost-row"><span class="label">⚒ РЕМОНТ</span><span class="value" style="color:${canRepair?'#55dd77':'#dd5555'}">${repairCost} отголосков</span></div>`
    : `<div class="stat-row cost-row"><span class="label">⚒ СОСТОЯНИЕ</span><span class="value" style="color:#55dd77">ПОЛНАЯ ПРОЧНОСТЬ</span></div>`;
  $('weaponStats').innerHTML = html;
  $('btnUpgradeWeapon').disabled = !can;
  $('btnRepairWeapon').disabled = !canRepair;
  if(maxed) $('btnUpgradeWeapon').textContent = '⭐ МАКС. УРОВЕНЬ';
  else $('btnUpgradeWeapon').textContent = `⚒ УЛУЧШИТЬ (+${shardCost} 💎)`;
  $('btnRepairWeapon').textContent = damaged ? `⚒ ПОЧИНИТЬ (${repairCost} 💰)` : '✓ ПРОЧНОСТЬ ПОЛНАЯ';
}
function upgradeWeapon(){
  if(player.weaponLevel >= WEAPON_MAX_LEVEL){ notify('МАКСИМАЛЬНЫЙ УРОВЕНЬ'); return; }
  const cost = WEAPON_SHARD_COSTS[player.weaponLevel];
  if(player.bloodShards < cost){ notify('НУЖНО '+cost+' ОСКОЛКОВ'); return; }
  player.bloodShards -= cost;
  player.weaponLevel++;
  sfx('weaponup');
  notify('ОРУЖИЕ +'+player.weaponLevel);
  if(player.weaponLevel >= WEAPON_MAX_LEVEL) unlockAchievement('max_weapon');
  updateWeaponUI();
  updateHUD();
  SaveSystem.save();
}
function weaponRepairCost(){ return 100 + player.weaponLevel * 50; }
function repairWeapon(){
  if(player.weaponDurability >= player.maxWeaponDurability){ notify('ПРОЧНОСТЬ ПОЛНАЯ'); return; }
  const cost = weaponRepairCost();
  if(player.echoes < cost){ notify('НУЖНО '+cost+' ОТГОЛОСКОВ'); return; }
  player.echoes -= cost;
  player.weaponDurability = player.maxWeaponDurability;
  sfx('weaponup');
  notify('ОРУЖИЕ ПОЛНОСТЬЮ ПОЧИНЕНО');
  updateWeaponUI();
  updateHUD();
  SaveSystem.save();
}
function openGemMenu(){ $('gemMenu').classList.add('active'); sfx('gem'); updateGemUI(); }
function closeGemMenu(){ $('gemMenu').classList.remove('active'); }
function updateGemUI(){
  const slots = $('gemSlots'); slots.innerHTML = '';
  player.bloodGems.forEach((gem, i) => {
    const slot = document.createElement('div');
    slot.className = 'gem-slot' + (gem ? ' filled' : '');
    if(gem) { slot.innerHTML = `<div class="gem-icon">${gem.icon}</div>`; slot.title = gem.name; }
    slot.addEventListener('click', () => selectGemSlot(i));
    slots.appendChild(slot);
  });
  let html = `<div class="stat-row"><span class="label">ДОСТУПНЫЕ</span><span class="value">${player.availableGems.length}</span></div>`;
  player.availableGems.forEach(gem => {
    html += `<div class="stat-row"><span class="label">${gem.icon} ${gem.name}</span><span class="value" style="color:${gem.color}">${gem.desc}</span></div>`;
  });
  $('gemStats').innerHTML = html;
}
function selectGemSlot(slotIndex){
  if(player.availableGems.length === 0) { notify('НЕТ ДОСТУПНЫХ САМОЦВЕТОВ'); return; }
  const gem = player.availableGems[0];
  if(player.bloodGems[slotIndex]) player.availableGems.push(player.bloodGems[slotIndex]);
  player.bloodGems[slotIndex] = gem;
  player.availableGems.shift();
  sfx('gem');
  notify(`${gem.icon} ${gem.name} УСТАНОВЛЕН`);
  updateGemUI(); updateHUD();
  if(player.bloodGems.filter(g=>g).length === 3) unlockAchievement('collector');
  SaveSystem.save();
}
function openTeleportMenu(){
  $('teleportMenu').classList.add('active');
  sfx('waystone');
  const list = $('teleportList'); list.innerHTML = '';
  LOCATIONS.forEach((name, i) => {
    const b = document.createElement('button');
    b.className = 'dream-action tp-btn';
    const unlocked = canEnterLocation(i);
    b.textContent = (unlocked ? '🕯 ' : '🔒 ') + name;
    if(i === currentLocation) b.style.borderColor = '#dd9a3a';
    b.disabled = !unlocked;
    b.addEventListener('click', () => {
      if(!canEnterLocation(i)){notify('СЮЖЕТНЫЙ ПУТЬ ЕЩЁ ЗАКРЫТ');return;}
      closeTeleportMenu();
      stageChoiceOpen = false;
      currentLocation = i;
      $('dreamUI').classList.remove('active');
      $('controls').style.display = 'flex';
      $('gameHUD').style.display = 'block';
      $('toolHotbar').classList.add('show');
      loadLocation(i);
      updateHUD();
      startAmbient();
      notify('ПЕРЕМЕЩЕНИЕ: ' + name);
    });
    list.appendChild(b);
  });
}
function closeTeleportMenu(){
  $('teleportMenu').classList.remove('active');
  if(stageChoiceOpen){ stageChoiceOpen=false; gameMode=GameMode.PLAYING; }
}
function openLanternMenu(){
  $('lanternMenu').classList.add('active');
  updateLanternUI();
  sfx('lantern');
  if(nearbyLantern){
    player.respawnPoint = {
      x: nearbyLantern.mesh.position.x - 2.4,
      z: nearbyLantern.mesh.position.z - 1.0,
      y: nearbyLantern.mesh.position.y,
      floor: Math.abs(nearbyLantern.mesh.position.y-FLOOR_LEVELS[1])<FLOOR_HEIGHT/2?1:0,
      loc: currentLocation
    };
  }
  SaveSystem.save();
}
function closeLanternMenu(){ $('lanternMenu').classList.remove('active'); }
function teleportToDream(){ closeLanternMenu(); loadDream(); }

function setupStick(el,knob,data,maxRadius,isMove){
  if(!el || !knob) return;
  if(el._stickSetup) return;
  el._stickSetup = true;
  let activeTouchId=null;
  const start = (cx,cy)=>{
    data.active = true;
    const r = el.getBoundingClientRect();
    data.origin.x = r.left+r.width/2;
    data.origin.y = r.top+r.height/2;
    move(cx,cy);
  };
  const move = (cx,cy)=>{
    let dx = cx-data.origin.x, dy = cy-data.origin.y;
    const d = Math.sqrt(dx*dx+dy*dy);
    if(d > maxRadius){ dx = (dx/d)*maxRadius; dy = (dy/d)*maxRadius; }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    data.x = dx/maxRadius;
    data.y = dy/maxRadius;
    if(isMove){
      const mag = Math.sqrt(data.x*data.x+data.y*data.y);
      if(mag > 0.75) knob.classList.add('sprint'); else knob.classList.remove('sprint');
    }
  };
  const end = ()=>{
    data.active = false; data.x = 0; data.y = 0;
    activeTouchId=null;
    knob.style.transform = 'translate(-50%,-50%)';
    knob.classList.remove('sprint');
  };
  data.cancel=end;
  el.addEventListener('touchstart',(e)=>{
    e.preventDefault();e.stopPropagation();
    if(data.active || !e.changedTouches.length) return;
    const touch=e.changedTouches[0];
    activeTouchId=touch.identifier;
    start(touch.clientX,touch.clientY);
  },{passive:false});
  el.addEventListener('touchmove',(e)=>{
    if(!data.active || activeTouchId===null) return;
    const touch=Array.from(e.changedTouches).find(t=>t.identifier===activeTouchId);
    if(!touch) return;
    e.preventDefault();move(touch.clientX,touch.clientY);
  },{passive:false});
  const endTouch=(e)=>{
    if(activeTouchId===null) return;
    const ended=Array.from(e.changedTouches).some(t=>t.identifier===activeTouchId);
    if(ended){ e.preventDefault();end(); }
  };
  el.addEventListener('touchend',endTouch,{passive:false});
  el.addEventListener('touchcancel',endTouch,{passive:false});
  el.addEventListener('mousedown',(e)=>{if(data.active)return;activeTouchId=null;e.preventDefault();start(e.clientX,e.clientY);});
  window.addEventListener('mousemove',(e)=>{if(data.active)move(e.clientX,e.clientY);});
  window.addEventListener('mouseup',()=>{if(data.active)end();});
}

function setupCameraSwipe(){
  if(setupCameraSwipe._done) return;
  setupCameraSwipe._done = true;

  let cameraPointerId = null;
  let moved = false;
  let lastX = 0, lastY = 0;
  let lastTapTime = 0, lastTapX = 0, lastTapY = 0;

  const isInteractive = (el) => {
    if(!el || typeof el.closest !== 'function') return false;
    return !!(
      el.closest('.act-btn') ||
      el.closest('.vial-btn') ||
      el.closest('.left-stick') ||
      el.closest('.tool-slot') ||
      el.closest('#lanternPrompt') ||
      el.closest('#dollPrompt') ||
      el.closest('#worldInteractPrompt') ||
      el.closest('.pause-btn') ||
      el.closest('.fullscreen-btn') ||
      el.closest('.settings-btn') ||
      el.closest('.dream-panel') ||
      el.closest('.pause-panel') ||
      el.closest('.settings-panel') ||
      el.closest('.lantern-panel')
    );
  };

  const start = (cx, cy, target, pointerId) => {
    if(gameMode !== GameMode.PLAYING || stairFallAnimation){ lastTapTime=0; return; }
    if(isInteractive(target)){ lastTapTime=0; return; }
    if(cameraPointerId !== null){ lastTapTime=0; return; }
    cameraPointerId = pointerId;
    moved = false;
    lastX = cx;
    lastY = cy;
  };

  const move = (cx, cy, pointerId) => {
    if(cameraPointerId !== pointerId) return;
    if(stairFallAnimation){ cameraPointerId=null;lastTapTime=0;return; }
    const dx = cx - lastX;
    const dy = cy - lastY;
    if(Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    cameraAngle -= dx * 0.005 * camSensitivity;
    const yDir = invertY ? dy : -dy;
    cameraHeight = Math.max(4, Math.min(16, cameraHeight + yDir * 0.015 * camSensitivity));
    lastX = cx;
    lastY = cy;
  };

  const end = (cx, cy, pointerId) => {
    if(cameraPointerId !== pointerId) return;
    cameraPointerId = null;
    if(!moved){
      const now = Date.now();
      const tapDist = Math.hypot(cx - lastTapX, cy - lastTapY);
      if(now - lastTapTime < 300 && tapDist < 50){
        performDodge();
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapX = cx;
        lastTapY = cy;
      }
    } else lastTapTime=0;
  };

  document.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse' && e.button!==0) return;
    start(e.clientX,e.clientY,e.target,e.pointerId);
  });
  document.addEventListener('pointermove',e=>{
    if(cameraPointerId!==e.pointerId) return;
    if(e.cancelable) e.preventDefault();
    move(e.clientX,e.clientY,e.pointerId);
  },{passive:false});
  document.addEventListener('pointerup',e=>end(e.clientX,e.clientY,e.pointerId));
  document.addEventListener('pointercancel',e=>{
    if(cameraPointerId===e.pointerId){ cameraPointerId=null; lastTapTime=0; }
  });
}

function setupButtons(){
  const atkBtn = $('btnAttack');
  let chargeStart = 0, chargeInterval = null;
  cancelActiveAttackCharge=()=>{
    if(chargeInterval){ clearInterval(chargeInterval);chargeInterval=null; }
    player.isCharging=false;
    if(atkBtn) atkBtn.classList.remove('charging');
    const indicator=$('chargeIndicator'),bar=$('chargeBar');
    if(indicator) indicator.classList.remove('show');
    if(bar) bar.style.width='0%';
  };
  const atkDown = (e)=>{
    e.preventDefault();e.stopPropagation();
    if(gameMode!==GameMode.PLAYING || stairFallAnimation) return;
    initAudio();
    if(player.isAttacking){ player.attackBuffer = true; return; }
    if(player.isDodging){ player.dodgeBuffer = true; return; }
    if(player.stamina < 15) return;
    chargeStart = Date.now();
    player.isCharging = true;
    atkBtn.classList.add('charging');
    $('chargeIndicator').classList.add('show');
    chargeInterval = setInterval(() => {
      const chargeTime = (Date.now() - chargeStart) / 1000;
      const chargePercent = Math.min(chargeTime / 1.5, 1) * 100;
      $('chargeBar').style.width = chargePercent + '%';
    }, 50);
  };
  const atkUp = (e)=>{
    e.preventDefault();e.stopPropagation();
    if(chargeInterval){ clearInterval(chargeInterval);chargeInterval=null; }
    if(!player.isCharging) return;
    const dur = (Date.now()-chargeStart)/1000;
    player.isCharging = false;
    atkBtn.classList.remove('charging');
    $('chargeIndicator').classList.remove('show');
    $('chargeBar').style.width = '0%';
    performAttack(dur);
  };
  if(atkBtn){
    atkBtn.addEventListener('touchstart',atkDown,{passive:false});
    atkBtn.addEventListener('touchend',atkUp,{passive:false});
    atkBtn.addEventListener('touchcancel',atkUp);
    atkBtn.addEventListener('mousedown',atkDown);
    atkBtn.addEventListener('mouseup',atkUp);
  }
  const bind = (id,fn)=>{
    const el = $(id);
    if(!el) return;
    el.addEventListener('touchstart',(e)=>{e.preventDefault();e.stopPropagation();if(gameMode===GameMode.PLAYING&&!stairFallAnimation)fn();},{passive:false});
    el.addEventListener('mousedown',(e)=>{e.preventDefault();if(gameMode===GameMode.PLAYING&&!stairFallAnimation)fn();});
  };
  bind('btnGun',performGunshot);
  bind('btnTransform',performTransformOrLock);
  bind('btnVial',useVial);
  bind('worldInteractPrompt',activateNearbyWorldObject);

  $('btnLevelVig').addEventListener('click',()=>levelUp('vig'));
  $('btnLevelEnd').addEventListener('click',()=>levelUp('end'));
  $('btnLevelStr').addEventListener('click',()=>levelUp('str'));
  $('btnLevelSkl').addEventListener('click',()=>levelUp('skl'));
  $('btnLevelBlt').addEventListener('click',()=>levelUp('blt'));
  $('btnLantLevelVig').addEventListener('click',()=>levelUp('vig'));
  $('btnLantLevelEnd').addEventListener('click',()=>levelUp('end'));
  $('btnLantLevelStr').addEventListener('click',()=>levelUp('str'));
  $('btnLantLevelSkl').addEventListener('click',()=>levelUp('skl'));
  $('btnLantLevelBlt').addEventListener('click',()=>levelUp('blt'));
  $('btnLeave').addEventListener('click',leaveDream);
  $('btnToDream').addEventListener('click',teleportToDream);
  $('btnCloseLantern').addEventListener('click',closeLanternMenu);
  $('btnOpenWeapon').addEventListener('click',openWeaponMenu);
  $('btnCloseWeapon').addEventListener('click',closeWeaponMenu);
  $('btnUpgradeWeapon').addEventListener('click',upgradeWeapon);
  $('btnRepairWeapon').addEventListener('click',repairWeapon);
  $('btnOpenGems').addEventListener('click',openGemMenu);
  $('btnCloseGems').addEventListener('click',closeGemMenu);
  $('btnOpenTeleport').addEventListener('click',openTeleportMenu);
  $('btnCloseTeleport').addEventListener('click',closeTeleportMenu);

  const lp = $('lanternPrompt');
  lp.addEventListener('touchstart',(e)=>{e.preventDefault();e.stopPropagation();openLanternMenu();},{passive:false});
  lp.addEventListener('mousedown',(e)=>{e.preventDefault();openLanternMenu();});
  const dp = $('dollPrompt');
  dp.addEventListener('touchstart',(e)=>{e.preventDefault();e.stopPropagation();openWeaponMenu();},{passive:false});
  dp.addEventListener('mousedown',(e)=>{e.preventDefault();openWeaponMenu();});

  document.querySelectorAll('.tool-slot').forEach(slot => {
    const useTool = () => { if(gameMode !== GameMode.PLAYING || stairFallAnimation) return; useToolItem(slot.dataset.tool); };
    slot.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); useTool(); }, {passive:false});
    slot.addEventListener('mousedown', (e) => { e.preventDefault(); useTool(); });
  });

  $('pauseBtn').addEventListener('click', togglePause);
  document.querySelectorAll('.pause-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pause-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderPauseTab(tab.dataset.tab);
    });
  });

  $('settingsBtn').addEventListener('click', openSettingsMenu);
  $('btnAboutProject').addEventListener('click', () => {
    openSettingsMenu();
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    const aboutTab=document.querySelector('.settings-tab[data-stab="about"]');
    if(aboutTab) aboutTab.classList.add('active');
    renderSettingsTab('about');
  });
  $('btnCloseSettings').addEventListener('click', closeSettingsMenu);
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSettingsTab(tab.dataset.stab);
    });
  });

  setupCameraSwipe();
  setupStagePlanAtlas();
}

function togglePause(){
  if(gameMode === GameMode.PLAYING){
    gameMode = GameMode.PAUSED;
    $('pauseMenu').classList.add('active');
    renderPauseTab('main');
    sfx('menu');
  } else if(gameMode === GameMode.PAUSED){
    gameMode = GameMode.PLAYING;
    $('pauseMenu').classList.remove('active');
  }
}

function renderPauseTab(tab){
  const c = $('pauseContent');
  if(tab === 'main'){
    c.innerHTML = `
      <div class="dream-actions" style="flex-direction:column;align-items:center">
        <button class="dream-action primary" onclick="togglePause()">▶ ПРОДОЛЖИТЬ</button>
        <button class="dream-action" onclick="SaveSystem.save(); notify('💾 СОХРАНЕНО'); renderPauseTab('main')">💾 СОХРАНИТЬ</button>
        <button class="dream-action" onclick="if(confirm('Вернуться в меню?')){ SaveSystem.save(); if(gameMode===GameMode.PAUSED) togglePause(); gameMode=GameMode.MENU; $('mainMenu').classList.add('active'); $('gameHUD').style.display='none'; $('controls').style.display='none'; $('toolHotbar').classList.remove('show'); setupMenuScene(); }">🏠 ГЛАВНОЕ МЕНЮ</button>
      </div>
    `;
  } else if(tab === 'stats'){
    c.innerHTML = `
      <div class="dream-stats">
        <div class="stat-row"><span class="label">УБИЙСТВ</span><span class="value">${player.kills}</span></div>
        <div class="stat-row"><span class="label">БОССОВ</span><span class="value">${player.bossesKilled}</span></div>
        <div class="stat-row"><span class="label">СМЕРТЕЙ</span><span class="value">${player.deaths}</span></div>
        <div class="stat-row"><span class="label">МАКС КОМБО</span><span class="value">${player.maxCombo}</span></div>
        <div class="stat-row"><span class="label">ПАРИРОВАНИЯ</span><span class="value">${parryCount}</span></div>
        <div class="stat-row"><span class="label">ИДЕАЛЬН. УКЛОН.</span><span class="value">${perfectDodgeCount}</span></div>
        <div class="stat-row"><span class="label">NG+</span><span class="value">${player.ngPlus}</span></div>
        <div class="stat-row"><span class="label">ИГРА ВРЕМЯ</span><span class="value">${Math.floor(gameTime/60)}м</span></div>
      </div>
    `;
  } else if(tab === 'bestiary'){
    let html = '';
    BESTIARY.forEach(b => {
      if(discoveredBestiary[b.id]){
        const art = b.art ? `<img src="${b.art}" alt="">` : '';
        html += `<div class="bestiary-entry ${b.art?'with-art':''}">${art}<div><h4>${b.icon} ${b.name}</h4><p>${b.desc}</p></div></div>`;
      } else html += `<div class="bestiary-entry" style="opacity:0.4"><h4>??? ???</h4><p>Не открыто</p></div>`;
    });
    c.innerHTML = html;
  } else if(tab === 'achievements'){
    let html = '';
    ACHIEVEMENTS.forEach(a => {
      const unlocked = unlockedAchievements[a.id];
      html += `<div class="ach-entry ${unlocked?'unlocked':''}"><div class="ach-icon">${a.icon}</div><div class="ach-info"><h4>${a.name}</h4><p>${a.desc}</p></div></div>`;
    });
    c.innerHTML = html;
  }
}

function openSettingsMenu(){
  if(gameMode === GameMode.PLAYING){ gameMode = GameMode.PAUSED; }
  $('settingsMenu').classList.add('active');
  renderSettingsTab('sound');
  sfx('menu');
}
function closeSettingsMenu(){
  $('settingsMenu').classList.remove('active');
  if(gameMode === GameMode.PAUSED && !$('pauseMenu').classList.contains('active')){
    gameMode = GameMode.PLAYING;
  }
  SaveSystem.save();
}
function renderSettingsTab(tab){
  const c = $('settingsContent');
  if(tab === 'sound'){
    let trackBtns = '';
    MUSIC_TRACKS.forEach((t, i) => {
      trackBtns += `<div class="track-btn ${i===currentMusicTrack?'active':''}" data-track="${i}">${t.name}</div>`;
    });
    c.innerHTML = `
      <div class="settings-row">
        <div class="sr-label"><b>🔊 ГРОМКОСТЬ SFX</b><span class="val" id="sfxVal">${Math.round(sfxVolume*100)}%</span></div>
        <input type="range" id="sfxSlider" min="0" max="100" value="${Math.round(sfxVolume*100)}">
      </div>
      <div class="settings-row">
        <div class="sr-label"><b>🎵 ГРОМКОСТЬ МУЗЫКИ</b><span class="val" id="musicVal">${Math.round(musicVolume*100)}%</span></div>
        <input type="range" id="musicSlider" min="0" max="100" value="${Math.round(musicVolume*100)}">
      </div>
      <div class="settings-row">
        <div class="sr-label"><b>🎼 МУЗЫКАЛЬНАЯ ТЕМА</b></div>
        <div class="track-picker" id="trackPicker">${trackBtns}</div>
      </div>
    `;
    $('sfxSlider').addEventListener('input', e => {
      sfxVolume = e.target.value / 100;
      $('sfxVal').textContent = e.target.value + '%';
      if(ambientNodes && ambientNodes.gain) ambientNodes.gain.gain.setTargetAtTime(0.13*sfxVolume,audioCtx.currentTime,0.08);
    });
    
    // === ИЗМЕНЕНИЕ: Обновление громкости MP3 ===
    $('musicSlider').addEventListener('input', e => {
      musicVolume = e.target.value / 100;
      $('musicVal').textContent = e.target.value + '%';
      if (musicAudio) musicAudio.volume = musicVolume;
    });
    
    document.querySelectorAll('.track-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.track);
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setMusicTrack(idx);
        sfx('menu');
      });
    });
  } else if(tab === 'screen'){
    c.innerHTML = `
      <div class="settings-row graphics-quality-row">
        <div class="sr-label"><b>🎨 КАЧЕСТВО ГРАФИКИ</b></div>
        <div class="graphics-quality-toggle" role="group" aria-label="Качество графики">
          <button type="button" class="graphics-quality-btn" data-mode="auto">АВТО</button>
          <button type="button" class="graphics-quality-btn" data-mode="low">НИЗКИЕ</button>
          <button type="button" class="graphics-quality-btn" data-mode="medium">СРЕДНИЕ</button>
          <button type="button" class="graphics-quality-btn" data-mode="ultra">УЛЬТРА</button>
        </div>
        <div class="graphics-quality-note" id="graphicsQualityNote"></div>
      </div>
      <div class="settings-row">
        <div class="sr-label"><b>🌌 ЯРКОСТЬ НЕБА</b><span class="val" id="skyVal">${Math.round(skyBrightness*100)}%</span></div>
        <input type="range" id="skySlider" min="20" max="380" value="${Math.round(skyBrightness*100)}">
      </div>
      <div class="settings-row">
        <div class="sr-label"><b>🖥 ЯРКОСТЬ ИГРЫ</b><span class="val" id="gameVal">${Math.round(gameBrightness*100)}%</span></div>
        <input type="range" id="gameSlider" min="30" max="370" value="${Math.round(gameBrightness*100)}">
      </div>
      <div class="settings-row" style="border-left-color:#3a5a3a">
        <div class="sr-label" style="margin-bottom:0"><b>💡 ПОДСКАЗКА</b></div>
        <div style="color:#8a7858;font-size:11px;line-height:1.5;margin-top:4px">200% — середина шкалы. «Небо» управляет фоном, туманом и луной; «Игра» — общим освещением сцены.</div>
      </div>
      <div class="settings-row">
        <div class="sr-label"><b>🎥 ЧУВСТВИТЕЛЬНОСТЬ КАМЕРЫ</b><span class="val" id="camVal">${Math.round(camSensitivity*100)}%</span></div>
        <input type="range" id="camSlider" min="50" max="200" value="${Math.round(camSensitivity*100)}">
      </div>
      <div class="settings-row">
        <div class="sr-label"><b>⬇ ИНВЕРСИЯ Y</b><input type="checkbox" id="invertCheck" style="transform:scale(1.4)" ${invertY?'checked':''}></div>
      </div>
    `;
    document.querySelectorAll('.graphics-quality-btn').forEach(button=>button.addEventListener('click',()=>{
      setGraphicsMode(button.dataset.mode);
      sfx('menu');
    }));
    updateGraphicsQualityControls();
    $('skySlider').addEventListener('input', e => {
      skyBrightness = e.target.value / 100;
      $('skyVal').textContent = e.target.value + '%';
      applyBrightness();
    });
    $('gameSlider').addEventListener('input', e => {
      gameBrightness = e.target.value / 100;
      $('gameVal').textContent = e.target.value + '%';
      applyBrightness();
    });
    $('camSlider').addEventListener('input', e => {
      camSensitivity = e.target.value / 100;
      $('camVal').textContent = e.target.value + '%';
    });
    $('invertCheck').addEventListener('change', e => { invertY = e.target.checked; });
  } else if(tab === 'about'){
    c.innerHTML = `
      <div class="about-text">
        <h3>Bloodborne: Hunter's Nightmare</h3>
        <p>Мрачная охота в проклятом городе Ярнам. Тёмные венецианские коридоры, готические аркады и бесконечный дождь. Ты — Охотник, и ночь только начинается.</p>
        <p>Испытай безумный бой, парирования и кровавую ярость Зверя внутри. Найди своё место в Кошмаре Охотника.</p>
        <h3>ЭТАПЫ ПЕРЕРАБОТКИ МИРА</h3>
        <ol class="build-stages">
          <li><b>Часовня Идон</b> — готические своды, фактурный камень, холодные витражи, мокрый пол и живое пламя на алтаре.</li>
          <li><b>Улицы Ярнама</b> — дождливые переулки, туман, отражающие лужи и тёплые фонари.</li>
          <li><b>Горный перевал</b> — ледяная дымка, скальные выступы и опасные открытые тропы.</li>
          <li><b>Паучий замок</b> — холодный лунный свет, готические детали, паутина и коконы.</li>
        </ol>
        <p><b>Автор:</b> Кравчук Андрей<br><b>Инструменты разработки:</b> Manus, Codex</p>
        <video class="about-showcase" controls playsinline preload="none" aria-label="Видео демонстрации 3D-модели">
          <source src="tripo-showcase-956e621b-78f7-4f2f-84a3-b496f8737543.mp4" type="video/mp4">
        </video>
        <p style="color:#8a7858;font-size:11px;margin-top:10px;line-height:1.6">
          <b style="color:#ddb858">УПРАВЛЕНИЕ:</b><br>
          • Левый стик — движение<br>
          • <b>Свайп по пустой части экрана</b> — поворот камеры<br>
          • <b>Двойной тап по пустой части</b> — перекат<br>
          • Долгое нажатие атаки — зарядка (×3 урона)<br>
          • Кнопки справа — атака, выстрел, уклонение, трансформация<br>
          • Зелья и инструменты — внизу
        </p>
      </div>
      <div class="about-text ver">Complete Edition • v1.2</div>
    `;
  }
}

function updateGraphicsQualityControls(){
  document.querySelectorAll('.graphics-quality-btn').forEach(button=>{
    const selected=button.dataset.mode===graphicsMode;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',selected?'true':'false');
  });
  const note=$('graphicsQualityNote');
  if(note)note.textContent=graphicsMode==='auto'
    ?'Авто начинает со «Средних» и включает «Низкие», если игра несколько секунд работает медленно.'
    :graphicsMode==='low'
      ?'Самый лёгкий режим: меньше дождя, ниже разрешение, без теней и экранных эффектов.'
      :graphicsMode==='ultra'
        ?'Максимальные эффекты, мягкое свечение и тени; на слабых телефонах может работать медленнее.'
        :'Средний режим: без тяжёлого свечения и затемнения углов.';
}

function setupFullscreen(){
  const btn = $('btnFullscreen');
  if(!btn) return;
  if(btn._fsSetup) return;
  btn._fsSetup = true;
  const getFsElement = () =>
    document.fullscreenElement || document.webkitFullscreenElement ||
    document.mozFullScreenElement || document.msFullscreenElement || null;
  const isSupported = () => {
    const el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen);
  };
  const toggleFullscreen = (e) => {
    if(e){ e.preventDefault(); e.stopPropagation(); }
    try {
      if(!getFsElement()){
        if(!isSupported()){ if(typeof notify === 'function') notify('⛶ ПОЛНЫЙ ЭКРАН НЕ ПОДДЕРЖИВАЕТСЯ'); return; }
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
        const result = req.call(el);
        if(result && result.catch) result.catch(err => console.warn('Fullscreen request failed:', err));
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if(exit){ const r = exit.call(document); if(r && r.catch) r.catch(err => console.warn('Exit fullscreen failed:', err)); }
      }
    } catch(err){ console.warn('Fullscreen toggle error:', err); }
  };
  btn.addEventListener('click', toggleFullscreen);
  const updateIcon = () => {
    const isFs = !!getFsElement();
    btn.classList.toggle('active', isFs);
    btn.textContent = isFs ? '⤢' : '⛶';
    btn.title = isFs ? 'Выйти из полноэкранного режима' : 'Полный экран';
  };
  document.addEventListener('fullscreenchange', updateIcon);
  document.addEventListener('webkitfullscreenchange', updateIcon);
  document.addEventListener('mozfullscreenchange', updateIcon);
  document.addEventListener('MSFullscreenChange', updateIcon);
  updateIcon();
}

function useToolItem(tool){
  if(stairFallAnimation) return;
  if(tool === 'molotov'){
    if(player.tools.molotov <= 0){ notify('НЕТ МОЛОТОВЫХ КОКТЕЙЛЕЙ'); return; }
    player.tools.molotov--; sfx('throw'); spawnMolotov();
  } else if(tool === 'knife'){
    if(player.tools.knife <= 0){ notify('НЕТ НОЖЕЙ'); return; }
    player.tools.knife--; sfx('throw'); spawnKnife();
  } else if(tool === 'firepaper'){
    if(player.tools.firepaper <= 0){ notify('НЕТ ОГНЕННОЙ БУМАГИ'); return; }
    player.tools.firepaper--;
    player.firePaperTimer = 15;
    sfx('firepaper');
    notify('🔥 ОГНЕННАЯ БУМАГА АКТИВИРОВАНА!');
  }
  updateHUD();
}
function spawnMolotov(){
  if(!hunter || !scene) return;
  const geo = new THREE.SphereGeometry(0.2, 8, 8);
  const mat = new THREE.MeshStandardMaterial({color:0x9a4418, emissive:0x551800, emissiveIntensity:0.8});
  const m = new THREE.Mesh(geo, mat);
  const startPos = hunter.position.clone(); startPos.y += 1.5;
  m.position.copy(startPos);
  const dir = new THREE.Vector3(Math.sin(hunter.rotation.y), 0.3, Math.cos(hunter.rotation.y)).normalize();
  scene.add(m);
  toolProjectiles.push({mesh:m, velocity:dir.multiplyScalar(0.5), life:2.0, type:'molotov'});
}
function spawnKnife(){
  if(!hunter || !scene) return;
  const geo = new THREE.ConeGeometry(0.05, 0.3, 4);
  const mat = new THREE.MeshStandardMaterial({color:0xbbbbc0, metalness:0.9, roughness:0.2});
  const m = new THREE.Mesh(geo, mat);
  const startPos = hunter.position.clone(); startPos.y += 1.5;
  m.position.copy(startPos);
  const dir = new THREE.Vector3(Math.sin(hunter.rotation.y), 0, Math.cos(hunter.rotation.y)).normalize();
  m.rotation.x = Math.PI/2; m.rotation.y = hunter.rotation.y;
  scene.add(m);
  toolProjectiles.push({mesh:m, velocity:dir.multiplyScalar(0.8), life:1.5, type:'knife'});
}
function explodeMolotov(pos){
  if(!scene) return;
  sfx('molotov');
  const fireGeo = new THREE.SphereGeometry(3, 16, 16);
  const fireMat = new THREE.MeshBasicMaterial({color:0xdd3300, transparent:true, opacity:0.75});
  const fire = new THREE.Mesh(fireGeo, fireMat);
  fire.position.copy(pos); scene.add(fire);
  const light = new THREE.PointLight(0xdd5522, 5, 10, 2);
  light.position.copy(pos); scene.add(light);
  attackTrails.push({mesh:fire, life:0.8, maxLife:0.8, isFire:true, light});
  player.screenShake = 0.4;
  enemies.forEach(e => {
    const d = e.mesh.position.distanceTo(pos);
    if(d < 3.5){
      e.burning = 3.0;
      e.hp -= 30;
      spawnDmg(e.mesh.position.clone().setY(2), 30, 'heavy');
      if(e.hp <= 0) killEnemy(e);
    }
  });
}

function cancelMoveStickForAction(){
  if(typeof moveData.cancel==='function') moveData.cancel();
  else { moveData.active=false; moveData.x=0; moveData.y=0; }
  player.sprintTime=0;
}

function performAttack(chargeDur=0){
  if(stairFallAnimation || player.isAttacking || player.stamina < 18) return;
  if(player.weaponDurability <= 0){ notify('ОРУЖИЕ СЛОМАНО — ПОЧИНИТЕ В МАСТЕРСКОЙ'); return; }
  const running = Math.sqrt(moveData.x**2+moveData.y**2) > 0.75;
  const isCharged = chargeDur >= 1.5;
  const isHeavy = chargeDur > 0.7 || isCharged;
  const cost = isHeavy ? 40 : 20;
  if(player.stamina < cost) return;
  let attackType = 'normal', dmgMult = 1.0, range = 6.0, angle = Math.PI * 0.50;
  if(isCharged){ attackType = 'charged'; dmgMult = 3.0; range = 7.5; angle = Math.PI * 0.65; }
  else if(player.dodgeBuffer && gameTime - player.lastActionTime < 0.3 && player.lastAction === 'roll'){ attackType = 'roll'; dmgMult = 1.6; range = 6.5; angle = Math.PI * 0.58; }
  else if(player.dodgeBuffer && player.lastAction === 'backstep'){ attackType = 'backstep'; dmgMult = 1.4; range = 6.5; angle = Math.PI * 0.48; }
  else if(running && player.sprintTime > 0.5){ attackType = 'sprint'; dmgMult = 1.6; range = 6.8; }
  else if(isHeavy){ attackType = 'heavy'; dmgMult = 2.8; range = 7.0; angle = Math.PI * 0.62; }
  if(player.transformAttackBuffer > 0){ attackType = 'transform'; dmgMult *= 1.4; range += 0.5; player.transformAttackBuffer = 0; }
  const hasMoveHeading=moveData.active&&Math.hypot(moveData.x,moveData.y)>0.16;
  if(!hasMoveHeading && player.lockedTarget && enemies.includes(player.lockedTarget)){
    const t = player.lockedTarget.mesh.position;
    hunter.rotation.y = Math.atan2(t.x - hunter.position.x, t.z - hunter.position.z);
  } else if(!hasMoveHeading){
    hunter.rotation.y = Math.atan2(-Math.sin(cameraAngle), -Math.cos(cameraAngle));
  }
  player.attackFacing = hunter.rotation.y;
  player.attackHand=player.attackHand===0?1:0;
  cancelMoveStickForAction();
  player.isAttacking = true; player.attackTime = 0;
  player.stamina -= cost;
  player.weaponDurability = Math.max(0, player.weaponDurability - (isHeavy ? 2 : 1));
  const isSpear = player.weaponMode === 1;
  const skillBonus = 1 + player.stats.skl*0.03;
  const strBonus = 1 + player.stats.str*0.03;
  let gemBonus = 1.0;
  player.bloodGems.forEach(gem => { if(gem && gem.id === 'damage') gemBonus += 0.2; });
  player.currentAttack = {
    isHeavy, running, attackType, isCharged,
    attackRange: range * (isSpear?1.1:1),
    attackAngle: angle,
    dmgMult: dmgMult * (isSpear?0.95:1) * gemBonus * (player.beastMode ? 1.5 : 1) * (player.firePaperTimer > 0 ? 1.3 : 1),
    dmgBonus: player.stats.str*strBonus*0.5 + player.stats.skl*skillBonus*0.5,
    facingAngle:player.attackFacing, attackHand:player.attackHand,
    lungeDistance:attackType==='sprint'?0.78:(isHeavy||isCharged?0.46:0.34),
    lungeRemaining:attackType==='sprint'?0.78:(isHeavy||isCharged?0.46:0.34),
    hitEnemies: new Set(), hitEnv: new Set()
  };
  if(attackType === 'charged') sfx('heavy');
  else if(attackType === 'roll' || attackType === 'heavy') sfx('heavy');
  else sfx('slash');
  spawnAttackTrail();
  if(isHeavy || attackType === 'roll' || attackType === 'sprint' || isCharged) player.screenShake = isCharged ? 0.5 : 0.35;
  if(isCharged) notify('⚡ CHARGED ATTACK! ⚡');
  else if(attackType === 'roll') notify('ROLL ATTACK!');
  else if(attackType === 'backstep') notify('BACKSTEP ATTACK!');
  else if(attackType === 'sprint') notify('SPRINT ATTACK!');
  else if(attackType === 'transform') notify('TRANSFORM ATTACK!');
  else if(attackType === 'heavy') notify('HEAVY SLASH!');
  player.dodgeBuffer = false;
  player.lastAction = 'attack';
  player.lastActionTime = gameTime;
  player.beastCharge = Math.min(100, player.beastCharge + 10);
  updateHUD();
}
function resolveAttackHits(){
  if(!player.currentAttack || !hunter) return;
  const ca = player.currentAttack;
  damageBreakableBarrier(ca);
  const pAng = ca.facingAngle ?? hunter.rotation.y;
  const weaponBonus = 1 + player.weaponLevel * 0.08;
  const insightBonus = 1 + player.insight * 0.02;
  let critBonus = 1.0;
  player.bloodGems.forEach(gem => { if(gem && gem.id === 'crit') critBonus += 0.5; });
  enemies.slice().forEach(enemy=>{
    if(ca.hitEnemies.has(enemy)||enemy.hp<=0) return;
    if(Math.abs(enemy.mesh.position.y-hunter.position.y)>FLOOR_HEIGHT*0.4) return;
    const dx = enemy.mesh.position.x - hunter.position.x;
    const dz = enemy.mesh.position.z - hunter.position.z;
    const d = Math.sqrt(dx*dx+dz*dz);
    const maxRange = ca.attackRange + enemy.radius;
    if(d > maxRange) return;
    if(d < 0.3) return;
    const ang = Math.atan2(dx, dz);
    let diff = ang - pAng;
    while(diff>Math.PI) diff -= Math.PI*2;
    while(diff<-Math.PI) diff += Math.PI*2;
    if(Math.abs(diff) < ca.attackAngle/2){
      ca.hitEnemies.add(enemy);
      discoverBestiary(enemy.type === 'boss' ? enemy.name : enemy.type);
      const isVisceral = enemy.stunned > 0 && d < 4.0;
      const isRiposte = enemy.stunned > 0;
      const enemyFacing = enemy.mesh.rotation.y;
      let backDiff = ang - (enemyFacing + Math.PI);
      while(backDiff>Math.PI) backDiff -= Math.PI*2;
      while(backDiff<-Math.PI) backDiff += Math.PI*2;
      const isBackstab = Math.abs(backDiff) < Math.PI/3 && !enemy.detected;
      let dmgMult = ca.dmgMult, dmgType = 'normal';
      if(ca.isCharged){ dmgMult *= 1.5; dmgType = 'crit'; sfx('crit'); }
      else if(isVisceral){ dmgMult *= 4 * critBonus; sfx('visceral'); dmgType = 'visceral'; notify('VISCERAL ATTACK!'); }
      else if(isRiposte){ dmgMult *= 3 * critBonus; sfx('crit'); dmgType = 'crit'; }
      else if(isBackstab && ca.isHeavy){ dmgMult *= 5 * critBonus; sfx('visceral'); dmgType = 'visceral'; notify('CHARGED BACKSTAB!'); }
      else if(isBackstab){ dmgMult *= 2.5 * critBonus; sfx('hit'); dmgType = 'backstab'; notify('BACKSTAB!'); }
      else if(ca.isHeavy) { sfx('heavy'); dmgType = 'heavy'; }
      else sfx('hit');
      const dmg = (25 + player.stats.str + player.stats.skl + Math.random()*10) * dmgMult * weaponBonus * insightBonus;
      enemy.hp -= dmg;
      player.comboCount++; player.comboTimer = 2.5; updateCombo();
      if(player.rallyHp > 0) recoverFromRally();
      player.hitStop = isVisceral||isBackstab?0.15:(ca.isHeavy?0.1:0.05);
      player.screenShake = Math.max(player.screenShake, isVisceral?0.5:(ca.isHeavy?0.3:0.1));
      const hitPos = enemy.mesh.position.clone();
      hitPos.y += enemy.type==='boss'?4:1.5;
      spawnDmg(hitPos,dmg,dmgType);
      spawnBlood(hitPos, isVisceral?40:(ca.isHeavy?25:15));
      if(isVisceral||isRiposte) enemy.stunned = 0;
      if(enemy.type==='boss' && !player.seenBosses[enemy.name]){
        player.seenBosses[enemy.name] = true;
        player.insight += 1;
        sfx('insight');
        notify('+1 👁 ПРОНИЦАТЕЛЬНОСТЬ');
        if(player.insight >= 5) unlockAchievement('insight_5');
        updateHUD();
      }
      if(enemy.type==='boss'){
        const pct = (enemy.hp/enemy.maxHp)*100;
        $('bossFill').style.width = pct+'%';
        if(pct<50 && !enemy.phase2){
          enemy.phase2 = true;
          enemy.speed *= 1.5; enemy.cooldown *= 0.7;
          if(enemy.material) enemy.material.emissive.setHex(0x440000);
          sfx('roar'); notify('БОСС В ЯРОСТИ!');
        }
      }
      if(enemy.hp<=0) killEnemy(enemy);
    }
  });
}
function killEnemy(enemy){
  if(!enemy || enemy._defeated) return;
  enemy._defeated=true;
  if(enemy.hpBar){ scene.remove(enemy.hpBar.bg); scene.remove(enemy.hpBar.fill); }
  scene.remove(enemy.mesh);
  disposeWorldObjectResources(enemy.mesh,collectSharedWorldResources(),{geometries:new Set(),materials:new Set()});
  enemies = enemies.filter(e=>e!==enemy);
  player.echoes += enemy.echoes;
  player.kills++;
  if(player.kills >= 50) unlockAchievement('slayer');
  if(player.kills === 1) unlockAchievement('first_kill');
  if(enemy.type === 'boss'){
    player.bossesKilled++;
    player.insight += 1;
    sfx('insight');
    notify('+1 👁 ПРОНИЦАТЕЛЬНОСТЬ');
    unlockAchievement('first_boss');
    if(currentLocation===0) campaignProgress.cityBoss=true;
    else if(currentLocation===1) campaignProgress.buildingBoss=true;
    else if(currentLocation===2) campaignProgress.mountainBoss=true;
    player.unlockedLocations=Math.max(player.unlockedLocations,Math.min(4,currentLocation+2));
    SaveSystem.save();
  }
  const shardChance = enemy.type === 'boss' ? 1.0 : 0.15;
  if(Math.random() < shardChance){
    const shardAmount = enemy.type === 'boss' ? 3 : 1;
    player.bloodShards += shardAmount;
    sfx('shard');
    notify('+'+shardAmount+' 💎 КРОВАВЫЙ ОСКОЛОК');
  }
  updateHUD();
  if(enemy.type==='boss'){ showSpecialMessage('PREY SLAUGHTERED', 3500); sfx('roar'); }
  else notify('ВРАГ УБИТ');
  if(Math.random()<0.3 && enemy.type!=='boss'){ player.vials++; updateHUD(); }
  if(player.lockedTarget===enemy){ player.lockedTarget = null; }
  if(enemy.type==='boss'){
    $('bossWrap').classList.remove('show');
    const defeatedLocation=currentLocation;
    setTimeout(()=>{
      if(currentLocation!==defeatedLocation) return;
      if(currentLocation < LOCATIONS.length-1){
        stageChoiceOpen=true;gameMode=GameMode.PAUSED;
        notify(currentLocation===0?'ПУТЬ В ЗДАНИЕ ОТКРЫТ':'НОВАЯ ЛОКАЦИЯ ОТКРЫТА');
        openTeleportMenu();
      } else {
        player.ngPlus++;unlockAchievement('ng_plus');notify('🌑 NG+'+player.ngPlus+' НАЧИНАЕТСЯ!');loadLocation(0);
      }
    },4000);
  }
  SaveSystem.save();
}
function performDodge(){
  if(stairFallAnimation||player.isDodging||player.stamina<25) return;
  const moving = moveData.active && (Math.abs(moveData.x)>0.1 || Math.abs(moveData.y)>0.1);
  player.isDodging = true; player.dodgeTime = 0;
  player.stamina -= 25;
  if(player.lockedTarget && moving) player.dodgeType = 'quickstep';
  else if(moving) player.dodgeType = 'roll';
  else player.dodgeType = 'step';
  if(moving){
    const fwd = new THREE.Vector3(-Math.sin(cameraAngle),0,-Math.cos(cameraAngle));
    const right = new THREE.Vector3(Math.cos(cameraAngle),0,-Math.sin(cameraAngle));
    const dirX = right.x*moveData.x + fwd.x*(-moveData.y);
    const dirZ = right.z*moveData.x + fwd.z*(-moveData.y);
    player.dodgeAngle = Math.atan2(dirX,dirZ);
  } else {
    player.dodgeAngle = Math.atan2(Math.sin(cameraAngle+Math.PI),Math.cos(cameraAngle+Math.PI));
  }
  player.invincible = true;
  if(player.dodgeType==='roll') hunter.rotation.y=player.dodgeAngle;
  player.lastAction = player.dodgeType === 'step' ? 'backstep' : 'roll';
  player.lastActionTime = gameTime;
  let perfect = false;
  enemies.forEach(e=>{
    const d = hunter.position.distanceTo(e.mesh.position);
    if(d < e.attackRange + 1 && e.state === 'attack' && e.stateTime < 0.2 && e.stateTime > 0) perfect = true;
  });
  if(perfect){
    perfectDodgeFlash(); sfx('perfect');
    player.timeScale = 0.3;
    notify('PERFECT DODGE!');
    setTimeout(()=>player.timeScale = 1, 500);
    player.stamina = Math.min(player.maxStamina, player.stamina + 15);
    player.beastCharge = Math.min(100, player.beastCharge + 15);
    perfectDodgeCount++;
    if(perfectDodgeCount >= 10) unlockAchievement('perfect_dodge');
  }
  setTimeout(()=>player.invincible = false, player.dodgeType === 'quickstep' ? 500 : 700);
  rollSound();
  updateHUD();
}
function performGunshot(){
  if(stairFallAnimation||player.stamina<12) return;
  if(player.bullets <= 0){ notify('НЕТ ПАТРОНОВ'); return; }
  player.stamina -= 12; player.bullets--; updateHUD();
  startHunterRigAction('shoot',0.3);
  player.gunRecoil=0.22;
  sfx('gun');
  hunterParts.leftArm.rotation.x = -1.1;
  setTimeout(()=>hunterParts.leftArm.rotation.x = 0,300);
  const pAng = hunter.rotation.y;
  if(currentLocation===2 && !campaignProgress.castleChainShot && chainTarget){
    const dx=chainTarget.x-hunter.position.x,dz=chainTarget.z-hunter.position.z,d=Math.hypot(dx,dz);
    let diff=Math.atan2(dx,dz)-pAng;while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    if(d<24&&Math.abs(diff)<Math.PI/10){campaignProgress.castleChainShot=true;chainTarget.mesh.visible=false;if(chainTarget.gate)chainTarget.gate.visible=false;if(chainTarget.collider){wallColliders=wallColliders.filter(c=>c!==chainTarget.collider);rebuildWallCollisionGrid();}SaveSystem.save();sfx('break');notify('ЦЕПЬ ОБОРВАНА — ВОРОТА ЗАМКА ОТКРЫТЫ');player.screenShake=0.55;}
  }
  const bltBonus = player.stats.blt*0.8;
  enemies.forEach(enemy=>{
    if(Math.abs(enemy.mesh.position.y-hunter.position.y)>FLOOR_HEIGHT*0.4) return;
    const dx = enemy.mesh.position.x - hunter.position.x;
    const dz = enemy.mesh.position.z - hunter.position.z;
    const d = Math.sqrt(dx*dx+dz*dz);
    if(d<22){
      const ang = Math.atan2(dx,dz);
      let diff = ang-pAng;
      while(diff>Math.PI) diff -= Math.PI*2;
      while(diff<-Math.PI) diff += Math.PI*2;
      if(Math.abs(diff)<Math.PI/4){
        const timeSinceAttackStart = gameTime - enemy.lastAttackStartTime;
        const isParryWindow = enemy.canParry && enemy.state === 'attack'
          && timeSinceAttackStart >= 0 && timeSinceAttackStart < enemy.attackWindup;
        if(isParryWindow){
          enemy.stunned = 3.5;
          enemy._dealt = false;
          enemy.state = 'chase';
          enemy.stateTime = 0;
          enemy.lastAttackStartTime = -Infinity;
          enemy.lastAttack = gameTime;
          sfx('parry');
          notify('PARRY! VISCERAL ATTACK READY!');
          spawnDmg(enemy.mesh.position.clone().setY(enemy.mesh.position.y+(enemy.type==='boss'?4:1.5)), 0, 'crit');
          spawnParryIndicator(enemy);
          parryCount++;
          if(parryCount >= 10) unlockAchievement('parry_king');
          SaveSystem.save();
          return;
        }
        const dmg = 16+bltBonus+Math.random()*8;
        enemy.hp -= dmg;
        spawnDmg(enemy.mesh.position.clone().setY(enemy.mesh.position.y+(enemy.type==='boss'?4:1.5)),dmg,'normal');
        if(!enemy.detected){
          enemy.detected = true;
          if(enemy.type==='boss'){ $('bossWrap').classList.add('show'); $('bossName').textContent = enemy.name; }
        }
        if(enemy.type==='boss') $('bossFill').style.width = (enemy.hp/enemy.maxHp*100)+'%';
        if(enemy.hp<=0) killEnemy(enemy);
      }
    }
  });
}
function performTransformOrLock(){
  if(player.lockedTarget||getNearestLockOnTarget()){
    if(player.isAttacking||player.isDodging)return;
    toggleLockOn();
    return;
  }
  performTransform();
}
function performTransform(){
  if(player.isAttacking){ player.transformAttackBuffer = 1.0; return; }
  if(player.isDodging) return;
  player.weaponMode = 1-player.weaponMode;
  sfx('transform');
  const blade = hunterParts.weaponBlade;
  if(!blade) return;
  if(player.weaponMode===1){
    blade.geometry.dispose();
    blade.geometry = new THREE.BoxGeometry(0.1,1.6,0.06);
    blade.position.y = 1.15;
    $('btnTransform').classList.add('active');
    notify('ПИЛА-КОПЬЁ');
  } else {
    blade.geometry.dispose();
    blade.geometry = new THREE.BoxGeometry(0.22,1.2,0.07);
    blade.position.y = 0.95;
    $('btnTransform').classList.remove('active');
    notify('ПИЛА-ТЕСАК');
  }
}
function useVial(){
  if(player.vials<=0){ notify('НЕТ ЗЕЛИЙ'); return; }
  if(player.hp>=player.maxHp){ notify('ЗДОРОВЬЕ ПОЛНОЕ'); return; }
  player.vials--;
  startHunterRigAction('heal',0.6);
  player.hp = Math.min(player.maxHp,player.hp+45);
  updateHUD();
  sfx('vial'); notify('ЗЕЛЬЕ ИСПОЛЬЗОВАНО');
  spawnDmg(hunter.position.clone().setY(hunter.position.y+2),45,'heal');
}
function getNearestLockOnTarget(){
  if(!hunter) return null;
  let nearest=null, nearD=25;
  enemies.forEach(e=>{
    if(!e||!e.mesh||Math.abs(e.mesh.position.y-hunter.position.y)>FLOOR_HEIGHT*0.4) return;
    const d=hunter.position.distanceTo(e.mesh.position);
    if(d<nearD){ nearD=d; nearest=e; }
  });
  return nearest;
}
function updateLockOnButton(){
  const button=$('btnTransform');
  if(!button) return;
  if(gameMode!==GameMode.PLAYING||!hunter){
    button.classList.remove('target-available','locked');
    button.setAttribute('aria-pressed','false');
    button.setAttribute('aria-label','Смена формы оружия');
    return;
  }
  const target=player.lockedTarget;
  const targetInRange=!!(target&&target.mesh&&enemies.includes(target)&&
    Math.abs(target.mesh.position.y-hunter.position.y)<=FLOOR_HEIGHT*0.4&&
    hunter.position.distanceTo(target.mesh.position)<25);
  if(target&&!targetInRange) player.lockedTarget=null;
  const hasTarget=!!getNearestLockOnTarget();
  const locked=!!player.lockedTarget;
  button.classList.toggle('target-available',hasTarget);
  button.classList.toggle('locked',locked);
  button.setAttribute('aria-pressed',locked?'true':'false');
  button.setAttribute('aria-label',hasTarget?'Захват цели':'Смена формы оружия');
}
function toggleLockOn(){
  if(player.lockedTarget){
    player.lockedTarget = null;
    notify('🎯 ЗАХВАТ СНЯТ');
    updateLockOnButton();
    return;
  }
  const nearest=getNearestLockOnTarget();
  if(nearest){
    player.lockedTarget = nearest;
    hunter.rotation.y = Math.atan2(nearest.mesh.position.x-hunter.position.x, nearest.mesh.position.z-hunter.position.z);
    notify('🎯 ЗАХВАТ ЦЕЛИ');
    sfx('alert');
  } else {
    notify('НЕТ ЦЕЛЕЙ ПОБЛИЗОСТИ');
  }
  updateLockOnButton();
}
function checkLanternProximity(){
  nearbyLantern = null;
  let minD = 3.5;
  lanterns.forEach(l=>{
    const d = hunter.position.distanceTo(l.mesh.position);
    if(d < minD){ minD = d; nearbyLantern = l; }
  });
  const prompt = $('lanternPrompt');
  const menuOpen = $('lanternMenu').classList.contains('active');
  const settingsOpen = $('settingsMenu').classList.contains('active');
  if(nearbyLantern && !player.isAttacking && !player.isDodging && !menuOpen && !settingsOpen && gameMode === GameMode.PLAYING){
    prompt.classList.add('show');
  } else prompt.classList.remove('show');
}
function checkDollProximity(){
  nearbyDoll = false;
  if(!doll || !hunter) return;
  const d = hunter.position.distanceTo(doll.position);
  if(d < 3.5) nearbyDoll = true;
  const prompt = $('dollPrompt');
  const menuOpen = $('weaponMenu').classList.contains('active');
  if(nearbyDoll && !menuOpen && gameMode === GameMode.DREAM){
    prompt.classList.add('show');
  } else prompt.classList.remove('show');
}

/* ====================================================================
   АНИМАЦИЯ ВРАГОВ — ЛАПЫ ПАУКА/ЗВЕРЯ, РУКИ ОХОТНИКА
   ==================================================================== */
