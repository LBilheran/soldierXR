"use strict";

import * as THREE from 'three';

// XR Emulator
import { DevUI } from '@iwer/devui';
import { XRDevice, metaQuest3 } from 'iwer';

// XR
import { XRButton } from 'three/addons/webxr/XRButton.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';


// XR setup
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


// Initalisation
let camera, scene, renderer;
let controller;

const clock = new THREE.Clock();

let objectM = new THREE.Group();
let objectR = new THREE.Group();

let attackingRobots = [];
let deadRobots = [];

let closeMichelles = [];
let farMichelles = [];

let circleMesh;
let gameOverText = null;
let nextWaveText = null;

let bullets = [];
const bulletSpeed = 0.1;
const maxBulletDistance = 10;

let minRadius = 1;
let maxRadius = 10;

let wave = 1;
let playerHPmax = 5; 
let playerHP = playerHPmax;
let nbrRobot = wave;

let gameOver = false;
let next = false;

const music = new Audio('assets/audio/music_AoW.mp3');

const init = () => {
  scene = new THREE.Scene();
  scene.add(objectM);
  scene.add(objectR);

  const circleGeometry = new THREE.CircleGeometry(minRadius, 64);
  const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
  circleMesh = new THREE.Mesh(circleGeometry, circleMaterial);
  circleMesh.rotation.x = -Math.PI / 2;
  circleMesh.position.y = 0.01;
  scene.add(circleMesh);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10); // meters
  camera.position.set(0, 1.6, 3);

  const light = new THREE.AmbientLight(0xffffff, 1.0); // soft white light
  scene.add(light);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
  hemiLight.position.set(0.5, 1, 0.25);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
  dirLight.position.set(5, 10, 5);
  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -10;
  dirLight.shadow.camera.right = 10;
  dirLight.shadow.camera.top = 10;
  dirLight.shadow.camera.bottom = -10;

  scene.add(dirLight);

  const planeGeometry = new THREE.PlaneGeometry(10, 10);
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });

  const shadowPlane = new THREE.Mesh(planeGeometry, shadowMaterial);
  shadowPlane.rotation.x = -Math.PI / 2; // À plat sur le sol
  shadowPlane.position.y = 0.02; // Juste au-dessus du sol pour éviter les bugs

  shadowPlane.receiveShadow = true; // Active la réception d'ombres
  scene.add(shadowPlane);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate); // requestAnimationFrame() replacement, compatible with XR 
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const xrButton = XRButton.createButton(renderer, {});
  xrButton.style.backgroundColor = 'skyblue';
  document.body.appendChild(xrButton);
  xrButton.addEventListener('click', () => {
    music.play();
  });


  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.6, 0);
  controls.update();

  controller = renderer.xr.getController(0);
  scene.add(controller);

  setupEventListeners();

  window.addEventListener('resize', onWindowResize, false);
}


// EventsListeners
function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}

function setupEventListeners() {
  // Clic souris (pour desktop)
  window.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // Clic gauche
          shootBullet();
      }
  });

  // Sélection AR (pour mobile et casque VR)
  controller.addEventListener('select', shootBullet);
}


// Load models
function loadMichelle(url, closeCount, maxRadiusMichelle = minRadius - 0.2) {

  const loader = new GLTFLoader();
  loader.load(url, function (gltf) {

      // Close Michelle
      for (let i = 0; i < closeCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * maxRadiusMichelle;
          const posX = Math.cos(angle) * distance;
          const posZ = Math.sin(angle) * distance;
          const posY = 0;

          const clone = SkeletonUtils.clone(gltf.scene);
          clone.scale.set(0.5, 0.5, 0.5);
          clone.position.set(posX, posY, posZ);
          clone.rotation.y = Math.random() * Math.PI * 2;

          const mixer = new THREE.AnimationMixer(clone);
          clone.userData.mixer = mixer;
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();

          closeMichelles.push(clone);
          scene.add(clone);
          objectM.add(clone);
      }

      window.closeMichelles = closeMichelles;
  });
}

