const LOCATION_VISUAL_PALETTES = [
  { wall:0xa6abb5, floor:0x59616d, ceiling:0x41414a },
  { wall:0x82766b, floor:0x57504a, ceiling:0x38332f },
  { wall:0x6f8993, floor:0x52656d, ceiling:0x34464e },
  { wall:0x796b82, floor:0x51485f, ceiling:0x332c40 }
];

function getLocationVisualPalette(locationIndex=currentLocation){
  const index=Number.isInteger(locationIndex)?Math.max(0,Math.min(LOCATION_VISUAL_PALETTES.length-1,locationIndex)):0;
  return LOCATION_VISUAL_PALETTES[index];
}

function collectRegionalWallFaces(rooms,seed,skipStartingChapel=false){
  const faces=[],seen=new Set();
  const add=(room,x,y,side)=>{
    const wx=room.roomX+(x+0.5)*cellSize,wz=room.roomZ+(y+0.5)*cellSize;
    let face;
    if(side==='north') face={x:wx,z:room.roomZ+y*cellSize+0.38,yaw:0,nx:0,nz:1};
    else if(side==='south') face={x:wx,z:room.roomZ+(y+1)*cellSize-0.38,yaw:0,nx:0,nz:-1};
    else if(side==='west') face={x:room.roomX+x*cellSize+0.38,z:wz,yaw:Math.PI/2,nx:1,nz:0};
    else face={x:room.roomX+(x+1)*cellSize-0.38,z:wz,yaw:Math.PI/2,nx:-1,nz:0};
    face.floorY=room.floorY;face.roomIndex=room.roomIndex;face.floorIndex=room.floorIndex;
    const key=[face.floorY,face.x,face.z,face.yaw].map(value=>Math.round(value*10)).join(':');
    if(!seen.has(key)){seen.add(key);faces.push(face);}
  };
  rooms.forEach(room=>{
    if(skipStartingChapel&&room.floorIndex===0&&room.roomIndex===0)return;
    const blocked=(x,y)=>x>=0&&y>=0&&x<mazeSize&&y<mazeSize&&room.grid[y][x]===1;
    for(let y=1;y<mazeSize-1;y++)for(let x=1;x<mazeSize-1;x++)if(room.grid[y][x]===0){
      if(blocked(x,y-1))add(room,x,y,'north');
      if(blocked(x,y+1))add(room,x,y,'south');
      if(blocked(x-1,y))add(room,x,y,'west');
      if(blocked(x+1,y))add(room,x,y,'east');
    }
  });
  const random=seededRandom(seed>>>0);
  for(let i=faces.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[faces[i],faces[j]]=[faces[j],faces[i]];}
  return faces;
}

function addArchedWallDetails(group,rooms,options){
  const faces=collectRegionalWallFaces(rooms,options.seed,options.skipStartingChapel).slice(0,options.maxPanels);
  if(!faces.length)return faces;
  const width=options.width,height=options.height,baseY=options.baseY;
  const panelGeometry=new THREE.ShapeGeometry(makeLancetShape(width,height));
  const panelMaterial=new THREE.MeshStandardMaterial({
    color:options.panelMap?0xffffff:options.panelColor,map:options.panelMap||null,
    emissive:options.emissive||0x000000,emissiveIntensity:options.emissiveIntensity||0,
    roughness:0.94,side:THREE.DoubleSide
  });
  const panels=new THREE.InstancedMesh(panelGeometry,panelMaterial,faces.length),dummy=new THREE.Object3D();
  faces.forEach((face,index)=>{
    dummy.position.set(face.x,face.floorY+baseY,face.z);
    dummy.rotation.set(0,face.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();panels.setMatrixAt(index,dummy.matrix);
  });
  panels.instanceMatrix.needsUpdate=true;panels.castShadow=false;panels.receiveShadow=false;group.add(panels);

  const positions=[],half=width/2;
  const outline=[[-half,0],[half,0],[half,height*0.62],[width*0.43,height*0.79],[width*0.28,height*0.93],[0,height],[-width*0.28,height],[-width*0.43,height*0.79],[-half,height*0.62],[-half,0]];
  const addSegment=(face,a,b)=>{
    const toWorld=(point)=>{
      const lx=point[0],ly=point[1],lz=0.085;
      return [face.x+lx*Math.cos(face.yaw)+lz*Math.sin(face.yaw),face.floorY+baseY+ly,face.z-lx*Math.sin(face.yaw)+lz*Math.cos(face.yaw)];
    };
    positions.push(...toWorld(a),...toWorld(b));
  };
  faces.forEach(face=>{
    for(let i=0;i<outline.length-1;i++)addSegment(face,outline[i],outline[i+1]);
    (options.crossbars||[]).forEach(y=>addSegment(face,[-width*0.38,y],[width*0.38,y]));
    if(options.pilasters){
      addSegment(face,[-width*0.56,0],[-width*0.56,height*0.64]);
      addSegment(face,[width*0.56,0],[width*0.56,height*0.64]);
    }
  });
  const frameGeometry=new THREE.BufferGeometry();
  frameGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  frameGeometry.computeBoundingSphere();
  const frameMaterial=new THREE.LineBasicMaterial({color:options.frameColor,transparent:true,opacity:0.92});
  group.add(new THREE.LineSegments(frameGeometry,frameMaterial));

  if(options.boarded){
    const boardGeometry=new THREE.BoxGeometry(width*0.88,0.17,0.10);
    const boardMaterial=new THREE.MeshStandardMaterial({color:0x60452f,roughness:0.93});
    const boards=new THREE.InstancedMesh(boardGeometry,boardMaterial,faces.length*3),roll=new THREE.Quaternion();
    let index=0;
    faces.forEach(face=>[0.72,1.58,2.42].forEach((heightOffset,slat)=>{
      dummy.position.set(face.x,face.floorY+baseY+heightOffset,face.z);
      dummy.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),face.yaw);
      roll.setFromAxisAngle(new THREE.Vector3(0,0,1),(slat%2?1:-1)*0.055);
      dummy.quaternion.multiply(roll);dummy.scale.set(slat===1?0.9:1,1,1);dummy.updateMatrix();boards.setMatrixAt(index++,dummy.matrix);
    }));
    boards.instanceMatrix.needsUpdate=true;boards.castShadow=false;boards.receiveShadow=false;group.add(boards);
    const nailGeometry=new THREE.BoxGeometry(0.065,0.065,0.035);
    const nailMaterial=new THREE.MeshStandardMaterial({color:0x9a7951,metalness:0.62,roughness:0.4});
    const nails=new THREE.InstancedMesh(nailGeometry,nailMaterial,faces.length*6);
    let nailIndex=0;
    faces.forEach(face=>[0.72,1.58,2.42].forEach(heightOffset=>[-width*0.31,width*0.31].forEach(lx=>{
      dummy.position.set(face.x+lx*Math.cos(face.yaw)+face.nx*0.06,face.floorY+baseY+heightOffset,face.z-lx*Math.sin(face.yaw)+face.nz*0.06);
      dummy.rotation.set(0,face.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();nails.setMatrixAt(nailIndex++,dummy.matrix);
    })));
    nails.instanceMatrix.needsUpdate=true;nails.castShadow=false;nails.receiveShadow=false;group.add(nails);
  }
  return faces;
}

