import * as THREE from 'three';
import Colors from './Colors';
import Airplane from './Airplane';
import Cloud from './Cloud';

const SPAWN_DISTANCE = 0.8;

// GAME VARIABLES
let game;
const enemiesPool = [];
let sky;
let coinsHolder;
let enemiesHolder;

function resetGame() {
  game = {
    speed: 0.0035,
    distanceForSpeedUpdate: 100,
    speedLastUpdate: 0,

    distance: 0,
    ratioSpeedDistance: 50,

    planeDefaultHeight: 100,
    planeAmpHeight: 80,
    planeAmpWidth: 75,
    planeMoveSensivity: 0.05,
    planeRotXSensivity: 0.008,
    planeRotZSensivity: 0.004,
    planeFallSpeed: 0.01,
    planeCollisionDisplacementX: 0,
    planeCollisionSpeedX: 0,

    planeCollisionDisplacementY: 0,
    planeCollisionSpeedY: 0,

    seaRadius: 600,
    seaLength: 800,
    // seaRotationSpeed:0.006,
    wavesMinAmp: 5,
    wavesMaxAmp: 20,
    wavesMinSpeed: 0.001,
    wavesMaxSpeed: 0.003,

    coinDistanceTolerance: 15,
    coinValue: 3,
    coinsSpeed: 0.5,
    coinLastSpawn: 0,
    distanceForCoinsSpawn: 15,

    enemyDistanceTolerance: 10,
    enemyValue: 10,
    enemiesSpeed: 0.6,
    enemyLastSpawn: 0,
    distanceForEnemiesSpawn: 10,

    status: 'playing',
  };
}

// THREEJS RELATED VARIABLES
let scene;
let camera;
let renderer;
let container;

// SCREEN & MOUSE VARIABLES
let HEIGHT;
let WIDTH;
let mousePos = { x: 0, y: 0 };

// INIT THREE JS, SCREEN AND MOUSE EVENTS
function createScene() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    50,
    WIDTH / HEIGHT,
    0.1,
    10000,
  );
  scene.fog = new THREE.Fog(0xf7d9aa, 100, 950);
  camera.position.x = 0;
  camera.position.z = 500;
  camera.position.y = game.planeDefaultHeight;
  // camera.lookAt(new THREE.Vector3(0, 400, 0));

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);

  renderer.shadowMap.enabled = true;

  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', handleWindowResize, false);
}

// MOUSE AND SCREEN EVENTS
function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}
function handleMouseMove(event) {
  const tx = -1 + (event.clientX / WIDTH) * 2;
  const ty = 1 - (event.clientY / HEIGHT) * 2;
  mousePos = { x: tx, y: ty };
}
function handleTouchMove(event) {
  event.preventDefault();
  const tx = -1 + (event.touches[0].pageX / WIDTH) * 2;
  const ty = 1 - (event.touches[0].pageY / HEIGHT) * 2;
  mousePos = { x: tx, y: ty };
}
function handleMouseUp(event) {
  if (game.status === 'waitingReplay') {
    resetGame();
    hideReplay();
  }
}
function handleTouchEnd(event) {
  if (game.status === 'waitingReplay') {
    resetGame();
    hideReplay();
  }
}

// LIGHTS
let ambientLight;
let hemisphereLight;
let shadowLight;
function createLights() {
  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, 0.9);

  ambientLight = new THREE.AmbientLight(0xdc8874, 0.5);

  shadowLight = new THREE.DirectionalLight(0xffffff, 0.9);
  shadowLight.position.set(150, 350, 350);
  shadowLight.castShadow = true;
  shadowLight.shadow.camera.left = -400;
  shadowLight.shadow.camera.right = 400;
  shadowLight.shadow.camera.top = 400;
  shadowLight.shadow.camera.bottom = -400;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 1000;
  shadowLight.shadow.mapSize.width = 4096;
  shadowLight.shadow.mapSize.height = 4096;

  const ch = new THREE.CameraHelper(shadowLight.shadow.camera);

  // scene.add(ch);
  scene.add(hemisphereLight);
  scene.add(shadowLight);
  scene.add(ambientLight);
}

