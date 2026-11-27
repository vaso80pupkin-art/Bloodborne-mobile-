"""Build a detailed open mountain canyon visual slice for Bloodborne: Hunter's Nightmare."""
import bpy, math, random
from pathlib import Path
OUT=Path(__file__).resolve().parents[2]/'assets'/'levelgen'/'cathedral_ground_slice.glb'
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
random.seed(19)

def mat(name,color,rough=0.9,metal=0.0,emission=None):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
 if emission:
  p.inputs['Emission Color'].default_value=(*emission,1); p.inputs['Emission Strength'].default_value=2.2
 return m
rock=mat('Wet slate rock',(0.105,0.13,0.16),.98); rock2=mat('Cold fractured stone',(0.18,0.20,0.22),.94); crackmat=mat('Deep rock fissures',(0.018,0.022,0.025),1); gravel=mat('Wet loose gravel',(0.12,0.14,0.15),.96); dark=mat('Abyss',(0.012,0.018,0.025),1); wood=mat('Black wet timber',(0.16,0.095,0.055),.92); rope=mat('Tarred rope',(0.035,0.027,0.022),1); pine=mat('Storm pine',(0.035,0.09,0.065),1); trunk=mat('Pine trunk',(0.12,0.075,0.045),1); ruin=mat('Ancient ruin',(0.22,0.22,0.22),.97); fire=mat('Campfire glow',(0.42,0.09,0.018),.65,emission=(1.0,.16,.025)); blue=mat('Cold moon mist',(0.12,.25,.35),.5,emission=(.04,.12,.25))

def cube(name,loc,scale,material,bevel=.0):
 o=bpy.data.objects.new(name,bpy.data.meshes.new(name+'Mesh')); bpy.context.collection.objects.link(o); o.location=(loc[0],-loc[2],loc[1]); o.dimensions=(scale[0],scale[2],scale[1]); bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material); o.select_set(False)
 if bevel:
  b=o.modifiers.new('eroded edges','BEVEL'); b.width=bevel; b.segments=2; o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return o

def ico(name,x,y,z,sx,sy,sz,material):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x,-z,y)); o=bpy.context.object; o.name=name; o.scale=(sx,sz,sy); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material); return o

def bridge(z,y,length,width):
 count=int(length/1.55)
 for i in range(count):
  x=-length/2+.78+i*1.55; cube('bridge plank',(x,y,z),(1.35,.28,width),wood,.05)
 for side in (-1,1):
  cube('bridge rail', (0,y+1.15,z+side*(width/2+.18)),(length,.16,.16),rope,.02)
  for i in range(0,count+1,3): cube('bridge post',(-length/2+i*1.55,y+.55,z+side*(width/2+.18)),(.16,1.25,.16),rope,.02)

def pine_tree(x,z,y=0,s=1):
 cube('pine trunk',(x,y+2.0,z),(.38,4.0,.38),trunk,.04)
 for yy,rad in ((3.2,1.8),(4.7,1.35),(6.0,.85)):
  bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=rad*s,radius2=.12*s,depth=2.6*s,location=(x,-z,yy*s+y)); o=bpy.context.object; o.name='storm pine crown'; o.data.materials.append(pine)

# Deep central ravine and large stepped cliff masses.
cube('abyss',(0,-13,0),(68,.8,58),dark)
for side in (-1,1):
 for i in range(15):
  x=side*(25+random.uniform(0,10)); z=-28+i*4+random.uniform(-1.2,1.2); y=random.uniform(2,9); ico('massive cliff',x,y,z,random.uniform(4,8),random.uniform(3,7),random.uniform(3,6),rock if i%3 else rock2)
 for i in range(10):
  x=side*(17+random.uniform(0,7)); z=-24+i*5+random.uniform(-1,1); y=random.uniform(-1,4); ico('broken ledge',x,y,z,random.uniform(2.4,5),random.uniform(1.2,3),random.uniform(2,4),rock2)
# playable ledges and route hierarchy
cube('near ledge',(-20,0,18),(32,1.0,22),rock,.12); cube('far ledge',(20,8,-20),(28,1.0,20),rock,.12); cube('camp ledge',(0,-1,-22),(17,1.0,13),rock2,.12)
# Fine relief: wet gravel, exposed ledge seams and branching cracks break up the broad slabs.
for i in range(42):
 x=random.uniform(-29,29); z=random.uniform(10,25)
 ico('loose floor stone',x,.62,z,random.uniform(.18,.62),random.uniform(.10,.28),random.uniform(.16,.48),gravel)
for i in range(28):
 x=random.uniform(-7,7); z=random.uniform(-27,-17)
 ico('camp ground stone',x,-.35,z,random.uniform(.18,.55),random.uniform(.08,.24),random.uniform(.14,.42),gravel)
for x,z,ang,length in [(-30,18,.25,8),(-22,22,-.42,6),(-12,13,.7,7),(18,-14,-.2,9),(27,-22,.55,7),(-3,-19,-.75,5),(9,-25,.32,6)]:
 cube('deep rock fissure',(x,.56,z),(length,.045,.16),crackmat,.01)
 cube('branching fissure',(x+math.sin(ang)*length*.2,.59,z+math.cos(ang)*.5),(length*.42,.035,.10),crackmat,.01)
bridge(5,0,34,4.3); bridge(-10,8,25,3.2)
# Suspended upper walkway with broken end.
for i in range(15): cube('hanging walkway',(-17+i*1.55,11,-1+i*.12),(1.3,.3,3.2),wood,.04)
# stone stairs between ledges
for i in range(18): cube('cliff stair',(-18+i*.72, i*.48, 8-i*.12),(3.2,.42,2.4),rock2,.06)
# distant broken arch/ruin silhouettes
for x,z,h in [(-26,-31,12),(29,-34,16),(0,-39,10)]:
 cube('ruin pillar',(x,h/2,z),(2.2,h,2.4),ruin,.12)
 cube('ruin lintel',(x,h,z),(10,.9,2.2),ruin,.12)
# camp, tents, fire
for x,z in [(-5,-21),(6,-20),(13,-24),(-12,-24)]: ico('camp boulder',x,.8,z,1.5,1.0,1.2,rock2)
for x,z in [(-3,-21),(6,-23)]:
 bpy.ops.mesh.primitive_cone_add(vertices=4,radius1=3.1, radius2=0, depth=4.4, location=(x,-z,2.2)); o=bpy.context.object; o.name='rough canvas tent'; o.rotation_euler[2]=math.pi/4; o.data.materials.append(wood)
for a in range(5):
 o=cube('fire log',(0,.35,-20),(.18,.18,2.2),wood); o.rotation_euler[1]=a*math.pi/5
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(0, -(-20),1.25)); o=bpy.context.object; o.name='warm campfire'; o.scale=(.8,.8,1.3); o.data.materials.append(fire)
# pines frame the view and occupy ledges.
for x,z,s in [(-28,13,1.2),(-19,20,1.0),(25,-8,1.15),(30,-18,.9),(-25,-27,1.1),(17,-28,.8),(4,12,.75)]: pine_tree(x,z,0,s)
# cold blue vertical mist volumes in the ravine
for x,z in ((-12,12),(12,12)): cube('blue ravine mist',(x,-5,z),(3,12,1.2),blue,.3)
# Export in glTF Y-up with no cameras/lights.
bpy.ops.object.select_all(action='SELECT'); bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_apply=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_yup=True)
print('Wrote',OUT,OUT.stat().st_size)
