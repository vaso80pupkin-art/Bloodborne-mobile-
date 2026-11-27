let altarFireRefs=[];
let altarFireLight=null;
let altarEmberRefs=[];
function createAltarFlameGeometry(){
  const profile=[[0,0.31,0],[0.12,0.41,0.015],[0.34,0.32,0.045],[0.58,0.22,0.105],[0.79,0.13,0.16],[0.94,0.055,0.205],[1,0.008,0.225]];
  const segments=9,vertices=[],indices=[];
  profile.forEach(([y,r,shift])=>{
    for(let i=0;i<segments;i++){
      const angle=i/segments*Math.PI*2;
      vertices.push(Math.cos(angle)*r+shift,y,Math.sin(angle)*r);
    }
  });
  for(let row=0;row<profile.length-1;row++)for(let i=0;i<segments;i++){
    const a=row*segments+i,b=row*segments+(i+1)%segments,c=(row+1)*segments+i,d=(row+1)*segments+(i+1)%segments;
    indices.push(a,b,c,b,d,c);
  }
  const tip=vertices.length/3;vertices.push(0.23,1.04,0);
  const last=(profile.length-1)*segments;
  for(let i=0;i<segments;i++)indices.push(last+i,last+(i+1)%segments,tip);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}
function updateAltarFire(time){
  if(!altarFireRefs.length)return;
  altarFireRefs.forEach(flame=>{
    const data=flame.userData,phase=data.phase;
    const pulse=0.93+Math.sin(time*8.5+phase)*0.095+Math.sin(time*15.7+phase*0.63)*0.045;
    flame.scale.set(data.baseScaleX*(1+Math.sin(time*7+phase)*0.035),data.baseScaleY*pulse,data.baseScaleZ*(1+Math.sin(time*9+phase)*0.045));
    flame.position.set(data.baseX+Math.sin(time*4.2+phase)*0.035,data.baseY+Math.sin(time*10+phase)*0.018,data.baseZ+Math.cos(time*3.7+phase)*0.025);
    flame.rotation.z=data.baseRotation+Math.sin(time*5.4+phase)*0.065;
  });
  altarEmberRefs.forEach(ember=>{
    const data=ember.userData,p=(time*data.speed+data.phase)%1;
    ember.position.set(data.baseX+Math.sin(time*4+data.phase)*0.11,data.baseY+p*data.rise,data.baseZ+Math.cos(time*3.2+data.phase)*0.08);
    ember.material.opacity=(1-p)*0.76;ember.scale.setScalar(data.baseSize*(1-p*0.38));
  });
  if(altarFireLight){const flicker=0.92+Math.sin(time*8.2)*0.08+Math.sin(time*15.3+0.7)*0.045;altarFireLight.intensity=1.8*flicker;altarFireLight.position.y=altarFireLight.userData.baseY+Math.sin(time*6.5)*0.025;}
}

function createCobblestoneFloor(width,ox,oz,depth=width,levelY=0,holes=[],ceiling=false,segmentSpacing=3){
  if(!scene) return;
  const surfaces=createSurfaceTextures();
  surfaces.floor.repeat.set(Math.max(1,width/4.5),Math.max(1,depth/4.5));
  surfaces.floorBump.repeat.set(Math.max(1,width/4.5),Math.max(1,depth/4.5));
  surfaces.floorNormal.repeat.copy(surfaces.floor.repeat);
  surfaces.floorRoughness.repeat.copy(surfaces.floor.repeat);
  let regions=[{x0:ox,x1:ox+width,z0:oz,z1:oz+depth}];
  holes.forEach(hole=>{
    const next=[];
    regions.forEach(region=>{
      const x0=Math.max(region.x0,hole.x0),x1=Math.min(region.x1,hole.x1),z0=Math.max(region.z0,hole.z0),z1=Math.min(region.z1,hole.z1);
      if(x0>=x1||z0>=z1){next.push(region);return;}
      if(z0>region.z0) next.push({x0:region.x0,x1:region.x1,z0:region.z0,z1:z0});
      if(z1<region.z1) next.push({x0:region.x0,x1:region.x1,z0:z1,z1:region.z1});
      if(x0>region.x0) next.push({x0:region.x0,x1:x0,z0:z0,z1:z1});
      if(x1<region.x1) next.push({x0:x1,x1:region.x1,z0:z0,z1:z1});
    });
    regions=next;
  });
  regions.forEach(r=>addCobblePatch(r.x1-r.x0,r.z1-r.z0,(r.x0+r.x1)/2,(r.z0+r.z1)/2,levelY,ceiling,segmentSpacing));
}

let roomWallUnitGeometry=null;
function addRoomWallBatch(boxes,roomBounds,floorY,locationIndex=currentLocation){
  if(!boxes.length) return;
  if(!roomWallUnitGeometry) roomWallUnitGeometry=new THREE.BoxGeometry(1,1,1);
  const p=roomWallUnitGeometry.attributes.position.array,n=roomWallUnitGeometry.attributes.normal.array,u=roomWallUnitGeometry.attributes.uv.array,idx=roomWallUnitGeometry.index.array;
  const positions=[],normals=[],uvs=[],indices=[];
  boxes.forEach(box=>{
    const width=box.maxX-box.minX,height=box.maxY-box.minY,depth=box.maxZ-box.minZ,base=positions.length/3;
    for(let i=0;i<p.length;i+=3) positions.push(p[i]*width+box.cx,p[i+1]*height+box.cy,p[i+2]*depth+box.cz);
    for(let i=0;i<n.length;i++) normals.push(n[i]);
    for(let i=0;i<u.length;i+=2){
      const normalX=n[(i/2)*3];
      const faceWidth=Math.abs(normalX)>0.5?box.maxZ-box.minZ:(box.maxX-box.minX);
      uvs.push(u[i]*Math.max(0.5,faceWidth/4.5),u[i+1]*Math.max(0.5,box.h/4.5));
    }
    for(let i=0;i<idx.length;i++) indices.push(base+idx[i]);
  });
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices); geometry.computeBoundingSphere();
  const tex=createSurfaceTextures(),palette=getLocationVisualPalette(locationIndex);
  const material=new THREE.MeshStandardMaterial({color:palette.wall,map:tex.wall,normalMap:tex.wallNormal,normalScale:new THREE.Vector2(0.62,0.62),roughnessMap:tex.wallRoughness,roughness:0.92,metalness:0.02,transparent:true,opacity:1});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.castShadow=true; mesh.receiveShadow=true;
  mesh.userData={isRoomBatch:true,colliders:boxes,targetOpacity:1,cx:(roomBounds.minX+roomBounds.maxX)/2,cy:floorY+5.25,cz:(roomBounds.minZ+roomBounds.maxZ)/2,minX:roomBounds.minX,maxX:roomBounds.maxX,minZ:roomBounds.minZ,maxZ:roomBounds.maxZ,w:roomBounds.maxX-roomBounds.minX,h:10.5,d:roomBounds.maxZ-roomBounds.minZ,floorY};
  scene.add(mesh); wallMeshes.push(mesh); wallColliders.push(...boxes);
}

function addWalkableStaircase(x,z,lowerY,upperY,run=28,width=4.8,style='stone'){
  const rise=upperY-lowerY, count=Math.ceil(run/1.05), tread=run/count, stepRise=rise/count;
  const group=new THREE.Group();
  const isStone=style==='stone',isRope=style==='rope';
  const treadMaterial=new THREE.MeshStandardMaterial({color:isStone?0x27252a:(isRope?0x513a24:0x4d3020),roughness:isStone?0.9:0.82,bumpMap:createSurfaceTextures().wallBump,bumpScale:0.11});
  const edge=new THREE.MeshStandardMaterial({color:isStone?0x4a454b:(isRope?0x39281c:0x31231c),roughness:0.86,metalness:isStone?0.14:0.02});
  const fenceMaterial=new THREE.MeshStandardMaterial({color:isStone?0x625e67:(isRope?0x59432e:0x68482f),roughness:0.82,metalness:isStone?0.08:0.02});
  if(isRope){
    const rungCount=Math.floor(run/1.15);
    const rungGeometry=new THREE.CylinderGeometry(0.12,0.12,width,8);
    for(let i=0;i<=rungCount;i++){
      const t=i/rungCount, rung=new THREE.Mesh(rungGeometry,treadMaterial);
      rung.rotation.z=Math.PI/2; rung.position.set(0,lowerY+t*rise,zOffset(t,run)); rung.castShadow=true; group.add(rung);
    }
    const ropeLength=Math.sqrt(run*run+rise*rise),ropeAngle=Math.atan2(run,rise);
    const ropeGeometry=new THREE.CylinderGeometry(0.075,0.075,ropeLength,8),anchorGeometry=new THREE.SphereGeometry(0.18,10,8);
    for(const side of [-1,1]){
      const rope=new THREE.Mesh(ropeGeometry,edge);
      rope.position.set(side*(width/2+0.1),(lowerY+upperY)/2,run/2);rope.rotation.x=ropeAngle;group.add(rope);
      const anchor=new THREE.Mesh(anchorGeometry,edge);
      anchor.position.set(side*(width/2+0.1),upperY,run);group.add(anchor);
      const railX=x+side*(width/2+0.1),railHalfWidth=0.18;
      wallColliders.push({minX:railX-railHalfWidth,maxX:railX+railHalfWidth,minY:lowerY,maxY:upperY+0.4,minZ:z-0.2,maxZ:z+run+0.2,cx:railX,cy:(lowerY+upperY)/2,cz:z+run/2,w:railHalfWidth*2,h:upperY-lowerY+0.4,d:run+0.4,floorY:lowerY,stairGuard:true,stairX:x,stairZ:z,stairLowerY:lowerY,stairUpperY:upperY,stairRun:run});
    }
  } else {
    const boxGeometry=new THREE.BoxGeometry(1,1,1);
    for(let i=0;i<count;i++){
      const treadSlab=new THREE.Mesh(boxGeometry,treadMaterial);treadSlab.scale.set(width,0.2,Math.max(0.45,tread-0.08));
      treadSlab.position.set(0,lowerY+(i+1)*stepRise-0.1,(i+0.5)*tread);treadSlab.castShadow=true;treadSlab.receiveShadow=true;group.add(treadSlab);
      const riser=new THREE.Mesh(boxGeometry,edge);riser.scale.set(width,Math.max(0.2,stepRise-0.16),0.15);
      riser.position.set(0,lowerY+(i+0.5)*stepRise,i*tread);riser.castShadow=true;group.add(riser);
    }
    for(const side of [-1,1]){
      const railX=x+side*(width/2+0.12),railHalfWidth=isStone?0.24:0.18;
      wallColliders.push({minX:railX-railHalfWidth,maxX:railX+railHalfWidth,minY:lowerY,maxY:upperY+1.4,minZ:z-0.2,maxZ:z+run+0.2,cx:railX,cy:(lowerY+upperY)/2,cz:z+run/2,w:railHalfWidth*2,h:upperY-lowerY+1.4,d:run+0.4,floorY:lowerY,stairGuard:true,stairX:x,stairZ:z,stairLowerY:lowerY,stairUpperY:upperY,stairRun:run});
    }
  }
  addStairSideFence(group,width,lowerY,upperY,run,fenceMaterial);
  addStairLandingSideFence(group,x,z,width,upperY,run,fenceMaterial);
  group.position.set(x,0,z);scene.add(group);envObjects.push({mesh:group});
  stairs.push({x,z,lowerY,upperY,run,width,style});
  return {x0:x-width/2-0.65,x1:x+width/2+0.65,z0:z-0.8,z1:z+run+0.8};
}

function registerGeneratedDungeonStaircase(stair){
  const {x,z,lower_y:lowerY,upper_y:upperY,run,width}=stair;
  stairs.push({x,z,lowerY,upperY,run,width,style:'stone'});
  for(const side of [-1,1]){
    const railX=x+side*(width/2+0.25),halfWidth=0.225;
    wallColliders.push({minX:railX-halfWidth,maxX:railX+halfWidth,minY:lowerY,maxY:upperY,
      minZ:z-0.2,maxZ:z+run+0.2,cx:railX,cy:(lowerY+upperY)/2,cz:z+run/2,
      w:halfWidth*2,h:upperY-lowerY,d:run+0.4,floorY:lowerY,stairGuard:true,
      stairX:x,stairZ:z,stairLowerY:lowerY,stairUpperY:upperY,stairRun:run});
  }
}

function addStairSideFence(group,width,lowerY,upperY,run,material){
  const rise=upperY-lowerY;
  const fenceHeight=3.8;
  const sideOffset=width/2+0.14;
  const postCount=Math.max(2,Math.ceil(run/3.5));
  const postGeometry=new THREE.BoxGeometry(0.24,fenceHeight,0.24);
  const posts=new THREE.InstancedMesh(postGeometry,material,(postCount+1)*2);
  const marker=new THREE.Object3D();
  let postIndex=0;
  for(const side of [-1,1])for(let i=0;i<=postCount;i++){
    const t=i/postCount;
    marker.position.set(side*sideOffset,lowerY+rise*t+fenceHeight/2,run*t);
    marker.rotation.set(0,0,0);marker.scale.set(1,1,1);marker.updateMatrix();
    posts.setMatrixAt(postIndex++,marker.matrix);
  }
  posts.instanceMatrix.needsUpdate=true;posts.name='stair-waist-fence-posts';
  posts.castShadow=true;posts.receiveShadow=true;posts.frustumCulled=false;group.add(posts);

  const railLength=Math.sqrt(run*run+rise*rise),railAngle=Math.atan2(run,rise);
  const railGeometry=new THREE.BoxGeometry(0.18,railLength,0.24);
  const rails=new THREE.InstancedMesh(railGeometry,material,4);
  let railIndex=0;
  for(const side of [-1,1])for(const heightRatio of [0.5,0.98]){
    marker.position.set(side*sideOffset,lowerY+rise/2+fenceHeight*heightRatio,run/2);
    marker.rotation.set(railAngle,0,0);marker.scale.set(1,1,1);marker.updateMatrix();
    rails.setMatrixAt(railIndex++,marker.matrix);
  }
  rails.instanceMatrix.needsUpdate=true;rails.name='stair-waist-fence-rails';
  rails.castShadow=true;rails.receiveShadow=true;rails.frustumCulled=false;group.add(rails);
}

function addStairLandingSideFence(group,x,z,width,upperY,run,material){
  const landingDepth=3.5,fenceHeight=3.8,sideOffset=width/2+0.14;
  const marker=new THREE.Object3D();
  const postGeometry=new THREE.BoxGeometry(0.24,fenceHeight,0.24);
  const posts=new THREE.InstancedMesh(postGeometry,material,2);
  let postIndex=0;
  for(const side of [-1,1]){
    marker.position.set(side*sideOffset,upperY+fenceHeight/2,run+landingDepth);
    marker.rotation.set(0,0,0);marker.scale.set(1,1,1);marker.updateMatrix();
    posts.setMatrixAt(postIndex++,marker.matrix);
  }
  posts.instanceMatrix.needsUpdate=true;posts.name='stair-landing-fence-posts';
  posts.castShadow=true;posts.receiveShadow=true;posts.frustumCulled=false;group.add(posts);

  const railGeometry=new THREE.BoxGeometry(0.24,0.18,landingDepth);
  const rails=new THREE.InstancedMesh(railGeometry,material,4);
  let railIndex=0;
  for(const side of [-1,1])for(const heightRatio of [0.5,0.98]){
    marker.position.set(side*sideOffset,upperY+fenceHeight*heightRatio,run+landingDepth/2);
    marker.rotation.set(0,0,0);marker.scale.set(1,1,1);marker.updateMatrix();
    rails.setMatrixAt(railIndex++,marker.matrix);
  }
  rails.instanceMatrix.needsUpdate=true;rails.name='stair-landing-fence-rails';
  rails.castShadow=true;rails.receiveShadow=true;rails.frustumCulled=false;group.add(rails);

  const halfWidth=0.18;
  for(const side of [-1,1]){
    const railX=x+side*sideOffset,minZ=z+run-0.12,maxZ=z+run+landingDepth+0.12;
    wallColliders.push({minX:railX-halfWidth,maxX:railX+halfWidth,minY:upperY,maxY:upperY+fenceHeight,
      minZ,maxZ,cx:railX,cy:upperY+fenceHeight/2,cz:(minZ+maxZ)/2,
      w:halfWidth*2,h:fenceHeight,d:maxZ-minZ,floorY:upperY,stairLandingFence:true});
  }
}

function zOffset(t,run){return t*run;}

function seededRandom(seed){
  let state=(seed>>>0)||1;
  return ()=>{state=(state*1664525+1013904223)>>>0; return state/4294967296;};
}

function carveMazeRoute(grid,edge){
  const last=grid.length-1,mid=Math.floor(last/2),open=(x,y)=>{grid[y][x]=0;};
  if(edge==='west'||edge==='east'){
    const x=edge==='west'?0:last;
    for(let xx=Math.min(x,mid);xx<=Math.max(x,mid);xx++) open(xx,mid);
  } else {
    const y=edge==='north'?0:last;
    for(let yy=Math.min(y,mid);yy<=Math.max(y,mid);yy++) open(mid,yy);
  }
}