function addStreetPuddles(group,rooms,seed){
  const random=seededRandom(seed>>>0),spots=[];
  rooms.forEach(room=>{
    if(room.floorIndex===0&&room.roomIndex===0)return;
    const open=[];
    for(let y=1;y<mazeSize-1;y++)for(let x=1;x<mazeSize-1;x++)if(room.grid[y][x]===0)open.push({x,y});
    if(open.length&&random()<0.34){
      const cell=open[Math.floor(random()*open.length)];
      spots.push({x:room.roomX+(cell.x+0.5)*cellSize,z:room.roomZ+(cell.y+0.5)*cellSize,y:room.floorY+0.035,sx:1.05+random()*0.7,sz:0.42+random()*0.32,angle:random()*Math.PI});
    }
  });
  if(!spots.length)return;
  const geometry=new THREE.CircleGeometry(1,18);
  const material=new THREE.MeshStandardMaterial({color:0x435760,emissive:0x10191d,emissiveIntensity:0.12,metalness:0.28,roughness:0.2,transparent:true,opacity:0.58,side:THREE.DoubleSide,depthWrite:false});
  const mesh=new THREE.InstancedMesh(geometry,material,spots.length),dummy=new THREE.Object3D();
  spots.forEach((spot,index)=>{
    dummy.position.set(spot.x,spot.y,spot.z);dummy.rotation.set(-Math.PI/2,spot.angle,0);dummy.scale.set(spot.sx,spot.sz,1);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);
}

function addStreetCrates(group,faces,seed){
  const selected=faces.filter((_,index)=>index%3===0).slice(0,7);
  if(!selected.length)return;
  const random=seededRandom(seed>>>0),geometry=new THREE.BoxGeometry(1.0,0.9,0.86);
  const material=new THREE.MeshStandardMaterial({color:0x51402f,roughness:0.92});
  const crates=new THREE.InstancedMesh(geometry,material,selected.length),dummy=new THREE.Object3D();
  selected.forEach((face,index)=>{
    dummy.position.set(face.x+face.nx*0.9,face.floorY+0.48,face.z+face.nz*0.9);
    dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.set(0.82+random()*0.3,0.82+random()*0.35,0.82+random()*0.3);
    dummy.updateMatrix();crates.setMatrixAt(index,dummy.matrix);
  });
  crates.instanceMatrix.needsUpdate=true;crates.castShadow=false;crates.receiveShadow=true;group.add(crates);
}

function buildYharnamStreetVisuals(floorRooms){
  const group=new THREE.Group(),rooms=floorRooms.flat();
  const faces=addArchedWallDetails(group,rooms,{seed:0x57ee71,maxPanels:14,width:1.9,height:3.45,baseY:2.45,panelColor:0x100e12,emissive:0x120805,emissiveIntensity:0.24,frameColor:0xa28c72,boarded:true,crossbars:[1.35,2.45],skipStartingChapel:true});
  addStreetPuddles(group,rooms,0x5177a9);addStreetCrates(group,faces,0x3912ab);
  if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
}

function buildCathedralInteriorVisuals(floorRooms){
  const group=new THREE.Group(),rooms=floorRooms.flat();
  const entrance=rooms.find(room=>room.floorIndex===0&&room.roomIndex===0);
  const entranceMaps=entrance?getChapelTextureAssets():null;
  if(entrance){
    const entryFloor=new THREE.Mesh(new THREE.PlaneGeometry(cellSize*mazeSize,cellSize*mazeSize),new THREE.MeshStandardMaterial({color:0x6b7480,map:entranceMaps.floor,bumpMap:entranceMaps.floor,bumpScale:0.035,roughness:0.4,metalness:0.08}));
    entryFloor.rotation.x=-Math.PI/2;entryFloor.position.set(entrance.roomX+cellSize*3.5,entrance.floorY+0.035,entrance.roomZ+cellSize*3.5);group.add(entryFloor);
  }
  const entranceArch={seed:0xca7ed2,maxPanels:5,width:2.2,height:4.1,baseY:2.25,panelColor:0x12131b,panelMap:entranceMaps&&entranceMaps.glass,emissive:0x11182a,emissiveIntensity:0.18,frameColor:0xb49a70,pilasters:true};
  if(entrance)addArchedWallDetails(group,[entrance],entranceArch);
  const otherRooms=rooms.filter(room=>room!==entrance);
  addArchedWallDetails(group,otherRooms,{...entranceArch,panelMap:null,seed:0x72ca7e,maxPanels:8,width:1.8,height:3.3,baseY:2.8,skipStartingChapel:true});
  const entranceFaces=entrance?collectRegionalWallFaces([entrance],0x6ab1e5).slice(0,3):[];
  const faces=[...entranceFaces,...collectRegionalWallFaces(otherRooms,0x6ab1e5,true).slice(0,4)];
  if(faces.length){
    const wood=new THREE.MeshStandardMaterial({color:0x5a4635,roughness:0.94});
    const seatGeo=new THREE.BoxGeometry(1.75,0.16,0.52),legGeo=new THREE.BoxGeometry(0.14,0.46,0.15),backGeo=new THREE.BoxGeometry(1.75,0.46,0.12);
    const seats=new THREE.InstancedMesh(seatGeo,wood,faces.length),legs=new THREE.InstancedMesh(legGeo,wood,faces.length*4),backs=new THREE.InstancedMesh(backGeo,wood,faces.length),dummy=new THREE.Object3D();
    let legIndex=0;
    const worldPosition=(face,lx,lz)=>({x:face.x+face.nx*0.75+lx*Math.cos(face.yaw)+lz*Math.sin(face.yaw),z:face.z+face.nz*0.75-lx*Math.sin(face.yaw)+lz*Math.cos(face.yaw)});
    faces.forEach((face,index)=>{
      const seat=worldPosition(face,0,0);dummy.position.set(seat.x,face.floorY+0.52,seat.z);dummy.rotation.set(0,face.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();seats.setMatrixAt(index,dummy.matrix);
      const back=worldPosition(face,0,-0.16);dummy.position.set(back.x,face.floorY+0.83,back.z);dummy.rotation.set(0,face.yaw,0);dummy.updateMatrix();backs.setMatrixAt(index,dummy.matrix);
      for(const lx of [-0.68,0.68])for(const lz of [-0.16,0.16]){
        const p=worldPosition(face,lx,lz);dummy.position.set(p.x,face.floorY+0.24,p.z);dummy.rotation.set(0,face.yaw,0);dummy.updateMatrix();legs.setMatrixAt(legIndex++,dummy.matrix);
      }
    });
    [seats,legs,backs].forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);});
  }
  addCathedralGroundTierVisuals(group,(floorRooms[0]||[]).filter(room=>room.floorIndex===0));
  if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
}