const Sky = function () {
  this.mesh = new THREE.Object3D();
  this.nClouds = 20;
  this.clouds = [];
  const stepAngle = Math.PI * 2 / this.nClouds;
  for (let i = 0; i < this.nClouds; i++) {
    const c = new Cloud();
    this.clouds.push(c);
    const a = stepAngle * i;
    const h = game.seaRadius + 150 + Math.random() * 200;
    c.mesh.position.y = Math.sin(a) * h;
    c.mesh.position.x = Math.cos(a) * h;
    c.mesh.position.z = -300 - Math.random() * 500;
    c.mesh.rotation.z = a + Math.PI / 2;
    const s = 1 + Math.random() * 2;
    c.mesh.scale.set(s, s, s);
    this.mesh.add(c.mesh);
  }
};
Sky.prototype.moveClouds = function () {
  for (let i = 0; i < this.nClouds; i++) {
    const c = this.clouds[i];
    c.rotate();
  }
  this.mesh.rotation.z += game.speed;
};

const Sea = function () {
  const geom = new THREE.CylinderGeometry(game.seaRadius, game.seaRadius, game.seaLength, 40, 10);
  geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  geom.mergeVertices();
  const l = geom.vertices.length;

  this.waves = [];

  for (let i = 0; i < l; i++) {
    const v = geom.vertices[i];
    // v.y = Math.random()*30;
    this.waves.push({
      y: v.y,
      x: v.x,
      z: v.z,
      ang: Math.random() * Math.PI * 2,
      amp: game.wavesMinAmp + Math.random() * (game.wavesMaxAmp - game.wavesMinAmp),
      speed: game.wavesMinSpeed + Math.random() * (game.wavesMaxSpeed - game.wavesMinSpeed),
    });
  }
  const mat = new THREE.MeshPhongMaterial({
    color: Colors.blue,
    transparent: true,
    opacity: 0.8,
    shading: THREE.FlatShading,
  });

  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.name = 'waves';
  this.mesh.receiveShadow = true;
};
Sea.prototype.moveWaves = function () {
  const verts = this.mesh.geometry.vertices;
  const l = verts.length;
  for (let i = 0; i < l; i++) {
    const v = verts[i];
    const vprops = this.waves[i];
    v.x = vprops.x + Math.cos(vprops.ang) * vprops.amp;
    v.y = vprops.y + Math.sin(vprops.ang) * vprops.amp;
    vprops.ang += vprops.speed;
    this.mesh.geometry.verticesNeedUpdate = true;
  }
};

const Enemy = function () {
  const geom = new THREE.TetrahedronGeometry(8, 2);
  const mat = new THREE.MeshPhongMaterial({
    color: Colors.red,
    shininess: 0,
    specular: 0xffffff,
    shading: THREE.FlatShading,
  });
  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.castShadow = true;
  this.angle = 0;
  this.dist = 0;
};
const EnemiesHolder = function () {
  this.mesh = new THREE.Object3D();
  this.enemiesInUse = [];
};
EnemiesHolder.prototype.spawnEnemies = function () {
  var enemy;
  if (enemiesPool.length) {
    enemy = enemiesPool.pop();
  } else {
    enemy = new Enemy();
  }

  enemy.angle = SPAWN_DISTANCE;
  enemy.distance = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight - 20);
  enemy.mesh.position.y = -game.seaRadius + Math.sin(enemy.angle) * enemy.distance;
  enemy.mesh.position.x = Math.cos(enemy.angle) * enemy.distance;

  this.mesh.add(enemy.mesh);
  this.enemiesInUse.push(enemy);
};
EnemiesHolder.prototype.rotateEnemies = function () {
  for (let i = 0; i < this.enemiesInUse.length; i++) {
    const enemy = this.enemiesInUse[i];
    enemy.angle += game.speed * game.enemiesSpeed;

    if (enemy.angle > Math.PI * 2) enemy.angle -= Math.PI * 2;

    enemy.mesh.position.y = -game.seaRadius + Math.sin(enemy.angle) * enemy.distance;
    enemy.mesh.position.x = Math.cos(enemy.angle) * enemy.distance;
    enemy.mesh.rotation.z += Math.random() * 0.1;
    enemy.mesh.rotation.y += Math.random() * 0.1;

    // var globalEnemyPosition =  enemy.mesh.localToWorld(new THREE.Vector3());
    const diffPos = airplane.mesh.position.clone().sub(enemy.mesh.position.clone());
    const d = diffPos.length();
    if (d < game.enemyDistanceTolerance) {
      enemiesPool.unshift(this.enemiesInUse.splice(i, 1)[0]);
      this.mesh.remove(enemy.mesh);
      game.status = 'gameover';
      i--;
    } else if (enemy.angle > Math.PI) {
      enemiesPool.unshift(this.enemiesInUse.splice(i, 1)[0]);
      this.mesh.remove(enemy.mesh);
      i--;
    }
  }
};

