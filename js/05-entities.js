function spawnEnemy(type,x,z,floorY=0){
  if(!scene) return;
  const g = new THREE.Group();
  let hp=50,maxHp=50,speed=0.07,attackRange=2.4,cooldown=1.6;
  let detectionRange=10,echoes=15,radius=0.7,damage=15;
  let legs = null;

  if(type==='spider'){
    const mat = new THREE.MeshStandardMaterial({color:0x3a2e22, roughness:0.95});
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.75,14,14),mat);
    body.position.y = 0.75; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55,12,12),mat);
    head.position.set(0,0.8,0.65); head.castShadow = true; g.add(head);
    const eyeMat = new THREE.MeshBasicMaterial({color:0xdd2222});
    for(let i=-1;i<=1;i+=2){
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.14,10,10),eyeMat);
      e.position.set(i*0.22,0.9,0.95); g.add(e);
    }
    /* === СОЧЛЕНЁННЫЕ ЛАПЫ ПАУКА (8 лап) === */
    const legMat = new THREE.MeshStandardMaterial({color:0x221a10,roughness:0.95});
    legs = [];
    for(let i=0;i<8;i++){
      const side = i < 4 ? 1 : -1;
      const legIdx = i % 4;
      const zOffset = (legIdx - 1.5) * 0.32;

      const hip = new THREE.Group();
      hip.position.set(side * 0.55, 0.75, zOffset);

      const upperLegGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.85, 6);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = 0.425; 
      upperLeg.rotation.z = side * (Math.PI / 3.2);
      upperLeg.rotation.x = (legIdx - 1.5) * -0.15;
      upperLeg.castShadow = true;
      hip.add(upperLeg);

      const knee = new THREE.Group();
      knee.position.y = 0.85;
      const lowerLegGeo = new THREE.CylinderGeometry(0.035, 0.018, 1.0, 6);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -0.5; 
      lowerLeg.rotation.z = -side * (Math.PI / 2.6);
      lowerLeg.castShadow = true;
      knee.add(lowerLeg);

      upperLeg.add(knee);
      g.add(hip);
      legs.push({hip, knee, side});
    }
    hp = maxHp = 45; speed = 0.08; attackRange = 3.6; cooldown = 1.6;
    detectionRange = 14; echoes = 15; radius = 2.1; damage = 12;
  } else if(type==='beast'){
    const mat = new THREE.MeshStandardMaterial({color:0x4a3a2a,roughness:0.95});
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.5,16,16),mat);
    body.position.y = 1.8; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1.1,14,14),mat);
    head.position.set(0,3.1,0.75); head.castShadow = true; g.add(head);
    const eyeMat = new THREE.MeshBasicMaterial({color:0xdd2222});
    for(let i=-1;i<=1;i+=2){
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.22,12,12),eyeMat);
      e.position.set(i*0.42,3.3,1.15); g.add(e);
    }
    /* === СОЧЛЕНЁННЫЕ ЛАПЫ ЗВЕРЯ (4 лапы) === */
    const legMat = new THREE.MeshStandardMaterial({color:0x2e1e10,roughness:0.95});
    legs = [];
    for(let i=0;i<4;i++){
      for(let s=-1;s<=1;s+=2){
        const hip = new THREE.Group();
        hip.position.set(s*0.95, 1.5, -0.65+i*0.55);

        const upperLegGeo = new THREE.CylinderGeometry(0.18,0.15,0.85,10);
        const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
        upperLeg.position.y = -0.425;
        upperLeg.rotation.z = s * 0.28;
        upperLeg.castShadow = true;
        hip.add(upperLeg);

        const knee = new THREE.Group();
        knee.position.y = -0.85;
        const lowerLegGeo = new THREE.CylinderGeometry(0.15,0.12,1.1,10);
        const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
        lowerLeg.position.y = -0.55;
        lowerLeg.castShadow = true;
        knee.add(lowerLeg);

        upperLeg.add(knee);
        g.add(hip);
        legs.push({hip, knee, side: s, isFront: i < 2});
      }
    }
    hp = maxHp = 90; speed = 0.07; attackRange = 3; cooldown = 2.2;
    detectionRange = 12; echoes = 35; radius = 1.4; damage = 22;
  } else if(type==='hunter'){
    const mat = new THREE.MeshStandardMaterial({color:0x3a3a4a,roughness:0.9});
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.5,1.4,14),mat);
    body.position.y = 1.3; body.castShadow = true; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35,12,12),new THREE.MeshStandardMaterial({color:0x6a6a7a}));
    head.position.y = 2.3; head.castShadow = true; g.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.55,0.06,14),new THREE.MeshStandardMaterial({color:0x181820}));
    hat.position.y = 2.6; g.add(hat);

    /* === СОЧЛЕНЁННЫЕ РУКИ ОХОТНИКА === */
    legs = []; 
    const armMat = new THREE.MeshStandardMaterial({color:0x2a2a3a, roughness:0.9});
    const rShoulder = new THREE.Group();
    rShoulder.position.set(0.5, 1.95, 0.15);
    const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.11,0.55,10), armMat);
    rUpper.position.y = -0.275;
    rUpper.castShadow = true;
    rShoulder.add(rUpper);
    const rElbow = new THREE.Group();
    rElbow.position.y = -0.55;
    const rLower = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.09,0.55,10), armMat);
    rLower.position.y = -0.275;
    rLower.castShadow = true;
    rElbow.add(rLower);
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08),
      new THREE.MeshStandardMaterial({color:0x999aa8, metalness:0.9, roughness:0.25}));
    sword.position.y = -0.6;
    rLower.add(sword);
    rUpper.add(rElbow);
    g.add(rShoulder);
    legs.push({hip: rShoulder, knee: rElbow, side: 1, isArm: true, isFront: true});

    const lShoulder = new THREE.Group();
    lShoulder.position.set(-0.5, 1.95, 0.15);
    const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.11,0.55,10), armMat);
    lUpper.position.y = -0.275;
    lUpper.castShadow = true;
    lShoulder.add(lUpper);
    const lElbow = new THREE.Group();
    lElbow.position.y = -0.55;
    const lLower = new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.09,0.55,10), armMat);
    lLower.position.y = -0.275;
    lLower.castShadow = true;
    lElbow.add(lLower);
    lUpper.add(lElbow);
    g.add(lShoulder);
    legs.push({hip: lShoulder, knee: lElbow, side: -1, isArm: true, isFront: false});

    hp = maxHp = 80; speed = 0.1; attackRange = 2.8; cooldown = 1.4;
    detectionRange = 13; echoes = 45; radius = 0.8; damage = 25;
  }

  const ngMult = 1 + player.ngPlus * 0.5;
  hp = maxHp = Math.floor(hp * ngMult);
  damage = Math.floor(damage * ngMult);
  echoes = Math.floor(echoes * (1 + player.ngPlus * 0.7));

  const hpBar = addHPBar(g,type==='beast'?2.4:(type==='spider'?2.25:1.5));
  g.position.set(x,floorY,z);
  scene.add(g);
  const enemy = {
    mesh:g,type,hp,maxHp,speed,attackRange,cooldown,lastAttack:0,detected:false,
    detectionRange,radius,echoes,hpBar,state:'idle',stateTime:0,stunned:0,damage,
    homeX:x,homeY:floorY,homeZ:z,floorY, attackWindup:0.4, lastAttackStartTime:0, canParry: true, burning:0,
    legs: legs,
    animPhase: Math.random() * Math.PI * 2
  };
  if(type==='beast') enemy.visualModelKey='paladin';
  if(type==='hunter') enemy.visualModelKey='skullHunter';
  enemies.push(enemy);
  if(type === 'spider') attachSpiderModel(enemy);
  else if(type === 'hunter') requestEnemyVisualModel('skullHunter');
  else if(type === 'beast') requestEnemyVisualModel('paladin');
}
function spawnBoss(name,x,z,floorY=0){
  if(!scene) return;
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:0x3a2e22,roughness:0.98,metalness:0.05});
  const body = new THREE.Mesh(new THREE.SphereGeometry(5,18,18),mat);
  body.position.y = 6.5; body.scale.set(1,1.15,2.2); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.7,16,16),mat);
  head.position.set(0,11,5.5); head.castShadow = true; g.add(head);
  const eyeMat = new THREE.MeshBasicMaterial({color:0xdd2222});
  for(let i=-1;i<=1;i+=2){
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.5,12,12),eyeMat);
    e.position.set(i*1.2,11.8,7.4); g.add(e);
  }
  const hornMat = new THREE.MeshStandardMaterial({color:0x1e1810,roughness:0.8,metalness:0.2});
  for(let i=-1;i<=1;i+=2){
    const h = new THREE.Mesh(new THREE.ConeGeometry(0.85,7,12),hornMat);
    h.position.set(i*1.5,14.5,5.5); h.rotation.z = i*0.65; h.castShadow = true; g.add(h);
  }
  /* === СОЧЛЕНЁННЫЕ ЛАПЫ БОССА (4 лапы) === */
  const legMat = new THREE.MeshStandardMaterial({color:0x2e2210,roughness:0.95});
  const legs = [];
  for(let i=0;i<4;i++){
    for(let s=-1;s<=1;s+=2){
      const hip = new THREE.Group();
      hip.position.set(s*3.2, 6.0, -1.8+i*2.2);

      const upperLegGeo = new THREE.CylinderGeometry(1.15,1.05,3.5,12);
      const upperLeg = new THREE.Mesh(upperLegGeo, legMat);
      upperLeg.position.y = -1.75;
      upperLeg.rotation.z = s * 0.2;
      upperLeg.castShadow = true;
      hip.add(upperLeg);

      const knee = new THREE.Group();
      knee.position.y = -3.5;
      const lowerLegGeo = new THREE.CylinderGeometry(1.05,0.9,4.5,12);
      const lowerLeg = new THREE.Mesh(lowerLegGeo, legMat);
      lowerLeg.position.y = -2.25;
      lowerLeg.castShadow = true;
      knee.add(lowerLeg);

      upperLeg.add(knee);
      g.add(hip);
      legs.push({hip, knee, side: s, isFront: i < 2});
    }
  }
  const hpBar = addHPBar(g,6.5);
  g.position.set(x,floorY,z);
  scene.add(g);
  const ngMult = 1 + player.ngPlus * 0.5;
  const bossEnemy={
    mesh:g,type:'boss',name,hp:Math.floor(500*ngMult),maxHp:Math.floor(500*ngMult),speed:0.05,
    attackRange:6,cooldown:2.8,lastAttack:0,detected:false,
    detectionRange:18,radius:4,echoes:Math.floor(800*(1+player.ngPlus*0.7)),hpBar,
    state:'idle',stateTime:0,stunned:0,damage:Math.floor(45*ngMult),
    phase2:false,material:mat,homeX:x,homeY:floorY,homeZ:z,floorY,
    attackWindup:0.55, lastAttackStartTime:0, canParry: false,
    phase: 1, phase2Unlocked: false, burning:0,
    legs: legs,
    animPhase: Math.random() * Math.PI * 2
  };
  bossEnemy.visualModelKey = name==='CLERIC BEAST' ? 'paladin'
    : name==='BLOOD-STARVED BEAST' ? 'paladin'
    : name==='SHADOW OF YHARNAM' ? 'skullHunter'
    : name==='MOON PRESENCE' ? 'moonPresence' : '';
  enemies.push(bossEnemy);
  if(bossEnemy.visualModelKey==='skullHunter') requestEnemyVisualModel('skullHunter');
  else if(bossEnemy.visualModelKey) requestEnemyVisualModel(bossEnemy.visualModelKey);
}
function spawnChest(x,z,floorY=0){
  if(!scene) return;
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:0x8a6828,metalness:0.85,roughness:0.4});
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.3,0.75,0.9),mat);
  base.position.y = 0.38; base.castShadow = true; g.add(base);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.35,0.22,0.95),mat);
  lid.position.y = 0.82; g.add(lid);
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.22,0.22,0.08), new THREE.MeshStandardMaterial({color:0xddb800,metalness:1,roughness:0.2}));
  lock.position.set(0,0.63,0.46); g.add(lock);
  const glow = new THREE.PointLight(0xddb800,1.0,5,2);
  glow.position.set(0,0.95,0); g.add(glow);
  g.position.set(x,floorY,z);
  const loots = [
    {type:'vial',amount:3},
    {type:'bullet',amount:5},
    {type:'shards',amount:1 + Math.floor(Math.random()*2)},
    {type:'gem',gem:BLOOD_GEMS[Math.floor(Math.random()*BLOOD_GEMS.length)]},
    {type:'tool',tool:['molotov','knife','firepaper'][Math.floor(Math.random()*3)],amount: 1 + Math.floor(Math.random()*2)}
  ];
  g.userData = {opened:false, loot:loots[Math.floor(Math.random()*loots.length)]};
  scene.add(g);
  chests.push({mesh:g,...g.userData});
}
function spawnLantern(x,z,isRespawn=false,floorY=0){
  if(!scene) return null;
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color:0x302921,metalness:0.72,roughness:0.46});
  const trimMat = new THREE.MeshStandardMaterial({color:0x76552c,metalness:0.76,roughness:0.34});
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.5,1.2,10),mat);
  base.position.y = 0.6; base.castShadow = true; g.add(base);
  const baseTrim = new THREE.Mesh(new THREE.TorusGeometry(0.38,0.055,7,16),trimMat);
  baseTrim.rotation.x = Math.PI/2; baseTrim.position.y = 1.08; g.add(baseTrim);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.14,5.5,10),mat);
  pole.position.y = 3.95; pole.castShadow = true; g.add(pole);
  const glassMat = new THREE.MeshStandardMaterial({color:0x603818,emissive:0xff8a24,emissiveIntensity:0.24,transparent:true,opacity:0.58,roughness:0.32,side:THREE.DoubleSide,depthWrite:false});
  const lowerBand = new THREE.Mesh(new THREE.BoxGeometry(0.72,0.12,0.72),trimMat);lowerBand.position.y=6.55;g.add(lowerBand);
  const upperBand = new THREE.Mesh(new THREE.BoxGeometry(0.72,0.12,0.72),trimMat);upperBand.position.y=7.54;g.add(upperBand);
  for(const [x,z] of [[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3],[0.3,0.3]]){
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.045,1.0,7),trimMat);post.position.set(x,7.05,z);post.castShadow=true;g.add(post);
  }
  const paneGeometry = new THREE.PlaneGeometry(0.56,0.78);
  for(const [x,z,yaw] of [[0,0.31,0],[0,-0.31,Math.PI],[0.31,0,Math.PI/2],[-0.31,0,-Math.PI/2]]){
    const pane = new THREE.Mesh(paneGeometry,glassMat);pane.position.set(x,7.05,z);pane.rotation.y=yaw;g.add(pane);
  }
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.67,0.055,0.67),trimMat);crossbar.position.y=7.05;g.add(crossbar);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.13,10,8),new THREE.MeshBasicMaterial({color:0xff972f}));flame.position.y=7.05;g.add(flame);
  const light = new THREE.PointLight(isRespawn?0xddc088:0xdd9933, isRespawn?4.0:2.8, isRespawn?22:18, 2);
  light.position.y = 7.05; light.castShadow = false; registerGraphicsPointLight(light); g.add(light);
  const glowSprite = new THREE.Sprite(getLanternGlowMaterial().clone());
  glowSprite.position.y = 7.05;
  glowSprite.scale.set(isRespawn?4.2:3.3,isRespawn?4.2:3.3,1);
  glowSprite.renderOrder = 2;
  g.add(glowSprite);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.5,0.52,4),mat);top.rotation.y=Math.PI/4;
  top.position.y = 7.7; top.castShadow = true; g.add(top);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.09,8,6),trimMat);finial.position.y=8.0;g.add(finial);
  g.position.set(x,floorY,z);
  scene.add(g);
  lanterns.push({mesh:g,light,glow:glowSprite,baseIntensity:isRespawn?4.0:2.8,isRespawn});
  return lanterns[lanterns.length-1];
}