function buildMountainVisualAccents(ox,oz){
  const group=new THREE.Group(),route=getMountainRouteLayout(ox,oz),random=seededRandom(0x6f2057);
  const entryX=ox+cellSize*3.5,entryZ=oz+cellSize*3.5;
  const capGeometry=new THREE.SphereGeometry(1,10,6,0,Math.PI*2,0,Math.PI/2);
  const capMaterial=new THREE.MeshStandardMaterial({color:0x8b9b9d,roughness:0.92});
  const boulderCaps=new THREE.InstancedMesh(capGeometry,capMaterial,12),dummy=new THREE.Object3D();
  for(let i=0;i<12;i++){
    const entryOffsets=[[-11,-8],[11,-8],[-11,9],[11,9]];
    const x=i<4?entryX+entryOffsets[i][0]:route.valleyX-11+((i-4)%4)*7;
    const z=i<4?entryZ+entryOffsets[i][1]:route.valleyZ-5+Math.floor((i-4)/4)*9;
    dummy.position.set(x,i<4?0.08:1.07,z);dummy.rotation.set(0,random()*Math.PI*2,0);
    dummy.scale.set(i<4?2.1:1.45+0.2*(i%3),i<4?0.52:0.24,i<4?1.7:1.12);dummy.updateMatrix();boulderCaps.setMatrixAt(i,dummy.matrix);
  }
  boulderCaps.instanceMatrix.needsUpdate=true;boulderCaps.castShadow=false;boulderCaps.receiveShadow=true;group.add(boulderCaps);

  const patches=[
    {x:entryX-8,z:entryZ-7,y:0.025},{x:entryX+8,z:entryZ-6,y:0.025},
    {x:entryX-9,z:entryZ+7,y:0.025},{x:entryX+8,z:entryZ+8,y:0.025},
    {x:route.valleyX-6,z:route.valleyZ-8,y:0.025},{x:route.valleyX+5,z:route.valleyZ+8,y:0.025},
    {x:route.valleyX+15,z:route.valleyZ-4,y:0.025},{x:route.valleyX-15,z:route.valleyZ+5,y:0.025},
    {x:-38,z:27,y:-7.94},{x:-25,z:34,y:-7.94},
    {x:route.spiralX-4,z:route.spiralZ-6,y:0.025},{x:route.spiralX+5,z:route.spiralZ+4,y:0.025},
    {x:route.gateX-5,z:route.gateZ-3,y:0.025},{x:route.gateX+4,z:route.gateZ+5,y:0.025},
    {x:route.bridgeX-8,z:route.bridgeZ+4,y:FLOOR_HEIGHT+0.025},{x:route.bridgeX+7,z:route.bridgeZ-5,y:FLOOR_HEIGHT+0.025}
  ];
  const frostGeometry=new THREE.CircleGeometry(1,10),frostMaterial=new THREE.MeshStandardMaterial({color:0x829da4,roughness:0.46,metalness:0.04,transparent:true,opacity:0.28,side:THREE.DoubleSide,depthWrite:false});
  const frost=new THREE.InstancedMesh(frostGeometry,frostMaterial,patches.length);
  patches.forEach((patch,index)=>{
    dummy.position.set(patch.x,patch.y,patch.z);dummy.rotation.set(-Math.PI/2,random()*Math.PI*2,0);dummy.scale.set(0.8+random()*0.85,0.34+random()*0.28,1);dummy.updateMatrix();frost.setMatrixAt(index,dummy.matrix);
  });
  frost.instanceMatrix.needsUpdate=true;frost.castShadow=false;frost.receiveShadow=false;group.add(frost);
  if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
}