function makeLancetShape(width,height){
  const half=width/2,shape=new THREE.Shape();
  shape.moveTo(-half,0);shape.lineTo(half,0);shape.lineTo(half,height*0.62);
  shape.quadraticCurveTo(half,height*0.82,0,height);
  shape.quadraticCurveTo(-half,height*0.82,-half,height*0.62);shape.closePath();
  return shape;
}

let chapelTextureAssets=null;
function getChapelTextureAssets(){
  if(chapelTextureAssets) return chapelTextureAssets;
  const loader=new THREE.TextureLoader();
  const load=(file,repeatX=1,repeatY=1,isColor=false)=>{
    const texture=loader.load(`./assets/chapel/${file}`,undefined,undefined,error=>console.warn('[BB] Не удалось загрузить текстуру часовни:',file,error));
    texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
    texture.repeat.set(repeatX,repeatY);
    texture.anisotropy=renderer?Math.min(8,renderer.capabilities.getMaxAnisotropy()):1;
    if(isColor&&THREE.sRGBEncoding!==undefined) texture.encoding=THREE.sRGBEncoding;
    return texture;
  };
  chapelTextureAssets={
    wall:load('wall-albedo.webp',1,1,true),
    floor:load('floor-albedo.webp',6,6,true),
    glass:load('stained-glass.webp',1,1,true)
  };
  return chapelTextureAssets;
}

function buildOedonChapelFoyer(room,floorY){
  if(!room||!scene) return;
  const group=new THREE.Group(),cx=room.roomX+cellSize*3.5,cz=room.roomZ+cellSize*3.5;
  const chapelMaps=getChapelTextureAssets();
  const surfaces=createSurfaceTextures();
  const stone=new THREE.MeshStandardMaterial({color:0x96979d,map:chapelMaps.wall,normalMap:surfaces.wallNormal,normalScale:new THREE.Vector2(0.48,0.48),roughnessMap:surfaces.wallRoughness,roughness:0.96});
  const darkStone=new THREE.MeshStandardMaterial({color:0x5b5c64,map:chapelMaps.wall,normalMap:surfaces.wallNormal,normalScale:new THREE.Vector2(0.42,0.42),roughnessMap:surfaces.wallRoughness,roughness:0.94,metalness:0.02});
  const brass=new THREE.MeshStandardMaterial({color:0x665035,roughness:0.68,metalness:0.58});
  const stainedGlass=new THREE.MeshBasicMaterial({color:0xffffff,map:chapelMaps.glass,side:THREE.DoubleSide,toneMapped:false});
  const makeBox=(w,h,d,material,x,y,z)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
  const makeBeam=(a,b,width,depth,material)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,direction.length(),depth),material);
    mesh.position.copy(start.add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  };

  const chapelWall=wallMeshes.find(wall=>wall.userData&&wall.userData.isRoomBatch&&Math.abs(wall.userData.minX-room.roomX)<0.01&&Math.abs(wall.userData.minZ-room.roomZ)<0.01&&Math.abs(wall.userData.floorY-floorY)<0.01);
  if(chapelWall){
    chapelWall.material.map=chapelMaps.wall;chapelWall.material.normalMap=surfaces.wallNormal;chapelWall.material.roughnessMap=surfaces.wallRoughness;
    chapelWall.material.normalScale.set(0.48,0.48);chapelWall.material.color.setHex(0x999ba3);chapelWall.material.roughness=0.96;chapelWall.material.metalness=0;
    chapelWall.material.needsUpdate=true;
  }
  const floorWash=new THREE.Mesh(new THREE.PlaneGeometry(cellSize*mazeSize,cellSize*mazeSize),new THREE.MeshStandardMaterial({color:0x38414c,map:chapelMaps.floor,normalMap:surfaces.floorNormal,normalScale:new THREE.Vector2(0.48,0.48),roughnessMap:surfaces.floorRoughness,roughness:0.84,metalness:0.025}));
  floorWash.rotation.x=-Math.PI/2;floorWash.position.set(cx,floorY+0.018,cz);group.add(floorWash);
  const mosaicGeometry=new THREE.CircleGeometry(5.3,64),mosaicUv=mosaicGeometry.attributes.uv;
  for(let i=0;i<mosaicUv.count;i++) mosaicUv.setXY(i,0.5+(mosaicUv.getX(i)-0.5)*0.2,0.5+(mosaicUv.getY(i)-0.5)*0.2);
  mosaicUv.needsUpdate=true;
  const mosaic=new THREE.Mesh(mosaicGeometry,new THREE.MeshStandardMaterial({color:0x555d68,map:chapelMaps.floor,normalMap:surfaces.floorNormal,normalScale:new THREE.Vector2(0.35,0.35),roughnessMap:surfaces.floorRoughness,roughness:0.72,metalness:0.04}));
  mosaic.rotation.x=-Math.PI/2;mosaic.position.set(cx,floorY+0.045,cz);group.add(mosaic);
  for(const [inner,outer,color] of [[4.1,4.22,0x514231],[2.4,2.49,0x482f34],[0.52,0.66,0x5b503d]]){
    const ring=new THREE.Mesh(new THREE.RingGeometry(inner,outer,48),new THREE.MeshStandardMaterial({color,roughness:0.88,metalness:0.12,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;ring.position.set(cx,floorY+0.065,cz);group.add(ring);
  }
  for(let i=0;i<8;i++){
    const spoke=new THREE.Mesh(new THREE.BoxGeometry(0.11,0.035,3.55),brass);
    spoke.position.set(cx,floorY+0.075,cz);spoke.rotation.y=i*Math.PI/4;group.add(spoke);
  }

  const columnXs=[cx-11,cx+11],columnZs=[cz-11,cz+11];
  columnZs.forEach(z=>{
    const left=[cx-11,floorY+9.25,z],right=[cx+11,floorY+9.25,z],peak=[cx,floorY+10.55,z];
    makeBeam(left,peak,0.52,0.62,stone);makeBeam(peak,right,0.52,0.62,stone);
  });
  const frontPeak=[cx,floorY+10.55,cz+11],backPeak=[cx,floorY+10.55,cz-11],centerPeak=[cx,floorY+11.1,cz];
  makeBeam(backPeak,centerPeak,0.42,0.52,stone);makeBeam(centerPeak,frontPeak,0.42,0.52,stone);
  makeBeam([cx-11,floorY+10.55,cz],centerPeak,0.42,0.52,stone);makeBeam(centerPeak,[cx+11,floorY+10.55,cz],0.42,0.52,stone);
  const addPointedRib=(left,peak,right)=>{
    const apex=new THREE.Vector3(...peak);
    [left,right].forEach(startValues=>{
      const start=new THREE.Vector3(...startValues),control=start.clone().lerp(apex,0.62);control.y=apex.y-1.15;
      const curve=new THREE.QuadraticBezierCurve3(start,control,apex);
      const rib=new THREE.Mesh(new THREE.TubeGeometry(curve,24,0.2,8,false),stone);
      rib.castShadow=true;rib.receiveShadow=true;group.add(rib);
    });
  };
  columnZs.forEach(z=>addPointedRib([cx-11,floorY+9.25,z],[cx,floorY+10.75,z],[cx+11,floorY+9.25,z]));
  columnXs.forEach(x=>addPointedRib([x,floorY+9.25,cz-11],[x,floorY+11.1,cz],[x,floorY+9.25,cz+11]));
  const columnAccentGeometry=new THREE.TorusGeometry(0.72,0.045,7,18);
  columnXs.forEach(x=>columnZs.forEach(z=>{
    for(const [radius,height,y,material] of [[0.92,0.48,0.24,darkStone],[0.68,8.55,4.75,stone],[0.9,0.55,9.3,darkStone],[1.08,0.38,9.76,stone]]){
      const piece=new THREE.Mesh(new THREE.CylinderGeometry(radius*0.94,radius,height,14),material);
      piece.position.set(x,floorY+y,z);piece.castShadow=true;piece.receiveShadow=true;group.add(piece);
    }
    for(const y of [floorY+0.66,floorY+8.9]){
      const accent=new THREE.Mesh(columnAccentGeometry,brass);accent.rotation.x=Math.PI/2;accent.position.set(x,y,z);group.add(accent);
    }
    wallColliders.push({minX:x-0.68,maxX:x+0.68,minZ:z-0.68,maxZ:z+0.68,minY:floorY,maxY:floorY+9.5,cx:x,cy:floorY+4.75,cz:z,w:1.36,h:9.5,d:1.36,floorY});
  }));
  const fluteGeometry=new THREE.CylinderGeometry(0.045,0.045,8.15,6);
  const columnFlutes=new THREE.InstancedMesh(fluteGeometry,darkStone,columnXs.length*columnZs.length*8),fluteTransform=new THREE.Object3D();
  let fluteIndex=0;
  columnXs.forEach(x=>columnZs.forEach(z=>{
    for(let i=0;i<8;i++){
      const angle=i/8*Math.PI*2;
      fluteTransform.position.set(x+Math.cos(angle)*0.64,floorY+4.75,z+Math.sin(angle)*0.64);
      fluteTransform.updateMatrix();columnFlutes.setMatrixAt(fluteIndex++,fluteTransform.matrix);
    }
  }));
  columnFlutes.instanceMatrix.needsUpdate=true;columnFlutes.castShadow=true;columnFlutes.receiveShadow=true;group.add(columnFlutes);

  const windowZ=room.roomZ+cellSize+0.88;
  [room.roomX+cellSize*2,room.roomX+cellSize*3.5,room.roomX+cellSize*5].forEach(x=>{
    const window=new THREE.Group();
    const frame=new THREE.Mesh(new THREE.ExtrudeGeometry(makeLancetShape(4.2,7.25),{depth:0.24,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:0.09,bevelThickness:0.07}),stone);
    frame.position.z=0.02;window.add(frame);
    const archPoints=[[-2.55,0],[-2.55,4.3],[-2.1,5.75],[-1.35,6.85],[0,7.5],[1.35,6.85],[2.1,5.75],[2.55,4.3],[2.55,0]].map(([px,py])=>new THREE.Vector3(px,py,0.3));
    const archCurve=new THREE.CatmullRomCurve3(archPoints,false,'centripetal',0.45);
    const archRib=new THREE.Mesh(new THREE.TubeGeometry(archCurve,48,0.15,8,false),new THREE.MeshStandardMaterial({color:0x42414a,roughness:0.96,metalness:0.01}));
    archRib.castShadow=true;archRib.receiveShadow=true;window.add(archRib);
    const glassWidth=3.55,glassHeight=6.65;
    const glassGeometry=new THREE.ShapeGeometry(makeLancetShape(glassWidth,glassHeight)),glassUv=glassGeometry.attributes.uv,glassPositions=glassGeometry.attributes.position;
    for(let i=0;i<glassUv.count;i++) glassUv.setXY(i,(glassPositions.getX(i)+glassWidth/2)/glassWidth,glassPositions.getY(i)/glassHeight);
    glassUv.needsUpdate=true;
    const glass=new THREE.Mesh(glassGeometry,stainedGlass);
    glass.position.set(0,0,0.34);window.add(glass);
    const leadMat=new THREE.MeshStandardMaterial({color:0x20232c,roughness:0.62,metalness:0.18});
    const addLeadStroke=(points,radius=0.045)=>{
      const curve=new THREE.CatmullRomCurve3(points.map(([px,py])=>new THREE.Vector3(px,py,0.47)));
      const stroke=new THREE.Mesh(new THREE.TubeGeometry(curve,20,radius,5,false),leadMat);stroke.castShadow=false;stroke.receiveShadow=false;window.add(stroke);
    };
    const mullion=new THREE.Mesh(new THREE.BoxGeometry(0.085,6.2,0.055),leadMat);mullion.position.set(0,3.05,0.42);window.add(mullion);
    for(const xSide of [-0.92,0.92]){const bar=new THREE.Mesh(new THREE.BoxGeometry(0.055,5.6,0.05),leadMat);bar.position.set(xSide,2.85,0.42);window.add(bar);}
    for(const y of [0.92,1.8,3.75,5.25,6.12]){const bar=new THREE.Mesh(new THREE.BoxGeometry(3.1,0.07,0.05),leadMat);bar.position.set(0,y,0.42);window.add(bar);}
    for(const side of [-1,1]){
      const c=side*1.34;
      addLeadStroke([[c-0.38,0.35],[c-0.38,3.85],[c-0.32,4.52],[c,5.18],[c+0.32,4.52],[c+0.38,3.85],[c+0.38,0.35]],0.038);
      const lancetBar=new THREE.Mesh(new THREE.BoxGeometry(0.045,3.35,0.04),leadMat);lancetBar.position.set(c,2.0,0.46);window.add(lancetBar);
    }
    const rose=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.035,6,20),brass);rose.position.set(0,4.75,0.43);window.add(rose);
    const roseInner=new THREE.Mesh(new THREE.TorusGeometry(0.22,0.028,5,18),leadMat);roseInner.position.set(0,4.75,0.455);window.add(roseInner);
    for(let spoke=0;spoke<4;spoke++){
      const ray=new THREE.Mesh(new THREE.BoxGeometry(0.045,0.76,0.045),leadMat);ray.position.set(0,4.75,0.44);ray.rotation.z=spoke*Math.PI/4;window.add(ray);
    }
    const roseGem=new THREE.Mesh(new THREE.SphereGeometry(0.075,8,6),new THREE.MeshBasicMaterial({color:0xd94d56,toneMapped:false}));roseGem.position.set(0,4.75,0.49);window.add(roseGem);
    addLeadStroke([[-1.72,0.36],[-1.72,4.1],[-1.58,5.25],[-1.12,6.35],[0,6.72],[1.12,6.35],[1.58,5.25],[1.72,4.1],[1.72,0.36]],0.045);
    const glassGlow=new THREE.PointLight(0x779bd0,0.42,10,2);glassGlow.position.set(0,4.1,0.22);registerGraphicsPointLight(glassGlow);window.add(glassGlow);
    const beamStart=new THREE.Vector3(0,4.1,0.26);
    const beamEnd=new THREE.Vector3(cx+2.4-x,-1.72,cz+1-windowZ);
    const beamDirection=beamEnd.clone().sub(beamStart),beamLength=beamDirection.length();
    const moonRay=new THREE.SpotLight(0x86a7d3,1.35,beamLength+2,Math.PI/7,0.72,1.6);
    moonRay.position.copy(beamStart);moonRay.target.position.copy(beamEnd);window.add(moonRay);window.add(moonRay.target);
    const shaft=new THREE.Mesh(new THREE.ConeGeometry(3.1,beamLength,16,1,true),new THREE.MeshBasicMaterial({color:0x8aaad4,transparent:true,opacity:0.055,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,fog:true}));
    shaft.position.copy(beamStart).add(beamEnd).multiplyScalar(0.5);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),beamDirection.normalize());
    shaft.renderOrder=1;window.add(shaft);
    window.position.set(x,floorY+1.9,windowZ);group.add(window);
  });

  const altarZ=cz-8.5;
  makeBox(5.0,0.46,2.8,darkStone,cx,floorY+0.23,altarZ);
  makeBox(4.2,0.72,2.0,stone,cx,floorY+0.82,altarZ);
  makeBox(2.7,0.22,1.5,brass,cx,floorY+1.29,altarZ);
  const brazier=new THREE.Mesh(new THREE.CylinderGeometry(0.78,0.98,0.34,12,1,true),darkStone);
  brazier.position.set(cx,floorY+1.56,altarZ);brazier.castShadow=true;group.add(brazier);
  const embers=new THREE.Mesh(new THREE.CircleGeometry(0.63,16),new THREE.MeshBasicMaterial({color:0xff4d14,toneMapped:false}));
  embers.rotation.x=-Math.PI/2;embers.position.set(cx,floorY+1.75,altarZ);group.add(embers);
  const flameShapes=[[0,1.14,0.39,0xff8a20],[0.24,0.92,0.31,0xff5f16],[-0.23,0.86,0.29,0xff741b],[0.02,0.73,0.22,0xffe58a]];
  const flameGeometry=createAltarFlameGeometry();
  flameShapes.forEach(([offset,height,radius,color],index)=>{
    const material=new THREE.MeshBasicMaterial({color,toneMapped:false,transparent:true,opacity:index===0?0.88:0.94,depthWrite:false,side:THREE.DoubleSide});
    const flame=new THREE.Mesh(flameGeometry,material);
    flame.scale.set(radius/0.41,height,radius/0.41);
    flame.position.set(cx+offset,floorY+1.76,altarZ+(index%2?0.12:-0.1));
    flame.rotation.z=(index%2?1:-1)*0.08;
    flame.userData={baseX:flame.position.x,baseY:flame.position.y,baseZ:flame.position.z,baseScaleX:flame.scale.x,baseScaleY:height,baseScaleZ:flame.scale.z,baseRotation:flame.rotation.z,phase:index*1.73};
    flame.renderOrder=4;group.add(flame);altarFireRefs.push(flame);
  });
  const emberGeometry=new THREE.SphereGeometry(1,6,5),emberColors=[0xffdb83,0xff8b35,0xffc25e];
  emberColors.forEach((color,index)=>{
    const material=new THREE.MeshBasicMaterial({color,toneMapped:false,transparent:true,opacity:0.75,depthWrite:false});
    const ember=new THREE.Mesh(emberGeometry,material),phase=index*0.37;
    ember.scale.setScalar(0.045+index*0.008);ember.position.set(cx,floorY+1.86,altarZ);ember.renderOrder=5;
    ember.userData={baseX:cx,baseY:floorY+1.86,baseZ:altarZ,baseSize:0.045+index*0.008,phase,speed:0.55+index*0.12,rise:0.7+index*0.12};
    group.add(ember);altarEmberRefs.push(ember);
  });
  altarFireLight=new THREE.PointLight(0xff762b,1.8,18,2);altarFireLight.position.set(cx,floorY+2.25,altarZ);altarFireLight.userData.baseY=altarFireLight.position.y;registerGraphicsPointLight(altarFireLight);group.add(altarFireLight);

  const urnPoints=[new THREE.Vector2(0,0),new THREE.Vector2(0.36,0),new THREE.Vector2(0.52,0.24),new THREE.Vector2(0.45,0.48),new THREE.Vector2(0.68,0.82),new THREE.Vector2(0.62,1.15),new THREE.Vector2(0.38,1.38),new THREE.Vector2(0.4,1.52),new THREE.Vector2(0.5,1.58),new THREE.Vector2(0,1.58)];
  const urnGeo=new THREE.LatheGeometry(urnPoints,16);
  for(const side of [-1,1]) for(const dz of [-3,3,9]){
    const x=cx+side*13.5,z=cz+dz;
    const pedestal=new THREE.Mesh(new THREE.BoxGeometry(1.65,0.55,1.65),darkStone);pedestal.position.set(x,floorY+0.28,z);pedestal.castShadow=true;group.add(pedestal);
    const urn=new THREE.Mesh(urnGeo,stone);urn.position.set(x,floorY+0.56,z);urn.castShadow=true;urn.receiveShadow=true;group.add(urn);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(0.47,0.07,8,18),brass);rim.rotation.x=Math.PI/2;rim.position.set(x,floorY+2.0,z);group.add(rim);
  }

  const candleMat=new THREE.MeshStandardMaterial({color:0x51412e,roughness:0.9});
  const flameMat=new THREE.MeshBasicMaterial({color:0xffad50});
  [[cx-2.3,altarZ],[cx+2.3,altarZ],[cx,altarZ-1.1]].forEach(([x,z])=>{
    for(let i=-1;i<=1;i++){
      const candle=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,0.75+Math.abs(i)*0.13,8),candleMat);
      candle.position.set(x+i*0.38,floorY+1.55,z);candle.castShadow=true;group.add(candle);
      const flame=new THREE.Mesh(new THREE.SphereGeometry(0.09,8,8),flameMat);flame.position.set(x+i*0.38,floorY+1.98+Math.abs(i)*0.13,z);group.add(flame);
    }
  });
  for(const [x,z] of [[cx-2,altarZ-1],[cx+2,altarZ-1],[cx,altarZ-2]]){
    const light=new THREE.PointLight(0xffbd78,0.95,9,2);light.position.set(x,floorY+2.2,z);group.add(light);
  }
  const puddleMaterial=new THREE.MeshStandardMaterial({color:0x111b26,metalness:0.24,roughness:0.16,transparent:true,opacity:0.58,side:THREE.DoubleSide,depthWrite:false});
  const puddleGeometry=new THREE.CircleGeometry(1,24);
  [[cx-7,cz+7,1.7,0.72],[cx+8,cz+5,1.35,0.62],[cx-9,cz-6,1.45,0.7],[cx+8,cz-4,1.1,0.58]].forEach(([x,z,sx,sz])=>{
    const puddle=new THREE.Mesh(puddleGeometry,puddleMaterial);puddle.rotation.x=-Math.PI/2;puddle.position.set(x,floorY+0.028,z);puddle.scale.set(sx,sz,1);group.add(puddle);
  });
  const rubbleGeometry=new THREE.DodecahedronGeometry(0.62,0),rubbleMaterial=new THREE.MeshStandardMaterial({color:0x292a31,roughness:0.98,bumpMap:surfaces.wallBump,bumpScale:0.12});
  [[cx-15,cz-8,0.9,0.55,1.1],[cx-13,cz-9,0.55,0.42,0.7],[cx+15,cz-8,0.75,0.8,0.65],[cx+14,cz+9,0.95,0.56,1.25],[cx-15,cz+8,0.68,0.6,0.82]].forEach(([x,z,sx,sy,sz])=>{
    const stoneChip=new THREE.Mesh(rubbleGeometry,rubbleMaterial);stoneChip.position.set(x,floorY+0.24,z);stoneChip.rotation.set(0.18,sx*1.7,0.32);stoneChip.scale.set(sx,sy,sz);stoneChip.castShadow=false;stoneChip.receiveShadow=true;group.add(stoneChip);
  });
  const chain=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,2.0,6),brass);chain.position.set(cx,floorY+14,cz);group.add(chain);
  const censer=new THREE.Mesh(new THREE.IcosahedronGeometry(0.55,1),darkStone);censer.position.set(cx,floorY+12.7,cz);censer.castShadow=true;group.add(censer);
  const censerRings=new THREE.Mesh(new THREE.TorusGeometry(0.67,0.07,8,18),brass);censerRings.position.copy(censer.position);censerRings.rotation.x=Math.PI/2;group.add(censerRings);

  scene.add(group);envObjects.push({mesh:group});
}

