/* =========================================================================
   BLOODBORNE: HUNTER'S NIGHTMARE — COMPLETE EDITION
   ========================================================================= */

const GameMode = { MENU:0, DREAM:1, PLAYING:2, DEAD:3, PAUSED:4 };
let gameMode = GameMode.MENU;
let sfxVolume = 0.7;
let musicVolume = 0.35;
let camSensitivity = 1.0;
let invertY = true;
let skyBrightness = 2.0;
let gameBrightness = 2.0;
const GRAPHICS_QUALITY_KEY = 'bloodborne_graphics_quality_v1';
const GRAPHICS_MODE_KEY = 'bloodborne_graphics_mode_v1';
const GRAPHICS_MODES = ['auto','low','medium','ultra'];
function detectInitialGraphicsMode(){
  try{
    const mode=localStorage.getItem(GRAPHICS_MODE_KEY);
    if(GRAPHICS_MODES.includes(mode))return mode;
    const saved=localStorage.getItem(GRAPHICS_QUALITY_KEY);
    if(GRAPHICS_MODES.includes(saved))return saved;
  }catch(e){}
  return 'auto';
}
let graphicsMode = detectInitialGraphicsMode();
function detectInitialGraphicsQuality(){
  return graphicsMode==='auto'?'medium':graphicsMode;
}
let graphicsQuality = detectInitialGraphicsQuality();
let stairFallAnimation = null;

/* === ИЗМЕНЕНИЕ: Аудио объект для фоновой музыки === */
let musicAudio = new Audio();
let currentMusicTrack = 0;
let musicActive = false;

const player = {
  hp:100, maxHp:100, stamina:100, maxStamina:100,
  level:10, echoes:0, vials:10, bullets:20, maxBullets:20,
  insight: 0, bloodShards: 0, weaponLevel: 0,
  weaponDurability: 100, maxWeaponDurability: 100,
  stats:{vig:10,end:10,str:10,skl:10,blt:10},
  weaponMode:0, isAttacking:false, isDodging:false, isDead:false, isCharging:false,
  attackTime:0, dodgeTime:0, dodgeAngle:0, walkTime:0, invincible:false,
  attackFacing:0, attackHand:1, gunRecoil:0,
  attackBuffer:false, transformBuffer:false, dodgeBuffer:false, currentAttack:null,
  hitStop:0, screenShake:0, timeScale:1, lockedTarget:null,
  dodgeType:'roll', lastAction:null, lastActionTime:0, sprintTime:0,
  comboCount:0, comboTimer:0, rallyHp:0, rallyMaxHp:0, rallyTimer:0,
  transformAttackBuffer:0, respawnPoint:null, seenBosses: {},
  beastMode: false, beastTimer: 0, beastCharge: 0,
  bloodGems: [null, null, null], availableGems: [],
  frenzy: 0, frenzyActive: false, frenzyPulseTimer: 0,
  ngPlus: 0, firePaperTimer: 0,
  deaths: 0, kills: 0, bossesKilled: 0,
  tools: { molotov: 3, knife: 5, firepaper: 2 },
  unlockedLocations: 1, bestKills: 0, maxCombo: 0
};