function setupMenuScene(){
  if(!scene) return;
  clearWorld();
  gameMode = GameMode.MENU;
  currentFloorIndex=0;
  currentSkyColor = BASE_SKY_MENU;
  currentFogDensity = 0.02;
  scene.background = new THREE.Color(currentSkyColor).multiplyScalar(skyBrightness);
  scene.fog = new THREE.FogExp2(currentSkyColor, currentFogDensity);
  scene.fog.color.copy(scene.background);
  createCobblestoneFloor(30, -15, -15);

  const wallPositions = [
    [-8, -6], [8, -6], [-8, 6], [8, 6],
    [-12, 0], [12, 0], [0, -10], [0, 10]
  ];
  wallPositions.forEach(([x, z]) => {
    createGothicWall(x, 2.0, z, 3.0, 4, 3.0, true);
  });

  if(hunter){
    hunter.position.set(0, 0, 0);
    hunter.rotation.y = Math.PI;
    hunter.rotation.x = 0;
  }
  camera.position.set(0, 7.2, 12.6);
  camera.lookAt(0, 4.6, 0);

  const menuLight = new THREE.PointLight(0xdd7733, 2.2, 22, 2);
  menuLight.position.set(3, 4, 3);
  scene.add(menuLight);
  envObjects.push({mesh:menuLight});
  const menuLight2 = new THREE.PointLight(0x4455aa, 1.5, 22, 2);
  menuLight2.position.set(-3, 4, -3);
  scene.add(menuLight2);
  envObjects.push({mesh:menuLight2});

  spawnDustMotes(30);
  menuOrbitTime = 0;
  applyBrightness();
}

