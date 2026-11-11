import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  TapriGameState,
  CustomerAppearance,
  RadioEventId,
  generateCustomerOrder,
} from './rules';

export type InteractiveStationTarget =
  | 'station_mortar'
  | 'station_stove'
  | 'station_tray'
  | 'station_radio'
  | 'station_spill'
  | 'customer';

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  scaleStart: number;
  scaleEnd: number;
  colorHex: number;
}

interface CharacterRig {
  root: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  heldCupGroup: THREE.Group;
  torsoMat: THREE.MeshStandardMaterial;
  secondaryMat: THREE.MeshStandardMaterial;
  skinMat: THREE.MeshStandardMaterial;
  glassesGroup: THREE.Group;
  mustacheMesh: THREE.Mesh;
  bindiMesh: THREE.Mesh;
  gandhiCap: THREE.Mesh;
  turbanGroup: THREE.Group;
  palluMesh: THREE.Mesh;
}

export class TapriScene3D {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private frameId: number = 0;
  private disposed: boolean = false;
  private clock: THREE.Clock;
  private resizeObserver: ResizeObserver | null = null;

  // Camera choreography — elevated clear angle showing full tabletop, Tea Maker, and walking Customers
  private mode: 'title' | 'playing' | 'paused' | 'gameover' = 'title';
  private cameraPosCurrent = new THREE.Vector3(0, 3.45, 5.35);
  private cameraLookCurrent = new THREE.Vector3(0, 1.15, -0.15);
  private cameraPosTarget = new THREE.Vector3(0, 3.4, 5.2);
  private cameraLookTarget = new THREE.Vector3(0, 1.12, -0.15);
  private pointerNormalized = new THREE.Vector2(0, 0);
  private cameraTrauma = 0;
  private hitstopTimer = 0;

  // Lighting & Atmosphere
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private stoveFlameLight!: THREE.PointLight;
  private festivalLight!: THREE.PointLight;
  private currentRadioEvent: RadioEventId = 'normal';

  // Interactive Raycasting
  private raycaster = new THREE.Raycaster();
  private interactables: THREE.Object3D[] = [];
  private onStationClick?: (target: InteractiveStationTarget) => void;

  // Station 1: Mortar & Pestle (Khalbatta)
  private mortarGroup!: THREE.Group;
  private pestleGroup!: THREE.Group;
  private spiceFillMesh!: THREE.Mesh;
  private spiceChunkMeshes: THREE.Mesh[] = [];
  private mortarCrushAnim = 0;
  private mortarWobble = 0;

  // Station 2: Stove & Brass Patila / Royal Samovar
  private stoveGroup!: THREE.Group;
  private patilaGroup!: THREE.Group;
  private royalCrownGroup!: THREE.Group;
  private liquidSurfaceMesh!: THREE.Mesh;
  private liquidMaterial!: THREE.MeshStandardMaterial;
  private liquidTargetColor = new THREE.Color(0x4ea8de);
  private liquidCurrentColor = new THREE.Color(0x4ea8de);
  private liquidTargetHeight = 0.05;
  private bubbleMeshes: THREE.Mesh[] = [];
  private flameMeshes: THREE.Mesh[] = [];
  private potSimmerBounce = 0;

  // Station 3: Serving Tray, Kulhad, Cutting Glass & Snacks
  private trayGroup!: THREE.Group;
  private kulhadGroup!: THREE.Group;
  private cuttingGlassGroup!: THREE.Group;
  private cupLiquidMesh!: THREE.Mesh;
  private snackParleGroup!: THREE.Group;
  private snackSamosaGroup!: THREE.Group;
  private snackPakoraGroup!: THREE.Group;
  private snackMithaiGroup!: THREE.Group;
  private trayServeSlide = 0;
  private pourArcMesh!: THREE.Mesh;
  private pourAnimTimer = 0;

  // Vintage Radio & Coin Gullak
  private radioGroup!: THREE.Group;
  private radioWaveRings: THREE.Mesh[] = [];
  private radioBounce = 0;
  private gullakCoinMeshes: THREE.Mesh[] = [];
  private flyingCoins: {
    mesh: THREE.Mesh;
    active: boolean;
    t: number;
    start: THREE.Vector3;
    end: THREE.Vector3;
  }[] = [];

  // Upgrades & Dynamic Visual Props in 3D World
  private marigoldGarlandGroup!: THREE.Group;
  private counterSamosaDisplay!: THREE.Group;
  private bulbAssemblyGroup!: THREE.Group;
  private bulbCounterPoolMesh!: THREE.Mesh;
  private parallaxFarGroup!: THREE.Group;
  private parallaxMidGroup!: THREE.Group;
  private spillPuddleGroup!: THREE.Group;
  private wipeClothGroup!: THREE.Group;
  private wipeAnimTimer = 0;

  // Active Station Guide Ring & Soft Hover Glow Ring
  private guideRingMesh!: THREE.Mesh;
  private guideRingTargetX = -2.1;
  private guideRingTargetZ = 0.35;
  private hoverRingMesh!: THREE.Mesh;
  private hoveredStation: InteractiveStationTarget | null = null;

  // 1. Tea Maker (Chaiwala) behind the counter
  private teaMakerRig!: CharacterRig;
  private teaMakerTargetX = 0;
  private teaMakerWorkTimer = 0;

  // 2. Walking & Waiting Customers at the Counter
  private activeCustomerRig!: CharacterRig;
  private queuedCustomerRig!: CharacterRig;
  private departingCustomerRig!: CharacterRig;

  private activeWalkProgress = 1; // 0 = walking in from road, 1 = waiting at counter
  private queuedWalkProgress = 1;
  private departingWalkProgress = 1; // < 1 when walking away sipping chai
  private lastCustomerId = '';

  // Pooled Particle Ring Buffer (Zero-GC)
  private particleCount = 64;
  private particleInstanced!: THREE.InstancedMesh;
  private particles: ParticleSlot[] = [];
  private particleIndex = 0;

  // Monsoon Rain InstancedMesh & Floating Golden Dust Motes
  private rainCount = 72;
  private rainInstanced!: THREE.InstancedMesh;
  private rainPositions: { x: number; y: number; z: number; speed: number }[] = [];
  private dustMoteCount = 36;
  private dustMoteInstanced!: THREE.InstancedMesh;
  private dustMotes: { x: number; y: number; z: number; phase: number; speed: number }[] = [];

  // Reusable scratch math objects (Zero GC in loop)
  private _dummy = new THREE.Object3D();
  private _color = new THREE.Color();
  private _vec2 = new THREE.Vector2();

  constructor(
    container: HTMLElement,
    onStationClick?: (target: InteractiveStationTarget) => void,
  ) {
    this.container = container;
    this.onStationClick = onStationClick;
    this.clock = new THREE.Clock();

    // 1. Software WebGL detection from GPU renderer string
    this.isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf6c28b);
    this.scene.fog = new THREE.FogExp2(0xf6c28b, 0.007);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    this.camera.position.copy(this.cameraPosCurrent);
    this.camera.lookAt(this.cameraLookCurrent);

    // 2. Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

