function animateEnemyLimbs(e, dt, time){
  if(!e.legs || e.legs.length === 0) return;
  const isWalking = (e.state === 'chase' || e.state === 'returning');
  const isAttacking = (e.state === 'attack');

  if(e.type === 'spider'){
    /* --- ПОХОДКА ПАУКА (8 лап, две группы по 4) --- */
    const animTime = time * 16 + (e.animPhase||0);
    e.legs.forEach((leg, index) => {
      const gaitOffset = (index % 2 === 0) ? 0 : Math.PI;
      if(isWalking){
        const phase = Math.sin(animTime + gaitOffset);
        leg.hip.rotation.y = phase * 0.55;
        leg.knee.rotation.z = leg.side * (-Math.PI / 2.6 + Math.max(0, phase) * 0.7);
      } else if(isAttacking){
        const atk = Math.sin(time * 20 + gaitOffset);
        leg.hip.rotation.y = atk * 0.3;
        leg.knee.rotation.z = leg.side * (-Math.PI / 2.6 + 0.4);
      } else {
        const idleTime = time * 2;
        leg.hip.rotation.y = Math.sin(idleTime + index) * 0.12;
        leg.knee.rotation.z = leg.side * (-Math.PI / 2.6 + Math.sin(idleTime * 1.5 + index) * 0.08);
      }
    });
  } else if(e.type === 'beast'){
    /* --- ПОХОДКА ЗВЕРЯ (4 лапы, трот: перед+зад крест-накрест) --- */
    const animTime = time * 10 + (e.animPhase||0);
    e.legs.forEach((leg, index) => {
      const isFront = leg.isFront;
      const gaitOffset = (leg.side > 0) === (isFront) ? 0 : Math.PI;
      if(isWalking){
        const phase = Math.sin(animTime + gaitOffset);
        leg.hip.rotation.x = phase * 0.55;
        leg.knee.rotation.x = Math.max(0, phase) * 0.6;
      } else if(isAttacking){
        const atk = Math.sin(time * 18 + gaitOffset);
        leg.hip.rotation.x = atk * 0.3;
        leg.knee.rotation.x = 0.3 + atk * 0.2;
      } else {
        leg.hip.rotation.x *= 0.9;
        leg.knee.rotation.x *= 0.9;
      }
    });
  } else if(e.type === 'hunter'){
    /* --- РУКИ ОХОТНИКА --- */
    const animTime = time * 8 + (e.animPhase||0);
    e.legs.forEach((leg, index) => {
      const isRight = leg.side > 0;
      const gaitOffset = isRight ? 0 : Math.PI;
      if(isWalking){
        const phase = Math.sin(animTime + gaitOffset);
        leg.hip.rotation.x = phase * 0.35;
        leg.knee.rotation.x = Math.max(0, phase) * 0.3;
      } else if(isAttacking){
        const atk = Math.sin(time * 12);
        if(isRight){
          leg.hip.rotation.x = -Math.PI/3 - Math.max(0, atk) * 0.8;
          leg.knee.rotation.x = Math.max(0, atk) * 0.5;
        } else {
          leg.hip.rotation.x = atk * 0.2;
          leg.knee.rotation.x = atk * 0.2;
        }
      } else {
        leg.hip.rotation.x = Math.sin(animTime * 0.5 + gaitOffset) * 0.08;
        leg.knee.rotation.x = Math.sin(animTime * 0.5 + gaitOffset) * 0.05;
      }
    });
  } else if(e.type === 'boss'){
    /* --- ЛАПЫ БОССА (4 лапы, тяжелая поступь) --- */
    const animTime = time * 6 + (e.animPhase||0);
    e.legs.forEach((leg, index) => {
      const isFront = leg.isFront;
      const gaitOffset = (leg.side > 0) === (isFront) ? 0 : Math.PI;
      if(isWalking){
        const phase = Math.sin(animTime + gaitOffset);
        leg.hip.rotation.x = phase * 0.25;
        leg.knee.rotation.x = Math.max(0, phase) * 0.3;
      } else {
        leg.hip.rotation.x *= 0.95;
        leg.knee.rotation.x *= 0.95;
      }
    });
  }
}