function buildGothicRoomArchitecture(floorRooms,locationIndex,stairSpecs,elevatorX,elevatorZ){
  const rooms=floorRooms.flat().filter(room=>{
    if(locationIndex===0&&room.floorIndex===0&&room.roomIndex===0)return false;
    const cx=room.roomX+ROOM_WORLD_SIZE/2,cz=room.roomZ+ROOM_WORLD_SIZE/2;
    const overlaps=(x,z)=>Math.abs(cx-x)<ROOM_WORLD_SIZE*0.48&&Math.abs(cz-z)<ROOM_WORLD_SIZE*0.48;
    return !stairSpecs.some(spec=>overlaps(spec.x,spec.z))&&!overlaps(elevatorX,elevatorZ);
  });
  if(!rooms.length)return;
  const group=new THREE.Group(),palette=getLocationVisualPalette(locationIndex),dummy=new THREE.Object3D();
  const spring=9.2,archHeight=4.4,width=ROOM_WORLD_SIZE-cellSize*1.5;
  const archCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-width/2,0,0),new THREE.Vector3(-width*0.46,archHeight*0.58,0),
    new THREE.Vector3(-width*0.25,archHeight*0.91,0),new THREE.Vector3(0,archHeight,0),
    new THREE.Vector3(width*0.25,archHeight*0.91,0),new THREE.Vector3(width*0.46,archHeight*0.58,0),
    new THREE.Vector3(width/2,0,0)
  ]);
  const archGeometry=new THREE.TubeGeometry(archCurve,32,0.22,7,false);
  const archMaterial=new THREE.MeshStandardMaterial({color:palette.ceiling,roughness:0.96,metalness:0.01});
  const arches=new THREE.InstancedMesh(archGeometry,archMaterial,rooms.length*2);
  let archIndex=0;
  rooms.forEach(room=>{
    for(let axis=0;axis<2;axis++){
      dummy.position.set(room.roomX+ROOM_WORLD_SIZE/2,room.floorY+spring,room.roomZ+ROOM_WORLD_SIZE/2);
      dummy.rotation.set(0,axis*Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
      arches.setMatrixAt(archIndex++,dummy.matrix);
    }
  });
  arches.instanceMatrix.needsUpdate=true;arches.castShadow=true;arches.receiveShadow=true;arches.frustumCulled=false;group.add(arches);

  const columnHeight=spring-0.12;
  const columnGeometry=new THREE.CylinderGeometry(0.36,0.58,columnHeight,10,1);
  const columnMaterial=new THREE.MeshStandardMaterial({color:palette.wall,roughness:0.95,metalness:0.01});
  const columns=new THREE.InstancedMesh(columnGeometry,columnMaterial,rooms.length*4);
  let columnIndex=0;
  rooms.forEach(room=>{
    const inset=cellSize*0.52;
    for(const dx of [inset,ROOM_WORLD_SIZE-inset])for(const dz of [inset,ROOM_WORLD_SIZE-inset]){
      dummy.position.set(room.roomX+dx,room.floorY+columnHeight/2,room.roomZ+dz);
      dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
      columns.setMatrixAt(columnIndex++,dummy.matrix);
    }
  });
  columns.instanceMatrix.needsUpdate=true;columns.castShadow=true;columns.receiveShadow=true;columns.frustumCulled=false;group.add(columns);
  scene.add(group);envObjects.push({mesh:group});
}