function buildGothicChasmAtmosphere(ox,oz){
  const group=new THREE.Group(),layout=getGothicChasmLayout(ox,oz),tex=createSurfaceTextures(),stone=new THREE.MeshStandardMaterial({color:0x202b34,map:tex.wall,roughness:0.98,metalness:0.02}),windowMat=new THREE.MeshBasicMaterial({color:0x8ea8bd,transparent:true,opacity:0.42,toneMapped:false});
  [[-78,layout.centerZ+22,12,28],[-42,layout.centerZ+30,9,22],[46,layout.centerZ+28,11,30],[78,layout.centerZ+20,8,24]].forEach(([x,z,width,height],index)=>{
    const tower=new THREE.Mesh(new THREE.BoxGeometry(width,height,9),stone);tower.position.set(x,height/2-5,z);tower.castShadow=true;tower.receiveShadow=true;group.add(tower);
    const roof=new THREE.Mesh(new THREE.ConeGeometry(width*0.72,9,4),stone);roof.position.set(x,height+1-5,z);roof.rotation.y=Math.PI/4;roof.castShadow=true;group.add(roof);
    for(let row=0;row<3;row++){const win=new THREE.Mesh(new THREE.PlaneGeometry(1.2,2.8),windowMat);win.position.set(x+(index%2?width/2+0.02:-width/2-0.02),height*0.35+row*4-5,z-3.9);win.rotation.y=index%2?Math.PI/2:-Math.PI/2;group.add(win);}
  });
  const archMaterial=new THREE.MeshStandardMaterial({color:0x101820,roughness:0.99,metalness:0.01});
  // The playable hall is an enclosed Blender slice; keep the skyline arches outside its sightline.
  [layout.centerZ+52,layout.centerZ-58].forEach(z=>{const span=STAGE_WORLD_WIDTH*0.62,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-span/2,0,0),new THREE.Vector3(-span*0.38,10,0),new THREE.Vector3(0,17,0),new THREE.Vector3(span*0.38,10,0),new THREE.Vector3(span/2,0,0)]),arch=new THREE.Mesh(new THREE.TubeGeometry(curve,28,0.55,7,false),archMaterial);arch.position.set(layout.centerX,4,z);arch.castShadow=true;group.add(arch);});
  scene.add(group);envObjects.push({mesh:group});
}

function appendCastleWeb(positions,face,width,height){
  const world=(lx,ly)=>[face.x+lx*Math.cos(face.yaw)+0.10*Math.sin(face.yaw),face.floorY+0.35+ly,face.z-lx*Math.sin(face.yaw)+0.10*Math.cos(face.yaw)];
  const rays=7,rings=4,maxRadius=Math.min(width,height);
  for(let ray=0;ray<=rays;ray++){
    const angle=(Math.PI/2)*ray/rays;
    const end=world(Math.cos(angle)*maxRadius,Math.sin(angle)*maxRadius),start=world(0,0);
    positions.push(...start,...end);
  }
  for(let ring=1;ring<=rings;ring++){
    const radius=maxRadius*ring/rings;
    for(let ray=0;ray<rays;ray++){
      const a0=(Math.PI/2)*ray/rays,a1=(Math.PI/2)*(ray+1)/rays;
      positions.push(...world(Math.cos(a0)*radius,Math.sin(a0)*radius),...world(Math.cos(a1)*radius,Math.sin(a1)*radius));
    }
  }
}

function buildNightmareCastleVisuals(floorRooms){
  const group=new THREE.Group(),rooms=floorRooms.flat();
  const entrance=rooms.find(room=>room.floorIndex===0&&room.roomIndex===0);
  const entranceFaces=entrance?collectRegionalWallFaces([entrance],0x4d3e51).slice(0,4):[];
  const otherFaces=collectRegionalWallFaces(rooms.filter(room=>room!==entrance),0x4d3e51).slice(0,8),webPositions=[];
  entranceFaces.forEach(face=>appendCastleWeb(webPositions,face,4.4,5.3));
  otherFaces.forEach(face=>appendCastleWeb(webPositions,face,2.25,2.25));
  if(webPositions.length){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(webPositions,3));geometry.computeBoundingSphere();
    group.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xb7b0c6,transparent:true,opacity:0.56,depthWrite:false})));
  }

  const random=seededRandom(0x4e454d53),open=[],spawnX=stageBounds.minX+cellSize*1.5,spawnZ=stageBounds.minZ+cellSize*1.5;
  rooms.forEach(room=>{
    if(room.floorIndex===0&&room.roomIndex===0)return;
    const cells=[];
    for(let y=1;y<mazeSize-1;y++)for(let x=1;x<mazeSize-1;x++)if(room.grid[y][x]===0){
      const worldX=room.roomX+(x+0.5)*cellSize,worldZ=room.roomZ+(y+0.5)*cellSize;
      const wallDirs=[{dx:0,dy:-1,x:0,z:-1},{dx:0,dy:1,x:0,z:1},{dx:-1,dy:0,x:-1,z:0},{dx:1,dy:0,x:1,z:0}].filter(dir=>room.grid[y+dir.dy][x+dir.dx]===1);
      if(Math.hypot(worldX-spawnX,worldZ-spawnZ)>8)cells.push({x,y,wallDir:wallDirs.length?wallDirs[Math.floor(random()*wallDirs.length)]:null});
    }
    if(cells.length)open.push({room,cell:cells[Math.floor(random()*cells.length)]});
  });
  const cocoonSpots=open.filter((_,index)=>index%3===0).slice(0,8);
  if(cocoonSpots.length){
    const geometry=new THREE.LatheGeometry([
      new THREE.Vector2(0,-1.3),new THREE.Vector2(0.22,-1.22),new THREE.Vector2(0.43,-0.92),
      new THREE.Vector2(0.58,-0.48),new THREE.Vector2(0.62,0),new THREE.Vector2(0.54,0.48),
      new THREE.Vector2(0.36,0.88),new THREE.Vector2(0.16,1.16),new THREE.Vector2(0,1.3)
    ],10);
    const material=new THREE.MeshBasicMaterial({color:0x251b2d,toneMapped:false});
    const mesh=new THREE.InstancedMesh(geometry,material,cocoonSpots.length),dummy=new THREE.Object3D();
    const ringGeometry=new THREE.TorusGeometry(0.62,0.022,4,12),ringMaterial=new THREE.MeshBasicMaterial({color:0x9c83ad,toneMapped:false});
    const rings=new THREE.InstancedMesh(ringGeometry,ringMaterial,cocoonSpots.length*3);
    const threadGeometry=new THREE.CylinderGeometry(0.008,0.018,1,5),threadMaterial=new THREE.MeshBasicMaterial({color:0x231b2c,toneMapped:false});
    const threads=new THREE.InstancedMesh(threadGeometry,threadMaterial,cocoonSpots.length);
    let ringIndex=0;
    cocoonSpots.forEach((entry,index)=>{
      const wallOffset=0.95,wallDir=entry.cell.wallDir;
      const x=entry.room.roomX+(entry.cell.x+0.5)*cellSize+(wallDir?wallDir.x*wallOffset:0),z=entry.room.roomZ+(entry.cell.y+0.5)*cellSize+(wallDir?wallDir.z*wallOffset:0);
      dummy.position.set(x,entry.room.floorY+7.7,z);dummy.rotation.set(0,random()*Math.PI,0);dummy.scale.set(1,1,1);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
      [-0.24,0,0.24].forEach(heightOffset=>{
        const ringScale=heightOffset===0?1:0.97;
        dummy.position.set(x,entry.room.floorY+7.7+heightOffset,z);dummy.rotation.set(Math.PI/2,random()*Math.PI*2,0);dummy.scale.set(ringScale,ringScale,ringScale);dummy.updateMatrix();rings.setMatrixAt(ringIndex++,dummy.matrix);
      });
      dummy.position.set(x,entry.room.floorY+9.65,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1.25,1);dummy.updateMatrix();threads.setMatrixAt(index,dummy.matrix);
    });
    [mesh,rings,threads].forEach(item=>{item.instanceMatrix.needsUpdate=true;item.castShadow=false;item.receiveShadow=false;group.add(item);});
  }
  const boneFaces=collectRegionalWallFaces(rooms,0x6b0e51).slice(0,10);
  if(boneFaces.length){
    const geometry=new THREE.CylinderGeometry(0.075,0.12,1.2,6),material=new THREE.MeshStandardMaterial({color:0x9c9387,roughness:0.96});
    const bones=new THREE.InstancedMesh(geometry,material,boneFaces.length),dummy=new THREE.Object3D();
    boneFaces.forEach((face,index)=>{
      dummy.position.set(face.x+face.nx*0.72,face.floorY+0.16,face.z+face.nz*0.72);
      dummy.rotation.set(index%2?Math.PI/2:0,face.yaw,Math.PI/2+(random()-0.5)*0.45);dummy.scale.set(1,1,1);dummy.updateMatrix();bones.setMatrixAt(index,dummy.matrix);
    });
    bones.instanceMatrix.needsUpdate=true;bones.castShadow=false;bones.receiveShadow=true;group.add(bones);
  }
  if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
}