function stageEdgeKey(a,b){ return a<b ? `${a}-${b}` : `${b}-${a}`; }
function getGeneratedDungeonWallColliders(layout){
  if(!layout||!layout.world||!Array.isArray(layout.layers)) return [];
  const {world}=layout,cell=world.cell_size,width=world.width_cells,depth=world.depth_cells;
  const ox=world.origin_x,oz=world.origin_z,wallHeight=world.wall_height;
  const bridgeCells=new Set((layout.bridge_cells||[]).map(([x,z])=>`${x}:${z}`));
  const boxes=[];
  layout.layers.forEach((layer,floorIndex)=>{
    const grid=layer.grid,floorY=layer.y;
    for(let z=0;z<depth;z++) for(let x=0;x<width;x++){
      if(grid[z][x]!==0) continue;
      const wx=ox+(x+0.5)*cell,wz=oz+(z+0.5)*cell,isBridge=floorIndex===1&&bridgeCells.has(`${x}:${z}`);
      for(const [dx,dz] of [[0,-1],[0,1],[-1,0],[1,0]]){
        const nx=x+dx,nz=z+dz;
        if(nx>=0&&nx<width&&nz>=0&&nz<depth&&grid[nz][nx]===0) continue;
        let cx,cz,w,d,h;
        if(isBridge){
          h=1.1;
          if(dx===0){cx=wx;cz=wz+dz*(cell*0.5-0.2);w=cell;d=0.4;}
          else{cx=wx+dx*(cell*0.5-0.2);cz=wz;w=0.4;d=cell;}
        }else{
          h=wallHeight;
          if(dx===0){cx=wx;cz=wz+dz*(cell*0.5-0.12);w=cell+0.12;d=0.48;}
          else{cx=wx+dx*(cell*0.5-0.12);cz=wz;w=0.48;d=cell+0.12;}
        }
        boxes.push({minX:cx-w/2,maxX:cx+w/2,minY:floorY,maxY:floorY+h,minZ:cz-d/2,maxZ:cz+d/2,cx,cy:floorY+h/2,cz,w,h,d,floorY});
      }
    }
  });
  (layout.staircases||[]).forEach(stair=>{
    const landingDepth=3.5,halfWidth=0.18,sideOffset=stair.width/2+0.25;
    for(const side of [-1,1]){
      const cx=stair.x+side*sideOffset,minZ=stair.z+stair.run-0.12,maxZ=stair.z+stair.run+landingDepth+0.12;
      boxes.push({minX:cx-halfWidth,maxX:cx+halfWidth,minY:stair.upper_y,maxY:stair.upper_y+3.8,
        minZ,maxZ,cx,cy:stair.upper_y+1.9,cz:(minZ+maxZ)/2,
        w:halfWidth*2,h:3.8,d:maxZ-minZ,floorY:stair.upper_y,stairLandingFence:true});
    }
  });
  return boxes;
}
function getStageRoomEdges(locationIndex,floorIndex){
  const plan=STAGE_ROUTE_PLANS[locationIndex]||STAGE_ROUTE_PLANS[0];
  const floorPlan=plan.floors[floorIndex]||plan.floors[0];
  return new Set(floorPlan.edges.map(([a,b])=>stageEdgeKey(a,b)));
}

function buildStageFloor(locationIndex,floorIndex,ox,oz){
  const floorY=FLOOR_LEVELS[floorIndex],rooms=[],openEdges=getStageRoomEdges(locationIndex,floorIndex);
  const generatedLayout=locationIndex===3?window.BB_GENERATED_DUNGEON_LAYOUT:null;
  for(let row=0;row<ROOM_ROWS;row++) for(let col=0;col<ROOM_COLS;col++){
    const roomIndex=row*ROOM_COLS+col;
    const seed=(locationIndex+1)*7919+(floorIndex+1)*104729+(roomIndex+1)*31337;
    const authored=generatedLayout&&generatedLayout.rooms?.[floorIndex]?.[roomIndex]?.grid;
    const grid=authored?authored.map(line=>line.slice()):generateMaze(mazeSize,seed);
    if(!authored){
      if(col>0&&openEdges.has(stageEdgeKey(roomIndex,roomIndex-1))) carveMazeRoute(grid,'west');
      if(col<ROOM_COLS-1&&openEdges.has(stageEdgeKey(roomIndex,roomIndex+1))) carveMazeRoute(grid,'east');
      if(row>0&&openEdges.has(stageEdgeKey(roomIndex,roomIndex-ROOM_COLS))) carveMazeRoute(grid,'north');
      if(row<ROOM_ROWS-1&&openEdges.has(stageEdgeKey(roomIndex,roomIndex+ROOM_COLS))) carveMazeRoute(grid,'south');
      const stairwell=(row===0&&(col===2||col===4))||(row===1&&col===0);
      if(stairwell){
        const stairCol=Math.floor(mazeSize/2);
        for(let y=1;y<mazeSize-1;y++) grid[y][stairCol]=0;
        for(let y=1;y<mazeSize-1;y++) if(stairCol>1&&stairCol<mazeSize-2) grid[y][stairCol-1]=0;
      }
      if(row===1&&col===3){
        const mid=Math.floor(mazeSize/2);
        for(let i=1;i<mazeSize-1;i++){ grid[mid][i]=0; grid[i][mid]=0; }
        for(let y=mid-1;y<=mid+1;y++) for(let x=mid-1;x<=mid+1;x++) grid[y][x]=0;
      }
      if(floorIndex===0 && roomIndex===0){
        for(let y=1;y<=mazeSize-2;y++) for(let x=1;x<=mazeSize-2;x++) grid[y][x]=0;
      }
      if(floorIndex===1 && roomIndex===ROOMS_PER_FLOOR-1){
        const mid=Math.floor(mazeSize/2);
        for(let y=mid-2;y<=mid+2;y++) for(let x=mid-2;x<=mid+2;x++) grid[y][x]=0;
        for(let y=mid-1;y<=mid+1;y++) for(let x=0;x<=mid;x++) grid[y][x]=0;
        if(locationIndex===1)for(let y=mid;y<mazeSize;y++)grid[y][mid]=0;
      }
    }
    const roomX=ox+col*ROOM_WORLD_SIZE,roomZ=oz+row*ROOM_WORLD_SIZE;
    const bounds={minX:roomX,minZ:roomZ,maxX:roomX+ROOM_WORLD_SIZE,maxZ:roomZ+ROOM_WORLD_SIZE};
    const boxes=[],wallHeight=10.5,wallThickness=0.72;
    const blocked=(x,y)=>x>=0&&y>=0&&x<mazeSize&&y<mazeSize&&grid[y][x]===1;
    const addSegment=(minX,maxX,minZ,maxZ)=>boxes.push({minX,maxX,minZ,maxZ,minY:floorY,maxY:floorY+wallHeight,cx:(minX+maxX)/2,cy:floorY+wallHeight/2,cz:(minZ+maxZ)/2,w:maxX-minX,h:wallHeight,d:maxZ-minZ,floorY});
    for(let y=0;y<mazeSize;y++) for(let x=0;x<mazeSize;x++) if(grid[y][x]===0){
      const wx=roomX+x*cellSize+cellSize/2,wz=roomZ+y*cellSize+cellSize/2;
      if(blocked(x-1,y)){const edgeX=wx-cellSize/2;addSegment(edgeX-wallThickness/2,edgeX+wallThickness/2,wz-cellSize/2,wz+cellSize/2);}
      if(blocked(x+1,y)){const edgeX=wx+cellSize/2;addSegment(edgeX-wallThickness/2,edgeX+wallThickness/2,wz-cellSize/2,wz+cellSize/2);}
      if(blocked(x,y-1)){const edgeZ=wz-cellSize/2;addSegment(wx-cellSize/2,wx+cellSize/2,edgeZ-wallThickness/2,edgeZ+wallThickness/2);}
      if(blocked(x,y+1)){const edgeZ=wz+cellSize/2;addSegment(wx-cellSize/2,wx+cellSize/2,edgeZ-wallThickness/2,edgeZ+wallThickness/2);}
    }
    addRoomWallBatch(boxes,bounds,floorY,locationIndex);
    rooms.push({floorIndex,roomIndex,row,col,grid,roomX,roomZ,floorY,bounds});
  }
  return rooms;
}

function getCryptAtmosphereAssets(){
  if(cryptAtmosphereAssets) return cryptAtmosphereAssets;
  const puddleShape=new THREE.Shape();
  const puddlePoints=[];
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2, r=0.78+0.12*Math.sin(i*2.31)+0.07*Math.cos(i*4.7);
    puddlePoints.push(new THREE.Vector2(Math.cos(a)*r,Math.sin(a)*r));
  }
  puddleShape.moveTo(puddlePoints[0].x,puddlePoints[0].y);
  for(let i=1;i<puddlePoints.length;i++) puddleShape.lineTo(puddlePoints[i].x,puddlePoints[i].y);
  puddleShape.closePath();
  const wingShape=new THREE.Shape();
  wingShape.moveTo(0,0);wingShape.lineTo(0.22,0.17);wingShape.lineTo(0.76,0.34);
  wingShape.lineTo(0.57,0.10);wingShape.lineTo(0.94,-0.02);wingShape.lineTo(0.66,-0.22);
  wingShape.lineTo(0.39,-0.29);wingShape.lineTo(0.13,-0.12);wingShape.closePath();
  cryptAtmosphereAssets={
    puddleGeometry:new THREE.ShapeGeometry(puddleShape,1),
    batWingGeometry:new THREE.ShapeGeometry(wingShape,1),
    skullGeometry:new THREE.SphereGeometry(0.36,12,10),
    jawGeometry:new THREE.SphereGeometry(0.23,10,8),
    socketGeometry:new THREE.SphereGeometry(0.115,8,6),
    noseGeometry:new THREE.SphereGeometry(0.055,6,5),
    batBodyGeometry:new THREE.SphereGeometry(0.18,9,7),
    batHeadGeometry:new THREE.SphereGeometry(0.105,8,6),
    batEarGeometry:new THREE.ConeGeometry(0.055,0.16,5),
    batEyeGeometry:new THREE.SphereGeometry(0.025,6,4),
    flyBodyGeometry:new THREE.SphereGeometry(0.045,6,4),
    flyWingGeometry:new THREE.PlaneGeometry(0.085,0.05),
    skullMaterial:new THREE.MeshStandardMaterial({color:0xaaa08a,roughness:0.96}),
    socketMaterial:new THREE.MeshStandardMaterial({color:0x100e12,roughness:1}),
    slimeMaterial:new THREE.MeshStandardMaterial({color:0x271317,roughness:0.2,metalness:0.18,transparent:true,opacity:0.88,side:THREE.DoubleSide,depthWrite:false}),
    stainMaterial:new THREE.MeshStandardMaterial({color:0x3b1c1b,roughness:0.72,transparent:true,opacity:0.75,side:THREE.DoubleSide,depthWrite:false}),
    batMaterial:new THREE.MeshStandardMaterial({color:0x111116,roughness:0.88,side:THREE.DoubleSide}),
    batEyeMaterial:new THREE.MeshBasicMaterial({color:0x8e1d27}),
    flyMaterial:new THREE.MeshStandardMaterial({color:0x09090b,roughness:0.5}),
    flyWingMaterial:new THREE.MeshBasicMaterial({color:0x66615c,transparent:true,opacity:0.64,side:THREE.DoubleSide,depthWrite:false})
  };
  return cryptAtmosphereAssets;
}