function applyUnifiedCathedralSurfaces(){
  const t=createSurfaceTextures();
  const apply=(mesh,type)=>{if(!mesh||!mesh.material)return;const ms=Array.isArray(mesh.material)?mesh.material:[mesh.material];ms.forEach(m=>{if(!m||((m.name||'').toLowerCase().includes('glass')))return;m.color.setHex(0xffffff);m.map=type==='floor'?t.floor:t.wall;m.normalMap=type==='floor'?t.floorNormal:t.wallNormal;m.roughnessMap=type==='floor'?t.floorRoughness:t.wallRoughness;m.normalScale=new THREE.Vector2(.62,.62);m.roughness=.92;m.metalness=.02;m.needsUpdate=true;});};
  floorMeshes.forEach(m=>apply(m,'floor')); wallMeshes.forEach(m=>apply(m,'wall'));
}

let cathedralSliceLoadToken=0;
function loadCathedralHallSlice(x,y,z,locationIndex,scale=1){
  if(!THREE.GLTFLoader||!scene)return;
  const token=++cathedralSliceLoadToken;
  new THREE.GLTFLoader().load('./assets/levelgen/cathedral_ground_slice.glb',gltf=>{
    if(token!==cathedralSliceLoadToken||currentLocation!==locationIndex||!scene)return;
    const root=gltf.scene;
    root.userData.generatedAsset='cathedral_ground_slice.glb';
    root.position.set(x,y,z);root.scale.setScalar(scale);
    const cathedralTextures=createSurfaceTextures();
    cathedralTextures.wall.encoding=THREE.LinearEncoding;cathedralTextures.floor.encoding=THREE.LinearEncoding;
    root.traverse(object=>{
      if(!object.isMesh)return;
      object.castShadow=false;object.receiveShadow=true;
      const materials=Array.isArray(object.material)?object.material:[object.material];
      materials.forEach(material=>{
        const name=(material.name||'').toLowerCase();
        if(material.color){
          if(name.includes('glass'))material.color.setHex(0x0d2947);
          else if(locationIndex===2&&name.includes('wood'))material.color.setHex(0x68452b);
          else if(locationIndex===2&&name.includes('pine'))material.color.setHex(0x234735);
          else if(locationIndex===2&&name.includes('fire'))material.color.setHex(0xff6b20);
          else if(locationIndex===2&&name.includes('abyss'))material.color.setHex(0x05090e);
          else if(locationIndex===2&&name.includes('ruin'))material.color.setHex(0x555b62);
          else if(locationIndex===2&&name.includes('rock'))material.color.setHex(0x1c2931);
          else if(name.includes('limestone')||name.includes('trim'))material.color.setHex(0x4a5055);
          else if(name.includes('brass')||name.includes('metal'))material.color.setHex(0x6a4420);
          else material.color.setHex(0x1b242b);
        }
        if(locationIndex!==2&&!name.includes('glass')){
          material.map=name.includes('floor')?cathedralTextures.floor:cathedralTextures.wall;
          material.normalMap=name.includes('floor')?cathedralTextures.floorNormal:cathedralTextures.wallNormal;
          material.roughnessMap=name.includes('floor')?cathedralTextures.floorRoughness:cathedralTextures.wallRoughness;
          material.needsUpdate=true;
        }
        if(material.emissive){material.emissive.setHex(name.includes('fire')?0xff3a0a:(name.includes('glass')?0x06172b:0x000000));material.emissiveIntensity=name.includes('fire')?1.8:(name.includes('glass')?0.14:0);}
        if(name.includes('glass')){material.transparent=true;material.opacity=0.44;material.depthWrite=false;}
        if(material.roughness!==undefined)material.roughness=0.92;
      });
    });
    scene.add(root);envObjects.push({mesh:root});
    if(locationIndex===2){
      const moon=new THREE.DirectionalLight(0x83a9c8,0.38);moon.position.set(x-20,32,z+28);moon.target.position.set(x,0,z-16);scene.add(moon,moon.target);envObjects.push({mesh:moon});
      const camp=new THREE.PointLight(0xff7130,1.45,24,2);camp.position.set(x,2.5,z-16);registerGraphicsPointLight(camp);scene.add(camp);envObjects.push({mesh:camp});
    }
  },undefined,error=>console.warn('[BB] Cathedral slice GLB unavailable; existing procedural visuals remain active.',error));
}
function loadCathedralGroundSlice(entranceRoom){
  if(!entranceRoom||entranceRoom.floorIndex!==0)return;
  loadCathedralHallSlice(entranceRoom.roomX+ROOM_WORLD_SIZE/2,entranceRoom.floorY,entranceRoom.roomZ+ROOM_WORLD_SIZE/2,1,1);
}