const Coin = function () {
  const geom = new THREE.TetrahedronGeometry(5, 0);
  const mat = new THREE.MeshPhongMaterial({
    color: 0x009999,
    shininess: 0,
    specular: 0xffffff,

    shading: THREE.FlatShading,
  });
  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.castShadow = true;
  this.angle = 0;
  this.dist = 0;
};
const CoinsHolder = function () {
  this.mesh = new THREE.Object3D();
  this.coinsInUse = [];
  this.coinsPool = [];
};
CoinsHolder.prototype.spawnCoins = function () {
  const nCoins = 1 + Math.floor(Math.random() * 10);
  const d = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight - 20);
  const amplitude = 10 + Math.round(Math.random() * 10);
  for (let i = 0; i < nCoins; i++) {
    var coin;
    if (this.coinsPool.length) {
      coin = this.coinsPool.pop();
    } else {
      coin = new Coin();
    }
    this.mesh.add(coin.mesh);
    this.coinsInUse.push(coin);
    coin.angle = SPAWN_DISTANCE + (i * 0.02);
    coin.distance = d + Math.cos(i * 0.5) * amplitude;
    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle) * coin.distance;
    coin.mesh.position.x = Math.cos(coin.angle) * coin.distance;
  }
};
CoinsHolder.prototype.rotateCoins = function () {
  for (let i = 0; i < this.coinsInUse.length; i++) {
    const coin = this.coinsInUse[i];
    if (coin.exploding) continue;
    coin.angle += game.speed * game.coinsSpeed;
    if (coin.angle > Math.PI * 2) coin.angle -= Math.PI * 2;
    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle) * coin.distance;
    coin.mesh.position.x = Math.cos(coin.angle) * coin.distance;
    coin.mesh.rotation.z += Math.random() * 0.1;
    coin.mesh.rotation.y += Math.random() * 0.1;

    // var globalCoinPosition =  coin.mesh.localToWorld(new THREE.Vector3());
    const diffPos = airplane.mesh.position.clone().sub(coin.mesh.position.clone());
    const d = diffPos.length();
    if (d < game.coinDistanceTolerance) {
      this.coinsPool.unshift(this.coinsInUse.splice(i, 1)[0]);
      this.mesh.remove(coin.mesh);
      i--;
    } else if (coin.angle > Math.PI) {
      this.coinsPool.unshift(this.coinsInUse.splice(i, 1)[0]);
      this.mesh.remove(coin.mesh);
      i--;
    }
  }
};

// 3D Models
let sea;
let airplane;

function createPlane() {
  airplane = new Airplane();
  airplane.mesh.scale.set(0.25, 0.25, 0.25);
  airplane.mesh.position.y = game.planeDefaultHeight;
  scene.add(airplane.mesh);
}
function createSea() {
  sea = new Sea();
  sea.mesh.position.y = -game.seaRadius;
  scene.add(sea.mesh);
}
function createSky() {
  sky = new Sky();
  sky.mesh.position.y = -game.seaRadius;
  scene.add(sky.mesh);
}
function createCoins() {
  coinsHolder = new CoinsHolder();
  scene.add(coinsHolder.mesh);
}
function createEnemies() {
  enemiesHolder = new EnemiesHolder();
  scene.add(enemiesHolder.mesh);
}