function makeCryptSkull(x,z,floorY,random,group){
  const a=getCryptAtmosphereAssets(),skull=new THREE.Group();
  const cranium=new THREE.Mesh(a.skullGeometry,a.skullMaterial);
  cranium.scale.set(0.94,0.83,1.06);cranium.castShadow=true;skull.add(cranium);
  const jaw=new THREE.Mesh(a.jawGeometry,a.skullMaterial);jaw.position.set(0,-0.2,0.13);jaw.scale.set(1,0.7,0.9);skull.add(jaw);
  for(const side of [-1,1]){
    const socket=new THREE.Mesh(a.socketGeometry,a.socketMaterial);socket.position.set(side*0.135,0.035,0.3);socket.scale.set(1,1,0.45);skull.add(socket);
  }
  skull.position.set(x,floorY+0.34,z);skull.rotation.set((random()-0.5)*0.55,random()*Math.PI*2,(random()-0.5)*0.7);
  const scale=0.72+random()*0.46;skull.scale.setScalar(scale);group.add(skull);
}

function makeCryptPuddle(x,z,floorY,random,group){
  const a=getCryptAtmosphereAssets(),puddle=new THREE.Mesh(a.puddleGeometry,random()<0.32?a.stainMaterial:a.slimeMaterial);
  puddle.rotation.x=-Math.PI/2;puddle.rotation.z=random()*Math.PI*2;
  const size=0.62+random()*0.58;puddle.scale.set(size,1,size*(0.55+random()*0.45));
  puddle.position.set(x,floorY+0.055,z);group.add(puddle);
  if(random()<0.58){
    const stain=new THREE.Mesh(a.puddleGeometry,a.stainMaterial);
    stain.rotation.x=-Math.PI/2;stain.rotation.z=random()*Math.PI*2;
    stain.scale.set(size*(0.42+random()*0.2),1,size*(0.3+random()*0.22));
    stain.position.set(x+(random()-0.5)*0.7,floorY+0.061,z+(random()-0.5)*0.7);group.add(stain);
  }
  return {x,z};
}

function makeBatVisual(){
  const a=getCryptAtmosphereAssets(),bat=new THREE.Group();
  const body=new THREE.Mesh(a.batBodyGeometry,a.batMaterial);body.scale.set(0.8,0.8,1.25);body.castShadow=true;bat.add(body);
  const head=new THREE.Mesh(a.batHeadGeometry,a.batMaterial);head.position.z=0.19;bat.add(head);
  for(const side of [-1,1]){
    const ear=new THREE.Mesh(a.batEarGeometry,a.batMaterial);ear.position.set(side*0.065,0.12,0.16);ear.rotation.z=side*-0.22;bat.add(ear);
    const eye=new THREE.Mesh(a.batEyeGeometry,a.batEyeMaterial);eye.position.set(side*0.045,0.015,0.282);bat.add(eye);
  }
  const left=new THREE.Group(),right=new THREE.Group();left.position.x=-0.1;right.position.x=0.1;left.scale.x=-1;
  const leftMembrane=new THREE.Mesh(a.batWingGeometry,a.batMaterial),rightMembrane=new THREE.Mesh(a.batWingGeometry,a.batMaterial);
  leftMembrane.castShadow=rightMembrane.castShadow=true;left.add(leftMembrane);right.add(rightMembrane);bat.add(left,right);
  return {mesh:bat,leftWing:left,rightWing:right};
}

function addBatSwarm(room,x,z,random){
  for(let i=0;i<4;i++){
    const bat=makeBatVisual();bat.mesh.scale.setScalar(0.78+random()*0.22);scene.add(bat.mesh);
    ambientCreatures.push({type:'bat',mesh:bat.mesh,leftWing:bat.leftWing,rightWing:bat.rightWing,
      centerX:x,centerZ:z,floorY:room.floorY,phase:random()*Math.PI*2,speed:0.48+random()*0.24,
      radius:0.65+random()*0.75,altitude:5.6+random()*1.5,offset:i*Math.PI*0.5});
  }
}

function addFlySwarm(x,z,floorY,random){
  const a=getCryptAtmosphereAssets();
  for(let i=0;i<3;i++){
    const fly=new THREE.Group(),body=new THREE.Mesh(a.flyBodyGeometry,a.flyMaterial);body.scale.set(1,0.8,1.1);fly.add(body);
    const wings=[];
    for(const side of [-1,1]){
      const wing=new THREE.Mesh(a.flyWingGeometry,a.flyWingMaterial);wing.position.set(side*0.035,0.035,0);wing.rotation.z=side*0.32;fly.add(wing);wings.push(wing);
    }
    scene.add(fly);ambientCreatures.push({type:'fly',mesh:fly,wings,centerX:x,centerZ:z,floorY,phase:random()*Math.PI*2,radius:0.28+random()*0.5,speed:1.5+random()*1.4});
  }
}

function scatterCryptAtmosphere(floorRooms,locationIndex){
  if(locationIndex!==3){
    if(locationIndex===0||locationIndex===2) floorRooms.flat().forEach(room=>{
      const selected=locationIndex===0?(room.floorIndex===0&&[2,7].includes(room.roomIndex)):(room.floorIndex===0&&[2,7].includes(room.roomIndex))||(room.floorIndex===1&&room.roomIndex===3);
      if(selected){const random=seededRandom((locationIndex+11)*65537+(room.floorIndex+1)*7919+(room.roomIndex+1)*31337);addBatSwarm(room,room.roomX+ROOM_WORLD_SIZE/2,room.roomZ+ROOM_WORLD_SIZE/2,random);}
    });
    return;
  }
  floorRooms.flat().forEach(room=>{
    if(room.floorIndex===0&&room.roomIndex===0) return;
    const random=seededRandom((locationIndex+11)*65537+(room.floorIndex+1)*7919+(room.roomIndex+1)*31337);
    const openCells=[];
    for(let row=1;row<mazeSize-1;row++) for(let col=1;col<mazeSize-1;col++) if(room.grid[row][col]===0) openCells.push({row,col});
    if(!openCells.length) return;
    const group=new THREE.Group();
    const pick=()=>openCells[Math.floor(random()*openCells.length)];
    const positionFor=cell=>({x:room.roomX+(cell.col+0.5)*cellSize,z:room.roomZ+(cell.row+0.5)*cellSize});
    let flyAt=null;
    if(random()<0.72){
      const pos=positionFor(pick());flyAt=makeCryptPuddle(pos.x,pos.z,room.floorY,random,group);
      if(random()<0.56){const skullPos=positionFor(pick());makeCryptSkull(skullPos.x,skullPos.z,room.floorY,random,group);}
    } else if(random()<0.64){
      const pos=positionFor(pick());makeCryptSkull(pos.x,pos.z,room.floorY,random,group);
    }
    if(flyAt&&random()<0.5) addFlySwarm(flyAt.x,flyAt.z,room.floorY,random);
    const hasBats=(room.floorIndex===0&&(room.roomIndex===2||room.roomIndex===7))||
      (room.floorIndex===1&&(room.roomIndex===3||room.roomIndex===8));
    if(hasBats){const pos=positionFor(pick());addBatSwarm(room,pos.x,pos.z,random);}
    if(group.children.length){scene.add(group);envObjects.push({mesh:group});}
  });
}

let _ambientUpdateTime=0;
function updateAmbientCreatures(time){
  if(time-_ambientUpdateTime<0.05) return;
  _ambientUpdateTime=time;
  ambientCreatures.forEach(creature=>{
    if(creature.type==='bat'){
      const orbit=time*creature.speed+creature.phase+creature.offset;
      creature.mesh.position.set(creature.centerX+Math.cos(orbit)*creature.radius,
        creature.floorY+creature.altitude+Math.sin(time*1.7+creature.phase)*0.42,
        creature.centerZ+Math.sin(orbit)*creature.radius);
      creature.mesh.rotation.y=Math.atan2(-Math.sin(orbit),Math.cos(orbit));
      const flap=Math.sin(time*18+creature.phase)*0.72;
      creature.leftWing.rotation.z=-flap;creature.rightWing.rotation.z=flap;
      creature.mesh.rotation.z=Math.sin(time*2.3+creature.phase)*0.08;
    } else {
      const orbit=time*creature.speed+creature.phase;
      creature.mesh.position.set(creature.centerX+Math.cos(orbit)*creature.radius,
        creature.floorY+0.4+Math.sin(time*5+creature.phase)*0.18,
        creature.centerZ+Math.sin(orbit)*creature.radius);
      creature.mesh.rotation.y=-orbit;
      const flap=Math.sin(time*31+creature.phase)*0.62;
      creature.wings[0].rotation.z=0.32+flap;creature.wings[1].rotation.z=-0.32-flap;
    }
  });
}

function roomSpawnPoint(room,seed){
  const random=seededRandom(seed),grid=room.grid,cells=[];
  for(let y=1;y<mazeSize-1;y++) for(let x=1;x<mazeSize-1;x++) if(grid[y][x]===0){
    const wx=room.roomX+(x+0.5)*cellSize,wz=room.roomZ+(y+0.5)*cellSize;
    const sx=room.roomX+ROOM_WORLD_SIZE/2,sz=room.roomZ+ROOM_WORLD_SIZE/2;
    if(Math.hypot(wx-sx,wz-sz)>10) cells.push({x:wx,z:wz});
  }
  if(!cells.length) return {x:room.roomX+ROOM_WORLD_SIZE/2,z:room.roomZ+ROOM_WORLD_SIZE/2};
  return cells[Math.floor(random()*cells.length)];
}

function roomAtWorldPosition(x,z){
  const col=Math.max(0,Math.min(ROOM_COLS-1,Math.floor((x-stageBounds.minX)/ROOM_WORLD_SIZE)));
  const row=Math.max(0,Math.min(ROOM_ROWS-1,Math.floor((z-stageBounds.minZ)/ROOM_WORLD_SIZE)));
  return row*ROOM_COLS+col;
}

function createGateLever(parent,gate,x,z,floorY,side){
  const group=new THREE.Group();
  const metal=new THREE.MeshStandardMaterial({color:0x534631,metalness:0.78,roughness:0.36});
  const brass=new THREE.MeshStandardMaterial({color:0x9b783f,metalness:0.82,roughness:0.3,emissive:0x241605});
  const base=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.34,0.25,10),metal);
  base.position.y=0.13;group.add(base);
  const post=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,0.92,8),metal);
  post.position.y=0.68;group.add(post);
  const handle=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.72,0.18),brass);
  handle.position.set(0.22,0.88,0);handle.rotation.z=-0.48;group.add(handle);
  group.position.set(x,floorY,z);parent.add(group);
  const interactable={type:'gateLever',gate,group,handle,x,z,y:floorY,side};
  gate.levers.push(interactable);worldInteractables.push(interactable);
}

function addShortcutGate(x,z,floorY,locationIndex,floorIndex,options={}){
  const group=new THREE.Group();
  const frameMat=new THREE.MeshStandardMaterial({color:0x302b2e,metalness:0.48,roughness:0.7});
  const panelMat=new THREE.MeshStandardMaterial({color:0x4a292a,metalness:0.38,roughness:0.68});
  const width=5.45,height=10.6,thickness=0.46;
  const postGeo=new THREE.BoxGeometry(0.42,height+0.5,0.62);
  for(const side of [-1,1]){
    const post=new THREE.Mesh(postGeo,frameMat);post.position.set(x+side*(width/2+0.26),floorY+(height+0.5)/2,z);post.castShadow=true;group.add(post);
  }
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(width+0.95,0.55,0.72),frameMat);
  lintel.position.set(x,floorY+height+0.16,z);lintel.castShadow=true;group.add(lintel);
  const panel=new THREE.Mesh(new THREE.BoxGeometry(width,height,thickness),panelMat);
  panel.position.set(x,floorY+height/2,z);panel.castShadow=true;panel.receiveShadow=true;group.add(panel);
  const collider={minX:x-width/2,maxX:x+width/2,minY:floorY,maxY:floorY+height,minZ:z-thickness/2,maxZ:z+thickness/2,cx:x,cy:floorY+height/2,cz:z,w:width,h:height,d:thickness,floorY};
  scene.add(group);envObjects.push({mesh:group});wallColliders.push(collider);
  const gate={group,panel,collider,levers:[],opened:false,opening:false,openElapsed:0,panelStartY:panel.position.y,panelRise:height+0.7,locationIndex,floorIndex};
  shortcutGates.push(gate);
  if(options.farSideOnly) createGateLever(group,gate,x,z+3.45,floorY,'north');
  else{
    createGateLever(group,gate,x,z-3.45,floorY,'south');
    createGateLever(group,gate,x,z+3.45,floorY,'north');
  }
  return gate;
}

function addStageElevator(x,z,lowerY,upperY){
  const group=new THREE.Group();
  const steel=new THREE.MeshStandardMaterial({color:0x34383c,metalness:0.82,roughness:0.42});
  const brass=new THREE.MeshStandardMaterial({color:0x8b6e3e,metalness:0.78,roughness:0.34});
  const shaftHeight=upperY-lowerY+5;
  for(const sx of [-2.85,2.85]) for(const sz of [-2.85,2.85]){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(0.28,shaftHeight,0.28),steel);
    beam.position.set(x+sx,lowerY+shaftHeight/2-0.3,z+sz);beam.castShadow=true;group.add(beam);
  }
  for(const y of [lowerY+0.25,upperY+0.25]){
    for(const side of [-1,1]){
      const across=new THREE.Mesh(new THREE.BoxGeometry(5.9,0.22,0.22),brass);
      across.position.set(x,y,z+side*2.95);group.add(across);
      const along=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.22,5.9),brass);
      along.position.set(x+side*2.95,y,z);group.add(along);
    }
  }
  const cabin=new THREE.Group();
  const platform=new THREE.Mesh(new THREE.BoxGeometry(5.25,0.45,5.25),steel);
  platform.position.y=0.22;platform.castShadow=true;platform.receiveShadow=true;cabin.add(platform);
  const deck=new THREE.Mesh(new THREE.BoxGeometry(4.85,0.08,4.85),new THREE.MeshStandardMaterial({color:0x5a5143,metalness:0.58,roughness:0.52}));
  deck.position.y=0.48;deck.receiveShadow=true;cabin.add(deck);
  for(const side of [-1,1]) for(const axis of [0,1]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(axis===0?4.7:0.14,0.85,axis===0?0.14:4.7),brass);
    rail.position.set(axis===0?0:side*2.35,0.9,axis===0?side*2.35:0);cabin.add(rail);
  }
  cabin.position.set(x,lowerY,z);group.add(cabin);
  scene.add(group);envObjects.push({mesh:group});
  const elevator={x,z,lowerY,upperY,currentY:lowerY,targetY:lowerY,moving:false,rider:false,group,cabin,speed:8.5};
  stageElevators.push(elevator);
  const rideButton=new THREE.Group();
  const button=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.24,0.12,10),brass);button.position.y=0.64;rideButton.add(button);cabin.add(rideButton);
  const rideInteractable={type:'elevatorRide',elevator,group:rideButton,x,z,y:lowerY+0.64};
  worldInteractables.push(rideInteractable);elevator.rideInteractable=rideInteractable;
  for(let floorIndex=0;floorIndex<2;floorIndex++){
    const floorY=FLOOR_LEVELS[floorIndex],panelGroup=new THREE.Group();
    const base=new THREE.Mesh(new THREE.BoxGeometry(0.68,1.25,0.4),steel);base.position.y=0.63;panelGroup.add(base);
    const callButton=new THREE.Mesh(new THREE.SphereGeometry(0.14,10,8),brass);callButton.position.set(0,0.82,0.24);panelGroup.add(callButton);
    panelGroup.position.set(x+4.1,floorY,z);group.add(panelGroup);
    worldInteractables.push({type:'elevatorCall',elevator,group:panelGroup,x:x+4.1,z,y:floorY,floorIndex});
  }
  return elevator;
}
function addCampaignExit(destination,x,z,floorY){
  const group=new THREE.Group();
  const stone=new THREE.MeshStandardMaterial({color:0x403943,roughness:0.84,metalness:0.12});
  const trim=new THREE.MeshStandardMaterial({color:0x806343,roughness:0.58,metalness:0.62});
  const glow=new THREE.MeshBasicMaterial({color:0x49304f,transparent:true,opacity:0.44,side:THREE.DoubleSide,depthWrite:false});
  for(const side of [-1,1]){
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.42,4.2,0.52),stone);
    post.position.set(side*1.72,2.1,0);post.castShadow=true;group.add(post);
  }
  const lintel=new THREE.Mesh(new THREE.BoxGeometry(4.05,0.5,0.58),trim);
  lintel.position.set(0,4.3,0);lintel.castShadow=true;group.add(lintel);
  const portal=new THREE.Mesh(new THREE.PlaneGeometry(2.75,3.35),glow);
  portal.position.set(0,1.9,0.08);group.add(portal);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.48,0.075,8,24),trim);
  ring.position.set(0,2.05,0.18);group.add(ring);
  group.position.set(x,floorY,z);scene.add(group);envObjects.push({mesh:group});
  const exit={type:'campaignExit',destination,x,z,y:floorY,group};
  worldInteractables.push(exit);
  return exit;
}
function campaignExitPrompt(destination){
  if(destination===1&&!campaignProgress.cityBoss)return 'ВЫХОД ЗАКРЫТ — ПОБЕДИТЕ БОССА';
  if(destination===2){
    if(!campaignProgress.buildingBoss)return 'ВЫХОД ЗАКРЫТ — ПОБЕДИТЕ БОССА';
    if(!campaignProgress.liftActivated)return 'ВЫХОД ЗАКРЫТ — СНАЧАЛА АКТИВИРУЙТЕ ЛИФТ';
  }
  if(destination===3){
    if(!campaignProgress.mountainBoss)return 'ВЫХОД ЗАКРЫТ — ПОБЕДИТЕ БОССА';
    if(!campaignProgress.castleChainShot)return 'ВЫХОД ЗАКРЫТ — СТРЕЛЯЙТЕ ПО ЦЕПИ';
  }
  return 'ПЕРЕЙТИ: '+LOCATIONS[destination];
}