let bloodStain = null;
const WEAPON_SHARD_COSTS = [1,1,2,2,3,3,4,5,6,8];
const WEAPON_MAX_LEVEL = 10;
const BLOOD_GEMS = [
  {id:'damage', name:'Руна Силы', icon:'⚔', desc:'+20% урона', color:'#dd3838'},
  {id:'speed',  name:'Руна Скорости', icon:'⚡', desc:'+30% скорости', color:'#3888dd'},
  {id:'crit',   name:'Руна Крови', icon:'💀', desc:'+50% крит. урона', color:'#dd38dd'}
];
const ACHIEVEMENTS = [
  {id:'first_kill', name:'Первая кровь', desc:'Убейте первого врага', icon:'🗡'},
  {id:'first_boss', name:'Охотник на чудовищ', desc:'Победите первого босса', icon:'⚔'},
  {id:'beast_mode', name:'Зверь внутри', desc:'Активируйте Beast Mode', icon:'🐺'},
  {id:'parry_king', name:'Мастер парирования', desc:'10 парирований', icon:'🛡'},
  {id:'collector', name:'Коллекционер', desc:'Соберите все 3 самоцвета', icon:'💎'},
  {id:'max_weapon', name:'Мастер оружейник', desc:'Улучшите оружие до +10', icon:'⚒'},
  {id:'insight_5', name:'Прозрение', desc:'Достигните 5 Insight', icon:'👁'},
  {id:'frenzy', name:'Безумие', desc:'Испытайте Frenzy', icon:'🌀'},
  {id:'ng_plus', name:'Новая охота', desc:'Начните NG+', icon:'🌑'},
  {id:'slayer', name:'Кровавый путь', desc:'Убейте 50 врагов', icon:'💀'},
  {id:'combo_10', name:'Серия ударов', desc:'Комбо 10 ударов', icon:'🔥'},
  {id:'perfect_dodge', name:'Тень смерти', desc:'10 идеальных уклонений', icon:'✨'}
];
const BESTIARY = [
  {id:'spider', name:'Паук Ярнама', desc:'Мерзкое существо из подземелий. Быстрое и ядовитое.', icon:'🕷'},
  {id:'beast', name:'Зверь-оборотень', desc:'Бывший человек, обращённый в чудовище. Очень сильный.', icon:'🐺'},
  {id:'hunter', name:'Павший охотник', desc:'Охотник, потерявший рассудок. Опасный противник.', icon:'🗡', art:'CherepKinjalMob.png'},
  {id:'CLERIC BEAST', name:'Зверь-Клерик', desc:'Бывший служитель церкви, превращённый в ужасного зверя.', icon:'⛪'},
  {id:'BLOOD-STARVED BEAST', name:'Зверь, жаждущий крови', desc:'Неистовое чудовище из глубин собора.', icon:'🩸'},
  {id:'SHADOW OF YHARNAM', name:'Тень Ярнама', desc:'Мистические существа, охраняющие запретные места.', icon:'👥'},
  {id:'MOON PRESENCE', name:'Лунное Присутствие', desc:'Внешний бог, управляющий охотой.', icon:'🌕'}
];
let unlockedAchievements = {};
let discoveredBestiary = {};
let perfectDodgeCount = 0;