function updateEnemies(dt,time){
  enemies.slice().forEach(e=>{
    e.stateTime += dt;
    updateEnemyVisual(e, dt, time);
    if(e.burning > 0){
      e.burning -= dt;
      e.hp -= dt * 10;
      if(Math.random() < 0.1) spawnBlood(e.mesh.position.clone().setY(e.floorY+1.5), 3, 0xdd3300);
      if(e.hp <= 0){ killEnemy(e); return; }
    }
    if(e.stunned>0){
      e.stunned -= dt;
      e.mesh.position.y = e.floorY + Math.sin(time*15)*0.15;
      animateEnemyLimbs(e, dt, time);
      return;
    }
    const dx = hunter.position.x - e.mesh.position.x;
    const dz = hunter.position.z - e.mesh.position.z;
    const vertical = hunter.position.y-e.floorY;
    const d = Math.sqrt(dx*dx+dz*dz+vertical*vertical);
    const distFromHome = Math.sqrt((e.mesh.position.x-e.homeX)**2 + (e.mesh.position.z-e.homeZ)**2);
    const angleToHunter = Math.atan2(dx,dz);
    const enemyAngle = e.mesh.rotation.y;
    let angDiff = angleToHunter - enemyAngle;
    while(angDiff>Math.PI) angDiff -= Math.PI*2;
    while(angDiff<-Math.PI) angDiff += Math.PI*2;
    const canDetect = Math.abs(vertical)<FLOOR_HEIGHT*0.4 && d < e.detectionRange && Math.abs(angDiff) < Math.PI/2.5;
    if(e.ceilingAmbush&&!e.ambushTriggered){
      e.mesh.position.y=e.floorY+8;
      if(Math.hypot(dx,dz)<e.ambushRange){e.ambushTriggered=true;e.ambushDrop=0.45;e.state='alert';e.detected=true;notify('ПАУК ПАДАЕТ С ПОТОЛКА!');}
      else return;
    }
    if(e.ambushDrop>0){e.ambushDrop=Math.max(0,e.ambushDrop-dt);e.mesh.position.y=e.floorY+1+7*(e.ambushDrop/0.45);return;}
    switch(e.state){
      case 'idle':
        e.mesh.position.y = e.floorY + Math.sin(time*2+e.homeX)*0.05;
        if(canDetect){
          e.state = 'alert'; e.stateTime = 0; e.detected = true;
          if(e.type==='boss'){
            $('bossWrap').classList.add('show');
            $('bossName').textContent = e.name;
            notify(e.name+' ОБНАРУЖИЛ ВАС!');
          }
        }
        break;
      case 'alert':
        e.mesh.rotation.y = lerp(e.mesh.rotation.y,angleToHunter,0.1);
        if(e.stateTime > 0.4){ e.state = 'chase'; e.stateTime = 0; }
        break;
      case 'chase':
        if(d>Math.max(1.2,e.radius*0.9)){
          const spd = e.speed*(e.phase2?1.5:1);
          const nx = e.mesh.position.x + (dx/d)*spd;
          const nz = e.mesh.position.z + (dz/d)*spd;
          if(!checkWall(nx,e.mesh.position.z,e.radius,e.floorY,e.type==='boss'?9:5)) e.mesh.position.x = nx;
          if(!checkWall(e.mesh.position.x,nz,e.radius,e.floorY,e.type==='boss'?9:5)) e.mesh.position.z = nz;
          e.mesh.rotation.y = Math.atan2(dx,dz);
          if(e.type==='spider') e.mesh.position.y = e.floorY + Math.abs(Math.sin(time*14))*0.2;
          else if(e.type==='boss') e.mesh.position.y = e.floorY + Math.sin(time*2.8)*0.3;
          else e.mesh.position.y = e.floorY + Math.sin(time*5)*0.2;
        }
        if(d < e.attackRange && time - e.lastAttack > e.cooldown){
          e.state = 'attack'; e.stateTime = 0; e.lastAttack = time;
          e.lastAttackStartTime = time;
          sfx('enemyAttack');
        }
        if(d > e.detectionRange*1.5){ e.state = 'returning'; e.stateTime = 0; }
        break;
      case 'attack':
        if(e.stateTime < e.attackWindup){
          if(e.mesh.children[0] && e.mesh.children[0].material)
            e.mesh.children[0].material.emissive = new THREE.Color(0x660000);
          if(e.type==='boss' && e.material) e.material.emissive.setHex(0x440000);
        } else if(e.stateTime < e.attackWindup + 0.15 && !e._dealt){
          e._dealt = true;
          if(d < e.attackRange+0.5 && !player.invincible && !player.isDodging){
            const dmg = e.damage*(e.phase2?1.4:1);
            player.hp = Math.max(0,player.hp-dmg);
            addRally(dmg * 0.4);
            updateHUD();
            damageFlash();
            player.screenShake = Math.max(player.screenShake,0.3);
            sfx('hit');
            if(!player.beastMode && player.hp / player.maxHp < 0.3) {
              player.beastCharge = Math.min(100, player.beastCharge + 25);
              if(player.beastCharge >= 100) activateBeastMode();
            }
            player.frenzy += 5;
            if(player.frenzy >= 100){ player.frenzy = 0; startFrenzy(); }
            if(player.hp<=0 && !player.isDead) die();
          }
        } else if(e.stateTime > e.attackWindup + 0.15){
          if(e.mesh.children[0] && e.mesh.children[0].material)
            e.mesh.children[0].material.emissive = new THREE.Color(0x000000);
          if(e.type==='boss' && e.material)
            e.material.emissive.setHex(e.phase2?0x220000:0x000000);
          if(e.stateTime > e.attackWindup + 0.5){
            e._dealt = false;
            e.state = 'chase'; e.stateTime = 0;
          }
        }
        break;
      case 'returning':
        e.mesh.position.y=e.floorY;
        if(distFromHome > 1){
          const hdx = e.homeX-e.mesh.position.x;
          const hdz = e.homeZ-e.mesh.position.z;
          const hd = Math.sqrt(hdx*hdx+hdz*hdz);
          e.mesh.position.x += (hdx/hd)*e.speed*0.7;
          e.mesh.position.z += (hdz/hd)*e.speed*0.7;
          e.mesh.rotation.y = Math.atan2(hdx,hdz);
        } else {
          e.state = 'idle'; e.stateTime = 0; e.detected = false;
          if(e.type==='boss') $('bossWrap').classList.remove('show');
        }
        if(canDetect){ e.state = 'alert'; e.stateTime = 0; }
        break;
    }
    animateEnemyLimbs(e, dt, time);
    if(e.hpBar){
      const pct = Math.max(0,e.hp/e.maxHp);
      e.hpBar.fill.scale.x = pct;
      e.hpBar.fill.position.x = -(1-pct)*e.hpBar.baseSize/2;
      e.hpBar.bg.quaternion.copy(camera.quaternion);
      e.hpBar.fill.quaternion.copy(camera.quaternion);
      const visible = e.detected && e.hp < e.maxHp;
      e.hpBar.bg.visible = visible;
      e.hpBar.fill.visible = visible;
    }
  });
  chests.forEach(c=>{
    if(c.opened) return;
    const d = hunter.position.distanceTo(c.mesh.position);
    if(d<2.4){
      c.opened = true;
      sfx('chest');
      const loot = c.loot;
      if(loot.type==='vial'){ player.vials += loot.amount; notify('+'+loot.amount+' ЗЕЛИЙ'); }
      else if(loot.type==='bullet'){ player.bullets += loot.amount; notify('+'+loot.amount+' ПАТРОНОВ'); }
      else if(loot.type==='shards'){ player.bloodShards += loot.amount; notify('+'+loot.amount+' 💎 ОСКОЛКОВ'); sfx('shard'); }
      else if(loot.type==='gem'){ player.availableGems.push(loot.gem); notify('💎 ПОЛУЧЕН САМОЦВЕТ: ' + loot.gem.name); sfx('gem'); }
      else if(loot.type==='tool'){ player.tools[loot.tool] += loot.amount; notify('+'+loot.amount+' ' + loot.tool.toUpperCase()); }
      else { player.echoes += loot.amount*100; notify('+'+(loot.amount*100)+' ОТГОЛОСКОВ'); }
      if(c.uniqueRewardKey){campaignProgress.brokenSecrets[c.uniqueRewardKey]=true;SaveSystem.save();}
      updateHUD();
      const lid = c.mesh.children[1];
      lid.rotation.x = -Math.PI/2; lid.position.y = 0.95;
    }
  });
}
let wallCollisionGrid=new Map();
const wallCollisionCandidates=new Set();
const WALL_GRID_SIZE=18;
function wallGridKey(x,z){return Math.floor(x/WALL_GRID_SIZE)+','+Math.floor(z/WALL_GRID_SIZE);}
function rebuildWallCollisionGrid(){
  const grid=new Map();
  for(const wall of wallColliders){
    const x0=Math.floor(wall.minX/WALL_GRID_SIZE),x1=Math.floor(wall.maxX/WALL_GRID_SIZE);
    const z0=Math.floor(wall.minZ/WALL_GRID_SIZE),z1=Math.floor(wall.maxZ/WALL_GRID_SIZE);
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
      const key=wallGridKey(x*WALL_GRID_SIZE+WALL_GRID_SIZE/2,z*WALL_GRID_SIZE+WALL_GRID_SIZE/2);
      if(!grid.has(key))grid.set(key,[]);grid.get(key).push(wall);
    }
  }
  wallCollisionGrid=grid;
}
function checkWall(nx,nz,radius=0.55,entityY=hunter?hunter.position.y:0,bodyHeight=2.2){
  const candidates=wallCollisionCandidates;
  candidates.clear();
  if(wallCollisionGrid.size){
    for(let x=Math.floor((nx-radius)/WALL_GRID_SIZE);x<=Math.floor((nx+radius)/WALL_GRID_SIZE);x++)
      for(let z=Math.floor((nz-radius)/WALL_GRID_SIZE);z<=Math.floor((nz+radius)/WALL_GRID_SIZE);z++){
        const bucket=wallCollisionGrid.get(wallGridKey(x*WALL_GRID_SIZE+WALL_GRID_SIZE/2,z*WALL_GRID_SIZE+WALL_GRID_SIZE/2));
        if(bucket)bucket.forEach(w=>candidates.add(w));
      }
  } else wallColliders.forEach(w=>candidates.add(w));
  for(const w of candidates){
    if(entityY+bodyHeight<w.minY || entityY>w.maxY) continue;
    if(w.stairGuard&&w.stairRun>0){
      const along=Math.max(0,Math.min(1,(nz-w.stairZ)/w.stairRun));
      const stairSurface=w.stairLowerY+(w.stairUpperY-w.stairLowerY)*along;
      if(entityY+bodyHeight<stairSurface-0.35) continue;
    }
    if(nx+radius>w.minX && nx-radius<w.maxX && nz+radius>w.minZ && nz-radius<w.maxZ){candidates.clear();return true;}
  }
  candidates.clear();
  return false;
}
function die(options={}){
  const deathLocation=currentLocation;
  const checkpoint=options.respawnAtCheckpoint&&player.respawnPoint&&
    (player.respawnPoint.loc===undefined||player.respawnPoint.loc===currentLocation)
    ?{...player.respawnPoint}:null;
  player.isDead = true;
  gameMode = GameMode.DEAD;
  player.deaths++;
  const lostEchoes = Math.floor(player.echoes * 0.7);
  sfx('roar');
  $('deathText').classList.add('show');
  $('deathOverlay').classList.add('show');
  if(lostEchoes > 0){
    const stain=options.bloodStainPosition;
    createBloodStain(stain?stain.x:hunter.position.x,stain?stain.z:hunter.position.z,lostEchoes,currentLocation,stain?stain.y:hunter.position.y);
  }
  setTimeout(()=>{
    player.hp = player.maxHp;
    player.stamina = player.maxStamina;
    player.echoes = Math.floor(player.echoes*0.3);
    player.rallyHp = 0; player.rallyMaxHp = 0;
    player.bullets = player.maxBullets;
    player.beastMode = false; player.beastTimer = 0; player.beastCharge = 0;
    player.frenzy = 0; player.frenzyActive = false;
    player.weaponDurability = player.maxWeaponDurability;
    $('deathText').classList.remove('show');
    $('deathOverlay').classList.remove('show');
    player.isDead = false;
    if(options.respawnAtCheckpoint&&checkpoint&&currentLocation===deathLocation&&hunter){
      hunter.position.set(checkpoint.x,checkpoint.y||0,checkpoint.z);
      hunter.rotation.x=0;hunter.rotation.y=Math.PI;
      currentFloorIndex=Number.isInteger(checkpoint.floor)?checkpoint.floor:0;
      cameraAngle=0;
      if(camera){camera.position.set(checkpoint.x,checkpoint.y+cameraHeight,checkpoint.z+cameraDistance);camera.lookAt(checkpoint.x,checkpoint.y+Math.max(1.5,hunterVisualHeight*0.55),checkpoint.z);}
      player.isAttacking=false;player.isDodging=false;player.isCharging=false;player.invincible=false;player.currentAttack=null;
      player.attackBuffer=false;player.dodgeBuffer=false;player.lockedTarget=null;
      if(typeof moveData.cancel==='function')moveData.cancel();else{moveData.active=false;moveData.x=0;moveData.y=0;}
      gameMode=GameMode.PLAYING;lastRoomNotice='';updateStageLocationLabel(true);updateHUD();SaveSystem.save();
      return;
    }
    loadDream();
    updateHUD();
    SaveSystem.save();
  },3500);
}
function dtGlobal(){
  const n = performance.now();
  const d = _lastRainTime ? (n - _lastRainTime)/1000 : 0.016;
  _lastRainTime = n;
  return Math.min(d, 0.1);
}
function updateRain(dt){
  if(!window._rainMesh) return;
  const rainGeo = window._rainMesh.geometry;
  const pos = rainGeo.attributes.position;
  const centerX=hunter?hunter.position.x:0,centerZ=hunter?hunter.position.z:0;
  const previousCenter=window._rainCenter||{x:centerX,z:centerZ};
  const shiftX=centerX-previousCenter.x,shiftZ=centerZ-previousCenter.z;
  for(let i=0;i<rainDrops.length;i++){
    const k = i*6;
    pos.array[k]+=shiftX;pos.array[k+2]+=shiftZ;pos.array[k+3]+=shiftX;pos.array[k+5]+=shiftZ;
    const fall = rainDrops[i].velocity * dt * 60;
    pos.array[k+1] += fall;
    pos.array[k+4] += fall;
    if(pos.array[k+4] < -0.5){
      const x = centerX+(Math.random()-0.5) * 100;
      const z = centerZ+(Math.random()-0.5) * 100;
      const y = 50 + Math.random()*4;
      pos.array[k] = x; pos.array[k+1] = y; pos.array[k+2] = z;
      pos.array[k+3] = x+0.08; pos.array[k+4] = y-rainDrops[i].length; pos.array[k+5] = z+0.03;
    }
  }
  window._rainCenter={x:centerX,z:centerZ};
  rainGeo.attributes.position.needsUpdate = true;
}
let _rafStarted = false;
function animate(){ if(_rafStarted) return; _rafStarted = true; loop(); }
function loop(){
  requestAnimationFrame(loop);
  const rawTime = Date.now()*0.001;
  if(!renderer || !scene || !camera) return;
  updateGraphicsAutoQuality();
  updateAltarFire(rawTime);
  if(gameMode!==GameMode.PLAYING) updateLockOnButton();

  if(gameMode === GameMode.MENU){
    menuOrbitTime += 0.003;
    const r = Math.max(6,hunterVisualHeight*1.5);
    camera.position.x = Math.sin(menuOrbitTime) * r;
    camera.position.z = Math.cos(menuOrbitTime) * r;
    camera.position.y = Math.max(3.2,hunterVisualHeight*0.85) + Math.sin(menuOrbitTime*0.7) * 0.5;
    camera.lookAt(0, Math.max(1.4,hunterVisualHeight*0.55), 0);
    if(hunter) hunter.rotation.y = Math.PI + menuOrbitTime * 0.3;
    if(hunterVisual) hunterVisual.position.y = hunterVisualBaseY + Math.sin(rawTime*1.7)*0.025;
    player.walkTime += 0.016*0.9; poseHunterModel('idle',rawTime); if(hunterMixer) hunterMixer.update(0.016);
    updateHunterRig(0.016,0);
    updateRain(dtGlobal());
    renderGameFrame();
    return;
  }
  if(gameMode === GameMode.PAUSED){
    renderGameFrame();
    return;
  }
  let dt = 0.016 * player.timeScale;
  if(player.hitStop > 0){ player.hitStop -= 0.016; dt *= 0.15; }
  gameTime += dt;
  if(player.rallyTimer > 0){
    player.rallyTimer -= dt;
    if(player.rallyTimer <= 0){ player.rallyHp = 0; player.rallyMaxHp = 0; updateHUD(); }
  }
  if(player.beastMode){
    player.beastTimer -= dt;
    if(player.beastTimer <= 0){ player.beastMode = false; notify('BEAST MODE ENDED'); updateHUD(); }
  }
  if(player.frenzyActive){
    player.frenzyPulseTimer -= dt;
    if(player.frenzyPulseTimer <= 0){ player.frenzyActive = false; updateHUD(); }
  }
  if(player.firePaperTimer > 0){
    player.firePaperTimer -= dt;
    if(player.firePaperTimer <= 0) updateHUD();
  }
  if(player.comboTimer > 0){
    player.comboTimer -= dt;
    if(player.comboTimer <= 0){ player.comboCount = 0; updateCombo(); }
  }
  if(moveData.active){
    const mag = Math.sqrt(moveData.x**2 + moveData.y**2);
    if(mag > 0.75) player.sprintTime += dt; else player.sprintTime = 0;
  } else player.sprintTime = 0;

  if(gameMode === GameMode.DREAM){
    player.walkTime += moveData.active ? dt*5.2 : dt*0.9;
    poseHunterModel(moveData.active?'walk':'idle',rawTime);
    if(hunterMixer) hunterMixer.update(dt);
    const angle = rawTime*0.15;
    cameraAngle = angle;
    const camX = hunter.position.x + Math.sin(angle)*8;
    const camZ = hunter.position.z + Math.cos(angle)*8;
    camera.position.x = lerp(camera.position.x,camX,0.05);
    camera.position.z = lerp(camera.position.z,camZ,0.05);
    camera.position.y = lerp(camera.position.y,hunter.position.y+Math.max(4.5,hunterVisualHeight*0.9),0.05);
    camera.lookAt(hunter.position.x,hunter.position.y+Math.max(1.5,hunterVisualHeight*0.55),hunter.position.z);
    const dreamRigStartX=hunter.position.x,dreamRigStartZ=hunter.position.z;
    if(moveData.active){
      const speed = 0.1;
      const fwd = new THREE.Vector3(-Math.sin(cameraAngle),0,-Math.cos(cameraAngle));
      const right = new THREE.Vector3(Math.cos(cameraAngle),0,-Math.sin(cameraAngle));
      const mx = (right.x*moveData.x + fwd.x*(-moveData.y))*speed;
      const mz = (right.z*moveData.x + fwd.z*(-moveData.y))*speed;
      hunter.position.x = Math.max(-22,Math.min(22,hunter.position.x+mx));
      hunter.position.z = Math.max(-22,Math.min(22,hunter.position.z+mz));
      hunter.position.y=0;
      hunter.rotation.y = Math.atan2(mx,mz);
    }
    updateHunterRig(dt,dt>0?Math.hypot(hunter.position.x-dreamRigStartX,hunter.position.z-dreamRigStartZ)/dt:0);
    if(doll) doll.position.y = Math.sin(rawTime)*0.05;
    checkDollProximity();
    updateRain(dt);
    renderGameFrame();
    return;
  }
  if(gameMode !== GameMode.PLAYING){ renderGameFrame(); return; }
  if(player.isDead){ renderGameFrame(); return; }
  const hunterRigStartX=hunter.position.x,hunterRigStartZ=hunter.position.z;
  if(hunterVisual) hunterVisual.position.y = lerp(hunterVisual.position.y,hunterVisualBaseY,0.18);
  if(hunterMixer) hunterMixer.update(dt);
  if(!player.isAttacking && !player.isDodging && player.stamina < player.maxStamina){
    player.stamina = Math.min(player.maxStamina,player.stamina+0.9);
    updateHUD();
  }
  if(player.lockedTarget && enemies.includes(player.lockedTarget)){
    const tp = player.lockedTarget.mesh.position;
    const dx = tp.x - hunter.position.x;
    const dz = tp.z - hunter.position.z;
    const targetAngle = Math.atan2(dx,dz);
    let diff = targetAngle - hunter.rotation.y;
    while(diff>Math.PI) diff -= Math.PI*2;
    while(diff<-Math.PI) diff += Math.PI*2;
    if(!player.isAttacking && !player.isDodging) hunter.rotation.y += diff*0.2;
  } else if(player.lockedTarget){
    player.lockedTarget = null;
  }
  if(stairFallAnimation){
    updateStairFallAnimation(dt);
  } else if(moveData.active && !player.isAttacking && !player.isDodging){
    const previousZ=hunter.position.z;
    const mag = Math.sqrt(moveData.x**2 + moveData.y**2);
    const sprintMult = mag>0.75?1.7:1.0;
    let speed = 0.14*sprintMult;
    let speedGemBonus = 1.0;
    player.bloodGems.forEach(gem => { if(gem && gem.id === 'speed') speedGemBonus = 1.3; });
    speed *= speedGemBonus;
    const fwd = new THREE.Vector3(-Math.sin(cameraAngle),0,-Math.cos(cameraAngle));
    const right = new THREE.Vector3(Math.cos(cameraAngle),0,-Math.sin(cameraAngle));
    const mx = (right.x*moveData.x + fwd.x*(-moveData.y))*speed;
    const mz = (right.z*moveData.x + fwd.z*(-moveData.y))*speed;
    const nx = hunter.position.x+mx;
    const nz = hunter.position.z+mz;
    if(!checkWall(nx,hunter.position.z,0.6,hunter.position.y,Math.min(8.6,hunterVisualHeight))) hunter.position.x = nx;
    if(!checkWall(hunter.position.x,nz,0.6,hunter.position.y,Math.min(8.6,hunterVisualHeight))) hunter.position.z = nz;
    updateHunterFloor(previousZ);
    updateStageLocationLabel(false);
    if(Math.hypot(mx,mz)>0.0001 && !player.lockedTarget) hunter.rotation.y = Math.atan2(mx,mz);
    player.walkTime += dt*(sprintMult>1.5?7.0:5.2);
    const wc = Math.sin(player.walkTime);
    if(hunterVisual){
      hunterVisual.position.y = lerp(hunterVisual.position.y,hunterVisualBaseY + Math.abs(wc)*0.022,0.16);
      hunterVisual.rotation.x=lerp(hunterVisual.rotation.x,0.008+Math.abs(wc)*0.006,0.14);
    }
    hunterParts.leftLeg.rotation.x = wc*0.2*sprintMult;
    hunterParts.rightLeg.rotation.x = -wc*0.2*sprintMult;
    hunterParts.rightArm.rotation.x = -0.35 + wc*0.12*sprintMult;
    hunterParts.coatBack.rotation.x = 0.3 + wc*0.1*sprintMult;
    poseHunterModel(sprintMult>1.5?'run':'walk',rawTime);
    footstep(sprintMult > 1.5);
  } else if(player.isDodging){
    player.dodgeTime += dt;
    const dodgeDuration = player.dodgeType === 'quickstep' ? 0.4 : (player.dodgeType === 'roll' ? 0.7 : 0.5);
    if(player.dodgeTime < dodgeDuration){
      const previousZ=hunter.position.z;
      let speed = 0.3;
      if(player.dodgeType === 'roll') speed = 0.4;
      else if(player.dodgeType === 'quickstep') speed = 0.45;
      const nx = hunter.position.x + Math.sin(player.dodgeAngle)*speed;
      const nz = hunter.position.z + Math.cos(player.dodgeAngle)*speed;
      if(!checkWall(nx,nz,0.65,hunter.position.y,Math.min(8.6,hunterVisualHeight))){ hunter.position.x = nx; hunter.position.z = nz; updateHunterFloor(previousZ); updateStageLocationLabel(false); }
      const progress=Math.min(1,player.dodgeTime/dodgeDuration);
      hunter.rotation.x=0;
      if(!hunterRig){
        if(player.dodgeType==='roll') hunterMotionPivot.rotation.x=-Math.PI*2*progress;
        else if(player.dodgeType==='quickstep') hunterMotionPivot.rotation.z=Math.sin(progress*Math.PI)*(moveData.x<0?-0.14:0.14);
        else hunterMotionPivot.rotation.z=Math.sin(progress*Math.PI)*0.08;
      }
      poseHunterModel('dodge',rawTime);
    } else {
      player.isDodging = false;
      hunter.rotation.x = 0;
      if(hunterMotionPivot) hunterMotionPivot.rotation.set(0,0,0);
      if(player.attackBuffer){ player.attackBuffer = false; player.dodgeBuffer = true; setTimeout(()=>performAttack(0), 50); }
    }
  } else if(player.isAttacking){
    player.attackTime += dt;
    const t = player.attackTime;
    let attackSpeedMult = 1.0;
    player.bloodGems.forEach(gem => { if(gem && gem.id === 'speed') attackSpeedMult = 1.3; });
    const adjustedT = t * attackSpeedMult;
    const attack=player.currentAttack;
    if(attack && adjustedT>=0.25 && adjustedT<0.55 && attack.lungeRemaining>0){
      const step=Math.min(attack.lungeRemaining,attack.lungeDistance*dt*attackSpeedMult/0.30);
      const oldX=hunter.position.x,oldZ=hunter.position.z;
      const nx=oldX+Math.sin(attack.facingAngle)*step;
      const nz=oldZ+Math.cos(attack.facingAngle)*step;
      if(!checkWall(nx,oldZ,0.65,hunter.position.y,Math.min(8.6,hunterVisualHeight))) hunter.position.x=nx;
      if(!checkWall(hunter.position.x,nz,0.65,hunter.position.y,Math.min(8.6,hunterVisualHeight))) hunter.position.z=nz;
      const moved=Math.hypot(hunter.position.x-oldX,hunter.position.z-oldZ);
      attack.lungeRemaining=Math.max(0,attack.lungeRemaining-moved);
      if(moved>0){ updateHunterFloor(oldZ); updateStageLocationLabel(false); }
    }
    if(adjustedT < 0.25){
      const p = adjustedT/0.25;
      hunterParts.torso.rotation.y = lerp(0,0.10,p);
      poseHunterModel('attack',rawTime,t);
      if(hunterVisual){ hunterVisual.rotation.x=lerp(hunterVisual.rotation.x,0.08,0.2); hunterVisual.rotation.z=lerp(hunterVisual.rotation.z,-0.045,0.18); }
    } else if(adjustedT < 0.55){
      const p = (adjustedT-0.25)/0.3;
      hunterParts.torso.rotation.y = lerp(0.10,-0.10,p);
      poseHunterModel('attack',rawTime,t);
      if(hunterVisual){ hunterVisual.rotation.x=lerp(hunterVisual.rotation.x,-0.11,0.25); hunterVisual.rotation.z=lerp(hunterVisual.rotation.z,(p-0.5)*0.08,0.22); }
      if(p>0.1 && p<0.85) resolveAttackHits();
    } else if(adjustedT < 0.85){
      const p = (adjustedT-0.55)/0.3;
      hunterParts.torso.rotation.y = lerp(-0.10,0,p);
      poseHunterModel('attack',rawTime,t);
      if(hunterVisual){ hunterVisual.rotation.x=lerp(hunterVisual.rotation.x,0.025,0.16); hunterVisual.rotation.z=lerp(hunterVisual.rotation.z,0,0.16); }
    } else {
      player.isAttacking = false;
      player.currentAttack = null;
      hunterParts.rightArm.rotation.x = -0.35;
      hunterParts.leftArm.rotation.x = -0.35;
      hunterParts.torso.rotation.y = 0;
      if(player.attackBuffer){ player.attackBuffer = false; performAttack(0); }
    }
    if(player.currentAttack) poseFallbackHunterAttack(t);
  } else {
    player.walkTime += dt*0.9;
    const b = Math.sin(player.walkTime)*0.04;
    if(hunterVisual){
      hunterVisual.position.y=lerp(hunterVisual.position.y,hunterVisualBaseY+Math.sin(player.walkTime*0.7)*0.018,0.08);
      hunterVisual.rotation.x=lerp(hunterVisual.rotation.x,0,0.12);
    }
    hunterParts.torso.position.y = 1.25+b;
    hunterParts.leftLeg.rotation.x = lerp(hunterParts.leftLeg.rotation.x,0,0.18);
    hunterParts.rightLeg.rotation.x = lerp(hunterParts.rightLeg.rotation.x,0,0.18);
    hunterParts.rightArm.rotation.x = lerp(hunterParts.rightArm.rotation.x,-0.35,0.18);
    hunterParts.leftArm.rotation.x = lerp(hunterParts.leftArm.rotation.x,-0.35,0.18);
    hunterParts.coatBack.rotation.x = lerp(hunterParts.coatBack.rotation.x,0.3,0.18);
    poseHunterModel('idle',rawTime);
  }
  const rigSpeed=dt>0?Math.hypot(hunter.position.x-hunterRigStartX,hunter.position.z-hunterRigStartZ)/dt:0;
  updateHunterRig(dt,rigSpeed);
  player.gunRecoil=Math.max(0,player.gunRecoil-dt);
  updateWallTransparency();
  updateEnemies(dt,rawTime);
  updateLockOnButton();
  updateAmbientCreatures(rawTime);
  updateCathedralGroundTierAtmosphere(rawTime);
  updateStageMechanics(dt);
  checkLanternProximity();
  checkWorldInteractableProximity();
  checkBloodStainPickup();
  if(!window._minimapUpdateAt||rawTime-window._minimapUpdateAt>0.12){updateMinimap();window._minimapUpdateAt=rawTime;}
  for(let i = bloodParticles.length-1;i>=0;i--){
    const bp = bloodParticles[i];
    bp.life -= dt;
    if(bp.life<=0){ scene.remove(bp.mesh); disposeTransientEffectResources(bp.mesh); bloodParticles.splice(i,1); continue; }
    const pos = bp.mesh.geometry.attributes.position.array;
    for(let j=0;j<bp.velocities.length;j++){
      bp.velocities[j].y -= 0.025;
      pos[j*3] += bp.velocities[j].x;
      pos[j*3+1] += bp.velocities[j].y;
      pos[j*3+2] += bp.velocities[j].z;
    }
    bp.mesh.geometry.attributes.position.needsUpdate = true;
    bp.mesh.material.opacity = bp.life/bp.maxLife;
  }
  for(let i = attackTrails.length-1;i>=0;i--){
    const t = attackTrails[i];
    t.life -= dt;
    if(t.life <= 0){
      scene.remove(t.mesh);
      if(t.light) scene.remove(t.light);
      disposeTransientEffectResources(t.mesh);
      attackTrails.splice(i,1);
      continue;
    }
    t.mesh.material.opacity = (t.life/t.maxLife) * (t.isFire ? 0.75 : 0.85);
    if(t.isFire) t.mesh.scale.setScalar(1 + (1-t.life/t.maxLife) * 0.5);
  }
  for(let i = parryIndicators.length-1;i>=0;i--){
    const p = parryIndicators[i];
    p.life -= dt;
    if(p.life <= 0){ scene.remove(p.mesh); disposeTransientEffectResources(p.mesh); parryIndicators.splice(i,1); continue; }
    p.mesh.material.opacity = p.life/p.maxLife;
    p.mesh.rotation.z += 0.1;
  }
  for(let i = toolProjectiles.length-1;i>=0;i--){
    const p = toolProjectiles[i];
    p.life -= dt;
    p.mesh.position.x += p.velocity.x;
    p.mesh.position.y += p.velocity.y;
    p.mesh.position.z += p.velocity.z;
    p.velocity.y -= 0.01;
    if(p.life <= 0 || p.mesh.position.y < 0){
      if(p.type === 'molotov') explodeMolotov(p.mesh.position);
      scene.remove(p.mesh);
      disposeTransientEffectResources(p.mesh);
      toolProjectiles.splice(i,1);
      continue;
    }
    for(const e of enemies){
      const d = e.mesh.position.distanceTo(p.mesh.position);
      if(d < e.radius + 0.3){
        if(p.type === 'knife'){
          e.hp -= 25;
          spawnDmg(e.mesh.position.clone().setY(2), 25, 'normal');
          if(e.hp <= 0) killEnemy(e);
        }
        scene.remove(p.mesh);
        disposeTransientEffectResources(p.mesh);
        toolProjectiles.splice(i,1);
        break;
      }
    }
  }
  updateRain(dt);
  dustMotes.forEach(d=>{
    d.mesh.position.x += d.vx*dt*60;
    d.mesh.position.y += d.vy*dt*60;
    d.mesh.position.z += d.vz*dt*60;
    d.mesh.position.x += Math.sin(rawTime + d.phase)*0.005;
    if(d.mesh.position.y > 7) d.mesh.position.y = 0.5;
    d.mesh.material.opacity = 0.25 + Math.sin(rawTime*2 + d.phase)*0.15;
  });
  lanterns.forEach(l=>{
    const flicker = Math.sin(rawTime*8+l.mesh.position.x*1.7+l.mesh.position.z*0.8);
    l.light.intensity = l.baseIntensity + flicker*0.85;
    if(l.glow) l.glow.material.opacity = 0.62 + flicker*0.06;
  });
  if(bloodStainMesh) bloodStainMesh.rotation.y += dt * 0.5;
  const shakeX = (Math.random()-0.5)*player.screenShake;
  const shakeY = (Math.random()-0.5)*player.screenShake;
  player.screenShake *= 0.88;
  if(player.screenShake < 0.005) player.screenShake = 0;
  const camDistance=Math.max(CAMERA_MIN_DISTANCE,cameraDistance);
  const lookTarget=new THREE.Vector3(hunter.position.x,hunter.position.y+Math.max(2.4,hunterVisualHeight*0.55),hunter.position.z);
  const desiredCamera=new THREE.Vector3(
    hunter.position.x+Math.sin(cameraAngle)*camDistance+shakeX,
    hunter.position.y+cameraHeight+shakeY,
    hunter.position.z+Math.cos(cameraAngle)*camDistance+shakeX
  );
  const safeCamera=getCameraSafePosition(lookTarget,desiredCamera);
  const smoothedCamera=new THREE.Vector3(
    lerp(camera.position.x,safeCamera.x,0.18),
    lerp(camera.position.y,safeCamera.y,0.15),
    lerp(camera.position.z,safeCamera.z,0.18)
  );
  camera.position.copy(getCameraSafePosition(lookTarget,smoothedCamera));
  camera.lookAt(lookTarget);
  renderGameFrame();
}