function updateStageMechanics(dt){
  shortcutGates.forEach(gate=>{
    if(!gate.opening) return;
    gate.openElapsed+=dt;
    const t=Math.min(1,gate.openElapsed/1.5),eased=t*t*(3-2*t);
    gate.panel.position.y=gate.panelStartY+gate.panelRise*eased;
    if(t>=1){
      gate.opening=false;gate.opened=true;
      wallColliders=wallColliders.filter(box=>box!==gate.collider);
      rebuildWallCollisionGrid();
      notify('КОРОТКИЙ ПУТЬ ОТКРЫТ');SaveSystem.save();
    }
  });
  stageElevators.forEach(elevator=>{
    if(!elevator.moving) return;
    const direction=Math.sign(elevator.targetY-elevator.currentY);
    elevator.currentY+=direction*elevator.speed*dt;
    if((direction>0&&elevator.currentY>=elevator.targetY)||(direction<0&&elevator.currentY<=elevator.targetY)){
      elevator.currentY=elevator.targetY;elevator.moving=false;
      if(elevator.rider){
        hunter.position.y=elevator.currentY+0.4;
        if(currentLocation===1&&!campaignProgress.liftActivated){campaignProgress.liftActivated=true;SaveSystem.save();notify('ЛИФТ АКТИВИРОВАН — ВЕРХНИЙ ВЫХОД ДОСТУПЕН');}
        currentFloorIndex=elevator.currentY>=(elevator.lowerY+elevator.upperY)/2?1:0;
        updateStageLocationLabel(true);
      }
      elevator.rider=false;
      sfx('liftStop');
      notify('ЛИФТ ПРИБЫЛ');
    }
    elevator.cabin.position.y=elevator.currentY;
    if(elevator.rider) hunter.position.y=elevator.currentY+0.4;
    elevator.rideInteractable.y=elevator.currentY+0.64;
  });
}

function checkWorldInteractableProximity(){
  nearbyWorldInteractable=null;
  if(!hunter||gameMode!==GameMode.PLAYING) return;
  const prompt=$('worldInteractPrompt');
  const menuOpen=['lanternMenu','weaponMenu','gemMenu','teleportMenu','pauseMenu','settingsMenu'].some(id=>$(id)?.classList.contains('active'));
  let nearest=4.0;
  if(!menuOpen&&!player.isAttacking&&!player.isDodging){
    worldInteractables.forEach(item=>{
      const d=Math.hypot(hunter.position.x-item.x,hunter.position.z-item.z);
      if(d<nearest&&Math.abs(hunter.position.y-item.y)<2.8){nearest=d;nearbyWorldInteractable=item;}
    });
  }
  if(nearbyWorldInteractable){
    prompt.textContent=nearbyWorldInteractable.type==='gateLever'?'РЫЧАГ — ОТКРЫТЬ КОРОТКИЙ ПУТЬ':
      nearbyWorldInteractable.type==='secretWall'?'КАМНИ ПОКРЫТЫ ТРЕЩИНАМИ — ПРОБЕЙТЕ ИХ ОРУЖИЕМ':
      nearbyWorldInteractable.type==='campaignExit'?campaignExitPrompt(nearbyWorldInteractable.destination):
      nearbyWorldInteractable.type==='elevatorCall'?'ВЫЗВАТЬ ЛИФТ':
      nearbyWorldInteractable.elevator.moving?'ЛИФТ ДВИЖЕТСЯ':'ЛИФТ — ПОДЪЁМ / СПУСК';
    prompt.classList.add('show');
  } else prompt.classList.remove('show');
}

function activateNearbyWorldObject(){
  const item=nearbyWorldInteractable;
  if(!item||gameMode!==GameMode.PLAYING) return;
  if(item.type==='secretWall'){notify('ЗАВАЛ НУЖНО РАЗРУШИТЬ УДАРОМ ОРУЖИЯ');return;}
  if(item.type==='gateLever'){
    const gate=item.gate;
    if(gate.opened||gate.opening){notify('ВОРОТА УЖЕ ОТКРЫВАЮТСЯ');return;}
    gate.opening=true;gate.openElapsed=0;
    gate.levers.forEach(lever=>lever.handle.material.color.setHex(0x44bb66));
    worldInteractables=worldInteractables.filter(entry=>entry.gate!==gate);
    sfx('lever');notify('ВОРОТА ОТКРЫВАЮТСЯ');
    return;
  }
  if(item.type==='campaignExit'){
    if(!canEnterLocation(item.destination)){notify(campaignExitPrompt(item.destination));return;}
    const destinationName=LOCATIONS[item.destination];
    loadLocation(item.destination);SaveSystem.save();updateHUD();startAmbient();
    notify('ПЕРЕХОД: '+destinationName);
    return;
  }
  const elevator=item.elevator;
  if(elevator.moving){notify('ЛИФТ УЖЕ ДВИЖЕТСЯ');return;}
  const onPlatform=Math.hypot(hunter.position.x-elevator.x,hunter.position.z-elevator.z)<2.1&&Math.abs(hunter.position.y-(elevator.currentY+0.4))<1.4;
  if(item.type==='elevatorCall'){
    const requestedY=FLOOR_LEVELS[item.floorIndex];
    if(Math.abs(elevator.currentY-requestedY)<0.8){
      if(onPlatform){
        elevator.targetY=item.floorIndex===0?elevator.upperY:elevator.lowerY;
        elevator.rider=true;
      } else {notify('ЛИФТ УЖЕ НА ЭТАЖЕ — ВСТАНЬТЕ НА ПЛАТФОРМУ');return;}
    } else {elevator.targetY=requestedY;elevator.rider=false;}
  } else {
    if(!onPlatform){notify('ВСТАНЬТЕ НА ПЛАТФОРМУ');return;}
    elevator.targetY=elevator.currentY<(elevator.lowerY+elevator.upperY)/2?elevator.upperY:elevator.lowerY;
    elevator.rider=true;
  }
  elevator.moving=true;sfx('liftStart');
}

function getFloorHeightAt(x,z,currentY=0,previousZ=z){
  for(const elevator of stageElevators){
    if(Math.abs(x-elevator.x)<=2.35&&Math.abs(z-elevator.z)<=2.35&&Math.abs(currentY-(elevator.currentY+0.4))<2.8) return elevator.currentY+0.4;
  }
  if(currentLocation===1&&typeof getCathedralExteriorFloorAt==='function'){
    const exteriorFloor=getCathedralExteriorFloorAt(x,z,currentY);
    if(exteriorFloor!==null)return exteriorFloor;
  }
  const inLowerVoid=currentLocation===2&&mountainFloorVoids.some(hole=>x>=hole.x0&&x<=hole.x1&&z>=hole.z0&&z<=hole.z1);
  const stairCandidates=stairs.filter(stair=>{
    const side=Math.abs(x-stair.x),along=z-stair.z;
    return side<=stair.width/2+0.8&&along>=-1&&along<=stair.run+1;
  });
  const reachable=FLOOR_LEVELS.filter(y=>
    y<=currentY+0.6&&y>=currentY-1.35&&!(y===0&&inLowerVoid)&&
    !stairCandidates.some(stair=>Math.abs(y-stair.upperY)<0.001)
  );
  for(const stair of stairCandidates){
    const along=z-stair.z;
    const previousAlong=previousZ-stair.z;
    const t=Math.max(0,Math.min(1,along/stair.run));
    const stairY=stair.lowerY+(stair.upperY-stair.lowerY)*t;
    if(stairY<=currentY+0.6&&stairY>=currentY-1.35&&(stairY<=currentY+0.0001||along>previousAlong+0.0001)) reachable.push(stairY);
    else if(stairY<currentY-1.35) reachable.push(stairY);
  }
  if(currentLocation===2) mountainWalkableSurfaces.forEach(surface=>{
    if(x>=surface.minX&&x<=surface.maxX&&z>=surface.minZ&&z<=surface.maxZ&&surface.y<=currentY+0.6&&surface.y>=currentY-1.35) reachable.push(surface.y);
  });
  if(reachable.length) return Math.max(...reachable);
  if(inLowerVoid&&currentY>=-0.6) return -0.7;
  if(currentLocation===2&&currentY<0) return currentY;
  return FLOOR_LEVELS.reduce((closest,y)=>Math.abs(y-currentY)<Math.abs(closest-currentY)?y:closest,FLOOR_LEVELS[0]);
}

function updateHunterFloor(previousZ){
  if(!hunter) return;
  if(currentLocation===1&&!stairFallAnimation&&typeof getCathedralFatalFallAt==='function'){
    const fall=getCathedralFatalFallAt(hunter.position.x,hunter.position.z,hunter.position.y);
    if(fall){
      stairFallAnimation={startY:hunter.position.y,targetY:fall.targetY,elapsed:0,duration:1,fatalFall:true,bloodStainPosition:fall.bloodStainPosition};
      player.isAttacking=false;player.isDodging=false;player.currentAttack=null;player.attackBuffer=false;player.dodgeBuffer=false;player.invincible=false;
      if(typeof cancelActiveAttackCharge==='function')cancelActiveAttackCharge();else player.isCharging=false;
      if(typeof moveData.cancel==='function')moveData.cancel();else{moveData.active=false;moveData.x=0;moveData.y=0;}
      player.sprintTime=0;return;
    }
  }
  if(currentLocation===2){
    const fall=mountainFallZones.find(zone=>hunter.position.x>=zone.minX&&hunter.position.x<=zone.maxX&&hunter.position.z>=zone.minZ&&hunter.position.z<=zone.maxZ&&
      (!zone.centerX||Math.hypot(hunter.position.x-zone.centerX,hunter.position.z-zone.centerZ)>=zone.minRadius)&&hunter.position.y>=zone.minY&&hunter.position.y<=zone.maxY);
    if(fall){
      const checkpoint=player.respawnPoint&&(player.respawnPoint.loc===undefined||player.respawnPoint.loc===currentLocation)?player.respawnPoint:null;
      const respawn=checkpoint||{x:stageBounds.minX+cellSize*1.5,z:stageBounds.minZ+cellSize*1.5,y:0};
      player.hp=Math.max(1,player.hp-(fall.damage||25));
      hunter.position.set(respawn.x,respawn.y||0,respawn.z);
      player.screenShake=0.55;
      if(typeof damageFlash==='function') damageFlash();
      sfx('hit');updateHUD();notify('СОРВАЛИСЬ С ОБРЫВА — ВОЗВРАЩЕНИЕ К ПОСЛЕДНЕМУ ФОНАРЮ');
    }
  }
  const x=hunter.position.x,z=hunter.position.z,previousY=hunter.position.y;
  const floorY=getFloorHeightAt(x,z,previousY,Number.isFinite(previousZ)?previousZ:z);
  const landedOnStair=stairs.some(stair=>{
    const along=z-stair.z,side=Math.abs(x-stair.x);
    if(side>stair.width/2+0.8||along<0.25||along>stair.run+0.8) return false;
    const stairY=stair.lowerY+(stair.upperY-stair.lowerY)*Math.max(0,Math.min(1,along/stair.run));
    return stairY>stair.lowerY+0.15&&Math.abs(floorY-stairY)<0.2;
  });
  if(previousY-floorY>1.35&&!stairFallAnimation){
    const damageOnLanding = previousY>=FLOOR_LEVELS[1]-1.35
      && Math.abs(floorY-FLOOR_LEVELS[0])<0.05 && !landedOnStair;
    stairFallAnimation={startY:previousY,targetY:floorY,elapsed:0,duration:1,damageOnLanding};
    player.isAttacking=false;player.isDodging=false;
    player.currentAttack=null;player.attackBuffer=false;player.dodgeBuffer=false;player.invincible=false;
    if(typeof cancelActiveAttackCharge==='function') cancelActiveAttackCharge();
    else player.isCharging=false;
    if(typeof moveData.cancel==='function') moveData.cancel();
    else { moveData.active=false;moveData.x=0;moveData.y=0; }
    player.sprintTime=0;
    return;
  }
  hunter.position.y=floorY;
  const nextFloor=Math.abs(hunter.position.y-FLOOR_LEVELS[1])<FLOOR_HEIGHT/2?1:0;
  if(nextFloor!==currentFloorIndex){ currentFloorIndex=nextFloor; updateStageLocationLabel(true); }
}

function updateStairFallAnimation(dt){
  const fall=stairFallAnimation;
  if(!fall||!hunter) return false;
  fall.elapsed=Math.min(fall.duration,fall.elapsed+Math.max(0,dt));
  const t=fall.duration>0?fall.elapsed/fall.duration:1;
  const eased=t*t*(3-2*t);
  hunter.position.y=fall.startY+(fall.targetY-fall.startY)*eased;
  if(t<1) return true;
  hunter.position.y=fall.targetY;
  stairFallAnimation=null;
  if(fall.fatalFall){die({respawnAtCheckpoint:true,bloodStainPosition:fall.bloodStainPosition});return true;}
  if(fall.damageOnLanding){
    player.hp=Math.max(0,player.hp-10);
    player.screenShake=Math.max(player.screenShake,0.2);
    if(typeof damageFlash==='function') damageFlash();
    sfx('hit');updateHUD();
  }
  const nextFloor=Math.abs(hunter.position.y-FLOOR_LEVELS[1])<FLOOR_HEIGHT/2?1:0;
  if(nextFloor!==currentFloorIndex){ currentFloorIndex=nextFloor; updateStageLocationLabel(true); }
  if(player.hp<=0&&!player.isDead) die();
  return true;
}