let scene = null, camera = null, renderer = null, hunter = null, hunterParts = {};
let hunterMotionPivot = null, hunterVisualRoot = null, hunterModelRig = null;
let modelLoader = null, hunterModelSource = null, spiderModelBundle = null;
let spiderFallbackBundle = null, hunterEnemyBundle = null;
let spiderFallbackLoadStarted = false, hunterEnemyLoadStarted = false;
let extraModelBundles = Object.create(null), extraModelLoads = Object.create(null), extraModelFallbacks = Object.create(null);
let hunterVisual = null, hunterVisualBaseY = 0, hunterVisualHeight = 2.8, visualAssetsStarted = false;
let hunterYawGroup = null, hunterMixer = null, hunterModelClips = [], hunterClipMap = null, hunterCurrentAction = null;
let hunterAnimMode = 'none';            // 'none' | 'clips' | 'parts' | 'body'
let hunterPoseState = '', hunterLastAttackT = 0, hunterAttackCombo = 0;
let hunterSwingAxis = null, hunterFwdAxis = null;
let modelFlip = new URLSearchParams(window.location.search).get('flip') === '1';
let hunterModelYaw = null;              // поворот GLB-модели, чтобы «перёд» смотрел по ходу движения
try{ const v = localStorage.getItem('bb_hunter_yaw'); if(v !== null && !isNaN(parseFloat(v))) hunterModelYaw = parseFloat(v); }catch(e){}
if(!modelFlip && hunterModelYaw !== null){
  const normalizedYaw=((hunterModelYaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
  modelFlip=Math.abs(normalizedYaw-Math.PI)<0.001;
}
if(modelFlip) hunterModelYaw = Math.PI;
let sceneInitialized = false;
let enemies = [], wallMeshes = [], wallColliders = [], floorMeshes = [], stairs = [], chests = [], lanterns = [], envObjects = [];
let graphicsPointLights = [], activeGraphicsShadowPointLight = null;
let bloodParticles = [], dustMotes = [], rainDrops = [];
let attackTrails = [], parryIndicators = [], toolProjectiles = [];
let ambientCreatures = [], cryptAtmosphereAssets = null;
let mountainWalkableSurfaces = [], mountainFallZones = [], mountainFloorVoids = [];
let shortcutGates = [], stageElevators = [], worldInteractables = [], nearbyWorldInteractable = null;
let bloodStainMesh = null;
let doll = null, workshop = null, waystone = null;
const cellSize = 6;
const mazeSize = 9;
const ROOM_COLS = 5, ROOM_ROWS = 2, ROOMS_PER_FLOOR = ROOM_COLS * ROOM_ROWS;
const FLOOR_HEIGHT = 17, FLOOR_LEVELS = [0, FLOOR_HEIGHT], ROOM_WORLD_SIZE = mazeSize * cellSize;
const STAGE_WORLD_WIDTH = ROOM_COLS * ROOM_WORLD_SIZE, STAGE_WORLD_DEPTH = ROOM_ROWS * ROOM_WORLD_SIZE;
let stageBounds = {minX:-STAGE_WORLD_WIDTH/2,minZ:-STAGE_WORLD_DEPTH/2,maxX:STAGE_WORLD_WIDTH/2,maxZ:STAGE_WORLD_DEPTH/2};
let currentFloorIndex = 0, lastRoomNotice = '';
let currentLocation = 0;
let campaignProgress = { cityBoss:false, buildingBoss:false, mountainBoss:false, liftActivated:false, castleChainShot:false, brokenSecrets:{} };
const LOCATIONS = ['ЦЕНТРАЛЬНЫЙ ЯРНАМ','КАФЕДРАЛЬНЫЙ КВАРТАЛ','ГОРНЫЙ ПЕРЕВАЛ','ПАУЧИЙ ЗАМОК'];
const STAGE_ROUTE_PLANS = [
  {
    title:'Центральный Ярнам',
    floors:[
      {edges:[[0,1],[1,2],[2,3],[3,4],[0,5],[2,7],[4,9]],labels:{0:'фонарь',2:'площадь',5:'переулок',9:'дверь здания'}},
      {edges:[[0,1],[1,6],[2,3],[3,8],[8,9]],labels:{3:'крыша',8:'босс',9:'выход'}}
    ],
    landmarks:[['фонарь',0,0],['развилка',2,0],['короткий путь',5,0],['выход',9,1]]
  },
  {
    title:'Кафедральный квартал',
    floors:[
      {edges:[[0,1],[1,2],[2,3],[3,4],[0,5],[2,7],[4,9],[7,8]],labels:{0:'вход',2:'холл',5:'подвал',7:'служебный коридор',9:'лифт'}},
      {edges:[[0,1],[1,6],[3,8],[6,7],[7,8],[8,9]],labels:{3:'балкон',8:'зал босса',9:'верхняя дверь'}}
    ],
    landmarks:[['вход',0,0],['лифт',9,0],['служебная комната',7,0],['зал босса',8,1],['выход',9,1]]
  },
  {
    title:'Горный перевал',
    floors:[
      {edges:[[0,1],[1,2],[2,3],[3,4],[0,5],[2,7],[4,9],[5,6],[6,7],[8,9]],labels:{0:'нижний вход',2:'нижняя галерея',5:'фонарь',6:'цепной подъём',7:'нижняя развилка',9:'ворота'}},
      {edges:[[0,1],[1,6],[3,8],[6,7],[7,8],[8,9]],labels:{1:'верхний виадук',3:'башня',7:'лестница',8:'поперечный мост',9:'выход к замку'}}
    ],
    landmarks:[['нижний мост',0,0],['цепь / лифт',6,0],['средняя галерея',2,0],['верхний виадук',1,1],['башни',3,1],['ворота',9,1]]
  },
  {
    title:'Паучий замок',
    floors:[
      {edges:[[0,1],[1,2],[2,3],[3,4],[0,5],[2,7],[4,9]],labels:{0:'ворота',2:'коконы',5:'нижний путь',9:'подъёмник'}},
      {edges:[[0,1],[1,6],[3,8],[6,7],[7,8],[8,9]],labels:{3:'галерея',8:'зал паука',9:'выход'}}
    ],
    landmarks:[['ворота',0,0],['коконы',2,0],['подъёмник',9,0],['зал паука',8,1],['выход',9,1]]
  }
];
function canEnterLocation(index){
  if(index===0) return true;
  if(index===1) return !!campaignProgress.cityBoss;
  if(index===2) return !!campaignProgress.cityBoss && !!campaignProgress.buildingBoss && !!campaignProgress.liftActivated;
  if(index===3) return !!campaignProgress.cityBoss && !!campaignProgress.buildingBoss && !!campaignProgress.liftActivated && !!campaignProgress.mountainBoss && !!campaignProgress.castleChainShot;
  return false;
}
let cameraAngle = 0, cameraDistance = 10, cameraHeight = 6;
const CAMERA_MIN_DISTANCE = 4.5;
const CAMERA_COLLISION_PADDING = 0.4;
let gameTime = 0, parryCount = 0;
let minimapCtx = null;
let menuOrbitTime = 0;
let nearbyLantern = null;
let nearbyDoll = false;
let stageChoiceOpen = false;
let moveData = {x:0,y:0,active:false,origin:{x:0,y:0}};

const lightingRefs = {};
const $ = id => document.getElementById(id);
const lerp = (a,b,t) => a + (b-a)*t;

const BASE_SKY_LANDSCAPE = 0x0a0812;
const BASE_SKY_MENU      = 0x0a0812;
const BASE_SKY_DREAM     = 0x18142a;
const BASE_WALL_COLOR    = 0x282534;
const BASE_FLOOR_COLOR   = 0x161420;
const LOCATION_MOODS = [
  {sky:0x0a0d15, fog:0.029, brightness:0.5, lighting:{ambient:0x223344,hemiSky:0x334455,hemiGround:0x0a0510,moon:0x7088bb,rim:0x9aa9c4,fill:0x445577}},
  {sky:0x17120f, fog:0.025, lighting:{ambient:0x5c5148,hemiSky:0x9b8c7d,hemiGround:0x211613,moon:0x9aabc5,rim:0xc29a72,fill:0x695447}},
  {sky:0x0b121a, fog:0.024, brightness:0.38, lighting:{ambient:0x2d4350,hemiSky:0x6f8da1,hemiGround:0x080d13,moon:0x7898bb,rim:0x8eaabd,fill:0x304b60}},
  {sky:0x130e1e, fog:0.030, lighting:{ambient:0x5d4c6b,hemiSky:0xa08db8,hemiGround:0x180f22,moon:0x9685b5,rim:0xc5a7d2,fill:0x584271}}
];
let currentSkyColor = BASE_SKY_LANDSCAPE;
let currentFogDensity = 0.029;
let surfaceTextures = null;
let lanternGlowMaterial = null;
let horizonAssets = null;

let audioCtx = null, ambientNodes = null, lastFootstepTime = 0, sfxLoadPromise=null, sfxReverb=null, sfxLoadDone=false;
const sfxBuffers=Object.create(null);
let sfxNoiseBuffer=null;
const SFX_FILES={};
const SFX_TYPES={
  slash:['swingLight',0.64,0.10],heavy:['swingHeavy',0.72,0.22],gun:['pistol',0.82,0.2],hit:['impact',0.76,0.10],
  crit:['impactHeavy',0.85,0.22],visceral:['impactHeavy',0.95,0.26],alert:['lantern',0.34,0.16],vial:['pickup',0.50,0.18],
  chest:['wood',0.65,0.18],levelup:['pickup',0.67,0.3],roar:['growl',0.85,0.34],break:['impactHeavy',0.65,0.18],
  menu:['menu',0.35,0.06],dream:['pickup',0.40,0.32],transform:['transform',0.7,0.20],rally:['impact',0.32,0.12],
  perfect:['parry',0.68,0.36],lantern:['lantern',0.58,0.28],weaponup:['transform',0.65,0.34],shard:['pickup',0.42,0.24],
  insight:['pickup',0.54,0.35],waystone:['pickup',0.48,0.38],doll:['pickup',0.35,0.28],parry:['parry',0.8,0.42],
  beast:['growl',0.64,0.24],gem:['pickup',0.50,0.28],frenzy:['growl',0.65,0.16],molotov:['swingHeavy',0.42,0.12],
  throw:['swingLight',0.38,0.08],firepaper:['transform',0.40,0.12],ach:['pickup',0.72,0.4],bloop:['menu',0.26,0.03],lock:['menu',0.32,0.04],
  enemyAttack:['enemyAttack',0.58,0.08],lever:['lever',0.64,0.18],liftStart:['liftStart',0.66,0.14],liftStop:['liftStop',0.58,0.2]
};
const SFX_SYNTH={
  step1:['triangle',112,48,0.09,0.42,0.10,560],step2:['triangle',94,42,0.10,0.40,0.12,460],
  step3:['triangle',126,54,0.08,0.40,0.09,620],step4:['triangle',102,46,0.10,0.42,0.11,500],
  swingLight:['sawtooth',470,105,0.19,0.28,0.30,1500],swingHeavy:['sawtooth',230,42,0.36,0.38,0.40,850],
  impact:['sine',145,48,0.17,0.62,0.55,800],impactHeavy:['sine',96,30,0.31,0.72,0.62,520],
  parry:['triangle',1380,460,0.24,0.46,0.16,3200],pistol:['square',180,52,0.16,0.48,0.74,1300],
  dodge:['sawtooth',560,110,0.22,0.20,0.38,1800],growl:['sawtooth',92,38,0.44,0.34,0.18,420],
  menu:['sine',620,380,0.08,0.26,0.02,1800],pickup:['triangle',480,980,0.24,0.35,0.05,2400],
  lantern:['triangle',1120,540,0.30,0.40,0.10,3200],wood:['triangle',205,82,0.22,0.28,0.28,620],
  transform:['sawtooth',210,690,0.34,0.26,0.18,1500],enemyAttack:['sawtooth',300,72,0.24,0.38,0.32,1100],
  lever:['triangle',360,145,0.25,0.40,0.20,1500],liftStart:['sawtooth',62,108,0.42,0.30,0.32,500],
  liftStop:['triangle',190,54,0.20,0.48,0.34,1400]
};
let _lastRainTime = 0;

function initAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended') audioCtx.resume();
  if(!sfxLoadPromise) preloadSoundEffects();
  if(!sfxReverb){
    const length=Math.floor(audioCtx.sampleRate*1.65),impulse=audioCtx.createBuffer(2,length,audioCtx.sampleRate);
    for(let ch=0;ch<2;ch++){
      const data=impulse.getChannelData(ch);
      for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*Math.pow(1-i/length,2.8)*0.32;
    }
    sfxReverb=audioCtx.createConvolver(); sfxReverb.buffer=impulse;
    const wet=audioCtx.createGain(); wet.gain.value=0.22;
    sfxReverb.connect(wet); wet.connect(audioCtx.destination);
  }
}
function preloadSoundEffects(){
  sfxLoadPromise=Promise.all(Object.entries(SFX_FILES).map(([key,file])=>
    fetch('./SFX/'+file).then(response=>{if(!response.ok) throw new Error('HTTP '+response.status);return response.arrayBuffer();})
      .then(data=>audioCtx.decodeAudioData(data)).then(buffer=>{sfxBuffers[key]=buffer;})
      .catch(error=>console.warn('[BB] Sound effect unavailable: '+file,error))
  )).then(()=>{
    sfxLoadDone=true;
    if(ambientNodes && ambientNodes.pending){ambientNodes=null;startAmbient();}
  });
  return sfxLoadPromise;
}
function playSfxSample(key,volume=0.6,reverb=0.12,rate=1){
  if(!audioCtx) return false;
  if(!sfxBuffers[key]) return playProceduralSfx(key,volume,reverb,rate);
  try{
    const source=audioCtx.createBufferSource(),gain=audioCtx.createGain();
    source.buffer=sfxBuffers[key]; source.playbackRate.value=rate;
    gain.gain.setValueAtTime(Math.max(0.0001,volume*sfxVolume),audioCtx.currentTime);
    source.connect(gain); gain.connect(audioCtx.destination);
    if(sfxReverb && reverb>0){const send=audioCtx.createGain();send.gain.value=reverb*volume*sfxVolume;source.connect(send);send.connect(sfxReverb);}
    source.start(); return true;
  }catch(e){return false;}
}
function playProceduralSfx(key,volume,reverb,rate){
  const preset=SFX_SYNTH[key];
  if(!audioCtx||!preset) return false;
  try{
    const [wave,startHz,endHz,duration,toneLevel,noiseLevel,cutoff]=preset;
    const now=audioCtx.currentTime,dur=duration/Math.max(0.5,rate||1);
    const output=audioCtx.createGain();
    output.gain.value=Math.max(0.0001,volume*sfxVolume);
    output.connect(audioCtx.destination);
    if(sfxReverb&&reverb>0){const send=audioCtx.createGain();send.gain.value=reverb*volume*sfxVolume;output.connect(send);send.connect(sfxReverb);}
    const envelope=(gain,peak)=>{
      gain.gain.setValueAtTime(0.0001,now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001,peak),now+0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    };
    if(toneLevel>0){
      const oscillator=audioCtx.createOscillator(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();
      oscillator.type=wave;oscillator.frequency.setValueAtTime(startHz*(rate||1),now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endHz*(rate||1)),now+dur);
      filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(Math.max(120,cutoff*0.35),now+dur);
      envelope(gain,toneLevel);oscillator.connect(filter);filter.connect(gain);gain.connect(output);oscillator.start(now);oscillator.stop(now+dur+0.01);
    }
    if(noiseLevel>0){
      if(!sfxNoiseBuffer){
        const length=Math.floor(audioCtx.sampleRate*0.5);sfxNoiseBuffer=audioCtx.createBuffer(1,length,audioCtx.sampleRate);
        const data=sfxNoiseBuffer.getChannelData(0);for(let i=0;i<length;i++) data[i]=(Math.random()*2-1)*(1-i/length*0.18);
      }
      const noise=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();
      noise.buffer=sfxNoiseBuffer;filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(100,cutoff*0.25),now+dur);
      envelope(gain,noiseLevel);noise.connect(filter);filter.connect(gain);gain.connect(output);noise.start(now);noise.stop(now+dur+0.01);
    }
    return true;
  }catch(e){console.warn('[BB] Procedural sound failed:',key,e);return false;}
}
function sfx(type){
  const cfg=SFX_TYPES[type];
  if(!audioCtx || !cfg) return;
  const rate=0.96+Math.random()*0.08;
  playSfxSample(cfg[0],cfg[1],cfg[2],rate);
}
function footstep(running){
  if(!audioCtx) return;
  const now = performance.now();
  if(now - lastFootstepTime < (running ? 200 : 320)) return;
  lastFootstepTime = now;
  const stair=stairs.find(step=>Math.abs(hunter.position.x-step.x)<=step.width/2+0.8&&hunter.position.z>=step.z&&hunter.position.z<=step.z+step.run);
  if(stair && stair.style!=='stone'){
    playSfxSample('wood',running?0.27:0.22,0.16,0.84+Math.random()*0.18);
    return;
  }
  const key='step'+(1+Math.floor(Math.random()*4));
  playSfxSample(key,running?0.52:0.39,0.12,running?1.06:0.94+Math.random()*0.08);
}
function rollSound(){
  playSfxSample('dodge',0.55,0.18,0.95+Math.random()*0.1);
}
function startAmbient(){
  if(!audioCtx || ambientNodes) return;
  if(!sfxBuffers.ambient){
    if(!sfxLoadDone) ambientNodes={pending:true};
    return;
  }
  try{
    const src=audioCtx.createBufferSource(),gain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
    src.buffer=sfxBuffers.ambient;src.loop=true;filter.type='lowpass';filter.frequency.value=320;filter.Q.value=.65;
    gain.gain.value=.13*sfxVolume;src.connect(filter);filter.connect(gain);gain.connect(audioCtx.destination);src.start();
    ambientNodes={src,gain,filter};
  }catch(e){}
}