let generatedDungeonLoadToken=0;
function loadGeneratedDungeonArt(){
  if(!THREE.GLTFLoader||!window.BB_GENERATED_DUNGEON_LAYOUT) return;
  const loadToken=generatedDungeonLoadToken;
  const loader=new THREE.GLTFLoader();
  loader.load('./assets/levelgen/bb_gothic_dungeon.glb',gltf=>{
    if(loadToken!==generatedDungeonLoadToken||currentLocation!==3||!scene) return;
    const layout=window.BB_GENERATED_DUNGEON_LAYOUT;
    const legacyBatches=wallMeshes.filter(mesh=>mesh&&mesh.userData&&mesh.userData.isRoomBatch);
    const legacyColliders=new Set(legacyBatches.flatMap(mesh=>mesh.userData.colliders||[]));
    const shared=collectSharedWorldResources(),disposed={geometries:new Set(),materials:new Set()};
    legacyBatches.forEach(mesh=>{
      scene.remove(mesh);disposeWorldObjectResources(mesh,shared,disposed);
    });
    wallMeshes=wallMeshes.filter(mesh=>!legacyBatches.includes(mesh));
    floorMeshes.forEach(mesh=>{
      scene.remove(mesh);disposeWorldObjectResources(mesh,shared,disposed);
    });
    floorMeshes=[];
    wallColliders=wallColliders.filter(box=>!legacyColliders.has(box));
    wallColliders.push(...getGeneratedDungeonWallColliders(layout));
    const root=gltf.scene;
    root.traverse(object=>{
      if(object.name&&object.name.indexOf('Locked_Shortcut_Gates')>=0){object.visible=false;return;}
      if(object.isMesh){object.castShadow=graphicsQuality==='ultra';object.receiveShadow=true;}
    });
    scene.add(root);envObjects.push({mesh:root});
    new THREE.TextureLoader().load('./assets/levelgen/textures/stone_ao.png',aoMap=>{
      if(loadToken!==generatedDungeonLoadToken||currentLocation!==3) return;
      aoMap.flipY=false;aoMap.encoding=THREE.LinearEncoding;
      root.traverse(object=>{
        if(!object.isMesh||!object.geometry.attributes.uv) return;
        object.geometry.setAttribute('uv2',object.geometry.attributes.uv);
        const materials=Array.isArray(object.material)?object.material:[object.material];
        materials.forEach(material=>{material.aoMap=aoMap;material.aoMapIntensity=0.72;material.needsUpdate=true;});
      });
    });
    rebuildWallCollisionGrid();
  },undefined,error=>console.warn('[BB] Gothic dungeon GLB load failed; keeping the procedural fallback.',error));
}
function loadLocation(idx){
  idx=Math.max(0,Math.min(LOCATIONS.length-1,idx|0));
  if(!canEnterLocation(idx)){notify('СЮЖЕТНЫЙ ПУТЬ ЕЩЁ ЗАКРЫТ');return false;}
  generatedDungeonLoadToken++;
  clearWorld();
  gameMode = GameMode.PLAYING;
  currentLocation = idx;
  currentFloorIndex=0; lastRoomNotice='';
  stageBounds={minX:-STAGE_WORLD_WIDTH/2,minZ:-STAGE_WORLD_DEPTH/2,maxX:STAGE_WORLD_WIDTH/2,maxZ:STAGE_WORLD_DEPTH/2};
  const mood = LOCATION_MOODS[idx] || LOCATION_MOODS[0];
  currentSkyColor = mood.sky;
  currentFogDensity = mood.fog*0.62;
  scene.background = new THREE.Color(currentSkyColor).multiplyScalar(skyBrightness);
  scene.fog = new THREE.FogExp2(currentSkyColor, currentFogDensity);
  scene.fog.color.copy(scene.background);
  if(lightingRefs.moonMesh){lightingRefs.moonMesh.visible=true;lightingRefs.moonMesh.scale.setScalar(idx===2?0.55:1);}
  if(lightingRefs.glow){lightingRefs.glow.visible=true;lightingRefs.glow.scale.setScalar(idx===2?0.62:1);}
  if(window._rainMesh)window._rainMesh.visible=idx!==2;

  $('locName').textContent = LOCATIONS[idx];
  $('locName').classList.remove('show'); void $('locName').offsetWidth;
  $('locName').classList.add('show');
  $('bossWrap').classList.remove('show');
  const ox=stageBounds.minX,oz=stageBounds.minZ;
  const mountainRoute=idx===2?getMountainRouteLayout(ox,oz):null;
  const gothicLayout=idx===2?getGothicChasmLayout(ox,oz):null;
  const floorRooms=[buildStageFloor(idx,0,ox,oz),buildStageFloor(idx,1,ox,oz)];
  const generatedStaircases=idx===3?window.BB_GENERATED_DUNGEON_LAYOUT?.staircases:null;
  const stairSpecs=generatedStaircases&&generatedStaircases.length
    ?generatedStaircases.map(stair=>({...stair,style:'stone'}))
    :idx===2?[]
    :[
      {col:2,row:0,run:28,width:4.8,style:'stone'},
      {col:0,row:1,run:25,width:4.6,style:'wood'},
      {col:4,row:0,run:28,width:3.4,style:'rope'}
    ];
  const stairHoles=stairSpecs.map(spec=>{
    if(spec.col!==undefined){
      const roomX=ox+spec.col*ROOM_WORLD_SIZE,roomZ=oz+spec.row*ROOM_WORLD_SIZE;
      spec.x=roomX+ROOM_WORLD_SIZE/2;spec.z=roomZ+12;
    }
    return {x0:spec.x-spec.width/2-0.8,x1:spec.x+spec.width/2+0.8,z0:spec.z-1,z1:spec.z+spec.run+1};
  });
  const elevatorX=ox+3*ROOM_WORLD_SIZE+ROOM_WORLD_SIZE/2;
  const elevatorZ=oz+ROOM_WORLD_SIZE+ROOM_WORLD_SIZE/2;
  stairHoles.push({x0:elevatorX-3.25,x1:elevatorX+3.25,z0:elevatorZ-3.25,z1:elevatorZ+3.25});
  const cathedralExitX=ox+4*ROOM_WORLD_SIZE+ROOM_WORLD_SIZE/2,cathedralExitZ=oz+STAGE_WORLD_DEPTH/2;
  const cathedralExitVoid=idx===1?{x0:ox+4*ROOM_WORLD_SIZE-10,x1:ox+5*ROOM_WORLD_SIZE+10,z0:cathedralExitZ,z1:cathedralExitZ+10.1}:null;
  const exteriorVoids=cathedralExitVoid?[cathedralExitVoid]:[];
  const lowerFloorOpenings=idx===2?[mountainRoute.wellOpening,mountainRoute.spiralOpening,gothicLayout.void]:exteriorVoids;
  mountainFloorVoids=idx===2?lowerFloorOpenings:[];
  const upperFloorHoles=stairHoles.concat(mountainRoute?mountainRoute.fallOpenings:[],idx===2?[{x0:gothicLayout.void.x0-4,x1:gothicLayout.void.x1+4,z0:gothicLayout.void.z0-4,z1:gothicLayout.void.z1+4}]:[],exteriorVoids);
  const floorMargin=10;
  const floorSegmentSpacing=idx===2?6:3;
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[0],lowerFloorOpenings,false,floorSegmentSpacing);
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[1],upperFloorHoles,false,floorSegmentSpacing);
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[1]-1.5,upperFloorHoles,true,floorSegmentSpacing);
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[0]+FLOOR_HEIGHT-1.5,stairHoles.concat(exteriorVoids),true,floorSegmentSpacing);
  createCobblestoneFloor(STAGE_WORLD_WIDTH+floorMargin*2,ox-floorMargin,oz-floorMargin,STAGE_WORLD_DEPTH+floorMargin*2,FLOOR_LEVELS[1]+FLOOR_HEIGHT-1.5,[],true,floorSegmentSpacing);
  applyUnifiedCathedralSurfaces();
  stairSpecs.forEach(spec=>{
    if(generatedStaircases&&generatedStaircases.length) registerGeneratedDungeonStaircase(spec);
    else addWalkableStaircase(spec.x,spec.z,FLOOR_LEVELS[0],FLOOR_LEVELS[1],spec.run,spec.width,spec.style);
  });
  addStageElevator(elevatorX,elevatorZ,FLOOR_LEVELS[0],FLOOR_LEVELS[1]);
  if(idx!==3&&idx!==2) buildGothicRoomArchitecture(floorRooms,idx,stairSpecs,elevatorX,elevatorZ);
  const shortcutX=idx===2?gothicLayout.centerX+66:ox+2.5*ROOM_WORLD_SIZE;
  const shortcutZ=idx===2?gothicLayout.lowerZ+18:oz+ROOM_WORLD_SIZE;
  const generatedShortcuts=idx===3?window.BB_GENERATED_DUNGEON_LAYOUT?.shortcuts:null;
  if(generatedShortcuts&&generatedShortcuts.length){
    generatedShortcuts.forEach(gate=>addShortcutGate(gate.world_x,gate.world_z,FLOOR_LEVELS[gate.floor],idx,gate.floor,{farSideOnly:gate.opens_from==='far_side'}));
  }else{
    for(let floor=0;floor<FLOOR_LEVELS.length;floor++) addShortcutGate(shortcutX,shortcutZ,FLOOR_LEVELS[floor],idx,floor);
  }
  if(idx===0) buildOedonChapelFoyer(floorRooms[0][0],FLOOR_LEVELS[0]);
  scatterCryptAtmosphere(floorRooms,idx);
  buildLocationLandmarks(idx,ox,oz);
  buildCampaignTargets(idx,ox,oz);
  if(idx===2){
    buildMountainRoute(ox,oz);loadCathedralHallSlice(gothicLayout.centerX,0,gothicLayout.lowerZ,2,1.0);
    floorMeshes.forEach(object=>{
      const material=object.material;
      const color=material&&material.color;
      if(object.isMesh&&color&&object.position.y<=0.25&&color.r>0.82&&color.g>0.82&&color.b>0.82)object.visible=false;
    });
  }
  buildRegionalVisuals(idx,floorRooms,ox,oz);
  if(idx===1) loadCathedralGroundSlice(floorRooms[0]&&floorRooms[0][0]);
  if(idx===1) buildCathedralExteriorRoute(cathedralExitX,cathedralExitZ);
  createDistantHorizon(idx);
  rebuildWallCollisionGrid();
  spawnDustMotes(60);
  if(idx===3) loadGeneratedDungeonArt();
  const startRoom=floorRooms[0][0];
  const spawnX=startRoom.roomX+cellSize*3.5;
  const spawnZ=startRoom.roomZ+cellSize*3.5;
  spawnLantern(spawnX+2.4,spawnZ+1.0,true,FLOOR_LEVELS[0]);
  player.respawnPoint={x:spawnX,z:spawnZ,y:FLOOR_LEVELS[0],loc:idx,floor:0};
  if(hunter){
    hunter.position.set(spawnX,FLOOR_LEVELS[0],spawnZ);
    hunter.rotation.x = 0;
    hunter.rotation.y = Math.PI;
  }
  camera.position.set(spawnX,FLOOR_LEVELS[0]+cameraHeight,spawnZ+cameraDistance);
  cameraAngle = 0;
  const bossNames=['CLERIC BEAST','BLOOD-STARVED BEAST','SHADOW OF YHARNAM','MOON PRESENCE'];
  const enemyPalettes=[
    ['spider','spider','spider','beast'],
    ['spider','beast','beast','hunter'],
    ['beast','hunter','hunter','spider'],
    ['hunter','beast','spider','hunter']
  ];
  for(let floor=0;floor<FLOOR_LEVELS.length;floor++){
    for(const room of floorRooms[floor]){
      const index=room.roomIndex,isStart=floor===0&&index===0,isBoss=floor===1&&index===ROOMS_PER_FLOOR-1;
      if(isStart) continue;
      const point=roomSpawnPoint(room,(idx+1)*100003+(floor+1)*19997+(index+1)*7919);
      if(!isBoss){
        const palette=enemyPalettes[idx]||enemyPalettes[0];
        const type=palette[(index+floor*2)%palette.length];
        spawnEnemy(type,point.x,point.z,room.floorY);
      }
      if(index%2===1&&!isBoss){
        const chestPoint=roomSpawnPoint(room,(idx+1)*65537+(floor+1)*8123+index*1973);
        spawnChest(chestPoint.x,chestPoint.z,room.floorY);
      }
      if((floor===0&&index===4)||(floor===1&&index===4)){
        spawnLantern(point.x,point.z,false,room.floorY);
      }
    }
  }
  const centralStair=stairSpecs[0];
  if(centralStair)spawnLantern(centralStair.x,centralStair.z+centralStair.run+2,false,FLOOR_LEVELS[1]);
  const bossRoom=floorRooms[1][ROOMS_PER_FLOOR-1];
  const bossCell=Math.floor(mazeSize/2)+0.5;
  const bx=bossRoom.roomX+bossCell*cellSize;
  const bz=bossRoom.roomZ+bossCell*cellSize;
  if(idx===3) buildCastleInterior(floorRooms,bossRoom);
  spawnBoss(idx===3?'ПАУЧЬЯ МАТРИАРХА':(bossNames[idx]||bossNames[0]),bx,bz,FLOOR_LEVELS[1]);
  if(idx<2)addCampaignExit(idx+1,bx-3,bz,FLOOR_LEVELS[1]);
  updateStageLocationLabel(true);

  if(bloodStain && bloodStain.loc === idx){
    createBloodStain(bloodStain.x,bloodStain.z,bloodStain.echoes,bloodStain.loc,bloodStain.floorY||0);
  }

  worldTutorialTimers=[2500,5500,8500].map((delay,i)=>setTimeout(()=>showTutorial(['Свайп по пустой части — поворот камеры','Двойной тап — перекат','Заряжайте атаку для ×3 урона!'][i]),delay));
  applyBrightness();
}