function updateStageLocationLabel(show=false){
  if(!scene || gameMode!==GameMode.PLAYING || !hunter) return;
  const room=roomAtWorldPosition(hunter.position.x,hunter.position.z),label=currentLocation+'-'+currentFloorIndex+'-'+room;
  if(label===lastRoomNotice) return;
  lastRoomNotice=label;
  $('locName').textContent=LOCATIONS[currentLocation]+' · ЭТАЖ '+(currentFloorIndex+1)+' · КОМНАТА '+String(room+1).padStart(2,'0');
  if(show){ $('locName').classList.remove('show'); void $('locName').offsetWidth; $('locName').classList.add('show'); }
}
function createGothicWall(worldX,worldY,worldZ,w,h,d,isBoundary){
  if(!scene) return null;
  const surfaces = createSurfaceTextures();
  const mat = new THREE.MeshStandardMaterial({color:getLocationVisualPalette(currentLocation).wall,map:surfaces.wall,normalMap:surfaces.wallNormal,normalScale:new THREE.Vector2(0.62,0.62),roughnessMap:surfaces.wallRoughness,roughness:0.92,metalness:0.02,transparent:true,opacity:1});
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  wall.position.set(worldX,worldY,worldZ);
  wall.castShadow = false; wall.receiveShadow = true;
  wall.userData = { minX: worldX - w/2, maxX: worldX + w/2, minY:worldY-h/2, maxY:worldY+h/2, minZ: worldZ - d/2, maxZ: worldZ + d/2, targetOpacity: 1, isBoundary, cx: worldX, cy: worldY, cz: worldZ, w, h, d };
  scene.add(wall);
  wallMeshes.push(wall);
  wallColliders.push(wall.userData);

  if(h < 4.5 && !isBoundary){
    const archMat = new THREE.MeshStandardMaterial({color:0x1e1a28, roughness:0.9});
    const arch = new THREE.Mesh(new THREE.BoxGeometry(w*0.7, 0.5, d*0.7), archMat);
    arch.position.set(worldX, worldY+h/2+0.15, worldZ);
    arch.castShadow = true;
    scene.add(arch);
    const deco = {mesh:arch,userData:{cx:worldX, cy:h+0.15, cz:worldZ, minX:1, maxX:-1, minZ:1, maxZ:-1}, material:archMat, visible:true, isDeco:true, isMesh:true, remove(){ scene.remove(arch); }};
    wallMeshes.push(deco);
  }
  return wall;
}
function buildLocationLandmarks(locationIndex,ox,oz){
  if(!scene) return;
  if(locationIndex===2) return;
  const rng=seededRandom(0x51a7+locationIndex*7919),trees=[],rocks=[],props=[];
  const treeGeo=new THREE.CylinderGeometry(0.35,0.62,5,6),pineGeo=new THREE.ConeGeometry(2.2,6,6);
  const rockGeo=new THREE.DodecahedronGeometry(1.25,0),treeMat=new THREE.MeshStandardMaterial({color:locationIndex===2?0x28362c:0x211c1b,roughness:1});
  const pineMat=new THREE.MeshStandardMaterial({color:0x26362d,roughness:1}),rockMat=new THREE.MeshStandardMaterial({color:locationIndex===3?0x312931:0x4a4643,roughness:0.96});
  const nearStartingChapel=(x,z,padding)=>locationIndex===0&&x>=ox-padding&&x<=ox+ROOM_WORLD_SIZE+padding&&z>=oz-padding&&z<=oz+ROOM_WORLD_SIZE+padding;
  const addInstances=(geometry,material,items)=>{
    if(!items.length)return;const mesh=new THREE.InstancedMesh(geometry,material,items.length),dummy=new THREE.Object3D();
    items.forEach((o,index)=>{dummy.position.set(o.x,o.y,o.z);dummy.rotation.set(o.rx||0,o.ry||0,o.rz||0);dummy.scale.set(o.sx||1,o.sy||1,o.sz||1);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);});
    mesh.castShadow=false;mesh.receiveShadow=true;scene.add(mesh);envObjects.push({mesh});
  };
  // Visually dress route edges and open courtyards with instanced scenery, not hundreds of standalone meshes.
  for(let i=0;i<44;i++){
    const x=ox+8+rng()*(STAGE_WORLD_WIDTH-16),z=oz+8+rng()*(STAGE_WORLD_DEPTH-16);
    if(Math.hypot(x-(ox+12),z-(oz+12))<18)continue;
    const p=rng()<0.5?-1:1;
    if(locationIndex===0){
      const propRotation=rng()*Math.PI*2;
      if(!nearStartingChapel(x,z,2))props.push({x,y:0.45,z,ry:propRotation,sx:1.6,sy:0.9,sz:0.8});
      const treeX=x+p*2,treeZ=z+p*2;
      if(i%2===0&&!nearStartingChapel(treeX,treeZ,14))trees.push({x:treeX,y:2.4,z:treeZ,sy:1.2});
    }
    else if(locationIndex===2){rocks.push({x,y:0.6+rng()*0.45,z,ry:rng()*Math.PI,sx:0.8+rng()*1.5,sy:0.65+rng()*0.6,sz:0.8+rng()});trees.push({x:x+p*2,y:2.3,z:z-p*2,sy:0.95+rng()*0.5});}
    else if(locationIndex===3&&i<28){props.push({x,y:0.35,z,ry:rng()*Math.PI*2,sx:1.1,sy:0.8,sz:1.4});}
  }
  if(locationIndex===0||locationIndex===2){
    addInstances(treeGeo,treeMat,trees);addInstances(pineGeo,pineMat,trees.map(t=>({x:t.x,y:t.y+5.1,z:t.z,sx:t.sy,sy:t.sy,sz:t.sy})));
  }
  addInstances(rockGeo,rockMat,rocks);
  if(props.length)addInstances(rockGeo,locationIndex===3?rockMat:new THREE.MeshStandardMaterial({color:0x493b36,roughness:1}),props);
  if(locationIndex===3){
    const webMat=new THREE.LineBasicMaterial({color:0xb9b1a6,transparent:true,opacity:0.22});
    for(let i=0;i<10;i++){
      const x=ox+12+(i%5)*ROOM_WORLD_SIZE,z=oz+12+Math.floor(i/5)*ROOM_WORLD_SIZE;
      const points=[];for(let j=0;j<7;j++)points.push(new THREE.Vector3(x-3+j,8+Math.sin(j/6*Math.PI)*2,z));
      const web=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),webMat);scene.add(web);envObjects.push({mesh:web});
    }
  }
}
function addBreakableStoneWall(id,x,z,floorY){
  if(campaignProgress.brokenSecrets[id])return;
  const group=new THREE.Group(),stone=new THREE.MeshStandardMaterial({color:0x514b47,roughness:1}),crack=new THREE.MeshBasicMaterial({color:0x181719});
  for(let i=0;i<7;i++){const b=new THREE.Mesh(new THREE.DodecahedronGeometry(0.75+(i%3)*0.12,0),stone);b.position.set((i%3-1)*0.8,0.6+Math.floor(i/3)*0.68,(i%2)*0.2);b.castShadow=false;group.add(b);}
  const fissure=new THREE.Mesh(new THREE.BoxGeometry(0.07,1.1,0.08),crack);fissure.position.set(0,1,0.4);group.add(fissure);
  group.position.set(x,floorY,z);scene.add(group);envObjects.push({mesh:group});
  const collider={minX:x-1.35,maxX:x+1.35,minY:floorY,maxY:floorY+2.2,minZ:z-0.55,maxZ:z+0.55,cx:x,cy:floorY+1.1,cz:z,w:2.7,h:2.2,d:1.1,floorY};wallColliders.push(collider);
  const barrier={id,x,z,y:floorY,group,collider,hp:2};breakableBarriers.push(barrier);
  const interactable={type:'secretWall',x,z,y:floorY,barrier};worldInteractables.push(interactable);
}
function getMountainRouteLayout(ox,oz){
  const bridgeX=ox+3.5*ROOM_WORLD_SIZE,bridgeZ=oz+ROOM_WORLD_SIZE/2;
  const wellX=ox+1.5*ROOM_WORLD_SIZE,wellZ=oz+ROOM_WORLD_SIZE+7;
  const spiralX=ox+3*ROOM_WORLD_SIZE+8,spiralZ=oz+ROOM_WORLD_SIZE*1.5;
  const fallOpenings=[
    {x0:bridgeX-16,x1:bridgeX+16,z0:bridgeZ-5.4,z1:bridgeZ-2.55},
    {x0:bridgeX-16,x1:bridgeX+16,z0:bridgeZ+2.55,z1:bridgeZ+5.4}
  ];
  return {
    bridgeX,bridgeZ,wellX,wellZ,spiralX,spiralZ,
    valleyX:ox+ROOM_WORLD_SIZE/2,valleyZ:oz+ROOM_WORLD_SIZE*1.5,
    lookoutX:bridgeX,lookoutZ:bridgeZ,
    gateX:ox+3.5*ROOM_WORLD_SIZE,gateZ:oz+ROOM_WORLD_SIZE+42,
    wellOpening:{x0:wellX-3.1,x1:wellX+3.1,z0:wellZ-1,z1:wellZ+22},
    spiralOpening:{x0:spiralX-6.8,x1:spiralX+6.8,z0:spiralZ-6.8,z1:spiralZ+6.8},
    fallOpenings,
    fallZones:[
      ...fallOpenings.map(hole=>({minX:hole.x0,maxX:hole.x1,minZ:hole.z0,maxZ:hole.z1,minY:8,maxY:23,damage:25})),
      {minX:spiralX-6.8,maxX:spiralX+6.8,minZ:spiralZ-6.8,maxZ:spiralZ-5.4,minY:-0.5,maxY:1.5,damage:25},
      {minX:spiralX-6.8,maxX:spiralX+6.8,minZ:spiralZ+5.4,maxZ:spiralZ+6.8,minY:-0.5,maxY:1.5,damage:25},
      {minX:spiralX-6.8,maxX:spiralX-5.4,minZ:spiralZ-5.4,maxZ:spiralZ+5.4,minY:-0.5,maxY:1.5,damage:25},
      {minX:spiralX+5.4,maxX:spiralX+6.8,minZ:spiralZ-5.4,maxZ:spiralZ+5.4,minY:-0.5,maxY:1.5,damage:25},
      {minX:-16,maxX:14,minZ:16,maxZ:25,minY:-8.5,maxY:-6.4,damage:25},
      {minX:-16,maxX:14,minZ:29,maxZ:38,minY:-8.5,maxY:-6.4,damage:25}
    ]
  };
}

function addMountainFloorPatch(x,z,width,depth,floorY,material){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,0.2,depth),material);
  mesh.position.set(x,floorY-0.1,z);mesh.receiveShadow=true;scene.add(mesh);envObjects.push({mesh});
  mountainWalkableSurfaces.push({minX:x-width/2,maxX:x+width/2,minZ:z-depth/2,maxZ:z+depth/2,y:floorY});
  return mesh;
}

function addMountainCliffWall(group,x,y,z,width,height,depth,material){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  wallColliders.push({minX:x-width/2,maxX:x+width/2,minY:y-height/2,maxY:y+height/2,minZ:z-depth/2,maxZ:z+depth/2,cx:x,cy:y,cz:z,w:width,h:height,d:depth,floorY:y-height/2});
  return mesh;
}

function addMountainSpiralStair(x,z,lowerY=-8,upperY=0){
  const group=new THREE.Group(),stone=new THREE.MeshStandardMaterial({color:0x55504a,roughness:0.92,bumpMap:createSurfaceTextures().wallBump,bumpScale:0.08});
  const treadGeometry=new THREE.BoxGeometry(1.9,0.2,1.45),steps=40,radius=4.5;
  for(let i=0;i<steps;i++){
    const t=(i+1)/steps,angle=-Math.PI/2+t*Math.PI*3,y=lowerY+(upperY-lowerY)*t;
    const px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius;
    const tread=new THREE.Mesh(treadGeometry,stone);tread.position.set(px,y-0.1,pz);tread.rotation.y=-angle;tread.castShadow=true;tread.receiveShadow=true;group.add(tread);
    mountainWalkableSurfaces.push({minX:px-1.05,maxX:px+1.05,minZ:pz-0.85,maxZ:pz+0.85,y});
  }
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.58,8.4,10),stone);pole.position.set(x,-3.8,z);pole.castShadow=true;group.add(pole);
  scene.add(group);envObjects.push({mesh:group});
}

function buildMountainBridge(x,z,floorY,width,length,material,underground=false){
  const group=new THREE.Group(),plankGeometry=new THREE.BoxGeometry(1.85,0.18,width),count=Math.floor(length/1.72);
  for(let i=0;i<count;i++){
    const px=x-length/2+0.9+i*1.72,plank=new THREE.Mesh(plankGeometry,material);
    plank.position.set(px,floorY-0.09,z);plank.rotation.y=(i%4===0?0.025:0);plank.castShadow=true;plank.receiveShadow=true;group.add(plank);
    mountainWalkableSurfaces.push({minX:px-1.05,maxX:px+1.05,minZ:z-width/2-0.12,maxZ:z+width/2+0.12,y:floorY});
  }
  if(underground){
    const support=new THREE.Mesh(new THREE.BoxGeometry(0.42,3.8,0.42),material);support.position.set(x-length/2+2,floorY-2,z);group.add(support);
    const support2=support.clone();support2.position.x=x+length/2-2;group.add(support2);
  } else {
    const rope=new THREE.MeshStandardMaterial({color:0x44342b,roughness:1});
    for(const side of [-1,1]){
      const rail=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,length,7),rope);rail.rotation.z=Math.PI/2;rail.position.set(x,floorY+1.15,z+side*(width/2+0.25));group.add(rail);
      for(let i=0;i<=count;i+=3){const post=new THREE.Mesh(new THREE.BoxGeometry(0.12,1.25,0.12),rope);post.position.set(x-length/2+i*1.72,floorY+0.62,z+side*(width/2+0.25));group.add(post);}
    }
  }
  scene.add(group);envObjects.push({mesh:group});
}

function buildMountainRoute(ox,oz){
  const route=getMountainRouteLayout(ox,oz),floorY=-8;
  mountainFallZones.push(...route.fallZones);
  const rock=new THREE.MeshStandardMaterial({color:0x202a31,roughness:0.98,bumpMap:createSurfaceTextures().wallBump,bumpScale:0.1});
  const wetRock=new THREE.MeshStandardMaterial({color:0x17262b,roughness:0.72,metalness:0.08,emissive:0x061112,emissiveIntensity:0.18});
  const wood=new THREE.MeshStandardMaterial({color:0x49362a,roughness:0.9});
  const cave=new THREE.Group();
  addMountainFloorPatch(-48,27,64,26,floorY,rock);
  addMountainFloorPatch(-22,27,26,26,floorY,wetRock);
  addMountainFloorPatch(24,27,20,26,floorY,rock);
  addMountainFloorPatch(route.spiralX,route.spiralZ,22,24,floorY,rock);
  addMountainCliffWall(cave,-70,-4.9,14.2,24,6,0.6,rock);
  addMountainCliffWall(cave,-33.8,-4.9,14.2,33,6,0.6,rock);
  addMountainCliffWall(cave,-49,-4.9,39.8,65,6,0.6,rock);
  addMountainCliffWall(cave,-81,-4.9,27,0.6,6,26,rock);
  addMountainCliffWall(cave,45,-4.9,27,0.6,6,26,rock);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(35,0.35,26),rock);roof.position.set(-23.5,-2.4,27);cave.add(roof);
  const campRoof=new THREE.Mesh(new THREE.BoxGeometry(20,0.35,26),rock);campRoof.position.set(24,-2.4,27);cave.add(campRoof);
  for(let i=0;i<9;i++){
    const spike=new THREE.Mesh(new THREE.ConeGeometry(0.38+(i%3)*0.12,1.8+(i%2)*0.7,7),rock);
    spike.position.set(-39+(i%5)*6,-3.15,17+Math.floor(i/5)*15);spike.rotation.x=Math.PI;spike.castShadow=true;cave.add(spike);
  }
  scene.add(cave);envObjects.push({mesh:cave});

  addWalkableStaircase(route.wellX,route.wellZ,0,floorY,21,4.8,'stone');
  buildMountainBridge(-1,27,floorY,3.7,30,wood,true);
  addMountainSpiralStair(route.spiralX,route.spiralZ,floorY,0);
  buildMountainBridge(route.bridgeX,route.bridgeZ,FLOOR_HEIGHT,5.1,31,wood,false);

  const trailMaterial=new THREE.MeshStandardMaterial({color:0x565047,roughness:0.95});
  addMountainFloorPatch(route.spiralX,route.spiralZ,10.8,10.8,0,trailMaterial);
  for(let i=0;i<7;i++){
    const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(0.72+(i%3)*0.14,0),trailMaterial);
    stone.position.set(route.valleyX+7+i*6,0.15,route.valleyZ-5-i*2.3);stone.scale.set(1.45,0.45,0.85);stone.rotation.y=i*0.43;stone.receiveShadow=true;cave.add(stone);
  }

  const sceneDress=new THREE.Group(),boulderGeo=new THREE.DodecahedronGeometry(1.4,0),pineGeo=new THREE.ConeGeometry(1.8,5.5,6);
  const pineMat=new THREE.MeshStandardMaterial({color:0x24342b,roughness:1}),trunkMat=new THREE.MeshStandardMaterial({color:0x34281f,roughness:1});
  for(let i=0;i<8;i++){
    const px=route.valleyX-11+(i%4)*7,pz=route.valleyZ-5+Math.floor(i/4)*9;
    const boulder=new THREE.Mesh(boulderGeo,rock);boulder.position.set(px,0.55,pz);boulder.scale.set(1.4+0.2*(i%3),0.8,1.1);boulder.rotation.y=i*0.68;sceneDress.add(boulder);
  }
  for(const [tx,tz] of [[route.valleyX-12,route.valleyZ+8],[route.valleyX+12,route.valleyZ-8],[route.valleyX+20,route.valleyZ+3]]){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.45,3.6,6),trunkMat);trunk.position.set(tx,1.8,tz);sceneDress.add(trunk);
    const pine=new THREE.Mesh(pineGeo,pineMat);pine.position.set(tx,5.5,tz);pine.castShadow=false;sceneDress.add(pine);
  }
  const tentMat=new THREE.MeshStandardMaterial({color:0x473b36,roughness:1,side:THREE.DoubleSide});
  for(const [tx,tz] of [[route.valleyX+2,route.valleyZ+5],[route.valleyX+10,route.valleyZ+4]]){
    const tent=new THREE.Mesh(new THREE.ConeGeometry(3.2,3.7,4),tentMat);tent.position.set(tx,1.85,tz);tent.rotation.y=Math.PI/4;sceneDress.add(tent);
  }
  const fire=new THREE.Group();
  for(let i=0;i<5;i++){const log=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.14,1.55,7),wood);log.rotation.z=Math.PI/2;log.rotation.y=i*Math.PI/5;log.position.set(route.valleyX+7,0.22,route.valleyZ+1);fire.add(log);}
  const glow=new THREE.PointLight(0xc05c24,1.3,13,2);glow.position.set(route.valleyX+7,1.2,route.valleyZ+1);fire.add(glow);sceneDress.add(fire);
  scene.add(sceneDress);envObjects.push({mesh:sceneDress});
  const cloudMat=new THREE.MeshBasicMaterial({color:0x4f6270,transparent:true,opacity:0.12,depthWrite:false,side:THREE.DoubleSide});
  for(const [cx,cy,cz,sx,sy] of [[-12,18,-42,92,13],[28,23,-68,120,17],[-42,30,-92,150,20],[0,2,-16,70,8],[-24,5,-34,54,7]]){
    const cloud=new THREE.Mesh(new THREE.PlaneGeometry(sx,sy),cloudMat);cloud.position.set(cx,cy,cz);cloud.rotation.z=0.08;scene.add(cloud);envObjects.push({mesh:cloud});
  }

  const puddle=new THREE.Mesh(new THREE.CircleGeometry(2.8,24),new THREE.MeshStandardMaterial({color:0x1a2a2c,roughness:0.25,metalness:0.2,transparent:true,opacity:0.72}));
  puddle.rotation.x=-Math.PI/2;puddle.position.set(-33,floorY+0.015,27);cave.add(puddle);
  const slime=new THREE.Mesh(new THREE.CircleGeometry(1.6,20),new THREE.MeshStandardMaterial({color:0x3b5936,roughness:0.35,transparent:true,opacity:0.62,emissive:0x17220c}));
  slime.rotation.x=-Math.PI/2;slime.position.set(22,floorY+0.02,31);cave.add(slime);
  const torchMat=new THREE.MeshStandardMaterial({color:0x6f5231,emissive:0x321706,emissiveIntensity:0.45});
  for(const [tx,tz] of [[-40,18],[-19,36],[21,18]]){
    const torch=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.18,1.2,7),torchMat);torch.position.set(tx,-5.8,tz);cave.add(torch);
    const light=new THREE.PointLight(0x8a4624,0.55,9,2);light.position.set(tx,-4.9,tz);cave.add(light);
  }
  const random=seededRandom(0x4d4f554e);
  addBatSwarm({floorY},-28,27,random);addBatSwarm({floorY},-47,27,random);
  spawnEnemy('spider',-35,23,floorY);spawnEnemy('spider',-22,31,floorY);
  spawnEnemy('hunter',20,23,floorY);spawnEnemy('hunter',28,32,floorY);
  spawnChest(route.lookoutX+6,route.lookoutZ+5,FLOOR_HEIGHT);
  if(!campaignProgress.brokenSecrets['mountain-cave-reward']){
    const secretX=ox+ROOM_WORLD_SIZE*3.7+7,secretZ=oz+ROOM_WORLD_SIZE*0.8-9;
    const secretLight=new THREE.PointLight(0x5a78b8,0.85,10,2);secretLight.position.set(secretX,2,secretZ);scene.add(secretLight);envObjects.push({mesh:secretLight});
    spawnChest(secretX,secretZ,0);
    const chest=chests[chests.length-1];chest.uniqueRewardKey='mountain-cave-reward';chest.loot={type:'gem',gem:BLOOD_GEMS[2]};
    const crystalMat=new THREE.MeshStandardMaterial({color:0x586da3,emissive:0x182a57,emissiveIntensity:0.7,roughness:0.35,metalness:0.35});
    const crystalGeo=new THREE.OctahedronGeometry(0.72,0),crystals=new THREE.Group();
    for(let i=0;i<4;i++){const crystal=new THREE.Mesh(crystalGeo,crystalMat);crystal.position.set(secretX-3+i*1.8,0.8+(i%2)*0.5,secretZ-3);crystal.rotation.z=0.2*(i%2?1:-1);crystals.add(crystal);}
    scene.add(crystals);envObjects.push({mesh:crystals});
  }
  for(let i=0;i<9;i++){
    const t=i/8,px=route.spiralX+(route.gateX-route.spiralX)*t,pz=route.spiralZ+(route.gateZ-route.spiralZ)*t;
    const trailStone=new THREE.Mesh(new THREE.DodecahedronGeometry(0.62,0),trailMaterial);
    trailStone.position.set(px,0.08,pz);trailStone.scale.set(1.65,0.16,1.05);trailStone.rotation.y=t*1.4;trailStone.receiveShadow=true;scene.add(trailStone);envObjects.push({mesh:trailStone});
  }
}

