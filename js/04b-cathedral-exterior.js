/* Наружный обход Кафедрального квартала: только геометрия и поверхности этой зоны. */
let cathedralExteriorBounds=null;
let cathedralExteriorSurfaces=[];
let cathedralExteriorRamps=[];
let cathedralFatalFallZones=[];

function getCathedralExteriorFloorAt(x,z,currentY){
  if(!cathedralExteriorBounds||x<cathedralExteriorBounds.minX||x>cathedralExteriorBounds.maxX||z<cathedralExteriorBounds.minZ||z>cathedralExteriorBounds.maxZ)return null;
  const reachable=[];
  cathedralExteriorSurfaces.forEach(surface=>{
    if(x>=surface.minX&&x<=surface.maxX&&z>=surface.minZ&&z<=surface.maxZ&&surface.y<=currentY+0.6&&surface.y>=currentY-1.35)reachable.push(surface.y);
  });
  cathedralExteriorRamps.forEach(ramp=>{
    const along=ramp.axis==='x'?x:z,across=ramp.axis==='x'?z:x;
    if(along<ramp.start-0.2||along>ramp.end+0.2||Math.abs(across-ramp.center)>ramp.width/2+0.35)return;
    const t=Math.max(0,Math.min(1,(along-ramp.start)/(ramp.end-ramp.start)));
    const y=ramp.startY+(ramp.endY-ramp.startY)*t;
    if(y<=currentY+0.6&&y>=currentY-1.35)reachable.push(y);
  });
  return reachable.length?Math.max(...reachable):null;
}

function getCathedralFatalFallAt(x,z,y){
  return cathedralFatalFallZones.find(zone=>x>=zone.minX&&x<=zone.maxX&&z>=zone.minZ&&z<=zone.maxZ&&y>=zone.minY&&y<=zone.maxY)||null;
}