function loadFarMichelle(url, farCount, minRadiusMichelle = minRadius + 3) {

  const loader = new GLTFLoader();
  loader.load(url, function (gltf) {

      // Far Michelle
      for (let i = 0; i < farCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * (maxRadius - minRadiusMichelle) + minRadiusMichelle;
          const posX = Math.cos(angle) * distance;
          const posZ = Math.sin(angle) * distance;
          const posY = 0;

          const clone = SkeletonUtils.clone(gltf.scene);
          clone.scale.set(0.5, 0.5, 0.5);
          clone.position.set(posX, posY, posZ);
          clone.rotation.y = Math.random() * Math.PI * 2;

          const mixer = new THREE.AnimationMixer(clone);
          clone.userData.mixer = mixer;
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();

          farMichelles.push(clone);
          scene.add(clone);
          objectM.add(clone);
      }

      window.farMichelles = farMichelles;
  });
}

loadMichelle('assets/models/Michelle.glb', playerHP);
loadFarMichelle('assets/models/Michelle.glb', 5);

function loadRobot(url, count) {

  const loader = new GLTFLoader();
  loader.load(url, function (gltf) {

      const minRadiusRobot = minRadius + 2;
      for (let i = 0; i < count; i++) {

          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * (maxRadius - minRadiusRobot) + minRadiusRobot;
          const posX = Math.cos(angle) * distance;
          const posZ = Math.sin(angle) * distance;
          const posY = 0;

          const clone = SkeletonUtils.clone(gltf.scene);
          scene.add(clone);

          clone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
          });

          clone.scale.set(0.3, 0.3, 0.3);
          clone.position.set(posX, posY, posZ);
          clone.lookAt(new THREE.Vector3(0, clone.position.y, 0));

          clone.userData.boundingBox = new THREE.Box3().setFromObject(clone);

          const mixer = new THREE.AnimationMixer(clone);
          clone.userData.mixer = mixer;
          clone.userData.animations = gltf.animations;
          const action = mixer.clipAction(clone.userData.animations[6]);
          action.play();

          objectR.add(clone);
      }
  });
}

loadRobot('assets/models/RobotExpressive.glb', nbrRobot);

function shootBullet() {
  const bulletGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  bullet.position.copy(camera.position);

  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  bullets.push({ mesh: bullet, direction, traveledDistance: 0 });

  scene.add(bullet);
}


// Animation and Interaction
const animate = () => {

  const delta = clock.getDelta();

  objectM.children.forEach(michelle => {
    if (michelle.userData.mixer) {
      michelle.userData.mixer.update(delta);
    }
  });
  objectR.children.forEach(robot => {
    if (robot.userData.mixer) {
      robot.userData.mixer.update(delta);
    }
  });  
  
  updateBullets();
  updateEnemies();
  updateFarMichelles();

  if (attackingRobots.length > 0) {
    if (circleMesh) {
      circleMesh.material.color.set(0xff0000);
    };

  } else {
    if (circleMesh) {
      circleMesh.material.color.set(0xffffff);
    }
   }

  if (nbrRobot <= 0 && !next) {
    next = true;
    displayNextWave3D(nextWave);
  }

  if (playerHP == 0 && !gameOver) {  
    gameOver = true;  
    displayGameOver3D();
    setTimeout(resetGame, 5000);
  }

  renderer.render(scene, camera);
};


