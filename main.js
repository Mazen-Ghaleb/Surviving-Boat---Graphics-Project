import * as THREE from 'https://cdn.skypack.dev/three';
import Stats from 'https://cdn.skypack.dev/three/examples/jsm/libs/stats.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'https://cdn.skypack.dev/three/examples/jsm/objects/Water.js';
import { Sky } from 'https://cdn.skypack.dev/three/examples/jsm/objects/Sky.js';
import { GUI } from 'https://cdn.skypack.dev/three/examples/jsm/libs/lil-gui.module.min.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';
import { LightningStrike } from 'https://cdn.skypack.dev/three/examples/jsm/geometries/LightningStrike.js';
import { LightningStorm } from 'https://cdn.skypack.dev/three/examples/jsm/objects/LightningStorm.js';
import { EffectComposer } from 'https://cdn.skypack.dev/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'https://cdn.skypack.dev/three/examples/jsm/postprocessing/OutlinePass.js';
import { VRButton } from 'https://cdn.skypack.dev/three/examples/jsm/webxr/VRButton.js';

// import * as THREE from 'three';
// import Stats from 'three/examples/jsm/libs/stats.module.js';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// import { Water } from 'three/examples/jsm/objects/Water.js';
// import { Sky } from 'three/examples/jsm/objects/Sky.js';
// import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// import { LightningStrike } from 'three/examples/jsm/geometries/LightningStrike.js';
// import { LightningStorm } from 'three/examples/jsm/objects/LightningStorm.js';
// import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
// import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
// import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

let container, stats;
let camera, scene, renderer, composer;
let controls, water, mesh;
let ambient, directionalLight;

var controller;
var main_scene;

let cloud,
  cloudsList = [];
let flash;

const loader = new GLTFLoader();

let currentSceneIndex = 0;

let currentTime = 0;

const sceneCreators = [createStormScene];

const clock = new THREE.Clock();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

const cloudCount = 500;
const SCALE = 10000;

function animateClouds(cloudsList) {
  cloudsList.forEach((cloud) => {
    cloud.position.x += 1;
    cloud.position.z -= 1;
    if (cloud.position.x > SCALE / 2) {
      cloud.position.x = -SCALE / 2;
    }
    if (cloud.position.z < -SCALE / 2) {
      cloud.position.z = SCALE / 2;
    }
  });
}

function animateFlash() {
  if (Math.random() > 0.5) {
    if (Math.random() > 0.5 || flash.power > 500) {
      if (flash.power < 100) flash.position.set(Math.random() * SCALE - SCALE / 2, 0, Math.random() * SCALE - SCALE / 2);
      flash.power = 50 + Math.random() * 1000;
    }
  }
}

function cameraPositionLimit() {
  if (camera.position.x > SCALE / 2) {
    camera.position.x = SCALE / 2;
  }

  if (camera.position.x < -SCALE / 2) {
    camera.position.x = -SCALE / 2;
  }

  if (camera.position.z > SCALE / 2) {
    camera.position.z = SCALE / 2;
  }

  if (camera.position.z < -SCALE / 2) {
    camera.position.z = -SCALE / 2;
  }

  if (camera.position.y < 0) {
    camera.position.z = 0;
  }
}

class Boat {
  constructor() {
    loader.load('assets/boat/scene.gltf', (gltf) => {
      scene.add(gltf.scene);
      gltf.scene.scale.set(3, 3, 3);
      gltf.scene.position.set(5, 13, 50);
      gltf.scene.rotation.y = 1.5;

      this.boat = gltf.scene;
      this.speed = {
        vel: 0,
        rot: 0,
      };
    });
  }

  stop() {
    this.speed.vel = 0;
    this.speed.rot = 0;
  }

  update() {
    if (this.boat) {
      this.boat.rotation.y += this.speed.rot;
      this.boat.translateX(this.speed.vel);
    }
  }
}
const boat = new Boat();

init();
animate();