    this.setupLighting();
    this.buildOutdoorEnvironment();
    this.buildTapriCounterAndCanopy();
    this.buildStation1Mortar();
    this.buildStation2Stove();
    this.buildStation3Tray();
    this.buildRadioAndGullak();
    this.buildTeaMakerAndCustomers();
    this.buildParticlePools();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.handleResize();
    this.startLoop();
  }

  private createWoodTexture(baseHex: string, grainHex: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = grainHex;
    for (let i = 0; i < 48; i++) {
      const y = (i * 5.5) % 256;
      ctx.fillRect(0, y, 256, 1.5 + (i % 3));
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  private createStripedAwningTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const stripes = 8;
    const w = 256 / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#c84b31' : '#fbf3e4';
      ctx.fillRect(i * w, 0, w, 256);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  private addContactShadow(parent: THREE.Object3D, radius: number, yOffset = 0.012): void {
    const geo = new THREE.CircleGeometry(radius, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x1e0d06,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(geo, mat);
    shadow.position.y = yOffset;
    parent.add(shadow);
  }

  private setupLighting(): void {
    this.hemiLight = new THREE.HemisphereLight(0xfff3db, 0x7c3f23, 1.15);
    this.hemiLight.position.set(0, 15, 0);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xffe0b2, 2.3);
    this.keyLight.position.set(6, 11, 7);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    const d = 6.5;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0xffb76b, 0.9);
    rimLight.position.set(-5, 6, -8);
    this.scene.add(rimLight);

    this.stoveFlameLight = new THREE.PointLight(0xff7b29, 1.6, 4.5, 2);
    this.stoveFlameLight.position.set(0, 1.32, 0.28);
    this.scene.add(this.stoveFlameLight);

    this.festivalLight = new THREE.PointLight(0xffbe55, 1.5, 9, 1.8);
    this.festivalLight.position.set(0, 3.2, 0.2);
    this.scene.add(this.festivalLight);
  }

  private buildOutdoorEnvironment(): void {
    const groundGeo = new THREE.CircleGeometry(42, 48);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xc98a5b,
      roughness: 0.92,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Front Customer Footpath / Stepping Stones leading up to the counter
    const pathGeo = new THREE.PlaneGeometry(18, 2.2);
    pathGeo.rotateX(-Math.PI / 2);
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0xa66a46,
      roughness: 0.86,
      metalness: 0.05,
    });
    const customerPath = new THREE.Mesh(pathGeo, pathMat);
    customerPath.position.set(0, 0.015, 1.9);
    customerPath.receiveShadow = true;
    this.scene.add(customerPath);

    // Raised Tapri Brick Platform
    const platformGeo = new THREE.BoxGeometry(8.8, 0.14, 3.4);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0xa44a28,
      roughness: 0.8,
      metalness: 0.08,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.set(0, 0.07, -0.2);
    platform.receiveShadow = true;
    this.scene.add(platform);

    // Background Banyan / Neem Trees
    this.buildTree(-6.2, -4.4, 1.25);
    this.buildTree(6.4, -4.6, 1.15);
    this.buildTree(-3.8, -6.8, 0.95);

    // Parked Vintage Scooter in background left
    const scooter = new THREE.Group();
    scooter.position.set(-5.2, 0.02, -2.6);
    scooter.rotation.y = 0.48;
    const scooterBodyMat = new THREE.MeshStandardMaterial({
      color: 0x3b7a57,
      roughness: 0.35,
      metalness: 0.3,
    });
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.2,
      metalness: 0.85,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.85,
    });
    const rearHull = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.65, 8, 12), scooterBodyMat);
    rearHull.rotation.z = Math.PI / 2;
    rearHull.position.set(-0.2, 0.48, 0);
    scooter.add(rearHull);

    const frontShield = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 0.56), scooterBodyMat);
    frontShield.position.set(0.42, 0.65, 0);
    frontShield.rotation.z = -0.22;
    scooter.add(frontShield);

    const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.68, 8), chromeMat);
    handlebar.rotation.x = Math.PI / 2;
    handlebar.position.set(0.35, 1.1, 0);
    scooter.add(handlebar);

    const wheelGeo = new THREE.TorusGeometry(0.22, 0.08, 10, 20);
    const frontWheel = new THREE.Mesh(wheelGeo, tireMat);
    frontWheel.position.set(0.52, 0.28, 0);
    scooter.add(frontWheel);
    const backWheel = new THREE.Mesh(wheelGeo, tireMat);
    backWheel.position.set(-0.45, 0.28, 0);
    scooter.add(backWheel);

    this.addContactShadow(scooter, 0.9, 0.01);
    this.scene.add(scooter);

    // Multilayered Parallax Indian Street Scene (Far Temple/Haveli Horizon + Mid Bazaar Streetlamps)
    this.parallaxFarGroup = new THREE.Group();
    const farSilMat = new THREE.MeshStandardMaterial({
      color: 0xb87648,
      roughness: 0.92,
    });
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0xd99152,
      roughness: 0.85,
    });
    const farBuildings = [
      { x: -9.5, w: 3.4, h: 4.8, z: -12.5, hasDome: true },
      { x: -5.2, w: 3.8, h: 3.9, z: -13.0, hasDome: false },
      { x: 0.0, w: 4.2, h: 5.5, z: -13.5, hasDome: true },
      { x: 5.4, w: 3.6, h: 4.1, z: -12.8, hasDome: false },
      { x: 9.6, w: 3.2, h: 4.9, z: -12.4, hasDome: true },
    ];
    farBuildings.forEach((b) => {
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, 1.4), farSilMat);
      bldg.position.set(b.x, b.h * 0.5, b.z);
      this.parallaxFarGroup.add(bldg);
      if (b.hasDome) {
        const dome = new THREE.Mesh(new THREE.ConeGeometry(b.w * 0.36, 1.8, 8), domeMat);
        dome.position.set(b.x, b.h + 0.9, b.z);
        this.parallaxFarGroup.add(dome);
      }
    });
    this.scene.add(this.parallaxFarGroup);

    this.parallaxMidGroup = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x3e2723,
      roughness: 0.6,
      metalness: 0.4,
    });
    const lampGlowMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfbbf24,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    [-4.8, 4.8].forEach((lx) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.8, 8), postMat);
      pole.position.set(lx, 1.9, -4.2);
      this.parallaxMidGroup.add(pole);

      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), lampGlowMat);
      globe.position.set(lx, 3.85, -4.2);
      this.parallaxMidGroup.add(globe);
    });
    this.scene.add(this.parallaxMidGroup);
  }

  private buildTree(x: number, z: number, scale: number): void {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);

    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, 2.6, 10), trunkMat);
    trunk.position.y = 1.3;
    tree.add(trunk);

    const foliageColors = [0x3a6b35, 0x4d8044, 0x2d572c, 0x629652];
    const offsets = [
      [0, 3.0, 0, 1.45],
      [-0.85, 2.6, 0.3, 1.1],
      [0.9, 2.7, -0.2, 1.15],
      [0.2, 3.5, 0.4, 1.05],
    ];
    offsets.forEach(([ox, oy, oz, r], i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: foliageColors[i % foliageColors.length],
        roughness: 0.78,
      });
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
      puff.position.set(ox, oy, oz);
      tree.add(puff);
    });

    this.addContactShadow(tree, 1.6, 0.02);
    this.scene.add(tree);
  }

  private buildTapriCounterAndCanopy(): void {
    const woodTex = this.createWoodTexture('#6e3b1e', '#4d2611');
    const lightWoodTex = this.createWoodTexture('#9c5a32', '#78401e');
    const awningTex = this.createStripedAwningTexture();

    const counterGroup = new THREE.Group();

    // Main Teakwood Counter Table
    const counterTopGeo = new THREE.BoxGeometry(8.2, 0.16, 1.85);
    const counterTopMat = new THREE.MeshStandardMaterial({
      map: lightWoodTex,
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.08,
    });
    const counterTop = new THREE.Mesh(counterTopGeo, counterTopMat);
    counterTop.position.set(0, 1.02, 0.25);
    counterTop.receiveShadow = true;
    counterTop.castShadow = !this.isSoftwareGl;
    counterGroup.add(counterTop);

    // Counter Base Front Panel
    const counterBaseGeo = new THREE.BoxGeometry(7.9, 0.86, 1.65);
    const counterBaseMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      color: 0xffffff,
      roughness: 0.78,
    });
    const counterBase = new THREE.Mesh(counterBaseGeo, counterBaseMat);
    counterBase.position.set(0, 0.51, 0.25);
    counterBase.receiveShadow = true;
    counterGroup.add(counterBase);

    // Bamboo Canopy Pillars
    const bambooMat = new THREE.MeshStandardMaterial({
      color: 0xb8863b,
      roughness: 0.62,
      metalness: 0.15,
    });
    const pillarPositions = [
      [-3.95, 2.2, 1.02],
      [3.95, 2.2, 1.02],
      [-3.95, 2.2, -1.35],
      [3.95, 2.2, -1.35],
    ];
    pillarPositions.forEach(([px, py, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 4.2, 12), bambooMat);
      post.position.set(px, py, pz);
      counterGroup.add(post);
    });

    // Striped Tapri Canopy Roof (high enough so Tea Maker & trees are clearly visible)
    const roofGeo = new THREE.BoxGeometry(8.8, 0.12, 3.0);
    const roofMat = new THREE.MeshStandardMaterial({
      map: awningTex,
      color: 0xffffff,
      roughness: 0.75,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 4.25, -0.15);
    roof.rotation.x = 0.14;
    counterGroup.add(roof);

    // 3 Station Mats on the Counter (Visual Framing for Station 1, 2, 3)
    const stationPositions = [
      { x: -2.05, z: 0.32, color: 0xb45309 }, // Station 1: Prep
      { x: 0.0, z: 0.26, color: 0x9a3412 },   // Station 2: Stove
      { x: 2.05, z: 0.34, color: 0x0f766e },  // Station 3: Tray
    ];
    stationPositions.forEach((st) => {
      const matMesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.65, 0.025, 1.22),
        new THREE.MeshStandardMaterial({
          color: st.color,
          roughness: 0.82,
        }),
      );
      matMesh.position.set(st.x, 1.11, st.z);
      matMesh.receiveShadow = true;
      counterGroup.add(matMesh);
    });

    // Active Station Guide Ring
    const ringGeo = new THREE.RingGeometry(0.72, 0.84, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.guideRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.guideRingMesh.position.set(-2.05, 1.125, 0.32);
    counterGroup.add(this.guideRingMesh);

    // Soft Glowing Hover Outline Ring when hovering over any 3D interactive station
    const hoverGeo = new THREE.RingGeometry(0.68, 0.92, 36);
    hoverGeo.rotateX(-Math.PI / 2);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.hoverRingMesh = new THREE.Mesh(hoverGeo, hoverMat);
    this.hoverRingMesh.position.set(0, 1.128, 0.32);
    this.hoverRingMesh.visible = false;
    counterGroup.add(this.hoverRingMesh);

    // Marigold Flower Garland (Genda Phool Toran) & Festive Lanterns Group
    this.marigoldGarlandGroup = new THREE.Group();
    const marigoldOrange = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.65,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.2,
    });
    const marigoldYellow = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.6,
      emissive: 0x713f12,
      emissiveIntensity: 0.2,
    });
    const puffGeo = new THREE.SphereGeometry(0.1, 10, 10);
    for (let i = 0; i <= 26; i++) {
      const t = i / 26;
      const x = -3.85 + t * 7.7;
      const archSag = Math.sin(t * Math.PI * 3) * 0.22;
      const y = 3.72 - archSag;
      const flower = new THREE.Mesh(puffGeo, i % 2 === 0 ? marigoldOrange : marigoldYellow);
      flower.position.set(x, y, 1.0);
      this.marigoldGarlandGroup.add(flower);
    }
    [-2.4, 0, 2.4].forEach((lx) => {
      const lantern = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.2, 0),
        new THREE.MeshStandardMaterial({
          color: 0xffedd5,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.9,
          roughness: 0.3,
        }),
      );
      lantern.position.set(lx, 3.45, 0.85);
      this.marigoldGarlandGroup.add(lantern);
    });
    this.marigoldGarlandGroup.visible = false;
    counterGroup.add(this.marigoldGarlandGroup);

    // Hanging Warm Glowing Tapri Bulb (Reacts dynamically to mouse/pointer cursor)
    this.bulbAssemblyGroup = new THREE.Group();
    this.bulbAssemblyGroup.position.set(0, 4.15, 0.32);

    const cordMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.72, 8),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 }),
    );
    cordMesh.position.y = -0.36;
    this.bulbAssemblyGroup.add(cordMesh);

    const brassShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.22, 18, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.28,
        metalness: 0.78,
        side: THREE.DoubleSide,
      }),
    );
    brassShade.position.y = -0.72;
    this.bulbAssemblyGroup.add(brassShade);

    const filamentBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfacc15,
        emissiveIntensity: 2.2,
        roughness: 0.15,
      }),
    );
    filamentBulb.position.y = -0.82;
    this.bulbAssemblyGroup.add(filamentBulb);
    counterGroup.add(this.bulbAssemblyGroup);

    // Cursor-Reactive Warm Light Pool on the Counter Tabletop
    const poolGeo = new THREE.CircleGeometry(1.85, 32);
    poolGeo.rotateX(-Math.PI / 2);
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
    });
    this.bulbCounterPoolMesh = new THREE.Mesh(poolGeo, poolMat);
    this.bulbCounterPoolMesh.position.set(0, 1.118, 0.32);
    counterGroup.add(this.bulbCounterPoolMesh);

    // Animated Counter Tea Spill Puddle + Wipe Cloth (Shown when a pour spill occurs)
    this.spillPuddleGroup = new THREE.Group();
    this.spillPuddleGroup.position.set(1.32, 1.122, 0.56);
    this.spillPuddleGroup.visible = false;

    const spillMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.12,
      metalness: 0.15,
    });
    const mainPuddle = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.018, 24), spillMat);
    mainPuddle.scale.set(1.25, 1, 0.82);
    this.spillPuddleGroup.add(mainPuddle);

    const dropOffsets = [
      [-0.58, 0.18, 0.14],
      [0.55, -0.15, 0.12],
      [0.25, 0.36, 0.1],
    ];
    dropOffsets.forEach(([dx, dz, dr]) => {
      const drop = new THREE.Mesh(new THREE.CylinderGeometry(dr, dr * 1.1, 0.015, 14), spillMat);
      drop.position.set(dx, 0, dz);
      this.spillPuddleGroup.add(drop);
    });

    // Folded Cotton Wipe Cloth beside the puddle
    this.wipeClothGroup = new THREE.Group();
    this.wipeClothGroup.position.set(-0.35, 0.04, 0.15);
    const clothMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.045, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 }),
    );
    const stripeMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.048, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.85 }),
    );
    this.wipeClothGroup.add(clothMesh, stripeMesh);
    this.spillPuddleGroup.add(this.wipeClothGroup);

    const spillHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.5, 1.1),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    spillHitbox.position.set(0, 0.2, 0);
    spillHitbox.userData.stationTarget = 'station_spill';
    this.spillPuddleGroup.add(spillHitbox);
    this.interactables.push(spillHitbox);

    counterGroup.add(this.spillPuddleGroup);

    this.scene.add(counterGroup);
  }

  // STATION 1: Mortar & Pestle (Khalbatta) + 3 Distinct Spice Bowls (Ginger, Cardamom, Lemon-Tulsi)
  private buildStation1Mortar(): void {
    this.mortarGroup = new THREE.Group();
    this.mortarGroup.position.set(-2.05, 1.12, 0.32);

    const brassMortarMat = new THREE.MeshStandardMaterial({
      color: 0xd49b38,
      roughness: 0.28,
      metalness: 0.82,
    });
    const darkInteriorMat = new THREE.MeshStandardMaterial({
      color: 0x452712,
      roughness: 0.85,
      metalness: 0.2,
    });

    const points = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.26, 0),
      new THREE.Vector2(0.22, 0.08),
      new THREE.Vector2(0.3, 0.26),
      new THREE.Vector2(0.34, 0.44),
      new THREE.Vector2(0.39, 0.5),
      new THREE.Vector2(0.31, 0.5),
      new THREE.Vector2(0.25, 0.14),
      new THREE.Vector2(0, 0.14),
    ];
    const mortarGeo = new THREE.LatheGeometry(points, 28);
    const mortarMesh = new THREE.Mesh(mortarGeo, brassMortarMat);
    mortarMesh.castShadow = !this.isSoftwareGl;
    mortarMesh.receiveShadow = true;
    this.mortarGroup.add(mortarMesh);

    const waistRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.29, 0.022, 10, 28),
      new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.2, metalness: 0.9 }),
    );
    waistRing.rotation.x = Math.PI / 2;
    waistRing.position.y = 0.26;
    this.mortarGroup.add(waistRing);

    this.spiceFillMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.18, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.75 }),
    );
    this.spiceFillMesh.position.y = 0.17;
    this.mortarGroup.add(this.spiceFillMesh);

    const chunkColors = [0xd4a359, 0x65a30d, 0xc28e42];
    for (let i = 0; i < 5; i++) {
      const chunk = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.06, 0),
        new THREE.MeshStandardMaterial({
          color: chunkColors[i % chunkColors.length],
          roughness: 0.7,
        }),
      );
      const angle = (i / 5) * Math.PI * 2;
      chunk.position.set(Math.cos(angle) * 0.1, 0.25, Math.sin(angle) * 0.1);
      this.mortarGroup.add(chunk);
      this.spiceChunkMeshes.push(chunk);
    }

    this.pestleGroup = new THREE.Group();
    this.pestleGroup.position.set(0.04, 0.4, 0);
    this.pestleGroup.rotation.z = -0.22;

    const pestleShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.09, 0.58, 16),
      brassMortarMat,
    );
    pestleShaft.position.y = 0.17;
    this.pestleGroup.add(pestleShaft);

    const pestleCrown = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 14, 14),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.18, metalness: 0.92 }),
    );
    pestleCrown.position.y = 0.47;
    this.pestleGroup.add(pestleCrown);

    this.mortarGroup.add(this.pestleGroup);
    this.addContactShadow(this.mortarGroup, 0.42, 0.01);

    // Three Spice Katori Bowls around the Mortar
    const katoriSpecs = [
      { x: -0.52, z: 0.26, spiceColor: 0xd69e4c }, // Ginger
      { x: -0.52, z: -0.24, spiceColor: 0x65a30d }, // Cardamom
      { x: 0.52, z: -0.24, spiceColor: 0xeab308 }, // Lemon/Tulsi
    ];
    katoriSpecs.forEach((spec) => {
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.11, 0.1, 16),
        darkInteriorMat,
      );
      bowl.position.set(spec.x, 0.05, spec.z);
      this.mortarGroup.add(bowl);

      for (let j = 0; j < 4; j++) {
        const morsel = new THREE.Mesh(
          new THREE.SphereGeometry(0.052, 8, 8),
          new THREE.MeshStandardMaterial({ color: spec.spiceColor, roughness: 0.65 }),
        );
        morsel.scale.set(1.2, 0.75, 0.9);
        morsel.position.set(
          spec.x + (j % 2 === 0 ? -0.04 : 0.04),
          0.1,
          spec.z + (j < 2 ? -0.04 : 0.04),
        );
        this.mortarGroup.add(morsel);
      }
    });

    const hitProxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 1.15, 1.35),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitProxy.position.y = 0.48;
    hitProxy.userData.stationTarget = 'station_mortar' as InteractiveStationTarget;
    this.mortarGroup.add(hitProxy);
    this.interactables.push(hitProxy);

    this.scene.add(this.mortarGroup);
  }

  // STATION 2: Gas Stove & Brass Patila + Milk Canister, Tea Leaves Jar & Sugar Bowl
  private buildStation2Stove(): void {
    this.stoveGroup = new THREE.Group();
    this.stoveGroup.position.set(0.0, 1.12, 0.26);

    const stoveFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.15, 0.84),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.65 }),
    );
    stoveFrame.position.y = 0.075;
    this.stoveGroup.add(stoveFrame);

    const burnerGrate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.38, 0.06, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.4 }),
    );
    burnerGrate.position.y = 0.17;
    this.stoveGroup.add(burnerGrate);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.085, 6), flameMat);
      flame.position.set(Math.cos(angle) * 0.26, 0.2, Math.sin(angle) * 0.26);
      this.stoveGroup.add(flame);
      this.flameMeshes.push(flame);
    }

    this.patilaGroup = new THREE.Group();
    this.patilaGroup.position.y = 0.2;

    const patilaBrassMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.22,
      metalness: 0.88,
    });
    const patilaPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.32, 0),
      new THREE.Vector2(0.43, 0.15),
      new THREE.Vector2(0.42, 0.34),
      new THREE.Vector2(0.35, 0.45),
      new THREE.Vector2(0.41, 0.51),
      new THREE.Vector2(0.36, 0.51),
      new THREE.Vector2(0.33, 0.43),
    ];
    const patilaBody = new THREE.Mesh(
      new THREE.LatheGeometry(patilaPoints, 32),
      patilaBrassMat,
    );
    patilaBody.castShadow = !this.isSoftwareGl;
    this.patilaGroup.add(patilaBody);

    [-1, 1].forEach((dir) => {
      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.018, 8, 16, Math.PI),
        patilaBrassMat,
      );
      handle.position.set(dir * 0.4, 0.32, 0);
      handle.rotation.z = -dir * (Math.PI / 2);
      this.patilaGroup.add(handle);
    });

    this.royalCrownGroup = new THREE.Group();
    const royalSpout = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.24, 12),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.15, metalness: 0.95 }),
    );
    royalSpout.position.set(0.45, 0.36, 0);
    royalSpout.rotation.z = -0.8;
    this.royalCrownGroup.add(royalSpout);

    const royalBelt = new THREE.Mesh(
      new THREE.TorusGeometry(0.43, 0.022, 10, 32),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.15, metalness: 0.95 }),
    );
    royalBelt.rotation.x = Math.PI / 2;
    royalBelt.position.y = 0.24;
    this.royalCrownGroup.add(royalBelt);
    this.royalCrownGroup.visible = false;
    this.patilaGroup.add(this.royalCrownGroup);

    this.liquidMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ea8de,
      roughness: 0.18,
      metalness: 0.1,
    });
    this.liquidSurfaceMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.33, 0.06, 28),
      this.liquidMaterial,
    );
    this.liquidSurfaceMesh.position.y = 0.14;
    this.patilaGroup.add(this.liquidSurfaceMesh);

    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      roughness: 0.3,
    });
    for (let i = 0; i < 10; i++) {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), bubbleMat);
      const angle = (i / 10) * Math.PI * 2;
      const rad = i % 2 === 0 ? 0.13 : 0.23;
      bubble.position.set(Math.cos(angle) * rad, 0.42, Math.sin(angle) * rad);
      bubble.visible = false;
      this.patilaGroup.add(bubble);
      this.bubbleMeshes.push(bubble);
    }

    this.stoveGroup.add(this.patilaGroup);

    // Flanking Ingredient Vessels on the Table: Milk Dolchi Canister, Assam Tea Jar & Sugar Bowl
    const milkCan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.17, 0.38, 18),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.8 }),
    );
    milkCan.position.set(-0.64, 0.19, -0.2);
    this.stoveGroup.add(milkCan);

    const teaJar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.32, 16),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.55 }),
    );
    teaJar.position.set(0.64, 0.16, -0.2);
    this.stoveGroup.add(teaJar);

    const sugarBowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.1, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.4 }),
    );
    sugarBowl.position.set(0.64, 0.08, 0.24);
    this.stoveGroup.add(sugarBowl);

    const hitProxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.75, 1.15, 1.35),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitProxy.position.y = 0.5;
    hitProxy.userData.stationTarget = 'station_stove' as InteractiveStationTarget;
    this.stoveGroup.add(hitProxy);
    this.interactables.push(hitProxy);

    this.scene.add(this.stoveGroup);
  }

  // STATION 3: Serving Tray, Clay Kulhad, Cutting Glass & 3D Snacks
  private buildStation3Tray(): void {
    this.trayGroup = new THREE.Group();
    this.trayGroup.position.set(2.05, 1.12, 0.34);

    const trayBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.045, 0.88),
      new THREE.MeshStandardMaterial({ color: 0x7c3f1d, roughness: 0.55 }),
    );
    trayBase.position.y = 0.022;
    this.trayGroup.add(trayBase);

    const brassRimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.28,
      metalness: 0.82,
    });
    [-0.62, 0.62].forEach((hx) => {
      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.016, 8, 16, Math.PI),
        brassRimMat,
      );
      handle.position.set(hx, 0.055, 0);
      handle.rotation.y = Math.PI / 2;
      this.trayGroup.add(handle);
    });

    this.kulhadGroup = new THREE.Group();
    this.kulhadGroup.position.set(-0.26, 0.045, 0.04);
    const terracottaMat = new THREE.MeshStandardMaterial({
      color: 0xc25934,
      roughness: 0.82,
      metalness: 0.04,
    });
    const kulhadBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.1, 0.3, 20),
      terracottaMat,
    );
    kulhadBody.position.y = 0.15;
    this.kulhadGroup.add(kulhadBody);

    const kulhadLip = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.016, 8, 20),
      terracottaMat,
    );
    kulhadLip.rotation.x = Math.PI / 2;
    kulhadLip.position.y = 0.3;
    this.kulhadGroup.add(kulhadLip);
    this.trayGroup.add(this.kulhadGroup);

    this.cuttingGlassGroup = new THREE.Group();
    this.cuttingGlassGroup.position.set(-0.26, 0.045, 0.04);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0.05,
      transmission: this.isSoftwareGl ? 0 : 0.85,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.42 : 1,
    });
    const glassBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.1, 0.31, 12),
      glassMat,
    );
    glassBody.position.y = 0.155;
    this.cuttingGlassGroup.add(glassBody);
    this.cuttingGlassGroup.visible = false;
    this.trayGroup.add(this.cuttingGlassGroup);

    this.cupLiquidMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.1, 0.25, 18),
      new THREE.MeshStandardMaterial({ color: 0xc86d28, roughness: 0.25 }),
    );
    this.cupLiquidMesh.position.set(-0.26, 0.2, 0.04);
    this.cupLiquidMesh.visible = false;
    this.trayGroup.add(this.cupLiquidMesh);

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-1.3, 0.9, -0.05),
      new THREE.Vector3(-0.7, 1.2, 0),
      new THREE.Vector3(-0.26, 0.3, 0.04),
    );
    this.pourArcMesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 16, 0.03, 8, false),
      new THREE.MeshStandardMaterial({ color: 0xc86d28, roughness: 0.2 }),
    );
    this.pourArcMesh.visible = false;
    this.trayGroup.add(this.pourArcMesh);

    const snackPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.2, 0.03, 24),
      brassRimMat,
    );
    snackPlate.position.set(0.25, 0.06, 0.02);
    this.trayGroup.add(snackPlate);

    // Snack 4A: Parle-G Biscuits
    this.snackParleGroup = new THREE.Group();
    this.snackParleGroup.position.set(0.25, 0.085, 0.02);
    const biscuitMat = new THREE.MeshStandardMaterial({ color: 0xd99343, roughness: 0.65 });
    for (let i = 0; i < 3; i++) {
      const biscuit = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.14), biscuitMat);
      biscuit.position.y = i * 0.038;
      biscuit.rotation.y = (i - 1) * 0.18;
      this.snackParleGroup.add(biscuit);
    }
    this.snackParleGroup.visible = false;
    this.trayGroup.add(this.snackParleGroup);

    // Snack 4B: Hot Samosas
    this.snackSamosaGroup = new THREE.Group();
    this.snackSamosaGroup.position.set(0.25, 0.13, 0.02);
    const samosaMat = new THREE.MeshStandardMaterial({ color: 0xc87d28, roughness: 0.72 });
    [-0.085, 0.085].forEach((sx, idx) => {
      const samosa = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.21, 4), samosaMat);
      samosa.position.set(sx, 0, idx === 0 ? -0.03 : 0.04);
      samosa.rotation.y = idx * 0.8;
      samosa.rotation.z = idx === 0 ? 0.18 : -0.18;
      this.snackSamosaGroup.add(samosa);
    });
    this.snackSamosaGroup.visible = false;
    this.trayGroup.add(this.snackSamosaGroup);

    // Snack 4C: Crispy Monsoon Pakoras
    this.snackPakoraGroup = new THREE.Group();
    this.snackPakoraGroup.position.set(0.25, 0.1, 0.02);
    const pakoraMat = new THREE.MeshStandardMaterial({ color: 0xb4691e, roughness: 0.85 });
    for (let i = 0; i < 6; i++) {
      const pakora = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 0), pakoraMat);
      const a = (i / 6) * Math.PI * 2;
      pakora.position.set(Math.cos(a) * 0.085, (i % 2) * 0.045, Math.sin(a) * 0.085);
      this.snackPakoraGroup.add(pakora);
    }
    this.snackPakoraGroup.visible = false;
    this.trayGroup.add(this.snackPakoraGroup);

    // Snack 4D: Festive Diwali Mithai
    this.snackMithaiGroup = new THREE.Group();
    this.snackMithaiGroup.position.set(0.25, 0.11, 0.02);
    const jamunMat = new THREE.MeshStandardMaterial({ color: 0x6b240c, roughness: 0.22 });
    [-0.075, 0.075].forEach((jx) => {
      const jamun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 14), jamunMat);
      jamun.position.set(jx, 0, -0.04);
      this.snackMithaiGroup.add(jamun);
    });
    const jalebi = new THREE.Mesh(
      new THREE.TorusGeometry(0.075, 0.02, 8, 20),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0x9a3412,
        emissiveIntensity: 0.25,
        roughness: 0.3,
      }),
    );
    jalebi.rotation.x = Math.PI / 2;
    jalebi.position.set(0, 0.03, 0.075);
    this.snackMithaiGroup.add(jalebi);
    this.snackMithaiGroup.visible = false;
    this.trayGroup.add(this.snackMithaiGroup);

    // Counter Display Plate for Unlocked Samosas
    this.counterSamosaDisplay = new THREE.Group();
    this.counterSamosaDisplay.position.set(1.18, 1.12, -0.28);
    const displayPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.2, 0.035, 18),
      brassRimMat,
    );
    this.counterSamosaDisplay.add(displayPlate);
    for (let i = 0; i < 3; i++) {
      const sm = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.17, 4), samosaMat);
      sm.position.set((i - 1) * 0.095, 0.09, 0);
      this.counterSamosaDisplay.add(sm);
    }
    this.counterSamosaDisplay.visible = false;
    this.scene.add(this.counterSamosaDisplay);

    const hitProxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.45, 0.7, 1.05),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hitProxy.position.y = 0.25;
    hitProxy.userData.stationTarget = 'station_tray' as InteractiveStationTarget;
    this.trayGroup.add(hitProxy);
    this.interactables.push(hitProxy);

    this.scene.add(this.trayGroup);
  }

  // VINTAGE RADIO & COIN GULLAK JAR
  private buildRadioAndGullak(): void {
    this.radioGroup = new THREE.Group();
    this.radioGroup.position.set(-3.15, 1.12, -0.22);
    this.radioGroup.rotation.y = 0.42;

    const radioCabinet = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.5, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x6b2d14, roughness: 0.42, metalness: 0.15 }),
    );
    radioCabinet.position.y = 0.25;
    this.radioGroup.add(radioCabinet);

    const speakerCloth = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.24, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xe7d3b0, roughness: 0.85 }),
    );
    speakerCloth.position.set(0, 0.31, 0.17);
    this.radioGroup.add(speakerCloth);

    const dialScale = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.085, 0.02),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.75,
      }),
    );
    dialScale.position.set(0, 0.12, 0.17);
    this.radioGroup.add(dialScale);

    const knobMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.85,
    });
    [-0.25, 0.25].forEach((kx) => {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 14), knobMat);
      knob.rotation.x = Math.PI / 2;
      knob.position.set(kx, 0.12, 0.18);
      this.radioGroup.add(knob);
    });

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.015, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 }),
    );
    antenna.position.set(0.24, 0.78, -0.05);
    antenna.rotation.z = -0.25;
    this.radioGroup.add(antenna);

    for (let i = 0; i < 2; i++) {
      const waveRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.13 + i * 0.09, 0.012, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.7 }),
      );
      waveRing.position.set(0, 0.72 + i * 0.14, 0);
      this.radioGroup.add(waveRing);
      this.radioWaveRings.push(waveRing);
    }

    const radioProxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 1.05, 0.8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    radioProxy.position.y = 0.45;
    radioProxy.userData.stationTarget = 'station_radio' as InteractiveStationTarget;
    this.radioGroup.add(radioProxy);
    this.interactables.push(radioProxy);

    this.scene.add(this.radioGroup);

    // Coin Gullak Jar on Right-Back Counter
    const gullakGroup = new THREE.Group();
    gullakGroup.position.set(3.15, 1.12, -0.18);

    const jarGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xfffbeb,
      roughness: 0.15,
      transmission: this.isSoftwareGl ? 0 : 0.82,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.38 : 1,
    });
    const jarBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.2, 0.44, 20),
      jarGlassMat,
    );
    jarBody.position.y = 0.22;
    jarBody.renderOrder = 2;
    gullakGroup.add(jarBody);

    const jarLid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.19, 0.055, 20),
      knobMat,
    );
    jarLid.position.y = 0.46;
    gullakGroup.add(jarLid);

    const coinGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.024, 14);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.2,
      metalness: 0.9,
    });
    for (let i = 0; i < 14; i++) {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.set(
        Math.sin(i * 1.7) * 0.065,
        0.04 + i * 0.025,
        Math.cos(i * 2.3) * 0.065,
      );
      gullakGroup.add(coin);
      this.gullakCoinMeshes.push(coin);
    }

    for (let i = 0; i < 5; i++) {
      const fCoin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.028, 16),
        coinMat,
      );
      fCoin.visible = false;
      this.scene.add(fCoin);
      this.flyingCoins.push({
        mesh: fCoin,
        active: false,
        t: 0,
        start: new THREE.Vector3(-1.35, 1.5, 0.95),
        end: new THREE.Vector3(3.15, 1.6, -0.18),
      });
    }

    this.scene.add(gullakGroup);
  }

  // Reusable Builder for 14-Part 3D Character Rig (with Walking Legs, Arms, Headwear, and Held Kulhad Cup)
  private createCharacterRig(): CharacterRig {
    const root = new THREE.Group();

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd99b72,
      roughness: 0.65,
    });
    const torsoMat = new THREE.MeshStandardMaterial({
      color: 0xf4ecd8,
      roughness: 0.78,
    });
    const secondaryMat = new THREE.MeshStandardMaterial({
      color: 0x8c4a27,
      roughness: 0.65,
    });
    const trousersMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f4,
      roughness: 0.82,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.6,
    });

    // 1. Walking Legs & Sandals/Shoes
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.15, 0.62, 0);
    const lLegCyl = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.42, 8, 12), trousersMat);
    lLegCyl.position.y = -0.24;
    leftLeg.add(lLegCyl);
    const lShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.24), shoeMat);
    lShoe.position.set(0, -0.52, 0.05);
    leftLeg.add(lShoe);
    root.add(leftLeg);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.15, 0.62, 0);
    const rLegCyl = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.42, 8, 12), trousersMat);
    rLegCyl.position.y = -0.24;
    rightLeg.add(rLegCyl);
    const rShoe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.24), shoeMat);
    rShoe.position.set(0, -0.52, 0.05);
    rightLeg.add(rShoe);
    root.add(rightLeg);

    // 2. Torso (Kurta / Saree bodice)
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.39, 1.05, 20),
      torsoMat,
    );
    torso.position.y = 1.08;
    torso.castShadow = !this.isSoftwareGl;
    root.add(torso);

    // 3. Draped Shawl / Gamcha / Saree Pallu
    const palluMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.78, 0.42),
      secondaryMat,
    );
    palluMesh.position.set(0.04, 1.14, 0.02);
    palluMesh.rotation.z = 0.22;
    root.add(palluMesh);

    // 4. Left & Right Arms + Held Kulhad Cup
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.4, 1.44, 0);
    const lArmMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 0.42, 8, 12),
      torsoMat,
    );
    lArmMesh.position.y = -0.2;
    leftArm.add(lArmMesh);
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), skinMat);
    lHand.position.y = -0.44;
    leftArm.add(lHand);
    root.add(leftArm);

    const rightArm = new THREE.Group();
    rightArm.position.set(0.4, 1.44, 0);
    const rArmMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.09, 0.42, 8, 12),
      torsoMat,
    );
    rArmMesh.position.y = -0.2;
    rightArm.add(rArmMesh);
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), skinMat);
    rHand.position.y = -0.44;
    rightArm.add(rHand);

    // Held Clay Kulhad Cup in Right Hand (visible when customer receives tea!)
    const heldCupGroup = new THREE.Group();
    heldCupGroup.position.set(0, -0.44, 0.14);
    const cupMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.068, 0.19, 14),
      new THREE.MeshStandardMaterial({ color: 0xc25934, roughness: 0.8 }),
    );
    heldCupGroup.add(cupMesh);
    const cupTea = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.065, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xc86d28, roughness: 0.25 }),
    );
    cupTea.position.y = 0.025;
    heldCupGroup.add(cupTea);
    heldCupGroup.visible = false;
    rightArm.add(heldCupGroup);

    root.add(rightArm);

    // 5. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.88, 0);

    const headSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 22, 22),
      skinMat,
    );
    headGroup.add(headSphere);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e1b18 });
    [-0.095, 0.095].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), eyeMat);
      eye.position.set(ex, 0.035, 0.255);
      headGroup.add(eye);
    });

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.036, 10, 10), skinMat);
    nose.position.set(0, -0.015, 0.28);
    headGroup.add(nose);

    const mustacheMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.04, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.8 }),
    );
    mustacheMesh.position.set(0, -0.08, 0.265);
    headGroup.add(mustacheMesh);

    const bindiMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xdc2626 }),
    );
    bindiMesh.position.set(0, 0.095, 0.27);
    headGroup.add(bindiMesh);

    const glassesGroup = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.2,
    });
    [-0.095, 0.095].forEach((gx) => {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.009, 8, 18), frameMat);
      rim.position.set(gx, 0.035, 0.27);
      glassesGroup.add(rim);
    });
    headGroup.add(glassesGroup);

    const gandhiCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.16, 0.48),
      new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.85 }),
    );
    gandhiCap.position.set(0, 0.25, 0);
    headGroup.add(gandhiCap);

    const turbanGroup = new THREE.Group();
    const turbanMain = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.115, 12, 22),
      secondaryMat,
    );
    turbanMain.rotation.x = Math.PI / 2 - 0.2;
    turbanMain.position.set(0, 0.19, 0);
    turbanGroup.add(turbanMain);
    headGroup.add(turbanGroup);

    root.add(headGroup);
    this.addContactShadow(root, 0.42, 0.02);

    return {
      root,
      headGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      heldCupGroup,
      torsoMat,
      secondaryMat,
      skinMat,
      glassesGroup,
      mustacheMesh,
      bindiMesh,
      gandhiCap,
      turbanGroup,
      palluMesh,
    };
  }

  private applyAppearanceToRig(rig: CharacterRig, appearance: CustomerAppearance): void {
    rig.skinMat.color.set(appearance.skinColor);
    rig.torsoMat.color.set(appearance.outfitPrimary);
    rig.secondaryMat.color.set(appearance.outfitSecondary);

    rig.glassesGroup.visible = appearance.glasses;
    rig.mustacheMesh.visible = appearance.mustache;
    rig.bindiMesh.visible = appearance.bindi;
    rig.gandhiCap.visible = appearance.headwear === 'gandhi_cap';
    rig.turbanGroup.visible = appearance.headwear === 'turban';
    rig.palluMesh.visible =
      appearance.headwear === 'saree_pallu' || appearance.headwear === 'shawl';
  }

  private buildTeaMakerAndCustomers(): void {
    // 1. Tea Maker (Chaiwala) standing behind the counter, completely unobstructed!
    this.teaMakerRig = this.createCharacterRig();
    this.applyAppearanceToRig(this.teaMakerRig, {
      skinColor: '#d4946a',
      outfitPrimary: '#fffbeb',   // Crisp cream kurta
      outfitSecondary: '#b91c1c', // Classic red gamcha scarf
      headwear: 'gandhi_cap',
      glasses: false,
      mustache: true,
      bindi: false,
    });
    this.teaMakerRig.palluMesh.visible = true;
    this.teaMakerRig.root.position.set(0, 0.14, -0.95);
    this.scene.add(this.teaMakerRig.root);

    // 2. Active Customer walking in from the right footpath & waiting at the Serving Counter
    this.activeCustomerRig = this.createCharacterRig();
    this.activeCustomerRig.root.position.set(1.95, 0.1, -0.78);
    this.activeCustomerRig.root.rotation.y = -0.35; // Faces camera & slightly toward Tea Maker

    // Interactive hitbox on Active Customer so clicking them serves tea when ready
    const custProxy = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 2.1, 0.95),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    custProxy.position.y = 1.05;
    custProxy.userData.stationTarget = 'customer' as InteractiveStationTarget;
    this.activeCustomerRig.root.add(custProxy);
    this.interactables.push(custProxy);

    this.scene.add(this.activeCustomerRig.root);

    // 3. Second Waiting Customer in the Queue
    this.queuedCustomerRig = this.createCharacterRig();
    this.queuedCustomerRig.root.position.set(3.05, 0.08, -0.88);
    this.queuedCustomerRig.root.rotation.y = -0.45;
    this.scene.add(this.queuedCustomerRig.root);

    // 4. Departing Served Customer (takes their steaming Kulhad cup and walks off happily!)
    this.departingCustomerRig = this.createCharacterRig();
    this.departingCustomerRig.heldCupGroup.visible = true;
    this.departingCustomerRig.root.visible = false;
    this.scene.add(this.departingCustomerRig.root);
  }

  // ZERO-GC POOLED PARTICLE RING BUFFER + MONSOON RAIN
  private buildParticlePools(): void {
    const pGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    this.particleInstanced = new THREE.InstancedMesh(pGeo, pMat, this.particleCount);
    this.particleInstanced.frustumCulled = false;

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -10,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        maxAge: 1,
        scaleStart: 1,
        scaleEnd: 0.1,
        colorHex: 0xffffff,
      });
      this._dummy.position.set(0, -10, 0);
      this._dummy.scale.setScalar(0.001);
      this._dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, this._dummy.matrix);
      this.particleInstanced.setColorAt(i, this._color.setHex(0xffffff));
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    if (this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.particleInstanced);

    const rainGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.55, 4);
    const rainMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.55,
    });
    this.rainInstanced = new THREE.InstancedMesh(rainGeo, rainMat, this.rainCount);
    this.rainInstanced.frustumCulled = false;
    this.rainInstanced.visible = false;

    for (let i = 0; i < this.rainCount; i++) {
      const rx = (Math.random() - 0.5) * 14;
      const ry = Math.random() * 6 + 0.5;
      const rz = -1.2 - Math.random() * 5.5;
      this.rainPositions.push({ x: rx, y: ry, z: rz, speed: 6 + Math.random() * 3 });
      this._dummy.position.set(rx, ry, rz);
      this._dummy.rotation.set(0, 0, -0.12);
      this._dummy.scale.setScalar(1);
      this._dummy.updateMatrix();
      this.rainInstanced.setMatrixAt(i, this._dummy.matrix);
    }
    this.rainInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.rainInstanced);

    // Floating Golden Dust Motes illuminated by the hanging tapri bulb
    const moteGeo = new THREE.SphereGeometry(0.028, 6, 6);
    const moteMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.62,
    });
    this.dustMoteInstanced = new THREE.InstancedMesh(moteGeo, moteMat, this.dustMoteCount);
    this.dustMoteInstanced.frustumCulled = false;
    for (let i = 0; i < this.dustMoteCount; i++) {
      const mx = (Math.random() - 0.5) * 7.6;
      const my = 1.25 + Math.random() * 2.5;
      const mz = -0.6 + Math.random() * 1.5;
      this.dustMotes.push({
        x: mx,
        y: my,
        z: mz,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.5,
      });
      this._dummy.position.set(mx, my, mz);
      this._dummy.scale.setScalar(0.8 + Math.random() * 0.5);
      this._dummy.updateMatrix();
      this.dustMoteInstanced.setMatrixAt(i, this._dummy.matrix);
    }
    this.dustMoteInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.dustMoteInstanced);
  }

  public spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    colorHex: number,
    speed = 1.0,
    upwardBias = 1.2,
  ): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleIndex];
      this.particleIndex = (this.particleIndex + 1) % this.particleCount;
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 0.22;
      slot.y = y + (Math.random() - 0.5) * 0.1;
      slot.z = z + (Math.random() - 0.5) * 0.22;
      slot.vx = (Math.random() - 0.5) * speed;
      slot.vy = upwardBias + Math.random() * speed;
      slot.vz = (Math.random() - 0.5) * speed;
      slot.age = 0;
      slot.maxAge = 0.45 + Math.random() * 0.45;
      slot.scaleStart = 0.9 + Math.random() * 0.5;
      slot.scaleEnd = 0.1;
      slot.colorHex = colorHex;
    }
  }

  // Slow-rising, gentle steam particle system for simmering & poured chai
  public spawnGentleSteam(x: number, y: number, z: number): void {
    const slot = this.particles[this.particleIndex];
    this.particleIndex = (this.particleIndex + 1) % this.particleCount;
    slot.active = true;
    slot.x = x + (Math.random() - 0.5) * 0.24;
    slot.y = y;
    slot.z = z + (Math.random() - 0.5) * 0.24;
    slot.vx = (Math.random() - 0.5) * 0.12;
    slot.vy = 0.42 + Math.random() * 0.22; // Slow, unhurried rising steam
    slot.vz = (Math.random() - 0.5) * 0.12;
    slot.age = 0;
    slot.maxAge = 1.65 + Math.random() * 0.55;
    slot.scaleStart = 0.55;
    slot.scaleEnd = 1.45;
    slot.colorHex = 0xfffbeb;
  }

  public triggerMortarPoundEffect(crushCount: number): void {
    this.mortarCrushAnim = 1.0;
    this.mortarWobble = 1.0;
    this.teaMakerWorkTimer = 0.6;
    this.cameraTrauma = Math.min(0.32, this.cameraTrauma + 0.12);
    this.hitstopTimer = 0.035;
    this.spawnParticles(
      -2.05,
      1.52,
      0.32,
      crushCount >= 3 ? 16 : 8,
      crushCount >= 3 ? 0xfacc15 : 0xd99b26,
      1.3,
      1.5,
    );
  }

  public triggerPotSplashEffect(colorHex: number): void {
    this.potSimmerBounce = 1.0;
    this.teaMakerWorkTimer = 0.6;
    this.spawnParticles(0, 1.65, 0.26, 10, colorHex, 0.9, 1.4);
  }

  public triggerTrayActionEffect(isPour: boolean): void {
    if (isPour) {
      this.pourAnimTimer = 0.65;
    }
    this.teaMakerWorkTimer = 0.6;
    this.spawnParticles(2.05, 1.45, 0.34, 10, isPour ? 0xfde68a : 0xf59e0b, 1.0, 1.2);
  }

  public triggerServeCelebration(): void {
    this.trayServeSlide = 1.0;
    this.teaMakerWorkTimer = 0.8;
    this.cameraTrauma = 0.2;
    this.hitstopTimer = 0.045;
    this.spawnParticles(1.95, 1.95, -0.45, 22, 0xfacc15, 1.8, 2.0);

    this.flyingCoins.forEach((fc, idx) => {
      fc.active = true;
      fc.t = -idx * 0.11;
      fc.mesh.visible = true;
    });
  }

  public triggerRadioPulse(): void {
    this.radioBounce = 1.0;
    this.spawnParticles(-3.15, 1.75, -0.22, 12, 0xfbbf24, 1.1, 1.4);
  }

  public triggerSpillSplashEffect(): void {
    this.cameraTrauma = 0.26;
    this.spawnParticles(1.32, 1.22, 0.56, 18, 0xb45309, 1.5, 1.3);
  }

  public triggerWipeCleanEffect(): void {
    this.wipeAnimTimer = 0.55;
    this.teaMakerWorkTimer = 0.6;
    this.spawnParticles(1.32, 1.22, 0.56, 14, 0xfef08a, 1.2, 1.1);
  }

  public syncGameState(
    state: TapriGameState,
    shellMode: 'title' | 'playing' | 'paused' | 'gameover',
  ): void {
    this.mode = shellMode;

    // 1. Update Customer Queue & Walking Transition when a new customer arrives
    if (state.currentCustomer.id !== this.lastCustomerId) {
      if (this.lastCustomerId !== '') {
        // Previous customer takes their tea cup and walks off happily!
        const prevOrder = generateCustomerOrder(
          Math.max(0, state.currentCustomer.customerIndex - 1),
          state.radioEvent,
          state.unlockedUpgrades,
        );
        this.applyAppearanceToRig(this.departingCustomerRig, prevOrder.appearance);
        this.departingCustomerRig.root.visible = true;
        this.departingWalkProgress = 0;
        this.activeWalkProgress = 0;
        this.queuedWalkProgress = 0;
      }
      this.lastCustomerId = state.currentCustomer.id;
    }

    this.applyAppearanceToRig(this.activeCustomerRig, state.currentCustomer.appearance);

    const nextQueuedOrder = generateCustomerOrder(
      state.currentCustomer.customerIndex + 1,
      state.radioEvent,
      state.unlockedUpgrades,
    );
    this.applyAppearanceToRig(this.queuedCustomerRig, nextQueuedOrder.appearance);

    // 2. Update Station 1 Mortar & Pestle
    const crushRatio = state.station.crushCount / 3;
    this.spiceFillMesh.scale.y = 0.3 + crushRatio * 1.4;
    this.spiceFillMesh.position.y = 0.15 + crushRatio * 0.08;
    this.spiceChunkMeshes.forEach((chunk, i) => {
      chunk.scale.setScalar(Math.max(0.25, 1 - crushRatio * 0.65));
      if (state.station.spiceSelected === 'cardamom') {
        (chunk.material as THREE.MeshStandardMaterial).color.setHex(0x65a30d);
      } else if (state.station.spiceSelected === 'ginger') {
        (chunk.material as THREE.MeshStandardMaterial).color.setHex(0xd4a359);
      } else {
        (chunk.material as THREE.MeshStandardMaterial).color.setHex(0xeab308);
      }
      chunk.visible = i >= state.station.crushCount;
    });

    // 3. Update Station 2 Stove & Patila Liquid Color + Height
    const st = state.station;
    const anyLiquid =
      st.waterAdded || st.teaLeavesAdded || st.milkOrLemonAdded || st.spicesInPot;
    this.liquidSurfaceMesh.visible = anyLiquid;

    if (!st.waterAdded) {
      this.liquidTargetHeight = 0.12;
      this.liquidTargetColor.setHex(0x4ea8de);
    } else if (!st.teaLeavesAdded) {
      this.liquidTargetHeight = 0.24;
      this.liquidTargetColor.setHex(0x5bc0be);
    } else if (!st.milkOrLemonAdded) {
      this.liquidTargetHeight = 0.3;
      this.liquidTargetColor.setHex(0x6b240c);
    } else if (!st.spicesInPot) {
      this.liquidTargetHeight = 0.36;
      this.liquidTargetColor.setHex(
        state.currentCustomer.teaBase === 'black_lemon_chai' ? 0x9a3412 : 0xd98a4e,
      );
    } else {
      this.liquidTargetHeight = 0.41;
      this.liquidTargetColor.setHex(
        state.currentCustomer.teaBase === 'black_lemon_chai' ? 0xb45309 : 0xc86d28,
      );
    }

    // 4. Update Station 3 Serving Tray (Cup + Snack + Counter Spill State)
    const activeCup = st.pouredCup ?? state.currentCustomer.cup;
    this.kulhadGroup.visible = activeCup === 'kulhad';
    this.cuttingGlassGroup.visible = activeCup === 'cutting_glass';
    this.cupLiquidMesh.visible = st.pouredCup !== null;
    this.spillPuddleGroup.visible = st.hasSpillOnCounter || this.wipeAnimTimer > 0;

    this.snackParleGroup.visible = st.platedSnack === 'parle_g';
    this.snackSamosaGroup.visible = st.platedSnack === 'samosa';
    this.snackPakoraGroup.visible = st.platedSnack === 'pakora';
    this.snackMithaiGroup.visible = st.platedSnack === 'mithai';

    // 5. Update Unlocked 3D Upgrades
    this.royalCrownGroup.visible =
      state.unlockedUpgrades.includes('brass_teapot') ||
      state.unlockedUpgrades.includes('larger_kettle');
    this.marigoldGarlandGroup.visible =
      state.unlockedUpgrades.includes('marigold_lights') || state.radioEvent === 'diwali';
    this.counterSamosaDisplay.visible = state.unlockedUpgrades.includes('samosa');

    // 6. Update Coin Gullak Fill
    const visibleCoins = Math.min(
      this.gullakCoinMeshes.length,
      Math.max(2, Math.floor(state.coins / 10)),
    );
    this.gullakCoinMeshes.forEach((c, idx) => {
      c.visible = idx < visibleCoins;
    });

    // 7. Update Active Guide Ring & Tea Maker Target Position
    if (st.crushCount < 3) {
      this.guideRingTargetX = -2.05;
      this.guideRingTargetZ = 0.32;
      this.teaMakerTargetX = -1.35;
    } else if (!st.isBoiled) {
      this.guideRingTargetX = 0.0;
      this.guideRingTargetZ = 0.26;
      this.teaMakerTargetX = -0.15;
    } else {
      this.guideRingTargetX = 2.05;
      this.guideRingTargetZ = 0.34;
      this.teaMakerTargetX = 0.72;
    }

    // 8. Update Weather & Atmosphere for Radio Event
    if (this.currentRadioEvent !== state.radioEvent) {
      this.currentRadioEvent = state.radioEvent;
      this.applyRadioAtmosphere(state.radioEvent);
    }
  }

  private applyRadioAtmosphere(event: RadioEventId): void {
    const bg = this.scene.background as THREE.Color;
    const fog = this.scene.fog as THREE.FogExp2;

    if (event === 'monsoon') {
      bg.setHex(0x7c98ab);
      fog.color.setHex(0x7c98ab);
      this.keyLight.color.setHex(0xdbeafe);
      this.keyLight.intensity = 1.65;
      this.rainInstanced.visible = true;
    } else if (event === 'diwali') {
      bg.setHex(0xd97736);
      fog.color.setHex(0xd97736);
      this.keyLight.color.setHex(0xffedd5);
      this.keyLight.intensity = 2.1;
      this.festivalLight.intensity = 2.6;
      this.rainInstanced.visible = false;
    } else if (event === 'milkman_delayed') {
      bg.setHex(0xf7d08a);
      fog.color.setHex(0xf7d08a);
      this.keyLight.color.setHex(0xfffbeb);
      this.keyLight.intensity = 2.35;
      this.rainInstanced.visible = false;
    } else {
      bg.setHex(0xf6c28b);
      fog.color.setHex(0xf6c28b);
      this.keyLight.color.setHex(0xffe0b2);
      this.keyLight.intensity = 2.3;
      this.festivalLight.intensity = 1.5;
      this.rainInstanced.visible = false;
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.visualViewport?.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
  }

  private computeCameraTargets(elapsed: number): void {
    const aspect = this.camera.aspect || 1.5;
    const halfFovTan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5));
    // Ensure full 8.5-unit tabletop & customer span (-4.25 to +4.25) at the front plane (z = +0.90) fits inside any screen width
    const minDistFromFrontPlane = 4.25 / (halfFovTan * Math.max(0.36, aspect));
    const baseDistZ = Math.max(5.55, 0.9 + minDistFromFrontPlane);
    const isPortrait = aspect < 1.05;

    if (this.mode === 'title') {
      this.cameraPosTarget.set(
        Math.sin(elapsed * 0.35) * (isPortrait ? 0.35 : 0.9),
        (isPortrait ? 0.85 + baseDistZ * 0.31 : 3.4) + Math.cos(elapsed * 0.25) * 0.08,
        baseDistZ + Math.sin(elapsed * 0.2) * 0.18,
      );
      this.cameraLookTarget.set(
        Math.sin(elapsed * 0.35) * 0.15,
        isPortrait ? 0.45 : 1.25,
        -0.15,
      );
    } else {
      this.cameraPosTarget.set(
        this.pointerNormalized.x * (isPortrait ? 0.06 : 0.18),
        (isPortrait ? 0.8 + baseDistZ * 0.31 : 3.35) + this.pointerNormalized.y * 0.05,
        baseDistZ,
      );
      this.cameraLookTarget.set(
        this.pointerNormalized.x * 0.05,
        isPortrait ? 0.22 : 0.88,
        -0.15,
      );
    }
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(
      1,
      Math.round(
        rect.width ||
          this.container.clientWidth ||
          window.visualViewport?.width ||
          window.innerWidth,
      ),
    );
    const height = Math.max(
      1,
      Math.round(
        rect.height ||
          this.container.clientHeight ||
          window.visualViewport?.height ||
          window.innerHeight,
      ),
    );
    const aspect = width / height;
    this.camera.aspect = aspect;
    if (aspect < 0.72) {
      this.camera.fov = 56;
    } else if (aspect < 1.05) {
      this.camera.fov = 50;
    } else if (aspect < 1.45) {
      this.camera.fov = 45;
    } else {
      this.camera.fov = 39;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, true);

    // Snap camera immediately on resize so mobile Chrome & tablets frame the full stall on Frame 1
    this.computeCameraTargets(this.clock.getElapsedTime());
    this.cameraPosCurrent.copy(this.cameraPosTarget);
    this.cameraLookCurrent.copy(this.cameraLookTarget);
    this.camera.position.copy(this.cameraPosCurrent);
    this.camera.lookAt(this.cameraLookCurrent);
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.pointerNormalized.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNormalized.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.mode === 'playing') {
      this._vec2.set(this.pointerNormalized.x, this.pointerNormalized.y);
      this.raycaster.setFromCamera(this._vec2, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactables, false);
      if (hits.length > 0) {
        const target = hits[0].object.userData.stationTarget as InteractiveStationTarget | undefined;
        this.hoveredStation = target ?? null;
        this.renderer.domElement.style.cursor = target ? 'pointer' : 'default';
      } else {
        this.hoveredStation = null;
        this.renderer.domElement.style.cursor = 'default';
      }
    } else {
      this.hoveredStation = null;
      this.renderer.domElement.style.cursor = 'default';
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.mode !== 'playing' || !this.onStationClick) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    this._vec2.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._vec2.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this._vec2, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    if (hits.length > 0) {
      const target = hits[0].object.userData.stationTarget as InteractiveStationTarget | undefined;
      if (target) {
        this.onStationClick(target);
      }
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || !gl.fenceSync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = this.clock.getElapsedTime();

      this.updateScene(dt, elapsed);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    tick();
  }

  private animateCharacterWalkAndIdle(
    rig: CharacterRig,
    isWalking: boolean,
    walkSpeedPhase: number,
    elapsed: number,
    isWorkingOrWaving = false,
    isHoldingCup = false,
  ): void {
    if (isWalking) {
      const stride = Math.sin(walkSpeedPhase) * 0.52;
      rig.leftLeg.rotation.x = stride;
      rig.rightLeg.rotation.x = -stride;
      rig.leftArm.rotation.x = -stride * 0.7;
      rig.rightArm.rotation.x = isHoldingCup ? -0.85 : stride * 0.7;
      rig.root.position.y = 0.02 + Math.abs(Math.cos(walkSpeedPhase)) * 0.06;
    } else {
      rig.leftLeg.rotation.x = 0;
      rig.rightLeg.rotation.x = 0;
      rig.root.position.y = 0.02 + Math.sin(elapsed * 2.4) * 0.02;

      if (isWorkingOrWaving) {
        rig.rightArm.rotation.x = -0.75 + Math.sin(elapsed * 12) * 0.35;
        rig.leftArm.rotation.x = -0.45 + Math.cos(elapsed * 12) * 0.25;
      } else if (isHoldingCup) {
        rig.rightArm.rotation.x = -0.95 + Math.sin(elapsed * 3) * 0.1;
        rig.leftArm.rotation.x = 0;
      } else {
        rig.rightArm.rotation.x = Math.sin(elapsed * 1.8) * 0.06;
        rig.leftArm.rotation.x = -Math.sin(elapsed * 1.8) * 0.06;
      }
    }

    rig.headGroup.rotation.y = Math.sin(elapsed * 1.3) * 0.08;
    rig.headGroup.rotation.z = Math.cos(elapsed * 1.6) * 0.03;
  }

  private updateScene(dt: number, elapsed: number): void {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
    }
    const simDt = this.hitstopTimer > 0 ? dt * 0.15 : dt;

    // 1. Responsive Camera Choreography (Fits full 8.5-unit counter on portrait phones, tablets & desktops)
    const dampFactor = 1 - Math.exp(-5.5 * dt);
    this.computeCameraTargets(elapsed);

    this.cameraPosCurrent.lerp(this.cameraPosTarget, dampFactor);
    this.cameraLookCurrent.lerp(this.cameraLookTarget, dampFactor);

    let shakeX = 0;
    let shakeY = 0;
    if (this.cameraTrauma > 0) {
      const shake = this.cameraTrauma * this.cameraTrauma;
      shakeX = Math.sin(elapsed * 48) * shake * 0.12;
      shakeY = Math.cos(elapsed * 54) * shake * 0.12;
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.4);
    }

    this.camera.position.set(
      this.cameraPosCurrent.x + shakeX,
      this.cameraPosCurrent.y + shakeY,
      this.cameraPosCurrent.z,
    );
    this.camera.lookAt(this.cameraLookCurrent);

    // 2. Guide Ring & Soft Glowing Hover Ring Interpolation
    this.guideRingMesh.position.x = THREE.MathUtils.lerp(
      this.guideRingMesh.position.x,
      this.guideRingTargetX,
      dampFactor * 1.5,
    );
    this.guideRingMesh.position.z = THREE.MathUtils.lerp(
      this.guideRingMesh.position.z,
      this.guideRingTargetZ,
      dampFactor * 1.5,
    );
    const ringScale = 1 + Math.sin(elapsed * 4.0) * 0.05;
    this.guideRingMesh.scale.setScalar(ringScale);
    this.guideRingMesh.visible = this.mode === 'playing';

    if (this.mode === 'playing' && this.hoveredStation) {
      this.hoverRingMesh.visible = true;
      let hx = 0;
      let hz = 0.32;
      if (this.hoveredStation === 'station_mortar') {
        hx = -2.05;
        hz = 0.32;
      } else if (this.hoveredStation === 'station_stove') {
        hx = 0.0;
        hz = 0.26;
      } else if (this.hoveredStation === 'station_tray' || this.hoveredStation === 'customer') {
        hx = 2.05;
        hz = 0.34;
      } else if (this.hoveredStation === 'station_radio') {
        hx = -3.15;
        hz = -0.22;
      }
      this.hoverRingMesh.position.x = hx;
      this.hoverRingMesh.position.z = hz;
      this.hoverRingMesh.scale.setScalar(1.06 + Math.sin(elapsed * 5.0) * 0.04);
    } else {
      this.hoverRingMesh.visible = false;
    }

    // 3. Tea Maker (Chaiwala) Movement & Working Animation behind the counter
    if (this.teaMakerWorkTimer > 0) {
      this.teaMakerWorkTimer = Math.max(0, this.teaMakerWorkTimer - simDt);
    }
    const prevTeaMakerX = this.teaMakerRig.root.position.x;
    this.teaMakerRig.root.position.x = THREE.MathUtils.lerp(
      prevTeaMakerX,
      this.teaMakerTargetX,
      dampFactor * 1.2,
    );
    const teaMakerWalking = Math.abs(this.teaMakerRig.root.position.x - this.teaMakerTargetX) > 0.06;
    this.animateCharacterWalkAndIdle(
      this.teaMakerRig,
      teaMakerWalking,
      elapsed * 10,
      elapsed,
      this.teaMakerWorkTimer > 0,
      false,
    );
    this.teaMakerRig.root.position.y += 0.12; // Stand on raised tapri platform

    // 4. Customers Walking In, Waiting at the Counter & Taking the Tea!
    // 4A. Active Customer walks from queued spot (+3.05, -0.88) to counter serving spot (+1.95, -0.78)
    if (this.activeWalkProgress < 1) {
      this.activeWalkProgress = Math.min(1, this.activeWalkProgress + simDt * 1.15);
    }
    const activeX = THREE.MathUtils.lerp(3.05, 1.95, this.activeWalkProgress);
    const activeZ = THREE.MathUtils.lerp(-0.88, -0.78, this.activeWalkProgress);
    this.activeCustomerRig.root.position.x = activeX;
    this.activeCustomerRig.root.position.z = activeZ;
    this.activeCustomerRig.root.rotation.y =
      this.activeWalkProgress < 0.92 ? -1.15 : -0.35; // Walks left toward counter, then faces counter & camera!
    this.animateCharacterWalkAndIdle(
      this.activeCustomerRig,
      this.activeWalkProgress < 0.96,
      elapsed * 9.5,
      elapsed,
      this.activeWalkProgress >= 0.96 && this.activeWalkProgress < 1.0,
      false,
    );
    this.activeCustomerRig.root.position.y += 0.08;

    // 4B. Queued Customer walks in from right roadside (+5.2, -0.95) to queue spot (+3.05, -0.88)
    if (this.queuedWalkProgress < 1) {
      this.queuedWalkProgress = Math.min(1, this.queuedWalkProgress + simDt * 0.95);
    }
    const queueX = THREE.MathUtils.lerp(5.2, 3.05, this.queuedWalkProgress);
    const queueZ = THREE.MathUtils.lerp(-0.95, -0.88, this.queuedWalkProgress);
    this.queuedCustomerRig.root.position.x = queueX;
    this.queuedCustomerRig.root.position.z = queueZ;
    this.queuedCustomerRig.root.rotation.y =
      this.queuedWalkProgress < 0.92 ? -1.25 : -0.45;
    this.animateCharacterWalkAndIdle(
      this.queuedCustomerRig,
      this.queuedWalkProgress < 0.96,
      elapsed * 8.5 + 1.2,
      elapsed + 2.0,
      false,
      false,
    );
    this.queuedCustomerRig.root.position.y += 0.06;

    // 4C. Departing Served Customer takes the tea at the Serving Tray and walks off happily holding their Kulhad!
    if (this.departingCustomerRig.root.visible) {
      this.departingWalkProgress += simDt * 0.55;
      if (this.departingWalkProgress >= 1) {
        this.departingCustomerRig.root.visible = false;
      } else {
        // First 0.28 of progress: stands right by Serving Tray holding & sipping their Kulhad cup, then walks off!
        if (this.departingWalkProgress < 0.28) {
          this.departingCustomerRig.root.position.set(1.45, 0.1, -0.75);
          this.departingCustomerRig.root.rotation.y = 0.15;
          this.animateCharacterWalkAndIdle(
            this.departingCustomerRig,
            false,
            0,
            elapsed,
            false,
            true,
          );
          this.departingCustomerRig.root.position.y += 0.08;
        } else {
          const walkT = (this.departingWalkProgress - 0.28) / 0.72;
          this.departingCustomerRig.root.position.x = THREE.MathUtils.lerp(1.45, 5.4, walkT);
          this.departingCustomerRig.root.position.z = THREE.MathUtils.lerp(-0.75, -0.65, walkT);
          this.departingCustomerRig.root.rotation.y = 1.15; // Walks away to the right holding tea cup
          this.animateCharacterWalkAndIdle(
            this.departingCustomerRig,
            true,
            elapsed * 9.0,
            elapsed,
            false,
            true,
          );
          this.departingCustomerRig.root.position.y += 0.08;
        }
      }
    }

    // 5. Station 1 Mortar & Pestle Pound + Wobble Animation
    if (this.mortarCrushAnim > 0) {
      this.mortarCrushAnim = Math.max(0, this.mortarCrushAnim - simDt * 4.2);
      const poundArc = Math.sin(this.mortarCrushAnim * Math.PI);
      this.pestleGroup.position.y = 0.4 - poundArc * 0.2;
      this.pestleGroup.rotation.z = -0.22 + poundArc * 0.32;
      const squash = 1 + poundArc * 0.09;
      this.mortarGroup.scale.set(squash, 1 / squash, squash);
    } else {
      this.pestleGroup.position.y = 0.4 + Math.sin(elapsed * 2.5) * 0.015;
      this.mortarGroup.scale.set(1, 1, 1);
    }

    if (this.mortarWobble > 0) {
      this.mortarWobble = Math.max(0, this.mortarWobble - simDt * 3.5);
      this.mortarGroup.rotation.z = Math.sin(elapsed * 32) * this.mortarWobble * 0.12;
    } else {
      this.mortarGroup.rotation.z = 0;
    }

    // 6. Station 2 Stove Flames, Liquid Color Lerp & Simmering Bubbles
    this.liquidCurrentColor.lerp(this.liquidTargetColor, dampFactor);
    this.liquidMaterial.color.copy(this.liquidCurrentColor);
    this.liquidSurfaceMesh.position.y = THREE.MathUtils.lerp(
      this.liquidSurfaceMesh.position.y,
      this.liquidTargetHeight,
      dampFactor,
    );

    if (this.potSimmerBounce > 0) {
      this.potSimmerBounce = Math.max(0, this.potSimmerBounce - simDt * 3.8);
      const s = 1 + Math.sin(this.potSimmerBounce * Math.PI) * 0.08;
      this.patilaGroup.scale.set(s, 1 / s, s);
    } else {
      this.patilaGroup.scale.set(1, 1, 1);
    }

    this.flameMeshes.forEach((flame, idx) => {
      flame.scale.y = 0.85 + Math.sin(elapsed * 14 + idx) * 0.25;
    });

    const showBubbles = this.liquidTargetHeight >= 0.39;
    this.bubbleMeshes.forEach((b, idx) => {
      b.visible = showBubbles;
      if (showBubbles) {
        const pulse = 0.7 + Math.sin(elapsed * 8 + idx * 1.3) * 0.45;
        b.scale.setScalar(Math.max(0.2, pulse));
        b.position.y = this.liquidSurfaceMesh.position.y + 0.03;
      }
    });

    if (showBubbles && Math.random() < 0.32) {
      this.spawnGentleSteam(0, 1.66, 0.26);
    }
    if (this.cupLiquidMesh.visible && Math.random() < 0.2) {
      this.spawnGentleSteam(1.79, 1.48, 0.38);
    }

    // 7. Station 3 Pour Stream & Tray Serve Slide
    if (this.pourAnimTimer > 0) {
      this.pourAnimTimer = Math.max(0, this.pourAnimTimer - simDt);
      this.pourArcMesh.visible = true;
    } else {
      this.pourArcMesh.visible = false;
    }

    if (this.trayServeSlide > 0) {
      this.trayServeSlide = Math.max(0, this.trayServeSlide - simDt * 1.8);
      const slideOffset = Math.sin(this.trayServeSlide * Math.PI) * 0.55;
      this.trayGroup.position.z = 0.34 + slideOffset;
    } else {
      this.trayGroup.position.z = 0.34;
    }

    // 8. Vintage Radio Wave Rings
    if (this.radioBounce > 0) {
      this.radioBounce = Math.max(0, this.radioBounce - simDt * 2.5);
      const rb = 1 + Math.sin(this.radioBounce * Math.PI * 2) * 0.1;
      this.radioGroup.scale.set(rb, 1 / rb, rb);
    } else {
      this.radioGroup.scale.set(1, 1, 1);
    }

    this.radioWaveRings.forEach((ring, idx) => {
      const wavePhase = (elapsed * 0.9 + idx * 0.5) % 1;
      ring.scale.setScalar(0.6 + wavePhase * 1.4);
      ring.position.y = 0.65 + wavePhase * 0.55;
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - wavePhase) * 0.65;
    });

    // 9. Flying Coins into Gullak Jar
    this.flyingCoins.forEach((fc) => {
      if (!fc.active) return;
      fc.t += simDt * 1.9;
      if (fc.t < 0) return;
      if (fc.t >= 1) {
        fc.active = false;
        fc.mesh.visible = false;
        return;
      }
      fc.mesh.position.lerpVectors(fc.start, fc.end, fc.t);
      fc.mesh.position.y += Math.sin(fc.t * Math.PI) * 1.35;
      fc.mesh.rotation.y += simDt * 12;
      fc.mesh.rotation.x += simDt * 8;
    });

    // 10. Update Pooled Particle Ring Buffer
    let anyParticleUpdated = false;
    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyParticleUpdated = true;
      p.age += simDt;
      if (p.age >= p.maxAge) {
        p.active = false;
        this._dummy.position.set(0, -10, 0);
        this._dummy.scale.setScalar(0.001);
        this._dummy.updateMatrix();
        this.particleInstanced.setMatrixAt(i, this._dummy.matrix);
        continue;
      }
      const progress = p.age / p.maxAge;
      p.x += p.vx * simDt;
      p.y += p.vy * simDt;
      p.z += p.vz * simDt;
      const scale = THREE.MathUtils.lerp(p.scaleStart, p.scaleEnd, progress);
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.scale.setScalar(scale);
      this._dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, this._dummy.matrix);
      this.particleInstanced.setColorAt(i, this._color.setHex(p.colorHex));
    }
    if (anyParticleUpdated) {
      this.particleInstanced.instanceMatrix.needsUpdate = true;
      if (this.particleInstanced.instanceColor) {
        this.particleInstanced.instanceColor.needsUpdate = true;
      }
    }

    // 11. Update Monsoon Rain Streaks
    if (this.rainInstanced.visible) {
      for (let i = 0; i < this.rainCount; i++) {
        const r = this.rainPositions[i];
        r.y -= r.speed * simDt;
        if (r.y < 0.2) {
          r.y = 6.2;
        }
        this._dummy.position.set(r.x, r.y, r.z);
        this._dummy.rotation.set(0, 0, -0.12);
        this._dummy.scale.setScalar(1);
        this._dummy.updateMatrix();
        this.rainInstanced.setMatrixAt(i, this._dummy.matrix);
      }
      this.rainInstanced.instanceMatrix.needsUpdate = true;
    }

    // 12. Cursor-Reactive Hanging Glowing Bulb, Soft Counter Light Pool & Parallax Street Scene
    const targetBulbSwingZ = this.pointerNormalized.x * 0.22 + Math.sin(elapsed * 1.6) * 0.04;
    const targetBulbSwingX = -this.pointerNormalized.y * 0.14;
    this.bulbAssemblyGroup.rotation.z = THREE.MathUtils.lerp(
      this.bulbAssemblyGroup.rotation.z,
      targetBulbSwingZ,
      dampFactor,
    );
    this.bulbAssemblyGroup.rotation.x = THREE.MathUtils.lerp(
      this.bulbAssemblyGroup.rotation.x,
      targetBulbSwingX,
      dampFactor,
    );
    this.festivalLight.position.x = THREE.MathUtils.lerp(
      this.festivalLight.position.x,
      this.pointerNormalized.x * 1.65,
      dampFactor,
    );
    this.festivalLight.position.z = THREE.MathUtils.lerp(
      this.festivalLight.position.z,
      0.32 + this.pointerNormalized.y * 0.45,
      dampFactor,
    );
    this.bulbCounterPoolMesh.position.x = THREE.MathUtils.lerp(
      this.bulbCounterPoolMesh.position.x,
      this.pointerNormalized.x * 1.15,
      dampFactor,
    );
    this.bulbCounterPoolMesh.position.z = THREE.MathUtils.lerp(
      this.bulbCounterPoolMesh.position.z,
      0.32 - this.pointerNormalized.y * 0.25,
      dampFactor,
    );

    // Multilayered Parallax Street Shift
    this.parallaxFarGroup.position.x = THREE.MathUtils.lerp(
      this.parallaxFarGroup.position.x,
      -this.pointerNormalized.x * 0.65,
      dampFactor,
    );
    this.parallaxMidGroup.position.x = THREE.MathUtils.lerp(
      this.parallaxMidGroup.position.x,
      -this.pointerNormalized.x * 0.32,
      dampFactor,
    );

    // Wipe Cloth Scrub Animation on Spill Puddle
    if (this.wipeAnimTimer > 0) {
      this.wipeAnimTimer = Math.max(0, this.wipeAnimTimer - simDt);
      this.wipeClothGroup.position.x = Math.sin(elapsed * 28) * 0.38;
      if (this.wipeAnimTimer <= 0) {
        this.spillPuddleGroup.visible = false;
      }
    } else if (this.spillPuddleGroup.visible) {
      const pulse = 1 + Math.sin(elapsed * 4.5) * 0.04;
      this.spillPuddleGroup.scale.set(pulse, 1, pulse);
      this.wipeClothGroup.position.x = -0.35 + Math.sin(elapsed * 3.5) * 0.05;
    }

    // Floating Golden Dust Motes in the Warm Bulb Beam
    for (let i = 0; i < this.dustMoteCount; i++) {
      const m = this.dustMotes[i];
      const dy = m.y + Math.sin(elapsed * m.speed + m.phase) * 0.18;
      const dx = m.x + Math.cos(elapsed * m.speed * 0.8 + m.phase) * 0.14;
      this._dummy.position.set(dx, dy, m.z);
      this._dummy.rotation.set(0, 0, 0);
      this._dummy.scale.setScalar(0.75 + Math.sin(elapsed * 2.2 + m.phase) * 0.35);
      this._dummy.updateMatrix();
      this.dustMoteInstanced.setMatrixAt(i, this._dummy.matrix);
    }
    this.dustMoteInstanced.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    window.visualViewport?.removeEventListener('resize', this.handleResize);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