function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];

    bullet.mesh.position.addScaledVector(bullet.direction, bulletSpeed);
    bullet.traveledDistance += bulletSpeed;

    if (bullet.traveledDistance > maxBulletDistance) {
        scene.remove(bullet.mesh);
        bullets.splice(i, 1);
        continue;
    }

    let bulletBox = new THREE.Box3().setFromObject(bullet.mesh);

    for (let j = objectR.children.length - 1; j >= 0; j--) {
      let enemy = objectR.children[j];
  
      enemy.userData.boundingBox.setFromObject(enemy);
      
      if (bulletBox.intersectsBox(enemy.userData.boundingBox) && !deadRobots.includes(enemy)) {
        scene.remove(bullet.mesh);
        bullets.splice(i, 1);
    
        attackingRobots = attackingRobots.filter(r => r !== enemy);
    
        const deathAudio = new Audio('assets/audio/Lego_Destroy.mp3');
        deathAudio.play();

        switchAnimation(enemy, 1);
        deadRobots.push(enemy);
    
        const action = enemy.userData.mixer.clipAction(enemy.userData.animations[1]);
        const animationDuration = action.getClip().duration;
    
        setTimeout(() => {
          objectR.remove(enemy);
          scene.remove(enemy);
          deadRobots = deadRobots.filter(r => r !== enemy);
          nbrRobot -= 1;
        }, animationDuration * 1000);
      }      
    }
  }
}


function updateEnemies() {
  for (let i = objectR.children.length - 1; i >= 0; i--) {
      let enemy = objectR.children[i];

      if (attackingRobots.includes(enemy) || deadRobots.includes(enemy)) continue;

      const direction = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), enemy.position).normalize();
      enemy.position.addScaledVector(direction, 0.02);

      if (enemy.position.length() <= minRadius + 0.5) {
          switchAnimation(enemy, 5);
          attackingRobots.push(enemy);
      }
  }
}

function updateFarMichelles() {
  const playerPosition = camera.position.clone();
  const maxRadiusMichelle = minRadius - 0.2;
  for (let i = farMichelles.length - 1; i >= 0; i--) {
      let michelle = farMichelles[i];
      let distanceToPlayer = michelle.position.distanceTo(playerPosition);

      if (distanceToPlayer < 0.8) {
          farMichelles.splice(i, 1);

          // Position in the base circle
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * maxRadiusMichelle;
          const posX = Math.cos(angle) * distance;
          const posZ = Math.sin(angle) * distance;
          const posY = 0;

          michelle.position.set(posX, posY, posZ);

          closeMichelles.push(michelle);

          playerHP++;
          console.log(`+1 PV ! Nouveau PV: ${playerHP}`);

          const Up1Audio = new Audio('assets/audio/mario_1up.mp3');
          Up1Audio.play();

          break;
      }
  }
}


function switchAnimation(model, anim) {
  if (model.userData.mixer) {
      model.userData.mixer.stopAllAction();

      const action = model.userData.mixer.clipAction(model.userData.animations[anim]);
      action.play();
  }
}

function damagePlayer() {
  if (attackingRobots.length > 0) {

      playerHP--;
      console.log(`PV restants: ${playerHP}`);

      if (closeMichelles.length > 0) {
          let michelle = closeMichelles.pop();
          scene.remove(michelle);
          objectM.remove(michelle);
      }
  }
}


setInterval(damagePlayer, 2000);

function displayGameOver3D() {
  const loader = new TTFLoader();
  loader.load('assets/texte/kenpixel.ttf', (json) => { 
      const fontLoader = new FontLoader();
      const font = fontLoader.parse(json);

      const textGeo = new TextGeometry('GAME OVER', {
        font: font,
        size: 0.1,
        depth: 0.02,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.005,
        bevelSize: 0.002,
        bevelOffset: 0,
        bevelSegments: 3
      });

      textGeo.computeBoundingBox();
      textGeo.computeVertexNormals();

      const textMaterial = new THREE.MeshPhongMaterial({ color: 0xff7000, flatShading: true });
      const textMesh = new THREE.Mesh(textGeo, textMaterial);

      const boundingBox = textGeo.boundingBox;
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      textGeo.translate(-center.x, -center.y, -center.z);

      const cameraPosition = camera.position.clone();
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);

      const startHeight = 2;
      textMesh.position.copy(cameraPosition).add(direction.multiplyScalar(1.5));
      textMesh.position.y += startHeight;

      textMesh.quaternion.copy(camera.quaternion);

      scene.add(textMesh);

      gameOverText = textMesh;

      let velocity = 0.02;
      function animateText() {
          const targetY = cameraPosition.y;
          if (textMesh.position.y > targetY) {
              textMesh.position.y -= velocity;
              velocity += 0.001;
              requestAnimationFrame(animateText);
          } else {
              textMesh.position.y = targetY;
          }
      }
      animateText();
  });
}