function init() {
  container = document.getElementById('container');

  //Renderer
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);
  composer = new EffectComposer(renderer);

  //Scene
  createScene();

  //Camera
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(30, 30, 100);

  loadGLTF();

  // Moon light
  ambient = new THREE.AmbientLight(0x555555);
  scene.add(ambient);
  directionalLight = new THREE.DirectionalLight(0xffeedd);
  directionalLight.position.set(0, 0, 1);
  scene.add(directionalLight);

  // Clouds
  const cloudLoader = new GLTFLoader();
  cloudLoader.load('./models/scene.gltf', function (cloud) {
    for (let p = 0; p < cloudCount; p++) {
      let currCloud = cloud.scene.clone().children[0];

      currCloud.position.x = Math.random() * SCALE - SCALE / 2;
      currCloud.position.y = 2000 + Math.random() * 1500 - 500;
      currCloud.position.z = Math.random() * SCALE - SCALE / 2;

      const scaleMultiplier = Math.random();
      currCloud.scale.setX(2 + 2 * scaleMultiplier);
      currCloud.scale.setY(2 + 2 * scaleMultiplier);
      currCloud.scale.setZ(0.5);

      scene.add(currCloud);

      cloudsList.push(currCloud);
    }
  });

  // Flash
  flash = new THREE.PointLight(0x062d89, 30, SCALE / 2, 0.1);
  flash.position.set(0, SCALE / 2, 0);
  scene.add(flash);

  // Water
  const waterGeometry = new THREE.PlaneGeometry(SCALE, SCALE);

  water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('assets/waternormals.jpg', function (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x004a7e,
    distortionScale: 3.7,
    fog: scene.fog !== undefined,
  });

  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  const parameters = {
    Sound: true,
    VR: true,
    elevation: 2,
    azimuth: 180,
  };

  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  function updateSound() {}

  const geometry = new THREE.BoxGeometry(0, 0, 0);
  const material = new THREE.MeshStandardMaterial({ roughness: 0 });
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  //Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = (1.5 * Math.PI) / 2;
  controls.target.set(0, 10, 0);
  controls.minDistance = 40.0;
  controls.maxDistance = 200.0;
  controls.update();

  //
  const waterUniforms = water.material.uniforms;
  stats = new Stats();
  container.appendChild(stats.dom);

  // GUI
  const gui = new GUI();

  const folderSettings = gui.addFolder('Settings');
  folderSettings.add(parameters, 'Sound').onChange(updateSound);
  folderSettings.open();

  const folderWater = gui.addFolder('Water');
  folderWater.add(waterUniforms.distortionScale, 'value', 0, 8, 0.1).name('distortionScale');
  folderWater.add(waterUniforms.size, 'value', 0.1, 10, 0.1).name('size');
  folderWater.open();

  window.addEventListener('resize', onWindowResize);

  function onSelectStart() {
    // Add code for when user presses their controller
  }

  function onSelectEnd() {
    // Add code for when user releases the button on their controller
  }

  controller = renderer.xr.getController(0);
  controller.addEventListener('selectstart', onSelectStart);
  controller.addEventListener('selectend', onSelectEnd);
  controller.addEventListener('connected', function (event) {});

  controller.addEventListener('disconnected', function () {});
  //controller.position.y += 5;
  camera.add(controller);

  window.addEventListener('resize', onWindowResize, false);

  document.body.appendChild(VRButton.createButton(renderer));

  // ------------ Music Init --------- //

  window.addEventListener('input', () => {
    // noinspection JSUnresolvedVariable
    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'soundeffects/thunder.mp3');
    xhr.responseType = 'arraybuffer';
    xhr.addEventListener('load', () => {
      let playsound = (audioBuffer) => {
        let source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.loop = false;
        source.start();

        setTimeout(function () {
          playsound(audioBuffer);
        }, 1000 + Math.random() * 2500);
      };

      audioCtx.decodeAudioData(xhr.response).then(playsound);
    });
    xhr.send();
  });

  window.addEventListener('load', () => {
    // noinspection JSUnresolvedVariable
    let audioCtx2 = new (window.AudioContext || window.webkitAudioContext)();
    let xhr2 = new XMLHttpRequest();
    xhr2.open('GET', 'soundeffects/waves.mp3');
    xhr2.responseType = 'arraybuffer';
    xhr2.addEventListener('load', () => {
      let playsound2 = (audioBuffer) => {
        let source2 = audioCtx2.createBufferSource();
        source2.buffer = audioBuffer;
        source2.connect(audioCtx2.destination);
        source2.loop = false;
        source2.start();

        setTimeout(function () {
          playsound2(audioBuffer);
        }, 1000 + Math.random() * 2500);
      };

      audioCtx2.decodeAudioData(xhr2.response).then(playsound2);
    });
    xhr2.send();
  });

  window.addEventListener('load', () => {
    // noinspection JSUnresolvedVariable
    let audioCtx3 = new (window.AudioContext || window.webkitAudioContext)();
    let xhr3 = new XMLHttpRequest();
    xhr3.open('GET', 'soundeffects/wind.wav');
    xhr3.responseType = 'arraybuffer';
    xhr3.addEventListener('load', () => {
      let playsound3 = (audioBuffer) => {
        let source3 = audioCtx3.createBufferSource();
        source3.buffer = audioBuffer;
        source3.connect(audioCtx3.destination);
        source3.loop = false;
        source3.start();

        setTimeout(function () {
          playsound3(audioBuffer);
        }, 1000 + Math.random() * 2500);
      };

      audioCtx3.decodeAudioData(xhr3.response).then(playsound3);
    });
    xhr3.send();
  });

  // Boat moving
  window.addEventListener('keydown', function (e) {
    if (e.key == 'ArrowUp') {
      boat.speed.vel = 1;
    }
    if (e.key == 'ArrowDown') {
      boat.speed.vel = -1;
    }
    if (e.key == 'ArrowRight') {
      boat.speed.rot = -0.1;
    }
    if (e.key == 'ArrowLeft') {
      boat.speed.rot = 0.1;
    }
  });
  window.addEventListener('keyup', function (e) {
    boat.stop();
  });
}