let cathedralGroundTierAtmosphere=null;
let cathedralGroundFogTexture=null;

function getCathedralGroundFogTexture(){
  if(cathedralGroundFogTexture)return cathedralGroundFogTexture;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(128,128,8,128,128,126);
  gradient.addColorStop(0,'rgba(226,238,246,0.23)');
  gradient.addColorStop(0.28,'rgba(191,211,226,0.16)');
  gradient.addColorStop(0.68,'rgba(151,177,198,0.055)');
  gradient.addColorStop(1,'rgba(120,151,179,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
  let seed=0x51a7f09;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<420;i++){
    const x=random()*256,y=random()*256,r=2+random()*13;
    ctx.fillStyle=`rgba(205,222,235,${0.006+random()*0.018})`;
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  cathedralGroundFogTexture=new THREE.CanvasTexture(canvas);
  if(THREE.sRGBEncoding!==undefined)cathedralGroundFogTexture.encoding=THREE.sRGBEncoding;
  return cathedralGroundFogTexture;
}

function isCathedralWallDetailClear(face){
  const nearStair=Array.isArray(stairs)&&stairs.some(stair=>
    Math.abs(face.floorY-stair.lowerY)<0.1&&
    Math.abs(face.x-stair.x)<stair.width/2+2.0&&
    face.z>=stair.z-2.0&&face.z<=stair.z+stair.run+2.0
  );
  if(nearStair)return false;
  return true;
}

function addCathedralGroundTierVisuals(group,groundRooms){
  if(!group||!groundRooms||!groundRooms.length)return;
  const surfaces=createSurfaceTextures(),seed=0xc47ed2;
  const random=seededRandom(seed);
  const entrance=groundRooms.find(room=>room.roomIndex===0)||groundRooms[0];
  const centerX=entrance.roomX+cellSize*3.5,centerZ=entrance.roomZ+cellSize*3.5;
  const floorY=entrance.floorY;

  const floorMosaic=new THREE.Mesh(new THREE.CircleGeometry(5.8,48),new THREE.MeshStandardMaterial({
    color:0x74808d,map:surfaces.floor,normalMap:surfaces.floorNormal,normalScale:new THREE.Vector2(0.42,0.42),
    roughnessMap:surfaces.floorRoughness,roughness:0.52,metalness:0.08
  }));
  floorMosaic.rotation.x=-Math.PI/2;floorMosaic.position.set(centerX,floorY+0.058,centerZ);group.add(floorMosaic);
  const mosaicRing=new THREE.Mesh(new THREE.RingGeometry(4.7,4.84,56),new THREE.MeshStandardMaterial({color:0x665842,metalness:0.48,roughness:0.52,side:THREE.DoubleSide}));
  mosaicRing.rotation.x=-Math.PI/2;mosaicRing.position.set(centerX,floorY+0.079,centerZ);group.add(mosaicRing);
  const roseGeometry=new THREE.BoxGeometry(0.085,0.026,3.25),roseMaterial=new THREE.MeshStandardMaterial({color:0x70624e,metalness:0.56,roughness:0.48});
  const rose=new THREE.InstancedMesh(roseGeometry,roseMaterial,8),roseTransform=new THREE.Object3D();
  for(let i=0;i<8;i++){
    roseTransform.position.set(centerX,floorY+0.083,centerZ);roseTransform.rotation.set(0,i*Math.PI/4,0);
    roseTransform.updateMatrix();rose.setMatrixAt(i,roseTransform.matrix);
  }
  rose.instanceMatrix.needsUpdate=true;rose.castShadow=false;rose.receiveShadow=false;group.add(rose);

  const allFaces=collectRegionalWallFaces(groundRooms,seed).filter(face=>{
    const nearSpawn=face.roomIndex===0&&Math.hypot(face.x-centerX,face.z-centerZ)<8.5;
    return !nearSpawn&&isCathedralWallDetailClear(face);
  });
  const stride=Math.max(3,Math.floor(allFaces.length/19)),detailFaces=[];
  for(let i=0;i<allFaces.length&&detailFaces.length<22;i+=stride)detailFaces.push(allFaces[i]);
  if(detailFaces.length){
    const coolStone=new THREE.MeshStandardMaterial({color:0x87919d,map:surfaces.wall,normalMap:surfaces.wallNormal,
      normalScale:new THREE.Vector2(0.68,0.68),roughnessMap:surfaces.wallRoughness,roughness:0.9,metalness:0.035});
    const shaft=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3,0.4,1,9),coolStone,detailFaces.length);
    const plinth=new THREE.InstancedMesh(new THREE.BoxGeometry(1.02,0.38,1.02),coolStone,detailFaces.length);
    const capital=new THREE.InstancedMesh(new THREE.BoxGeometry(1.12,0.34,1.12),coolStone,detailFaces.length);
    const transform=new THREE.Object3D();
    detailFaces.forEach((face,index)=>{
      const x=face.x+face.nx*0.48,z=face.z+face.nz*0.48;
      transform.position.set(x,face.floorY+3.43,z);transform.rotation.set(0,face.yaw,0);transform.scale.set(1,6.48,1);transform.updateMatrix();shaft.setMatrixAt(index,transform.matrix);
      transform.position.set(x,face.floorY+0.19,z);transform.scale.set(1,1,1);transform.updateMatrix();plinth.setMatrixAt(index,transform.matrix);
      transform.position.set(x,face.floorY+6.72,z);transform.updateMatrix();capital.setMatrixAt(index,transform.matrix);
    });
    [shaft,plinth,capital].forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);});

    const rubbleFaces=detailFaces.filter((_,index)=>index%2===0).slice(0,12);
    if(rubbleFaces.length){
      const rubbleMaterial=new THREE.MeshStandardMaterial({color:0x555c64,map:surfaces.wall,normalMap:surfaces.wallNormal,
        normalScale:new THREE.Vector2(0.55,0.55),roughnessMap:surfaces.wallRoughness,roughness:0.97});
      const rubble=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.72,0),rubbleMaterial,rubbleFaces.length);
      rubbleFaces.forEach((face,index)=>{
        transform.position.set(face.x+face.nx*1.05,floorY+0.2,face.z+face.nz*1.05);
        transform.rotation.set(random()*0.38,random()*Math.PI*2,random()*0.34);
        transform.scale.set(0.56+random()*0.28,0.2+random()*0.22,0.4+random()*0.34);transform.updateMatrix();rubble.setMatrixAt(index,transform.matrix);
      });
      rubble.instanceMatrix.needsUpdate=true;rubble.castShadow=false;rubble.receiveShadow=true;group.add(rubble);
    }
  }

  const wetSpots=[];
  const wetRandom=seededRandom(seed^0x3179ac);
  groundRooms.forEach(room=>{
    for(let row=1;row<mazeSize-1;row++)for(let col=1;col<mazeSize-1;col++){
      if(room.grid[row][col]!==0||wetRandom()>0.12)continue;
      const x=room.roomX+(col+0.5)*cellSize,z=room.roomZ+(row+0.5)*cellSize;
      if(room.roomIndex===0&&Math.hypot(x-centerX,z-centerZ)<8.0)continue;
      wetSpots.push({x,z,y:room.floorY+0.044,sx:0.8+wetRandom()*1.25,sz:0.38+wetRandom()*0.48,angle:wetRandom()*Math.PI});
    }
  });
  if(wetSpots.length){
    const puddles=new THREE.InstancedMesh(new THREE.CircleGeometry(1,20),new THREE.MeshStandardMaterial({
      color:0x526a79,emissive:0x0d151b,emissiveIntensity:0.16,metalness:0.28,roughness:0.13,
      transparent:true,opacity:0.42,side:THREE.DoubleSide,depthWrite:false
    }),wetSpots.length);
    const transform=new THREE.Object3D();
    wetSpots.forEach((spot,index)=>{
      transform.position.set(spot.x,spot.y,spot.z);transform.rotation.set(-Math.PI/2,0,spot.angle);
      transform.scale.set(spot.sx,spot.sz,1);transform.updateMatrix();puddles.setMatrixAt(index,transform.matrix);
    });
    puddles.instanceMatrix.needsUpdate=true;puddles.castShadow=false;puddles.receiveShadow=false;group.add(puddles);
  }

  const urnFaces=[];
  groundRooms.filter(room=>room.roomIndex!==0&&room.roomIndex%2===1).forEach(room=>{
    const candidates=collectRegionalWallFaces([room],seed+room.roomIndex*31).filter(isCathedralWallDetailClear);
    if(candidates.length&&urnFaces.length<5)urnFaces.push(candidates[0]);
  });
  if(urnFaces.length){
    const brassStone=new THREE.MeshStandardMaterial({color:0x59544d,map:surfaces.wall,normalMap:surfaces.wallNormal,
      normalScale:new THREE.Vector2(0.42,0.42),roughnessMap:surfaces.wallRoughness,roughness:0.91,metalness:0.06});
    const pedestal=new THREE.InstancedMesh(new THREE.BoxGeometry(0.72,0.42,0.72),brassStone,urnFaces.length);
    const urnProfile=[[0,0],[0.28,0],[0.42,0.18],[0.38,0.47],[0.52,0.82],[0.44,1.16],[0.28,1.42],[0,1.5]];
    const urnGeometry=new THREE.LatheGeometry(urnProfile.map(([r,y])=>new THREE.Vector2(r,y)),12);
    const urns=new THREE.InstancedMesh(urnGeometry,brassStone,urnFaces.length),transform=new THREE.Object3D();
    urnFaces.forEach((face,index)=>{
      const x=face.x+face.nx*0.96,z=face.z+face.nz*0.96;
      transform.position.set(x,face.floorY+0.21,z);transform.rotation.set(0,face.yaw,0);transform.scale.set(1,1,1);transform.updateMatrix();pedestal.setMatrixAt(index,transform.matrix);
      transform.position.set(x,face.floorY+0.42,z);transform.updateMatrix();urns.setMatrixAt(index,transform.matrix);
    });
    [pedestal,urns].forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);});
  }

  const lampFaces=[];
  groundRooms.filter(room=>room.roomIndex%2===0).forEach(room=>{
    const candidates=collectRegionalWallFaces([room],seed+room.roomIndex*47).filter(face=>{
      if(!isCathedralWallDetailClear(face))return false;
      return room.roomIndex!==0||Math.hypot(face.x-centerX,face.z-centerZ)>10.0;
    });
    if(candidates.length&&lampFaces.length<5)lampFaces.push(candidates[0]);
  });
  const lights=[],flameBases=[];
  if(lampFaces.length){
    const bronze=new THREE.MeshStandardMaterial({color:0x55432e,metalness:0.66,roughness:0.42});
    const bracket=new THREE.InstancedMesh(new THREE.BoxGeometry(0.68,0.13,0.16),bronze,lampFaces.length);
    const stem=new THREE.InstancedMesh(new THREE.BoxGeometry(0.13,0.52,0.13),bronze,lampFaces.length);
    const flameMaterial=new THREE.MeshBasicMaterial({color:0xffa14c,toneMapped:false});
    const flames=new THREE.InstancedMesh(new THREE.SphereGeometry(0.15,8,6),flameMaterial,lampFaces.length);
    const transform=new THREE.Object3D();
    lampFaces.forEach((face,index)=>{
      const x=face.x+face.nx*0.48,z=face.z+face.nz*0.48,y=face.floorY+4.55;
      transform.position.set(x,y-0.16,z);transform.rotation.set(0,face.yaw,0);transform.scale.set(1,1,1);transform.updateMatrix();bracket.setMatrixAt(index,transform.matrix);
      transform.position.set(x,y-0.31,z);transform.updateMatrix();stem.setMatrixAt(index,transform.matrix);
      transform.position.set(x+face.nx*0.18,y+0.19,z+face.nz*0.18);transform.scale.set(0.8,1.3,0.8);transform.updateMatrix();flames.setMatrixAt(index,transform.matrix);
      flameBases.push({x:x+face.nx*0.18,y:y+0.19,z:z+face.nz*0.18,phase:index*1.73,scale:0.8});
      const light=new THREE.PointLight(0xff9a48,1.15,12,2);light.position.set(x+face.nx*0.35,y+0.26,z+face.nz*0.35);
      light.castShadow=false;registerGraphicsPointLight(light);group.add(light);lights.push(light);
    });
    [bracket,stem,flames].forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);});
    for(const [dx,dz] of [[-8,-7],[10,9]]){
      const coolFill=new THREE.PointLight(0x779bb9,0.36,18,2);
      coolFill.position.set(centerX+dx,floorY+6.2,centerZ+dz);coolFill.castShadow=false;group.add(coolFill);
    }

    const fogCandidates=[];
    groundRooms.forEach(room=>{
      const open=[];
      for(let row=1;row<mazeSize-1;row++)for(let col=1;col<mazeSize-1;col++)if(room.grid[row][col]===0){
        const x=room.roomX+(col+0.5)*cellSize,z=room.roomZ+(row+0.5)*cellSize;
        if(room.roomIndex!==0||Math.hypot(x-centerX,z-centerZ)>9)open.push({x,z,y:room.floorY+0.12});
      }
      if(open.length&&fogCandidates.length<10){
        const picked=open[Math.floor(random()*open.length)];
        fogCandidates.push({...picked,sx:7.5+random()*5.5,sz:3.4+random()*2.1,angle:random()*Math.PI,phase:random()*Math.PI*2});
      }
    });
    if(fogCandidates.length){
      const fog=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({
        map:getCathedralGroundFogTexture(),color:0x9db3c4,transparent:true,opacity:0.34,depthWrite:false,
        side:THREE.DoubleSide,toneMapped:false
      }),fogCandidates.length);
      fogCandidates.forEach((patch,index)=>{
        transform.position.set(patch.x,patch.y,patch.z);transform.rotation.set(-Math.PI/2,0,patch.angle);
        transform.scale.set(patch.sx,patch.sz,1);transform.updateMatrix();fog.setMatrixAt(index,transform.matrix);
      });
      fog.instanceMatrix.needsUpdate=true;fog.frustumCulled=false;fog.renderOrder=3;group.add(fog);
      cathedralGroundTierAtmosphere={fog,fogPatches:fogCandidates,flames,flameBases,lights,lastUpdate:0};
    }else cathedralGroundTierAtmosphere={flames,flameBases,lights,lastUpdate:0};
  }else cathedralGroundTierAtmosphere=null;
}

