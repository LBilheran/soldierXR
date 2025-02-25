"use strict";

// Import only what you need, to help your bundler optimize final code size using tree shaking
// see https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)

import * as THREE from 'three';

// XR Emulator
import { DevUI } from '@iwer/devui';
import { XRDevice, metaQuest3 } from 'iwer';

// XR
import { XRButton } from 'three/addons/webxr/XRButton.js';

// If you prefer to import the whole library, with the THREE prefix, use the following line instead:
// import * as THREE from 'three'

// NOTE: three/addons alias is supported by Rollup: you can use it interchangeably with three/examples/jsm/  

// Importing Ammo can be tricky.
// Vite supports webassembly: https://vitejs.dev/guide/features.html#webassembly
// so in theory this should work:
//
// import ammoinit from 'three/addons/libs/ammo.wasm.js?init';
// ammoinit().then((AmmoLib) => {
//  Ammo = AmmoLib.exports.Ammo()
// })
//
// But the Ammo lib bundled with the THREE js examples does not seem to export modules properly.
// A solution is to treat this library as a standalone file and copy it using 'vite-plugin-static-copy'.
// See vite.config.js
// 
// Consider using alternatives like Oimo or cannon-es
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';


// Example of hard link to official repo for data, if needed
// const MODEL_PATH = 'https://raw.githubusercontent.com/mrdoob/three.js/r173/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb';

async function setupXR(xrMode) {

  if (xrMode !== 'immersive-vr') return;

  // iwer setup: emulate vr session
  let nativeWebXRSupport = false;
  if (navigator.xr) {
    nativeWebXRSupport = await navigator.xr.isSessionSupported(xrMode);
  }

  if (!nativeWebXRSupport) {
    const xrDevice = new XRDevice(metaQuest3);
    xrDevice.installRuntime();
    xrDevice.fovy = (75 / 180) * Math.PI;
    xrDevice.ipd = 0;
    window.xrdevice = xrDevice;
    xrDevice.controllers.right.position.set(0.15649, 1.43474, -0.38368);
    xrDevice.controllers.right.quaternion.set(
      0.14766305685043335,
      0.02471366710960865,
      -0.0037767395842820406,
      0.9887216687202454,
    );
    xrDevice.controllers.left.position.set(-0.15649, 1.43474, -0.38368);
    xrDevice.controllers.left.quaternion.set(
      0.14766305685043335,
      0.02471366710960865,
      -0.0037767395842820406,
      0.9887216687202454,
    );
    new DevUI(xrDevice);
  }
}

await setupXR('immersive-ar');


let camera, scene, renderer;
let controller;


const clock = new THREE.Clock();

let objectM = new THREE.Group();
let mixersM = [];

let minRadius = 2;
let maxRadius = 10;

const init = () => {
  scene = new THREE.Scene();
  scene.add(objectM);

    // Ajout d'un cercle blanc au sol
    const minRadius = 1; // Assure-toi d'utiliser la même valeur que dans loadEnnemy()
    const circleGeometry = new THREE.CircleGeometry(minRadius, 64);
    const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    
    circle.rotation.x = -Math.PI / 2; // Place le cercle à plat
    circle.position.y = 0.01; // Légèrement au-dessus du sol pour éviter le clipping
    
    scene.add(circle);
  

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10); // meters
  camera.position.set(0, 1.6, 3);

  const light = new THREE.AmbientLight(0xffffff, 1.0); // soft white light
  scene.add(light);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
  hemiLight.position.set(0.5, 1, 0.25);
  scene.add(hemiLight);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate); // requestAnimationFrame() replacement, compatible with XR 
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  /*
  document.body.appendChild( XRButton.createButton( renderer, {
    'optionalFeatures': [ 'depth-sensing' ],
    'depthSensing': { 'usagePreference': [ 'gpu-optimized' ], 'dataFormatPreference': [] }
  } ) );
*/

  const xrButton = XRButton.createButton(renderer, {});
  xrButton.style.backgroundColor = 'skyblue';
  document.body.appendChild(xrButton);

  const controls = new OrbitControls(camera, renderer.domElement);
  //controls.listenToKeyEvents(window); // optional
  controls.target.set(0, 1.6, 0);
  controls.update();

  // Handle input: see THREE.js webxr_ar_cones

  const geometry = new THREE.CylinderGeometry(0, 0.05, 0.2, 32).rotateX(Math.PI / 2);

  const onSelect = (event) => {

    const material = new THREE.MeshPhongMaterial({ color: 0xffffff * Math.random() });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, - 0.3).applyMatrix4(controller.matrixWorld);
    mesh.quaternion.setFromRotationMatrix(controller.matrixWorld);
    scene.add(mesh);

  }

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);


  window.addEventListener('resize', onWindowResize, false);

}

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

// Main loop
const animate = () => {

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (mixersM) mixersM.forEach(mixer => mixer.update(delta));

  // can be used in shaders: uniforms.u_time.value = elapsed;

  renderer.render(scene, camera);
};

init();

//

function loadEnnemy(url, count) {

  const loader = new GLTFLoader();
  loader.load(url, function (gltf) {
      console.log("GLTF chargé :", gltf);

      for (let i = 0; i < count; i++) {

          // Génère une position aléatoire dans l'anneau défini par [minRadius, maxRadius]
          const angle = Math.random() * Math.PI * 2; // Angle aléatoire
          const distance = Math.random() * (maxRadius - minRadius) + minRadius; // Distance entre min et max
          const posX = Math.cos(angle) * distance;
          const posZ = Math.sin(angle) * distance;
          const posY = 0; // Toujours au niveau du sol

          // Clone avec animations
          const clone = SkeletonUtils.clone(gltf.scene);
          scene.add(clone);

          // Applique la position aléatoire dans l'anneau
          clone.position.set(posX, posY, posZ);

          // Ajoute une légère rotation aléatoire pour varier l'apparence
          clone.rotation.y = Math.random() * Math.PI * 2;

          // Gère l'animation si disponible
          if (gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(clone);
              const action = mixer.clipAction(gltf.animations[0]);
              action.play();
              mixersM.push(mixer);
          }

          objectM.add(clone);
      }
  });
}

loadEnnemy('assets/models/Michelle.glb', 20);