function loop() {
  if (game.status === 'playing') {
    // Add coins every 100m;
    if (Math.floor(game.distance) % game.distanceForCoinsSpawn === 0 && Math.floor(game.distance) > game.coinLastSpawn) {
      game.coinLastSpawn = Math.floor(game.distance);
      coinsHolder.spawnCoins();
    }

    if (Math.floor(game.distance) % game.distanceForSpeedUpdate === 0 && Math.floor(game.distance) > game.speedLastUpdate) {
      game.speedLastUpdate = Math.floor(game.distance);
    }

    if (Math.floor(game.distance) % game.distanceForEnemiesSpawn === 0 && Math.floor(game.distance) > game.enemyLastSpawn) {
      game.enemyLastSpawn = Math.floor(game.distance);
      enemiesHolder.spawnEnemies();
    }

    updatePlane();
    updateDistance();
  } else if (game.status === 'gameover') {
    game.speed *= 0.99;
    airplane.mesh.rotation.z += (-Math.PI / 2 - airplane.mesh.rotation.z) * 0.002;
    airplane.mesh.rotation.x += 0.003;
    game.planeFallSpeed *= 1.05;
    airplane.mesh.position.y -= game.planeFallSpeed;

    if (airplane.mesh.position.y < -50) {
      showReplay();
      game.status = 'waitingReplay';
    }
  }
  airplane.propeller.rotation.x += 0.25;
  sea.mesh.rotation.z += game.speed;

  if (sea.mesh.rotation.z > 2 * Math.PI) sea.mesh.rotation.z -= 2 * Math.PI;

  ambientLight.intensity += (0.5 - ambientLight.intensity) * 0.005;

  coinsHolder.rotateCoins();
  enemiesHolder.rotateEnemies();

  sky.moveClouds();
  sea.moveWaves();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function updateDistance() {
  game.distance += game.speed * game.ratioSpeedDistance;
  fieldDistance.innerHTML = Math.floor(game.distance);
}

function updatePlane() {
  let targetY = normalize(mousePos.y, -0.75, 0.75, game.planeDefaultHeight - game.planeAmpHeight, game.planeDefaultHeight + game.planeAmpHeight);
  let targetX = normalize(mousePos.x, -1, 1, -game.planeAmpWidth * 0.7, -game.planeAmpWidth);

  game.planeCollisionDisplacementX += game.planeCollisionSpeedX;
  targetX += game.planeCollisionDisplacementX;


  game.planeCollisionDisplacementY += game.planeCollisionSpeedY;
  targetY += game.planeCollisionDisplacementY;

  airplane.mesh.position.y += (targetY - airplane.mesh.position.y) * game.planeMoveSensivity;
  airplane.mesh.position.x += (targetX - airplane.mesh.position.x) * game.planeMoveSensivity;

  airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * game.planeRotXSensivity;
  airplane.mesh.rotation.x = (airplane.mesh.position.y - targetY) * game.planeRotZSensivity;

  game.planeCollisionSpeedX += (0 - game.planeCollisionSpeedX) * 0.03;
  game.planeCollisionDisplacementX += (0 - game.planeCollisionDisplacementX) * 0.01;
  game.planeCollisionSpeedY += (0 - game.planeCollisionSpeedY) * 0.03;
  game.planeCollisionDisplacementY += (0 - game.planeCollisionDisplacementY) * 0.01;

  airplane.pilot.updateHairs();
}

function showReplay() {
  replayMessage.style.display = 'block';
}
function hideReplay() {
  replayMessage.style.display = 'none';
}

function normalize(v, vmin, vmax, tmin, tmax) {
  const nv = Math.max(Math.min(v, vmax), vmin);
  const dv = vmax - vmin;
  const pc = (nv - vmin) / dv;
  const dt = tmax - tmin;
  const tv = tmin + (pc * dt);
  return tv;
}

let fieldDistance;
let replayMessage;

function init(event) {
  // UI
  fieldDistance = document.getElementById('distValue');
  replayMessage = document.getElementById('replayMessage');

  resetGame();
  createScene();

  createLights();
  createPlane();
  createSea();
  createSky();
  createCoins();
  createEnemies();

  document.addEventListener('mousemove', handleMouseMove, false);
  document.addEventListener('touchmove', handleTouchMove, false);
  document.addEventListener('mouseup', handleMouseUp, false);
  document.addEventListener('touchend', handleTouchEnd, false);

  loop();
}

window.addEventListener('load', init, false);