function buildCathedralExteriorRoute(exitX,exitZ){
  cathedralExteriorSurfaces=[];cathedralExteriorRamps=[];cathedralFatalFallZones=[];
  const topY=FLOOR_LEVELS[1],lowerY=FLOOR_LEVELS[0];
  const roomX=exitX-ROOM_WORLD_SIZE/2,roomMaxX=roomX+ROOM_WORLD_SIZE;
  const platform={minX:exitX-11,maxX:exitX+11,minZ:exitZ-1,maxZ:exitZ+19};
  const firstStair={axis:'z',center:exitX+4,start:exitZ+18,end:exitZ+36,width:4.8,startY:topY,endY:9};
  const landing={minX:firstStair.center-4.2,maxX:firstStair.center+6.2,minZ:firstStair.end-4,maxZ:firstStair.end+4};
  const secondStair={axis:'x',center:landing.maxZ-2.4,start:landing.maxX-0.2,end:landing.maxX+18.5,width:4.8,startY:9,endY:lowerY};
  const lowerCenterX=secondStair.end;
  const lowerPath={minX:lowerCenterX-3,maxX:lowerCenterX+3,minZ:secondStair.center-1,maxZ:secondStair.center+11};
  const courtyard={minX:lowerCenterX-11,maxX:lowerCenterX+11,minZ:secondStair.center+8,maxZ:secondStair.center+36};
  cathedralExteriorBounds={minX:exitX-14,maxX:courtyard.maxX,minZ:exitZ-2,maxZ:courtyard.maxZ};

  const root=new THREE.Group();
  const textures=createSurfaceTextures();
  const tileMap=textures.floor.clone(),tileNormal=textures.floorNormal.clone(),tileRough=textures.floorRoughness.clone();
  [tileMap,tileNormal,tileRough].forEach(map=>{map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(4.5,4.5);map.needsUpdate=true;});
  const floorMaterial=new THREE.MeshStandardMaterial({color:0xb8b6b4,map:tileMap,normalMap:tileNormal,roughnessMap:tileRough,normalScale:new THREE.Vector2(0.72,0.72),roughness:0.76,metalness:0.12});
  const stoneMaterial=new THREE.MeshStandardMaterial({color:0x88878a,map:textures.wall,normalMap:textures.wallNormal,roughnessMap:textures.wallRoughness,normalScale:new THREE.Vector2(0.7,0.7),roughness:0.93,metalness:0.03});
  const darkStoneMaterial=new THREE.MeshStandardMaterial({color:0x45464d,map:textures.wall,normalMap:textures.wallNormal,roughness:0.97,metalness:0.04});
  const wornStoneMaterial=new THREE.MeshStandardMaterial({color:0x68656a,map:textures.wall,normalMap:textures.wallNormal,roughness:0.94,metalness:0.02});
  const mossMaterial=new THREE.MeshStandardMaterial({color:0x38483d,roughness:0.98,metalness:0.01});
  const waterMaterial=new THREE.MeshStandardMaterial({color:0x495760,roughness:0.17,metalness:0.2,transparent:true,opacity:0.72,depthWrite:false});
  const ironMaterial=new THREE.MeshStandardMaterial({color:0x292c30,roughness:0.7,metalness:0.72});
  const flameMaterial=new THREE.MeshBasicMaterial({color:0xff8a34});
  const boneMaterial=new THREE.MeshStandardMaterial({color:0xb4a78e,roughness:0.96});
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  const addBox=(x,y,z,w,h,d,material=stoneMaterial,cast=true)=>{
    const mesh=new THREE.Mesh(boxGeometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=cast;mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  const addCollider=(minX,maxX,minY,maxY,minZ,maxZ)=>wallColliders.push({minX,maxX,minY,maxY,minZ,maxZ,cx:(minX+maxX)/2,cy:(minY+maxY)/2,cz:(minZ+maxZ)/2,w:maxX-minX,h:maxY-minY,d:maxZ-minZ,floorY:minY});
  const addWall=(x,y,z,w,h,d,material=stoneMaterial)=>{
    addBox(x,y,z,w,h,d,material);
    addCollider(x-w/2,x+w/2,y-h/2,y+h/2,z-d/2,z+d/2);
  };
  const addSurface=(minX,maxX,minZ,maxZ,y,thickness=0.9)=>{
    const width=maxX-minX,depth=maxZ-minZ;
    addBox((minX+maxX)/2,y-thickness/2,(minZ+maxZ)/2,width,thickness,depth,floorMaterial);
    cathedralExteriorSurfaces.push({minX,maxX,minZ,maxZ,y});
  };
  const addRamp=(ramp)=>{
    cathedralExteriorRamps.push(ramp);
    const run=ramp.end-ramp.start,count=Math.max(8,Math.ceil(run/1.1)),tread=run/count;
    for(let i=0;i<count;i++){
      const t=(i+1)/count,y=ramp.startY+(ramp.endY-ramp.startY)*t;
      const along=ramp.start+(i+0.5)*tread;
      const mesh=addBox(ramp.axis==='x'?along:ramp.center,y-0.16,ramp.axis==='x'?ramp.center:along,
        ramp.axis==='x'?tread-0.06:ramp.width,0.32,ramp.axis==='x'?ramp.width:tread-0.06,
        i%4===0?wornStoneMaterial:stoneMaterial);
      mesh.castShadow=true;
    }
    const half=0.34,railHeight=2.35;
    for(const side of [-1,1]){
      const across=ramp.center+side*(ramp.width/2+0.06);
      const minY=Math.min(ramp.startY,ramp.endY),maxY=Math.max(ramp.startY,ramp.endY)+railHeight;
      if(ramp.axis==='z'){
        addCollider(across-half,across+half,minY,maxY,ramp.start-0.2,ramp.end+0.2);
        const postCount=Math.ceil(run/3.2);
        for(let i=0;i<=postCount;i++){
          const t=i/postCount,along=ramp.start+run*t,y=ramp.startY+(ramp.endY-ramp.startY)*t;
          addBox(across,y+1.0,along,0.48,2.0,0.52,i%2?wornStoneMaterial:stoneMaterial);
        }
      }else{
        addCollider(ramp.start-0.2,ramp.end+0.2,minY,maxY,across-half,across+half);
        const postCount=Math.ceil(run/3.2);
        for(let i=0;i<=postCount;i++){
          const t=i/postCount,along=ramp.start+run*t,y=ramp.startY+(ramp.endY-ramp.startY)*t;
          addBox(along,y+1.0,across,0.52,2.0,0.48,i%2?wornStoneMaterial:stoneMaterial);
        }
      }
    }
  };
  const addPuddle=(x,z,sx,sz,y)=>{
    const mesh=new THREE.Mesh(new THREE.CircleGeometry(1,16),waterMaterial);mesh.rotation.x=-Math.PI/2;mesh.rotation.z=(x+z)*0.13;mesh.scale.set(sx,sz,1);mesh.position.set(x,y+0.035,z);root.add(mesh);
  };
  const addTorch=(x,y,z)=>{
    addBox(x,y+0.22,z,0.34,0.18,0.55,ironMaterial,false);
    const bracket=addBox(x,y+0.48,z+0.12,0.1,0.56,0.1,ironMaterial,false);bracket.rotation.x=0.32;
    const flame=new THREE.Mesh(new THREE.ConeGeometry(0.2,0.66,7),flameMaterial);flame.position.set(x,y+1.02,z+0.16);root.add(flame);
    const light=new THREE.PointLight(0xff8b3d,1.55,13,2);light.position.set(x,y+1.0,z+0.15);root.add(light);
  };

  // Сплошная наружная стена босc-комнаты с узкой дверью; старый портал перехода не затрагивается.
  const facadeZ=exitZ-0.08,facadeHeight=10.5,doorHalf=2.7;
  const facadeY=topY+facadeHeight/2;
  addWall((roomX+exitX-doorHalf)/2,facadeY,facadeZ,exitX-doorHalf-roomX,facadeHeight,0.78,stoneMaterial);
  addWall((exitX+doorHalf+roomMaxX)/2,facadeY,facadeZ,roomMaxX-exitX-doorHalf,facadeHeight,0.78,stoneMaterial);
  for(const side of [-1,1]){
    const x=exitX+side*(doorHalf+0.18);
    addWall(x,topY+4.55,facadeZ,0.5,9.1,1.0,wornStoneMaterial);
    addBox(x,topY+9.25,facadeZ,0.78,0.42,1.05,darkStoneMaterial);
  }
  addBox(exitX,topY+10.18,facadeZ,6.5,0.46,1.08,stoneMaterial);
  // Узкий наружный порог быстро расширяется в площадку.
  addSurface(platform.minX,platform.maxX,platform.minZ,platform.maxZ,topY,0.9);
  // Площадка обозрения: невысокие ограждения оставляют проход к спрятанной лестнице в дальнем углу.
  addWall(platform.minX+0.2,topY+0.72,(exitZ+platform.maxZ)/2,0.62,1.45,platform.maxZ-exitZ-1.0,stoneMaterial);
  addWall(platform.maxX-0.2,topY+0.72,(exitZ+platform.maxZ)/2,0.62,1.45,platform.maxZ-exitZ-1.0,stoneMaterial);
  addWall((platform.minX+exitX+0.8)/2,topY+0.72,platform.maxZ-0.35,exitX+0.8-platform.minX,1.45,0.62,stoneMaterial);
  addWall((exitX+8.0+platform.maxX)/2,topY+0.72,platform.maxZ-0.35,platform.maxX-exitX-8.0,1.45,0.62,stoneMaterial);
  // Готический контрфорс скрывает начало спуска с прямой линии взгляда.
  addBox(exitX+9.1,topY+4.3,exitZ+18.0,1.35,8.6,1.45,darkStoneMaterial);
  addBox(exitX+9.1,topY+8.75,exitZ+18.0,2.0,0.42,1.9,wornStoneMaterial);
  addTorch(exitX-8.2,topY+1.45,platform.maxZ-0.75);

  // Первый марш идёт вдоль +Z, затем маршрут поворачивает вправо на второй марш вдоль +X.
  addRamp(firstStair);
  addSurface(landing.minX,landing.maxX,landing.minZ,landing.maxZ,9,0.8);
  const gapMinX=firstStair.center-3.0,gapMaxX=firstStair.center+3.0;
  addWall((landing.minX+gapMinX)/2,9+0.72,landing.maxZ-0.32,gapMinX-landing.minX,1.44,0.64,stoneMaterial);
  addWall((gapMaxX+landing.maxX)/2,9+0.72,landing.maxZ-0.32,landing.maxX-gapMaxX,1.44,0.64,stoneMaterial);
  // На внешнем ребре поворота намеренно отсутствует бортик: это единственный смертельный пролом.
  cathedralFatalFallZones.push({minX:gapMinX-0.3,maxX:gapMaxX+0.3,minZ:landing.maxZ+0.08,maxZ:landing.maxZ+3.2,minY:8.0,maxY:10.2,targetY:0,bloodStainPosition:{x:firstStair.center,y:9,z:landing.maxZ-1.25}});
  addRamp(secondStair);
  addSurface(lowerPath.minX,lowerPath.maxX,lowerPath.minZ,lowerPath.maxZ,lowerY,0.9);
  addSurface(courtyard.minX,courtyard.maxX,courtyard.minZ,courtyard.maxZ,lowerY,0.9);

  // Безопасные края нижней тропы и площадки; у смертельного поворота ограждение не создаётся.
  const lowRailY=lowerY+0.78;
  addWall(lowerPath.minX+0.18,lowRailY,(lowerPath.minZ+lowerPath.maxZ)/2,0.42,1.56,lowerPath.maxZ-lowerPath.minZ,stoneMaterial);
  addWall(lowerPath.maxX-0.18,lowRailY,(lowerPath.minZ+lowerPath.maxZ)/2,0.42,1.56,lowerPath.maxZ-lowerPath.minZ,stoneMaterial);
  addWall(courtyard.minX+0.18,lowRailY,(courtyard.minZ+courtyard.maxZ)/2,0.42,1.56,courtyard.maxZ-courtyard.minZ,stoneMaterial);
  addWall(courtyard.maxX-0.18,lowRailY,(courtyard.minZ+courtyard.maxZ)/2,0.42,1.56,courtyard.maxZ-courtyard.minZ,stoneMaterial);
  addWall((courtyard.minX+lowerCenterX-3.4)/2,lowRailY,courtyard.minZ+0.2,lowerCenterX-3.4-courtyard.minX,1.56,0.42,stoneMaterial);
  addWall((lowerCenterX+3.4+courtyard.maxX)/2,lowRailY,courtyard.minZ+0.2,courtyard.maxX-lowerCenterX-3.4,1.56,0.42,stoneMaterial);
  addWall((courtyard.minX+courtyard.maxX)/2,lowRailY,courtyard.maxZ-0.2,courtyard.maxX-courtyard.minX,1.56,0.42,stoneMaterial);

  // Проходимая каменная арка поперёк нижней тропы.
  const archX=lowerCenterX,archZ=secondStair.center+21.0,span=13.2,innerSpan=9.4;
  addWall(archX-span/2+0.75,lowerY+3.1,archZ,1.5,6.2,1.8,darkStoneMaterial);
  addWall(archX+span/2-0.75,lowerY+3.1,archZ,1.5,6.2,1.8,darkStoneMaterial);
  const archShape=new THREE.Shape();
  archShape.moveTo(-span/2,0);archShape.lineTo(-span/2,4.4);archShape.quadraticCurveTo(0,8.5,span/2,4.4);archShape.lineTo(span/2,0);archShape.closePath();
  const archHole=new THREE.Path();
  archHole.moveTo(-innerSpan/2,0);archHole.lineTo(-innerSpan/2,4.0);archHole.quadraticCurveTo(0,7.05,innerSpan/2,4.0);archHole.lineTo(innerSpan/2,0);archHole.closePath();archShape.holes.push(archHole);
  const archGeometry=new THREE.ExtrudeGeometry(archShape,{depth:1.8,bevelEnabled:false,curveSegments:14});
  archGeometry.translate(0,0,-0.9);
  const archMesh=new THREE.Mesh(archGeometry,wornStoneMaterial);archMesh.position.set(archX,lowerY,archZ);archMesh.castShadow=true;archMesh.receiveShadow=true;root.add(archMesh);
  // Потёртый рельеф арки и паутина в нише.
  const webMaterial=new THREE.LineBasicMaterial({color:0x8a8582,transparent:true,opacity:0.42});
  const webPoints=[];
  const wx=archX-span/2+2.0,wy=lowerY+4.15,wz=archZ-0.94;
  for(let i=0;i<5;i++){
    const t=i/4;webPoints.push(new THREE.Vector3(wx,wy-t*2.25,wz),new THREE.Vector3(wx+1.7,wy-t*2.25,wz));
  }
  for(let i=0;i<4;i++)webPoints.push(new THREE.Vector3(wx+i*0.42,wy,wz),new THREE.Vector3(wx+1.7-i*0.42,wy-2.25,wz));
  const webGeometry=new THREE.BufferGeometry().setFromPoints(webPoints);
  const web=new THREE.LineSegments(webGeometry,webMaterial);root.add(web);

  // Разрушенные контрфорсы, мокрый камень и мелкий реквизит.
  addBox(exitX-10,topY+0.28,exitZ+8,2.2,0.18,1.1,mossMaterial,false);
  addBox(exitX-6.5,topY+0.27,exitZ+12.5,1.3,0.16,0.7,mossMaterial,false);
  addPuddle(exitX-3.8,exitZ+11.2,1.55,0.72,topY);
  addPuddle(lowerCenterX-1.9,secondStair.center+13.0,1.75,0.7,lowerY);
  addPuddle(lowerCenterX+5.8,secondStair.center+29.0,1.35,0.58,lowerY);
  addTorch(lowerCenterX-8.4,lowerY+2.2,courtyard.minZ+10.2);
  addTorch(lowerCenterX+8.8,lowerY+2.2,courtyard.minZ+24.0);

  // Разбитые блоки, кости, бочка и урна на постаменте — декоративны и неинтерактивны.
  const rubbleGeo=new THREE.IcosahedronGeometry(1,0);
  [[platform.minX+3,topY+0.42,platform.maxZ-2,0.72],[lowerCenterX-7,0.38,courtyard.maxZ-4,0.9],[lowerCenterX+7,0.32,courtyard.minZ+3,0.58],[archX+5.7,0.4,archZ+3,0.72]].forEach(([x,y,z,s],i)=>{
    const rock=new THREE.Mesh(rubbleGeo,i%2?darkStoneMaterial:wornStoneMaterial);rock.position.set(x,y,z);rock.scale.set(s*1.2,s*0.65,s);rock.rotation.set(0.2*i,0.7*i,0.35*i);rock.castShadow=true;rock.receiveShadow=true;root.add(rock);
  });
  const barrelX=platform.minX+4.5,barrelZ=platform.maxZ-3.5;
  const barrel=new THREE.Mesh(new THREE.CylinderGeometry(0.58,0.64,1.45,10),new THREE.MeshStandardMaterial({color:0x49352a,roughness:0.86}));barrel.position.set(barrelX,topY+0.74,barrelZ);barrel.castShadow=true;root.add(barrel);
  for(const y of [topY+0.24,topY+1.18]){
    const band=new THREE.Mesh(new THREE.TorusGeometry(0.59,0.06,6,12),ironMaterial);band.rotation.x=Math.PI/2;band.position.set(barrelX,y,barrelZ);root.add(band);
  }
  const urnX=courtyard.minX+3.0,urnZ=courtyard.maxZ-5.0;
  addBox(urnX,lowerY+0.52,urnZ,1.05,1.04,1.05,darkStoneMaterial);
  const urn=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.54,1.05,9),wornStoneMaterial);urn.position.set(urnX,lowerY+1.55,urnZ);urn.castShadow=true;root.add(urn);
  const urnLip=new THREE.Mesh(new THREE.TorusGeometry(0.42,0.1,7,12),darkStoneMaterial);urnLip.rotation.x=Math.PI/2;urnLip.position.set(urnX,lowerY+2.08,urnZ);root.add(urnLip);
  for(let i=0;i<4;i++){
    const bone=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,1.15,6),boneMaterial);bone.position.set(lowerCenterX-6+i*0.55,lowerY+0.2,courtyard.minZ+4+(i%2)*0.5);bone.rotation.z=0.18*i;bone.rotation.x=Math.PI/2;root.add(bone);
  }

  scene.add(root);envObjects.push({mesh:root});
}