function getGothicChasmLayout(ox,oz){
  const centerX=ox+STAGE_WORLD_WIDTH/2,centerZ=oz+STAGE_WORLD_DEPTH/2;
  return {centerX,centerZ,void:{x0:centerX-38,x1:centerX+38,z0:centerZ-26,z1:centerZ+26},lowerZ:centerZ-4,upperZ:centerZ+17};
}
function addGothicChasmDeck(x,z,y,length,width,axis,stone){
  const alongX=axis==='x',deck=new THREE.Mesh(new THREE.BoxGeometry(alongX?length:width,0.42,alongX?width:length),stone);
  deck.position.set(x,y-0.21,z);deck.castShadow=true;deck.receiveShadow=true;scene.add(deck);envObjects.push({mesh:deck});
  mountainWalkableSurfaces.push({minX:x-(alongX?length:width)/2,maxX:x+(alongX?length:width)/2,minZ:z-(alongX?width:length)/2,maxZ:z+(alongX?width:length)/2,y});
  const railMat=new THREE.MeshStandardMaterial({color:0x25282d,roughness:0.88,metalness:0.14});
  const railOffset=(alongX?width:length)/2+0.35;
  for(const side of [-1,1]){
    const rail=new THREE.Mesh(new THREE.BoxGeometry(alongX?length:0.22,1.25,alongX?0.22:length),railMat);rail.position.set(x+(alongX?0:side*railOffset),y+0.62,z+(alongX?side*railOffset:0));rail.castShadow=true;scene.add(rail);envObjects.push({mesh:rail});
    for(let i=0;i<=Math.floor(length/6);i++){
      const t=-length/2+i*6,post=new THREE.Mesh(new THREE.BoxGeometry(alongX?0.22:0.22,1.35,alongX?0.22:0.22),railMat);post.position.set(x+(alongX?t:side*railOffset),y+0.67,z+(alongX?side*railOffset:t));post.castShadow=true;scene.add(post);envObjects.push({mesh:post});
    }
  }
}
function addGothicChasmArch(x,y,z,span,height,depth,material,axis='x'){
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-span/2,0,0),new THREE.Vector3(-span*0.43,height*0.58,0),new THREE.Vector3(-span*0.22,height*0.94,0),
    new THREE.Vector3(0,height,0),new THREE.Vector3(span*0.22,height*0.94,0),new THREE.Vector3(span*0.43,height*0.58,0),new THREE.Vector3(span/2,0,0)
  ]);
  const arch=new THREE.Mesh(new THREE.TubeGeometry(curve,28,0.72,8,false),material);arch.position.set(x,y,z);arch.rotation.y=axis==='x'?0:Math.PI/2;arch.castShadow=true;arch.receiveShadow=true;scene.add(arch);envObjects.push({mesh:arch});
  const pillarGeo=new THREE.BoxGeometry(1.65,height,1.65);
  for(const side of [-1,1]){const pillar=new THREE.Mesh(pillarGeo,material);pillar.position.set(x+(axis==='x'?side*span/2:0),y-height/2,z+(axis==='x'?0:side*span/2));pillar.castShadow=true;pillar.receiveShadow=true;scene.add(pillar);envObjects.push({mesh:pillar});}
}
function buildGothicChasmRoute(ox,oz){
  const layout=getGothicChasmLayout(ox,oz),{centerX,centerZ}=layout;
  const surfaces=createSurfaceTextures(),stone=new THREE.MeshStandardMaterial({color:0x101820,map:surfaces.wall,normalMap:surfaces.wallNormal,normalScale:new THREE.Vector2(0.72,0.72),roughnessMap:surfaces.wallRoughness,roughness:0.99,metalness:0.03}),darkStone=new THREE.MeshStandardMaterial({color:0x080d12,roughness:0.99,metalness:0.02});
  const abyss=new THREE.Mesh(new THREE.BoxGeometry(76,0.4,52),new THREE.MeshBasicMaterial({color:0x05090e,transparent:true,opacity:0.86,depthWrite:false}));abyss.position.set(centerX,-24,centerZ);scene.add(abyss);envObjects.push({mesh:abyss});
  const hallFloor=new THREE.Mesh(new THREE.BoxGeometry(58,0.28,58),new THREE.MeshStandardMaterial({color:0x202a31,map:surfaces.floor,normalMap:surfaces.floorNormal,normalScale:new THREE.Vector2(0.5,0.5),roughnessMap:surfaces.floorRoughness,roughness:0.92,metalness:0.08}));
  hallFloor.position.set(centerX,-0.14,layout.lowerZ);hallFloor.receiveShadow=true;scene.add(hallFloor);envObjects.push({mesh:hallFloor});
  mountainWalkableSurfaces.push({minX:centerX-28,maxX:centerX+28,minZ:layout.lowerZ-28,maxZ:layout.lowerZ+28,y:0});
  addGothicChasmDeck(centerX,layout.lowerZ,0,150,7,'x',stone);
  addGothicChasmDeck(centerX,layout.upperZ,FLOOR_HEIGHT,138,6.2,'x',stone);
  addGothicChasmDeck(centerX-26,centerZ,FLOOR_HEIGHT,46,5.4,'z',stone);
  // The lower level is an enclosed cathedral hall; its vault is supplied by the Blender slice.
  // Keep only two distant skyline arches outside the hall sightline.
  addGothicChasmArch(centerX-55,-2,centerZ+38,29,20,6,stone,'x');
  addGothicChasmArch(centerX+48,-3,centerZ-42,32,23,6,stone,'z');
  for(const x of [centerX-58,centerX-34,centerX+34,centerX+58]){
    const pillar=new THREE.Mesh(new THREE.BoxGeometry(3.2,29,3.2),darkStone);pillar.position.set(x,-6,centerZ+8);pillar.castShadow=true;pillar.receiveShadow=true;scene.add(pillar);envObjects.push({mesh:pillar});
  }
  addWalkableStaircase(centerX-49,layout.lowerZ-1,0,FLOOR_HEIGHT,27,5.2,'stone');
  addWalkableStaircase(centerX+42,layout.lowerZ+18,0,FLOOR_HEIGHT,24,4.6,'stone');
  const lanternMat=new THREE.MeshStandardMaterial({color:0x5b4028,roughness:0.82}),flameMat=new THREE.MeshBasicMaterial({color:0xffad55,toneMapped:false});
  [[centerX-63,layout.lowerZ,0xff994d],[centerX-15,layout.lowerZ,0xffb05e],[centerX+35,layout.upperZ,0xff9a4d],[centerX+61,layout.upperZ,0xffb66a]].forEach(([x,z,color])=>{
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.24,2.2,0.24),lanternMat);post.position.set(x,1.1,z);scene.add(post);envObjects.push({mesh:post});
    const flame=new THREE.Mesh(new THREE.SphereGeometry(0.22,8,6),flameMat);flame.position.set(x,2.35,z);scene.add(flame);envObjects.push({mesh:flame});
    const light=new THREE.PointLight(color,1.15,17,2);light.position.set(x,2.3,z);registerGraphicsPointLight(light);scene.add(light);envObjects.push({mesh:light});
  });
  const hallLamp=new THREE.Group(),lampPost=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.18,4.2,8),lanternMat);
  lampPost.position.set(centerX+7,2.1,layout.lowerZ+9);hallLamp.add(lampPost);
  const lampFlame=new THREE.Mesh(new THREE.SphereGeometry(0.28,10,8),flameMat);lampFlame.position.set(centerX+7,4.35,layout.lowerZ+9);hallLamp.add(lampFlame);
  const hallLight=new THREE.PointLight(0xffae62,2.1,24,2);hallLight.position.copy(lampFlame.position);registerGraphicsPointLight(hallLight);hallLamp.add(hallLight);
  scene.add(hallLamp);envObjects.push({mesh:hallLamp});
  const windowFill=new THREE.PointLight(0x6c9bd0,0.82,30,2);windowFill.position.set(centerX,7,layout.lowerZ-25);registerGraphicsPointLight(windowFill);scene.add(windowFill);envObjects.push({mesh:windowFill});
  const fog=new THREE.Mesh(new THREE.PlaneGeometry(110,34),new THREE.MeshBasicMaterial({color:0x8198a8,transparent:true,opacity:0.075,depthWrite:false,side:THREE.DoubleSide}));fog.rotation.x=Math.PI/2;fog.position.set(centerX,-9,centerZ);scene.add(fog);envObjects.push({mesh:fog});
  mountainFallZones.push({minX:layout.void.x0,maxX:layout.void.x1,minZ:layout.void.z0,maxZ:layout.void.z1,minY:-1,maxY:FLOOR_HEIGHT+2,damage:25});
  return layout;
}

function buildCampaignTargets(locationIndex,ox,oz){
  if(locationIndex===0)addBreakableStoneWall('street-court',ox+ROOM_WORLD_SIZE*2.5,oz+ROOM_WORLD_SIZE*0.55,0);
  if(locationIndex===2){
    addBreakableStoneWall('mountain-cave',ox+ROOM_WORLD_SIZE*3.7,oz+ROOM_WORLD_SIZE*0.8,0);
    const route=getMountainRouteLayout(ox,oz),x=route.gateX,z=route.gateZ,y=0;
    const frame=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:0x343039,metalness:0.65,roughness:0.56}),gold=new THREE.MeshStandardMaterial({color:0x80613b,metalness:0.8,roughness:0.35});
    for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.BoxGeometry(0.8,8,0.8),mat);post.position.set(side*4,4,0);frame.add(post);}
    const lintel=new THREE.Mesh(new THREE.BoxGeometry(8.8,0.8,0.8),mat);lintel.position.y=8;frame.add(lintel);
    const bars=new THREE.Mesh(new THREE.BoxGeometry(7.2,6.5,0.35),mat);bars.position.set(0,3.5,0);frame.add(bars);
    const chain=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,5.5,8),gold);chain.position.set(0,6.5,0.28);frame.add(chain);frame.position.set(x,y,z);scene.add(frame);envObjects.push({mesh:frame});
    const gateCollider={minX:x-3.6,maxX:x+3.6,minY:y,maxY:y+6.5,minZ:z-0.2,maxZ:z+0.2,cx:x,cy:y+3.25,cz:z,w:7.2,h:6.5,d:0.4,floorY:y};
    const gateOpen=!!campaignProgress.castleChainShot;bars.visible=!gateOpen;chain.visible=!gateOpen;
    if(!gateOpen)wallColliders.push(gateCollider);
    chainTarget={x,y:y+6.5,z:z+0.3,mesh:chain,gate:bars,collider:gateCollider};
    worldInteractables.push({type:'campaignExit',destination:3,x,z:z-2,y});
  }
}
function buildCastleInterior(floorRooms,bossRoom){
  const webMat=new THREE.MeshBasicMaterial({color:0xb8b2b7,transparent:true,opacity:0.28,side:THREE.DoubleSide,depthWrite:false});
  const webGeo=new THREE.BufferGeometry(),points=[];
  for(let i=0;i<7;i++){const a=i*Math.PI/3;points.push(0,0,0,Math.cos(a)*3,Math.sin(a)*3,0);}
  for(let r=1;r<=3;r++)for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3;points.push(Math.cos(a)*r,Math.sin(a)*r,0,Math.cos(b)*r,Math.sin(b)*r,0);}
  webGeo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const webs=new THREE.Group();
  [[bossRoom.roomX+1,bossRoom.roomZ+1,Math.PI/2],[bossRoom.roomX+ROOM_WORLD_SIZE-1,bossRoom.roomZ+1,Math.PI/2],[bossRoom.roomX+1,bossRoom.roomZ+ROOM_WORLD_SIZE-1,0],[bossRoom.roomX+ROOM_WORLD_SIZE-1,bossRoom.roomZ+ROOM_WORLD_SIZE-1,0]].forEach(([x,z,yaw])=>{
    const web=new THREE.LineSegments(webGeo,webMat);web.position.set(x,FLOOR_LEVELS[1]+7,z);web.rotation.y=yaw;webs.add(web);
  });
  const cocoonMat=new THREE.MeshStandardMaterial({color:0x665b5c,roughness:0.95});
  [[bossRoom.roomX+12,bossRoom.roomZ+13],[bossRoom.roomX+ROOM_WORLD_SIZE-13,bossRoom.roomZ+ROOM_WORLD_SIZE-12]].forEach(([x,z])=>{
    const cocoon=new THREE.Mesh(new THREE.SphereGeometry(0.75,10,8),cocoonMat);cocoon.position.set(x,FLOOR_LEVELS[1]+1.6,z);cocoon.scale.y=2.1;cocoon.castShadow=true;webs.add(cocoon);
    const bone=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.12,1.4,6),cocoonMat);bone.position.set(x+1,FLOOR_LEVELS[1]+0.3,z+1);bone.rotation.z=0.7;webs.add(bone);
  });
  scene.add(webs);envObjects.push({mesh:webs});
  [floorRooms[0][2],floorRooms[0][7]].forEach(room=>{
    const point=roomSpawnPoint(room,room.roomIndex+4901);
    [-1,1].forEach(side=>{
      const before=enemies.length;spawnEnemy('spider',point.x+side*1.25,point.z,room.floorY);
      const ambush=enemies[before];if(ambush){ambush.ceilingAmbush=true;ambush.ambushRange=8;ambush.ambushDrop=0;}
    });
  });
}
function damageBreakableBarrier(attack){
  if(!hunter)return;
  for(const wall of breakableBarriers){
    if(campaignProgress.brokenSecrets[wall.id]||attack.hitEnv.has(wall.id))continue;
    const dx=wall.x-hunter.position.x,dz=wall.z-hunter.position.z,d=Math.hypot(dx,dz);
    let a=Math.atan2(dx,dz)-attack.facingAngle;while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;
    if(d<attack.attackRange+1.8&&Math.abs(a)<Math.max(attack.attackAngle/2,0.6)&&Math.abs(hunter.position.y-wall.y)<2.5){
      attack.hitEnv.add(wall.id);wall.hp--;wall.group.children.forEach((piece,i)=>{piece.rotation.z+=(i%2?1:-1)*0.06;});
      if(wall.hp<=0){campaignProgress.brokenSecrets[wall.id]=true;wallColliders=wallColliders.filter(c=>c!==wall.collider);rebuildWallCollisionGrid();wall.group.children.forEach((piece,i)=>{piece.position.y-=0.18+(i%3)*0.12;});sfx('break');player.screenShake=0.3;notify('КАМЕННЫЙ ЗАВАЛ РАЗРУШЕН — СЕКРЕТНЫЙ ПРОХОД ОТКРЫТ');SaveSystem.save();}
    }
  }
}