function updateCathedralGroundTierAtmosphere(time){
  const state=cathedralGroundTierAtmosphere;
  if(!state||gameMode!==GameMode.PLAYING||currentLocation!==1||currentFloorIndex!==0||time-state.lastUpdate<0.05)return;
  state.lastUpdate=time;
  const transform=new THREE.Object3D();
  if(state.fog){
    state.fogPatches.forEach((patch,index)=>{
      const drift=time*0.12+patch.phase;
      transform.position.set(patch.x+Math.sin(drift)*1.4,patch.y+Math.sin(drift*0.7)*0.045,patch.z+Math.cos(drift*0.83)*1.0);
      transform.rotation.set(-Math.PI/2,0,patch.angle+Math.sin(drift*0.35)*0.04);
      transform.scale.set(patch.sx*(1+Math.sin(drift)*0.035),patch.sz*(1+Math.cos(drift)*0.045),1);
      transform.updateMatrix();state.fog.setMatrixAt(index,transform.matrix);
    });
    state.fog.instanceMatrix.needsUpdate=true;
  }
  if(state.flames){
    state.flameBases.forEach((flame,index)=>{
      const pulse=0.91+Math.sin(time*8+flame.phase)*0.09+Math.sin(time*14+flame.phase*0.7)*0.04;
      transform.position.set(flame.x,flame.y+Math.sin(time*10+flame.phase)*0.025,flame.z);
      transform.rotation.set(0,flame.phase,Math.sin(time*5+flame.phase)*0.08);
      transform.scale.set(flame.scale*(0.92+Math.sin(time*7+flame.phase)*0.06),flame.scale*pulse,flame.scale*(0.9+Math.cos(time*9+flame.phase)*0.05));
      transform.updateMatrix();state.flames.setMatrixAt(index,transform.matrix);
    });
    state.flames.instanceMatrix.needsUpdate=true;
  }
  state.lights.forEach((light,index)=>{light.intensity=1.04+Math.sin(time*8+index*1.73)*0.09+Math.sin(time*13+index*0.71)*0.045;});
}