function startGame(loadSave){
  try {
    if(!loadSave){
      SaveSystem.clear();
      campaignProgress = {cityBoss:false,buildingBoss:false,mountainBoss:false,liftActivated:false,castleChainShot:false,brokenSecrets:{}};
      player.hp = 100; player.maxHp = 100;
      player.level = 10;
      player.stats = {vig:10,end:10,str:10,skl:10,blt:10};
      player.echoes = 0; player.vials = 10; player.bullets = 20; player.maxBullets = 20;
      player.weaponLevel = 0; player.weaponDurability = 100;
      player.insight = 0; player.bloodShards = 0;
      player.bloodGems = [null,null,null];
      player.availableGems = [...BLOOD_GEMS];
      player.ngPlus = 0;
      player.tools = {molotov:3, knife:5, firepaper:2};
      player.kills = 0; player.bossesKilled = 0; player.deaths = 0;
      player.maxCombo = 0;
      player.unlockedLocations = 1;
      player.seenBosses = {};
      currentLocation = 0;
      unlockedAchievements = {};
      discoveredBestiary = {};
      parryCount = 0;
      perfectDodgeCount = 0;
    }
    if(!sceneInitialized){ initScene(); }
    if(!hunter){ createHunter(); }
    setupStick($('leftStick'),$('leftKnob'),moveData,65,true);
    $('mainMenu').classList.remove('active');
    $('gameHUD').style.display = 'block';
    $('controls').style.display = 'flex';
    $('toolHotbar').classList.add('show');
    loadLocation(currentLocation);
    updateHUD();
    startAmbient();
    
  } catch(err){
    console.error('[BB] startGame error:', err);
    alert('Ошибка при запуске: ' + err.message);
  }
}