function createScene() {
  scene = sceneCreators[currentSceneIndex]();
  scene.fog = new THREE.FogExp2(0x11111f, 0.0004);
  renderer.setClearColor(scene.fog.color);
  scene.userData.timeRate = 1;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  render();
  animateClouds(cloudsList);
  animateFlash();
  boat.update();
  stats.update();
}

function render() {
  cameraPositionLimit();
  const time = performance.now() * 0.001;

  mesh.position.y = Math.sin(time) * 20 + 5;
  mesh.rotation.x = time * 0.5;
  mesh.rotation.z = time * 0.51;

  water.material.uniforms['time'].value += 1.0 / 60.0;

  renderer.render(scene, camera);

  currentTime += scene.userData.timeRate * clock.getDelta();
  if (currentTime < 0) {
    currentTime = 0;
  }
  scene.userData.render(currentTime);
}

function loadGLTF() {
  let loader = new GLTFLoader();

  loader.load('assets/island.gltf', (gltf) => {
    main_scene = gltf.scene;
    main_scene.scale.set(7, 7, 7);
    scene.add(main_scene);
    main_scene.position.x = -500;
    main_scene.position.y = 0;
    main_scene.position.z = 100;
    main_scene.rotation.z = -1.2;
    main_scene.rotation.x = -1.55;
  });
}

function createStormScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  scene.userData.canGoBackwardsInTime = false;

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000);
  camera.position.set(30, 30, 100);
  // Lights

  scene.add(new THREE.AmbientLight(0x444444));

  const light1 = new THREE.DirectionalLight(0xffffff, 0.5);
  light1.position.set(1, 1, 1);
  scene.add(light1);

  const posLight = new THREE.PointLight(0x00ffff);
  posLight.position.set(0, 100, 0);
  scene.add(posLight);

  // Ground

  const GROUND_SIZE = 1000;

  // Storm

  scene.userData.lightningColor = new THREE.Color(0xb0ffff);
  scene.userData.outlineColor = new THREE.Color(0x00ffff);

  scene.userData.lightningMaterial = new THREE.MeshBasicMaterial({ color: scene.userData.lightningColor });

  const rayDirection = new THREE.Vector3(0, -1, 0);
  let rayLength = 0;
  const vec1 = new THREE.Vector3();
  const vec2 = new THREE.Vector3();

  scene.userData.rayParams = {
    radius0: 1,
    radius1: 0.5,
    minRadius: 0.3,
    maxIterations: 7,

    timeScale: 0.15,
    propagationTimeFactor: 0.2,
    vanishingTimeFactor: 0.9,
    subrayPeriod: 4,
    subrayDutyCycle: 0.6,

    maxSubrayRecursion: 3,
    ramification: 3,
    recursionProbability: 0.4,

    roughness: 0.85,
    straightness: 0.65,

    onSubrayCreation: function (segment, parentSubray, childSubray, lightningStrike) {
      lightningStrike.subrayConePosition(segment, parentSubray, childSubray, 0.6, 0.6, 0.5);

      // Plane projection

      rayLength = lightningStrike.rayParameters.sourceOffset.y;
      vec1.subVectors(childSubray.pos1, lightningStrike.rayParameters.sourceOffset);
      const proj = rayDirection.dot(vec1);
      vec2.copy(rayDirection).multiplyScalar(proj);
      vec1.sub(vec2);
      const scale = proj / rayLength > 0.5 ? rayLength / proj : 1;
      vec2.multiplyScalar(scale);
      vec1.add(vec2);
      childSubray.pos1.addVectors(vec1, lightningStrike.rayParameters.sourceOffset);
    },
  };

  const storm = new LightningStorm({
    size: GROUND_SIZE,
    minHeight: 2000,
    maxHeight: 3000,
    maxSlope: 0.6,
    maxLightnings: 8,

    lightningParameters: scene.userData.rayParams,

    lightningMaterial: scene.userData.lightningMaterial,
  });

  scene.add(storm);

  // Compose rendering

  composer.passes = [];
  composer.addPass(new RenderPass(scene, camera));

  // Light Controls

  const Lightcontrols = new OrbitControls(camera, renderer.domElement);
  Lightcontrols.target.y = GROUND_SIZE * 0.05;
  Lightcontrols.enableDamping = true;
  Lightcontrols.dampingFactor = 0.05;

  scene.userData.render = function (time) {
    storm.update(time);

    Lightcontrols.update();

    if (scene.userData.outlineEnabled) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  };

  return scene;
}
