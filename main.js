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
let objectR = new THREE.Group();

let attackingRobots = [];
let deadRobots = [];

let circleMesh;

let bullets = [];
const bulletSpeed = 0.1;
const maxBulletDistance = 10;

let minRadius = 1;
let maxRadius = 10;

let playerHP = 5;

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

  controller = renderer.xr.getController(0);
  scene.add(controller);

  setupEventListeners();

  window.addEventListener('resize', onWindowResize, false);

}

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

// Main loop
const animate = () => {

  const delta = clock.getDelta();

  // const elapsed = clock.getElapsedTime();
  // can be used in shaders: uniforms.u_time.value = elapsed;

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

  renderer.render(scene, camera);
};

init();

function loadMichelle(url, count, maxRadiusMichelle = minRadius - 0.2) {

  const loader = new GLTFLoader();
  loader.load(url, function (gltf) {

      for (let i = 0; i < count; i++) {

          // Génère une position aléatoire dans l'anneau défini par [minRadius, maxRadius]
          const angle = Math.random() * Math.PI * 2; // Angle aléatoire
          const distance = Math.random() * (maxRadiusMichelle); // Distance entre min et max
          const posX = Math.cos(angle) * distance;
          const posZ = Math.sin(angle) * distance;
          const posY = 0; // Toujours au niveau du sol

          // Clone avec animations
          const clone = SkeletonUtils.clone(gltf.scene);
          scene.add(clone);

          clone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
          });

          clone.scale.set(0.5, 0.5, 0.5);
          clone.position.set(posX, posY, posZ);
          clone.rotation.y = Math.random() * Math.PI * 2;

          const mixer = new THREE.AnimationMixer(clone);
          clone.userData.mixer = mixer;
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();

          objectM.add(clone);
      }
  });
}

loadMichelle('assets/models/Michelle.glb', 5);

function loadRobot(url, count) {

  const loader = new GLTFLoader();
  loader.load(url, function (gltf) {

      const minRadiusRobot = minRadius + 2;
      for (let i = 0; i < count; i++) {

          // Génère une position aléatoire dans l'anneau défini par [minRadius, maxRadius]
          const angle = Math.random() * Math.PI * 2; // Angle aléatoire
          const distance = Math.random() * (maxRadius - minRadiusRobot) + minRadiusRobot; // Distance entre min et max
          const posX = Math.cos(angle) * distance;
          const posZ = Math.sin(angle) * distance;
          const posY = 0; // Toujours au niveau du sol

          // Clone avec animations
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

loadRobot('assets/models/RobotExpressive.glb', 2);

function shootBullet() {
  // Création de la géométrie et du matériau de la balle
  const bulletGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  // Position initiale = position de la caméra
  bullet.position.copy(camera.position);

  // Définir la direction du tir (vers où la caméra regarde)
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  // Stocker les informations de la balle
  bullets.push({ mesh: bullet, direction, traveledDistance: 0 });

  scene.add(bullet);
}

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
      
      if (bulletBox.intersectsBox(enemy.userData.boundingBox)) {
        scene.remove(bullet.mesh);
        bullets.splice(i, 1);
    
        attackingRobots = attackingRobots.filter(r => r !== enemy);
    
        switchAnimation(enemy, 1);
        deadRobots.push(enemy);
    
        const action = enemy.userData.mixer.clipAction(enemy.userData.animations[1]);
        const animationDuration = action.getClip().duration;
    
        setTimeout(() => {
          enemy.userData.mixer.stopAllAction();
          enemy.userData.mixer.update(enemy.userData.mixer.time);
          fadeOutAndRemove(enemy);
      }, animationDuration * 1000);
      }      
    }
  }
}

function fadeOutAndRemove(enemy) {
  let opacity = 1.0; // Commence totalement visible
  const fadeSpeed = 50; // Intervalle en ms (plus petit = plus fluide)
  const duration = 1.5; // Durée totale du fondu en secondes
  const decrement = opacity / (duration * (1000 / fadeSpeed)); // Calcul du pas de diminution

  // Rendre tous les matériaux transparents
  enemy.traverse((child) => {
      if (child.isMesh) {
          child.material.transparent = true;
      }
  });

  // Démarre le fondu progressif
  const fadeInterval = setInterval(() => {
      opacity -= decrement;
      if (opacity <= 0) {
          opacity = 0;
          clearInterval(fadeInterval); // Stoppe le fondu

          // Supprime complètement le robot
          objectR.remove(enemy);
          scene.remove(enemy);
          deadRobots = deadRobots.filter(r => r !== enemy);
      }

      // Applique la nouvelle opacité
      enemy.traverse((child) => {
          if (child.isMesh) {
              child.material.opacity = opacity;
          }
      });
  }, fadeSpeed);
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



function damagePlayer() {
  if (attackingRobots.length > 0) { // Vérifie s'il y a des robots qui attaquent
    if (circleMesh) {
      circleMesh.material.color.set(0xff0000);
    };

    playerHP--; // Perd 1 PV
    console.log(`PV restants: ${playerHP}`);

    if (objectM.children.length > 0) {
      let michelle = objectM.children.pop();
      scene.remove(michelle);
    }

    if (playerHP <= 0) {
      console.log("Game Over !");
      alert("Game Over !");
      resetGame();
    }
  } else {
    if (circleMesh) {
      circleMesh.material.color.set(0xffffff);
    }
   }
}

// Lance le timer pour les dégâts (1 PV toutes les 2 sec)
setInterval(damagePlayer, 2000);


function switchAnimation(model, anim) {
  if (model.userData.mixer) {
      // Stop l'animation actuelle
      model.userData.mixer.stopAllAction();

      // Démarre l'animation n°anim
      const action = model.userData.mixer.clipAction(model.userData.animations[anim]);
      action.play();
  }
}

function resetGame() {
  playerHP = 5;
  objectM.children.forEach(enemy => scene.remove(enemy));
  objectM.children = [];
  objectR.children.forEach(enemy => scene.remove(enemy));
  objectR.children = [];
}