/* === ИЗМЕНЕНИЕ: Список треков теперь ссылается на MP3 файлы === */
const MUSIC_TRACKS = [
  { name:'Hunter', file: 'hunter.mp3' },
  { name:'BloodMoon', file: 'BloodMoon.mp3' },
  { name:'2Pac', file: '2Pac.mp3' }
];

function prepareMusicTrack(trackIdx=currentMusicTrack) {
    if (trackIdx < 0 || trackIdx >= MUSIC_TRACKS.length) return false;
    if (!musicAudio) musicAudio = new Audio();
    const trackUrl = new URL(MUSIC_TRACKS[trackIdx].file, document.baseURI).href;
    musicAudio.preload = 'auto';
    musicAudio.loop = true;
    musicAudio.volume = musicVolume;
    if (musicAudio.src !== trackUrl) {
        musicAudio.src = trackUrl;
        musicAudio.load();
    }
    return true;
}

function playMusicFile(trackIdx) {
    if(!audioCtx || !prepareMusicTrack(trackIdx)) return false;
    const trackUrl = new URL(MUSIC_TRACKS[trackIdx].file, document.baseURI).href;
    if (musicAudio.src === trackUrl) {
        musicAudio.pause();
        musicAudio.currentTime = 0;
    }
    musicActive = false;
    musicAudio.volume = musicVolume;
    const playRequest = musicAudio.play();
    if (playRequest && typeof playRequest.then === 'function') {
        playRequest.then(() => {
            musicActive = true;
            currentMusicTrack = trackIdx;
        }).catch(error => console.warn('[BB] Не удалось запустить фоновую музыку:', error));
    } else {
        musicActive = true;
        currentMusicTrack = trackIdx;
    }
    return true;
}