function displayNextWave3D(callback) {
  const loader = new TTFLoader();
  loader.load('assets/texte/kenpixel.ttf', (json) => { 
      const fontLoader = new FontLoader();
      const font = fontLoader.parse(json);

      let countdown = 3;
      
      // ✅ Crée la géométrie initiale
      let textGeo = new TextGeometry(`Next Wave in : ${countdown}`, {
          font: font,
          size: 0.1,
          depth: 0.02,
          curveSegments: 12,
          bevelEnabled: true,
          bevelThickness: 0.005,
          bevelSize: 0.002,
          bevelOffset: 0,
          bevelSegments: 3
      });

      textGeo.computeBoundingBox();
      textGeo.computeVertexNormals();

      const textMaterial = new THREE.MeshPhongMaterial({ color: 0xff7000, flatShading: true });
      let textMesh = new THREE.Mesh(textGeo, textMaterial);

      // ✅ Centre le texte par rapport à lui-même
      const boundingBox = textGeo.boundingBox;
      const center = new THREE.Vector3();
      boundingBox.getCenter(center);
      textGeo.translate(-center.x, -center.y, -center.z);

      // ✅ Positionner le texte devant la caméra UNE SEULE FOIS
      const cameraPosition = camera.position.clone();
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      textMesh.position.copy(cameraPosition).add(direction.multiplyScalar(1.5));
      textMesh.quaternion.copy(camera.quaternion); // ✅ Garde la même orientation que la caméra

      scene.add(textMesh);
      nextWaveText = textMesh; // ✅ Stocke le texte pour mise à jour

      // ✅ Mise à jour du texte chaque seconde (sans repositionner)
      const interval = setInterval(() => {
          countdown--;

          if (countdown > 0) {
              // ✅ Supprime seulement la géométrie et met à jour le texte
              scene.remove(nextWaveText);
              textGeo.dispose();

              textGeo = new TextGeometry(`Next Wave in : ${countdown}`, {
                  font: font,
                  size: 0.1,
                  depth: 0.02,
                  curveSegments: 12,
                  bevelEnabled: true,
                  bevelThickness: 0.005,
                  bevelSize: 0.002,
                  bevelOffset: 0,
                  bevelSegments: 3
              });

              textGeo.computeBoundingBox();
              textGeo.computeVertexNormals();
              textGeo.translate(-center.x, -center.y, -center.z);

              nextWaveText = new THREE.Mesh(textGeo, textMaterial);
              nextWaveText.position.copy(textMesh.position);
              nextWaveText.quaternion.copy(textMesh.quaternion);

              scene.add(nextWaveText);
          } else {
              clearInterval(interval);
              scene.remove(nextWaveText);
              nextWaveText.geometry.dispose();
              nextWaveText.material.dispose();
              nextWaveText = null;

              if (callback) callback();
          }
      }, 1000);
  });
}


// Update Game
function nextWave() {
  wave++
  nbrRobot = wave;

  next = false;

  objectR.children.forEach(enemy => scene.remove(enemy));
  objectR.children = [];
  attackingRobots = [];
  deadRobots = [];

  loadRobot('assets/models/RobotExpressive.glb', nbrRobot);
}

function resetGame() {  
  wave = 1;
  playerHP = playerHPmax;
  nbrRobot = wave;

  gameOver = false;

  objectM.children.forEach(enemy => scene.remove(enemy));
  objectM.children = [];
  objectR.children.forEach(enemy => scene.remove(enemy));
  objectR.children = [];
  attackingRobots = [];
  deadRobots = [];

  if (gameOverText) {
    scene.remove(gameOverText);
    gameOverText.geometry.dispose();
    gameOverText.material.dispose();
    gameOverText = null;
  }

  loadMichelle('assets/models/Michelle.glb', playerHP);
  loadRobot('assets/models/RobotExpressive.glb', nbrRobot);
}

init();