function createDistantHorizon(locationIndex){
  if(!scene) return;
  if(locationIndex===2) return;
  if(!horizonAssets){
    horizonAssets = {
      house:new THREE.MeshStandardMaterial({color:0x19171b,roughness:1,metalness:0}),
      cathedral:new THREE.MeshStandardMaterial({color:0x211b22,roughness:1,metalness:0}),
      castle:new THREE.MeshStandardMaterial({color:0x15131d,roughness:1,metalness:0}),
      forest:new THREE.MeshStandardMaterial({color:0x202a2a,roughness:1,metalness:0}),
      block:new THREE.BoxGeometry(1,1,1),
      roof:new THREE.ConeGeometry(0.55,1,4),
      finial:new THREE.ConeGeometry(0.12,1,6),
      trunk:new THREE.CylinderGeometry(0.16,0.24,1,5),
      pine:new THREE.ConeGeometry(0.5,1,5)
    };
  }
  const extent = Math.max(STAGE_WORLD_WIDTH,STAGE_WORLD_DEPTH)/2 + 24;
  if(locationIndex===2){
    const trees=[],crowns=[],dummy=new THREE.Object3D();
    for(let side=0;side<4;side++){
      for(let i=0;i<6;i++){
        const along=-extent+4+i*((extent-4)*2/5);
        const x=side<2?along:(side===2?-extent:extent);
        const z=side<2?(side===0?-extent:extent):along;
        const width=5+Math.random()*4,depth=5+Math.random()*4,height=13+Math.random()*15;
        trees.push({x,z,width,height,depth});
        for(let tier=0;tier<3;tier++)crowns.push({x,z,y:height*(0.43+tier*0.19),width:width*(1-tier*0.18),height:height*0.48});
      }
    }
    const trunks=new THREE.InstancedMesh(horizonAssets.trunk,horizonAssets.house,trees.length);
    const pines=new THREE.InstancedMesh(horizonAssets.pine,horizonAssets.forest,crowns.length);
    trees.forEach((tree,index)=>{
      dummy.position.set(tree.x,tree.height*0.31,tree.z);dummy.scale.set(tree.width*0.15,tree.height*0.62,tree.width*0.15);dummy.updateMatrix();trunks.setMatrixAt(index,dummy.matrix);
    });
    crowns.forEach((crown,index)=>{
      dummy.position.set(crown.x,crown.y,crown.z);dummy.scale.set(crown.width,crown.height,crown.width);dummy.updateMatrix();pines.setMatrixAt(index,dummy.matrix);
    });
    [trunks,pines].forEach(mesh=>{mesh.castShadow=false;mesh.receiveShadow=false;mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);envObjects.push({mesh});});
    return;
  }
  for(let side=0;side<4;side++){
    for(let i=0;i<6;i++){
      const along = -extent+4+i*((extent-4)*2/5);
      const x = side<2 ? along : (side===2 ? -extent : extent);
      const z = side<2 ? (side===0 ? -extent : extent) : along;
      const group = new THREE.Group();
      const forest = locationIndex === 2;
      const width = 5+Math.random()*4;
      const depth = 5+Math.random()*4;
      const height = forest ? 13+Math.random()*15 : (locationIndex===1 ? 14+Math.random()*14 : (locationIndex===3 ? 12+Math.random()*14 : 9+Math.random()*13));
      const material = forest ? horizonAssets.forest : (locationIndex===1 ? horizonAssets.cathedral : (locationIndex===3 ? horizonAssets.castle : horizonAssets.house));
      const addPart = (geometry,mat,px,py,pz,sx,sy,sz) => {
        const mesh = new THREE.Mesh(geometry,mat);
        mesh.position.set(px,py,pz);
        mesh.scale.set(sx,sy,sz);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        group.add(mesh);
      };
      if(forest){
        addPart(horizonAssets.trunk,horizonAssets.house,0,height*0.31,0,width*0.15,height*0.62,width*0.15);
        for(let tier=0;tier<3;tier++){
          const crownH = height*0.48;
          const crownY = height*(0.43+tier*0.19);
          const crownW = width*(1-tier*0.18);
          addPart(horizonAssets.pine,material,0,crownY,0,crownW,crownH,crownW);
        }
      } else {
        addPart(horizonAssets.block,material,0,height/2,0,width,height,depth);
        const roofH = locationIndex===1 ? height*0.46 : (locationIndex===3 ? height*0.5 : height*0.34);
        addPart(horizonAssets.roof,material,0,height+roofH/2,0,width*0.88,roofH,width*0.88);
        if(locationIndex===1 || i%2===0){
          const spireH = locationIndex===1 ? 6+Math.random()*6 : (locationIndex===3 ? 7+Math.random()*8 : 3+Math.random()*4);
          addPart(horizonAssets.finial,material,0,height+roofH+spireH/2,0,width*0.2,spireH,width*0.2);
        }
      }
      group.position.set(x,0,z);
      scene.add(group);
      envObjects.push({mesh:group});
    }
  }
}

function generateMaze(size,seed){
  const random=seed===undefined?Math.random:seededRandom(seed);
  const grid = [];
  for(let y=0;y<size;y++){grid[y]=[];for(let x=0;x<size;x++)grid[y][x]=1;}
  function carve(x,y){
    grid[y][x] = 0;
    const dirs = [[0,-2],[0,2],[-2,0],[2,0]];
    for(let i=dirs.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[dirs[i],dirs[j]]=[dirs[j],dirs[i]];}
    for(const [dx,dy] of dirs){
      const nx = x+dx, ny = y+dy;
      if(nx>0&&nx<size-1&&ny>0&&ny<size-1&&grid[ny][nx]===1){
        grid[y+dy/2][x+dx/2]=0; carve(nx,ny);
      }
    }
  }
  carve(1,1);
  for(let i=0;i<size*6;i++){
    const x = 1+Math.floor(random()*(size-2));
    const y = 1+Math.floor(random()*(size-2));
    if(grid[y][x]===1){
      const n = [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([nx,ny])=>nx>0&&nx<size-1&&ny>0&&ny<size-1&&grid[ny][nx]===0);
      if(n.length>=2) grid[y][x]=0;
    }
  }
  return grid;
}
function buildMazeWalls(grid,ox,oz){
  const size = grid.length * cellSize;
  const floorPadding = 24;
  createCobblestoneFloor(size+floorPadding*2,ox-floorPadding,oz-floorPadding);
  for(let y=0;y<grid.length;y++){
    for(let x=0;x<grid[y].length;x++){
      if(grid[y][x]===1){
        const h = 3.5 + Math.random()*1.2;
        createGothicWall(ox + x*cellSize + cellSize/2, h/2, oz + y*cellSize + cellSize/2, cellSize, h, cellSize, false);
      }
    }
  }
}
let _wallCheckFrame = 0;
let worldTutorialTimers=[];
let chainTarget=null;
let breakableBarriers=[];
function segmentAabbEntry(start,end,box,padding=0){
  if(!box||![box.minX,box.maxX,box.minY,box.maxY,box.minZ,box.maxZ].every(Number.isFinite)) return null;
  let tMin=0,tMax=1;
  const axes=[
    [start.x,end.x-start.x,box.minX-padding,box.maxX+padding],
    [start.y,end.y-start.y,box.minY-padding,box.maxY+padding],
    [start.z,end.z-start.z,box.minZ-padding,box.maxZ+padding]
  ];
  for(const [origin,delta,min,max] of axes){
    if(Math.abs(delta)<1e-8){if(origin<min||origin>max)return null;continue;}
    const a=(min-origin)/delta,b=(max-origin)/delta;
    tMin=Math.max(tMin,Math.min(a,b));tMax=Math.min(tMax,Math.max(a,b));
    if(tMin>tMax)return null;
  }
  if(tMax<0||tMin>1)return null;
  return Math.max(0,tMin);
}
function getCameraSafePosition(target,desired){
  const offset=desired.clone().sub(target),distance=offset.length();
  if(distance<1e-6)return desired.clone();
  let safeDistance=distance;
  wallColliders.forEach(box=>{
    const entry=segmentAabbEntry(target,desired,box,CAMERA_COLLISION_PADDING);
    if(entry!==null&&entry>1e-4)safeDistance=Math.min(safeDistance,Math.max(0.25,entry*distance));
  });
  const dy=desired.y-target.y;
  if(Math.abs(dy)>1e-8){
    floorMeshes.forEach(ceiling=>{
      if(!ceiling.userData?.isCeiling) return;
      const t=(ceiling.position.y-target.y)/dy;
      if(t<=1e-4||t>=1) return;
      const x=target.x+(desired.x-target.x)*t,z=target.z+(desired.z-target.z)*t;
      const width=ceiling.geometry?.parameters?.width||0,depth=ceiling.geometry?.parameters?.height||0;
      if(Math.abs(x-ceiling.position.x)>width/2+CAMERA_COLLISION_PADDING||Math.abs(z-ceiling.position.z)>depth/2+CAMERA_COLLISION_PADDING)return;
      const safeY=ceiling.position.y+(dy>0?-CAMERA_COLLISION_PADDING:CAMERA_COLLISION_PADDING);
      const safeT=(safeY-target.y)/dy;
      if(safeT>0)safeDistance=Math.min(safeDistance,safeT*distance);
    });
  }
  return target.clone().addScaledVector(offset.normalize(),Math.max(0.25,safeDistance));
}
function updateWallTransparency(){
  _wallCheckFrame++;
  if(_wallCheckFrame % 6 !== 0) return;
  if(!hunter || !camera) return;
  const cPos = camera.position.clone();
  const hBase = hunter.position.clone();
  const hCenter = new THREE.Vector3(hBase.x, hBase.y + Math.max(2.4,hunterVisualHeight*0.55), hBase.z);
  const hunterDist = cPos.distanceTo(hCenter);
  const mainDir = hCenter.clone().sub(cPos).normalize();
  wallMeshes.forEach(wall => {
    if(wall.isDeco) return;
    let target = 1.0;
    const candidates=wall.userData.colliders||[wall.userData];
    for(const box of candidates){
      if(hunter.position.y+2.2<box.minY || hunter.position.y+2.2>box.maxY+2) continue;
      if(segmentAabbEntry(hCenter,cPos,box)!==null){target=wall.userData.isRoomBatch?0.48:0.34;break;}
      const dx=box.cx-cPos.x,dy=box.cy-cPos.y,dz=box.cz-cPos.z;
      const distToCam=Math.sqrt(dx*dx+dy*dy+dz*dz);
      if(distToCam<2.8){ target=wall.userData.isRoomBatch?0.82:0.58; break; }
      const proj=dx*mainDir.x+dy*mainDir.y+dz*mainDir.z;
      if(proj>0&&proj<hunterDist+1){
        const ox=dx-mainDir.x*proj,oy=dy-mainDir.y*proj,oz=dz-mainDir.z*proj;
        if(ox*ox+oy*oy+oz*oz<4.84){ target=wall.userData.isRoomBatch?0.74:0.42; break; }
      }
    }
    wall.userData.targetOpacity = target;
    const speed = target < wall.material.opacity ? 0.18 : 0.10;
    wall.material.opacity = lerp(wall.material.opacity, target, speed);
    wall.material.depthWrite=wall.material.opacity>0.52;
    wall.visible = true;
  });
}

function collectSharedWorldResources(){
  const shared={geometries:new Set(),materials:new Set()};
  const addRoot=root=>{
    if(!root||typeof root.traverse!=='function') return;
    root.traverse(node=>{
      if(node.geometry) shared.geometries.add(node.geometry);
      if(node.material){
        const materials=Array.isArray(node.material)?node.material:[node.material];
        materials.forEach(material=>{if(material) shared.materials.add(material);});
      }
    });
  };
  const addCache=cache=>Object.values(cache||{}).forEach(resource=>{
    if(resource&&resource.isBufferGeometry) shared.geometries.add(resource);
    if(resource&&resource.isMaterial) shared.materials.add(resource);
  });
  addRoot(hunterModelSource);
  addRoot(spiderModelBundle&&spiderModelBundle.scene);
  addRoot(spiderFallbackBundle&&spiderFallbackBundle.scene);
  Object.values(extraModelBundles||{}).forEach(bundle=>addRoot(bundle&&bundle.scene));
  addCache(cryptAtmosphereAssets);
  addCache(horizonAssets);
  return shared;
}

function disposeWorldObjectResources(root,shared,disposed){
  if(!root||typeof root.traverse!=='function') return;
  root.traverse(node=>{
    const geometry=node.geometry;
    if(geometry&&!shared.geometries.has(geometry)&&!disposed.geometries.has(geometry)){
      disposed.geometries.add(geometry);
      geometry.dispose();
    }
    if(node.material){
      const materials=Array.isArray(node.material)?node.material:[node.material];
      materials.forEach(material=>{
        if(material&&!shared.materials.has(material)&&!disposed.materials.has(material)){
          disposed.materials.add(material);
          material.dispose();
        }
      });
    }
  });
}

function clearWorld(){
  if(!scene) return;
  if(typeof clearGraphicsPointLights==='function')clearGraphicsPointLights();
  if(typeof resetCathedralGroundTierAtmosphere==='function')resetCathedralGroundTierAtmosphere();
  altarFireRefs.length=0;altarEmberRefs.length=0;altarFireLight=null;
  if(worldTutorialTimers) worldTutorialTimers.forEach(clearTimeout);
  worldTutorialTimers=[];
  clearEnemyModelAttachQueue();
  const shared=collectSharedWorldResources(),disposed={geometries:new Set(),materials:new Set()};
  const removeObject=object=>{
    if(!object) return;
    scene.remove(object);
    disposeWorldObjectResources(object,shared,disposed);
  };
  [...enemies,...chests,...lanterns,...envObjects].forEach(object=>removeObject(object&&object.mesh));
  floorMeshes.forEach(removeObject);
  wallMeshes.forEach(wall=>removeObject(wall&&(wall.mesh||(!wall.isDeco?wall:null))));
  dustMotes.forEach(mote=>removeObject(mote&&mote.mesh));
  ambientCreatures.forEach(creature=>removeObject(creature&&creature.mesh));
  attackTrails.forEach(trail=>{removeObject(trail&&trail.mesh);if(trail&&trail.light) scene.remove(trail.light);});
  parryIndicators.forEach(indicator=>removeObject(indicator&&indicator.mesh));
  toolProjectiles.forEach(projectile=>removeObject(projectile&&projectile.mesh));
  bloodParticles.forEach(particle=>removeObject(particle&&particle.mesh));
  removeObject(doll);
  removeObject(workshop);
  removeObject(waystone);
  removeObject(bloodStainMesh);
  bloodStainMesh = null;
  enemies = []; wallMeshes = []; wallColliders=[]; floorMeshes=[]; stairs=[]; chests = []; lanterns = []; envObjects = [];
  bloodParticles=[];dustMotes = []; ambientCreatures=[]; attackTrails = []; parryIndicators = []; toolProjectiles = [];
  mountainWalkableSurfaces=[];mountainFallZones=[];mountainFloorVoids=[];
  if(typeof cathedralExteriorBounds!=='undefined'){cathedralExteriorBounds=null;cathedralExteriorSurfaces=[];cathedralExteriorRamps=[];cathedralFatalFallZones=[];}
  doll = null; workshop = null; waystone = null;
  nearbyLantern = null; nearbyDoll = false; nearbyWorldInteractable=null;
  shortcutGates=[]; stageElevators=[]; worldInteractables=[]; chainTarget=null; breakableBarriers=[];
  if(typeof wallCollisionGrid!=='undefined')wallCollisionGrid.clear();
}

function addHPBar(g,size){
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(size,size*0.13), new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.75,depthTest:false}));
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(size,size*0.13), new THREE.MeshBasicMaterial({color:0xaa0000,depthTest:false}));
  bg.position.set(0,size*1.3,0); fill.position.set(0,size*1.3,0.001);
  bg.renderOrder = 999; fill.renderOrder = 1000;
  g.add(bg); g.add(fill);
  return {bg,fill,baseSize:size};
}

/* ====================================================================
   СОЗДАНИЕ ВРАГОВ С АНИМИРОВАННЫМИ СОЧЛЕНЁННЫМИ КОНЕЧНОСТЯМИ
   ==================================================================== */