function getFullscreenElement(){
  return document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement||null;
}
async function requestLandscapeMode(){
  const root=document.documentElement;
  if(!getFullscreenElement()){
    const request=root.requestFullscreen||root.webkitRequestFullscreen||root.mozRequestFullScreen||root.msRequestFullscreen;
    if(request){
      try{const result=request.call(root);if(result&&result.then) await result;}
      catch(err){
        console.warn('[BB] Не удалось включить полный экран автоматически.',err);
        if(window.matchMedia('(orientation: landscape)').matches) notify('НАЖМИТЕ ⛶ ДЛЯ ПОЛНОГО ЭКРАНА');
      }
    }
  }
  if(window.matchMedia('(orientation: portrait)').matches&&screen.orientation&&typeof screen.orientation.lock==='function'){
    try{await screen.orientation.lock('landscape');}
    catch(err){console.warn('[BB] Не удалось автоматически заблокировать горизонтальную ориентацию; поверните устройство вручную.',err);}
  }
}
function requestFullscreenAfterRotation(){
  if(window.matchMedia('(orientation: landscape)').matches&&!getFullscreenElement()) requestLandscapeMode();
}

window.addEventListener('load', () => {
  const btnStart = $('btnStart');
  const btnContinue = $('btnContinue');
  const btnLandscapeMode = $('btnLandscapeMode');
  if(btnLandscapeMode) btnLandscapeMode.addEventListener('click', requestLandscapeMode);
  window.addEventListener('orientationchange',requestFullscreenAfterRotation);
  if(screen.orientation&&typeof screen.orientation.addEventListener==='function') screen.orientation.addEventListener('change',requestFullscreenAfterRotation);
  if(btnStart){
    btnStart.addEventListener('click', () => {
      try {
        requestLandscapeMode();
        initAudio();
        sfx('menu');
        playMusicFile(currentMusicTrack);
        loadVisualAssets();
        startGame(false);
      } catch(err){
        console.error('[BB] btnStart handler error:', err);
        alert('Ошибка: ' + err.message);
      }
    });
  }
  if(btnContinue){
    btnContinue.addEventListener('click', () => {
      try {
        requestLandscapeMode();
        initAudio();
        SaveSystem.load();
        playMusicFile(currentMusicTrack);
        sfx('menu');
        loadVisualAssets();
        startGame(true);
      } catch(err){
        console.error('[BB] btnContinue handler error:', err);
        alert('Ошибка: ' + err.message);
      }
    });
  }
  try { setupButtons(); } catch(err){ console.error('[BB] setupButtons:', err); }
  try { setupFullscreen(); } catch(err){ console.error('[BB] setupFullscreen:', err); }
  try { initScene(); } catch(err){ console.error('[BB] initScene:', err); }
  try { createHunter(); } catch(err){ console.error('[BB] createHunter:', err); }
  try { setupMenuScene(); } catch(err){ console.error('[BB] setupMenuScene:', err); }
  try { animate(); } catch(err){ console.error('[BB] animate:', err); }
  const loadMenuModels = () => {
    try { loadVisualAssets(); } catch(err){ console.error('[BB] loadVisualAssets:', err); }
    try { prepareMusicTrack(currentMusicTrack); } catch(err){ console.warn('[BB] Не удалось подготовить фоновую музыку:', err); }
  };
  if(window.requestIdleCallback) window.requestIdleCallback(loadMenuModels,{timeout:2500});
  else window.setTimeout(loadMenuModels,1400);
  if(SaveSystem.hasSave() && btnContinue) btnContinue.style.display = 'block';
});