function resetCathedralGroundTierAtmosphere(){cathedralGroundTierAtmosphere=null;}

function buildMountainCanyonVisuals(ox,oz){
  const group=new THREE.Group(),route=getMountainRouteLayout(ox,oz),random=seededRandom(0x91c4a7),surface=createSurfaceTextures();
  const rockMaterial=new THREE.MeshStandardMaterial({color:0x394b54,map:surface.wall,normalMap:surface.wallNormal,normalScale:new THREE.Vector2(0.72,0.72),roughnessMap:surface.wallRoughness,roughness:0.98,metalness:0.02});
  const snowMaterial=new THREE.MeshStandardMaterial({color:0x9aaeba,roughness:0.86,metalness:0.01});
  const rockGeometry=new THREE.DodecahedronGeometry(1,1),rocks=[];
  const edgePoints=[];
  for(let i=0;i<30;i++){
    const t=i/29,z=stageBounds.minZ+8+t*(STAGE_WORLD_DEPTH-16),side=i%2?-1:1;
    edgePoints.push({x:side*(STAGE_WORLD_WIDTH/2-8)+((i%3)-1)*2,z,y:2.8+random()*3.8,sx:2.8+random()*2.6,sy:2.5+random()*4.2,sz:2.0+random()*2.4});
  }
  for(let i=0;i<12;i++){
    const angle=random()*Math.PI*2,radius=18+random()*28;
    edgePoints.push({x:route.valleyX+Math.cos(angle)*radius,z:route.valleyZ+Math.sin(angle)*radius,y:1.2+random()*2.5,sx:2+random()*2.5,sy:1.3+random()*2.8,sz:2+random()*2.5});
  }
  const rockMesh=new THREE.InstancedMesh(rockGeometry,rockMaterial,edgePoints.length),snowMesh=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,6),snowMaterial,edgePoints.length),dummy=new THREE.Object3D();
  edgePoints.forEach((point,index)=>{
    dummy.position.set(point.x,point.y,point.z);dummy.rotation.set(random()*0.2,random()*Math.PI,random()*0.18);dummy.scale.set(point.sx,point.sy,point.sz);dummy.updateMatrix();rockMesh.setMatrixAt(index,dummy.matrix);
    dummy.position.set(point.x,point.y+point.sy*0.72,point.z);dummy.rotation.set(0,random()*Math.PI,0);dummy.scale.set(point.sx*0.62,point.sy*0.34,point.sz*0.62);dummy.updateMatrix();snowMesh.setMatrixAt(index,dummy.matrix);
  });
  [rockMesh,snowMesh].forEach(mesh=>{mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;group.add(mesh);});

  const trailMaterial=new THREE.MeshStandardMaterial({color:0x647681,roughness:0.9,metalness:0.04});
  const trailGeometry=new THREE.BoxGeometry(3.2,0.16,1.35),trailPoints=[];
  const addTrail=(a,b,count)=>{for(let i=0;i<count;i++){const t=(i+0.5)/count;trailPoints.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.x-a.x,b.z-a.z)});}};
  addTrail({x:route.valleyX,y:0.12,z:route.valleyZ},{x:route.wellX,y:0.12,z:route.wellZ},10);
  addTrail({x:route.valleyX,y:0.12,z:route.valleyZ},{x:route.bridgeX,y:FLOOR_HEIGHT+0.12,z:route.bridgeZ},12);
  addTrail({x:route.spiralX,y:0.12,z:route.spiralZ},{x:route.gateX,y:0.12,z:route.gateZ},13);
  const trailMesh=new THREE.InstancedMesh(trailGeometry,trailMaterial,trailPoints.length);
  trailPoints.forEach((point,index)=>{dummy.position.set(point.x,point.y,point.z);dummy.rotation.set(0,point.angle,0);dummy.scale.set(1+random()*0.35,1,0.72+random()*0.35);dummy.updateMatrix();trailMesh.setMatrixAt(index,dummy.matrix);});
  trailMesh.instanceMatrix.needsUpdate=true;trailMesh.castShadow=false;trailMesh.receiveShadow=true;group.add(trailMesh);

  const ruinMaterial=new THREE.MeshStandardMaterial({color:0x46545b,map:surface.wall,normalMap:surface.wallNormal,roughnessMap:surface.wallRoughness,roughness:0.95});
  const ruinX=stageBounds.maxX-14,ruinZ=stageBounds.minZ+18;
  const ruin=new THREE.Group();
  const ruinPosts=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,9,2.2),ruinMaterial,3);
  [[ruinX-8,ruinZ],[ruinX,ruinZ-2],[ruinX+8,ruinZ+1]].forEach(([x,z],index)=>{dummy.position.set(x,4.5,z);dummy.rotation.set(0,(index-1)*0.08,0);dummy.scale.set(1,0.8+random()*0.35,1);dummy.updateMatrix();ruinPosts.setMatrixAt(index,dummy.matrix);});
  ruinPosts.instanceMatrix.needsUpdate=true;ruin.add(ruinPosts);
  const arch=new THREE.Mesh(new THREE.TorusGeometry(5.4,0.75,7,16,Math.PI),ruinMaterial);arch.position.set(ruinX,8.1,ruinZ-0.9);arch.rotation.set(Math.PI/2,0,0);ruin.add(arch);group.add(ruin);
  const routeLights=[];
  [[route.valleyX+7,route.valleyZ+1,0xff9a4d],[route.wellX,route.wellZ,0x73a9c5],[route.gateX,route.gateZ,0xb8cce0]].forEach(([x,z,color])=>{const light=new THREE.PointLight(color,0.72,16,2);light.position.set(x,2.1,z);light.castShadow=false;group.add(light);routeLights.push(light);});
  group.userData.routeLights=routeLights;
  if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
}

function buildRegionalVisuals(locationIndex,floorRooms,ox,oz){
  if(!scene||!floorRooms)return;
  buildCathedralInteriorVisuals(floorRooms);
  if(locationIndex===0)buildYharnamStreetVisuals(floorRooms);
  else if(locationIndex===2)buildGothicChasmAtmosphere(ox,oz);
  else if(locationIndex===3)buildNightmareCastleVisuals(floorRooms);
}