function stopMusic() {
    if (musicAudio) {
        musicAudio.pause();
        musicAudio.currentTime = 0;
    }
    musicActive = false;
}

function setMusicTrack(idx) {
    if (idx < 0 || idx >= MUSIC_TRACKS.length) return;
    currentMusicTrack = idx;
    if (musicActive) {
        playMusicFile(idx);
    } else {
        prepareMusicTrack(idx);
    }
}

const SaveSystem = {
  KEY: 'bloodborne_complete_v1',
  hasSave(){ try{ return !!localStorage.getItem(this.KEY); }catch(e){ return false; } },
  save(){
    try {
      const data = {
        player: {
          hp: player.hp, maxHp: player.maxHp, stamina: player.stamina, maxStamina: player.maxStamina,
          level: player.level, echoes: player.echoes, vials: player.vials, bullets: player.bullets,
          maxBullets: player.maxBullets, insight: player.insight, bloodShards: player.bloodShards,
          weaponLevel: player.weaponLevel, weaponDurability: player.weaponDurability,
          stats: {...player.stats}, weaponMode: player.weaponMode,
          bloodGems: player.bloodGems, availableGems: player.availableGems,
          ngPlus: player.ngPlus, deaths: player.deaths, kills: player.kills, bossesKilled: player.bossesKilled,
          tools: {...player.tools}, unlockedLocations: player.unlockedLocations,
          seenBosses: {...player.seenBosses}, bestKills: player.bestKills, maxCombo: player.maxCombo
        },
        settings: { version: 3, sfxVolume, musicVolume, camSensitivity, invertY, skyBrightness, gameBrightness, currentMusicTrack, graphicsQuality, graphicsMode },
        currentLocation, campaignProgress, achievements: unlockedAchievements, bestiary: discoveredBestiary,
        parryCount, perfectDodgeCount, timestamp: Date.now()
      };
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch(e) { console.warn('Save failed', e); }
  },
  load(){
    try {
      const raw = localStorage.getItem(this.KEY);
      if(!raw) return false;
      const d = JSON.parse(raw);
      Object.assign(player, d.player);
      player.stats = {...d.player.stats};
      player.bloodGems = d.player.bloodGems || [null,null,null];
      player.availableGems = d.player.availableGems || [];
      player.tools = d.player.tools || {molotov:3, knife:5, firepaper:2};
      player.seenBosses = d.player.seenBosses || {};
      if(d.settings){
        const savedSettings=d.settings;
        const migrateOldDefaults=(savedSettings.version??0)<2;
        sfxVolume = savedSettings.sfxVolume ?? sfxVolume;
        musicVolume = savedSettings.musicVolume ?? musicVolume;
        camSensitivity = savedSettings.camSensitivity ?? camSensitivity;
        invertY = savedSettings.invertY ?? invertY;
        skyBrightness = savedSettings.skyBrightness ?? skyBrightness;
        gameBrightness = savedSettings.gameBrightness ?? gameBrightness;
        currentMusicTrack = savedSettings.currentMusicTrack ?? 0;
        if(GRAPHICS_MODES.includes(savedSettings.graphicsMode)){
          graphicsMode=savedSettings.graphicsMode;
          try{localStorage.setItem(GRAPHICS_MODE_KEY,graphicsMode);}catch(e){}
        }else if(!localStorage.getItem(GRAPHICS_MODE_KEY)&&GRAPHICS_MODES.includes(savedSettings.graphicsQuality)){
          graphicsMode=savedSettings.graphicsQuality;
          try{localStorage.setItem(GRAPHICS_MODE_KEY,graphicsMode);}catch(e){}
        }
        const loadedGraphicsQuality=graphicsMode==='auto'?'medium':graphicsMode;
        if(loadedGraphicsQuality!==graphicsQuality&&typeof applyGraphicsQuality==='function'){
          applyGraphicsQuality(loadedGraphicsQuality,{persist:false,saveGame:false});
        }else graphicsQuality=loadedGraphicsQuality;
        if(migrateOldDefaults){
          if(savedSettings.invertY===false) invertY=true;
          if(savedSettings.skyBrightness===1) skyBrightness=2.0;
          if(savedSettings.gameBrightness===1) gameBrightness=2.0;
        }
      }
      currentLocation = Number.isInteger(d.currentLocation) ? Math.max(0,Math.min(LOCATIONS.length-1,d.currentLocation)) : 0;
      campaignProgress = Object.assign({cityBoss:false,buildingBoss:false,mountainBoss:false,liftActivated:false,castleChainShot:false,brokenSecrets:{}},d.campaignProgress||{});
      campaignProgress.brokenSecrets = campaignProgress.brokenSecrets || {};
      if(!d.campaignProgress){
        // Legacy unlocks only imply boss victories; never infer lift activation or the chain shot.
        campaignProgress.cityBoss = (d.player.unlockedLocations||1)>=2;
        campaignProgress.buildingBoss = (d.player.unlockedLocations||1)>=3 && (d.player.bossesKilled||0)>=2;
        campaignProgress.mountainBoss = (d.player.unlockedLocations||1)>=4 && (d.player.bossesKilled||0)>=3;
      }
      unlockedAchievements = d.achievements || {};
      discoveredBestiary = d.bestiary || {};
      parryCount = d.parryCount || 0;
      perfectDodgeCount = d.perfectDodgeCount || 0;
      return true;
    } catch(e) { console.warn('Load failed', e); return false; }
  },
  clear(){ try{ localStorage.removeItem(this.KEY); }catch(e){} }
};
