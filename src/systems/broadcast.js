// Câmara de TV: filma um círculo "EM DIRETO" no relvado. Quem lá estiver aparece
// nos ecrãs gigantes do estádio (e num canto do teu ecrã) e ganha pontos.
import * as THREE from 'three';
import { renderer, scene, renderInset, quality } from './renderer.js';
import { game, world } from '../state.js';
import { BROADCAST, SCORE, HW } from '../config.js';
import { $, rand, clamp, dist, isTouch } from '../utils.js';
import { makeEntity } from '../entities/character.js';
import { KITS } from '../entities/kits.js';
import { setExcitement } from './audio.js';

const feed = new THREE.WebGLRenderTarget(512, 288, { samples: 4 });
const tvCam = new THREE.PerspectiveCamera(25, 16 / 9, 0.5, 400);
const zone = { x: 0, z: 0, t: 0, airtime: 0 };
const look = new THREE.Vector3(), tmp = new THREE.Vector3();
const screens = [];
let ringMesh, discMesh, rig, crew, frame = 0;

// Imagem pequena no canto do ecrã (o que está a passar no ecrã gigante)
const insetScene = new THREE.Scene();
const insetCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
insetScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: feed.texture })));

export const zoneState = zone;

export function buildBroadcast() {
  // Círculo no relvado
  ringMesh = new THREE.Mesh(new THREE.RingGeometry(BROADCAST.radius - 0.3, BROADCAST.radius, 64),
    new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: 0.9, depthWrite: false }));
  discMesh = new THREE.Mesh(new THREE.CircleGeometry(BROADCAST.radius - 0.3, 64),
    new THREE.MeshBasicMaterial({ color: '#ff3b30', transparent: true, opacity: 0.12, depthWrite: false }));
  for (const m of [ringMesh, discMesh]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.025; scene.add(m); }

  // Câmara num tripé + operador de câmara
  rig = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#1b1d22', roughness: 0.5, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.6), dark);
  body.position.y = 1.55;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.35, 16), dark);
  lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.55, 0.45);
  const tally = new THREE.Mesh(new THREE.SphereGeometry(0.035), new THREE.MeshBasicMaterial({ color: '#ff3b30' }));
  tally.position.set(0, 1.75, 0.2);
  rig.add(body, lens, tally);
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5), dark);
    const a = i / 3 * Math.PI * 2;
    leg.position.set(Math.sin(a) * 0.25, 0.7, Math.cos(a) * 0.25);
    leg.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3);
    rig.add(leg);
  }
  rig.traverse(o => { o.castShadow = true; });
  scene.add(rig);
  crew = makeEntity(KITS.crew, 0, 0);

  // Ecrãs gigantes: atrás da baliza de cada lado e por cima da bancada do fundo
  const frameMat = new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.6 });
  const screenMat = new THREE.MeshBasicMaterial({ map: feed.texture });
  const addScreen = (x, y, z, yaw) => {
    const g = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(20.6, 12, 0.6), frameMat);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(19.2, 10.8), screenMat);
    screen.position.z = 0.31;
    g.add(back, screen);
    g.position.set(x, y, z); g.rotation.y = yaw;
    scene.add(g);
    screens.push(screen);
  };
  addScreen(0, 14, -47, 0);
  addScreen(66, 14, 0, -Math.PI / 2);
  addScreen(-66, 14, 0, Math.PI / 2);

  moveZone();
}

// Muda o círculo para outro sítio, longe do invasor, e leva a câmara para a linha lateral mais próxima
export function moveZone() {
  const inv = world.invader;
  for (let i = 0; i < 15; i++) {
    zone.x = rand(-40, 40); zone.z = rand(-24, 24);
    if (!inv || game.state !== 'play' || Math.hypot(zone.x - inv.x, zone.z - inv.z) > BROADCAST.minDistFromPlayer) break;
  }
  zone.t = BROADCAST.moveEvery;
  zone.airtime = 0;
  ringMesh.position.x = discMesh.position.x = zone.x;
  ringMesh.position.z = discMesh.position.z = zone.z;

  const side = zone.z >= 0 ? 1 : -1;
  const cx = clamp(zone.x + rand(-6, 6), -48, 48), cz = side * (HW + 2.5);
  rig.position.set(cx, 0, cz);
  rig.lookAt(zone.x, 0, zone.z);
  Object.assign(crew, { x: cx + 0.5, z: cz + side * 0.6, heading: Math.atan2(zone.x - cx, zone.z - cz) });
  tvCam.position.set(cx, 2.4, cz);
  look.set(zone.x, 1, zone.z);
}

export function updateBroadcast(dt, now) {
  const inv = world.invader;
  const playing = game.state === 'play';
  game.live = playing && dist(inv, zone) < BROADCAST.radius;

  if (playing) {
    zone.t -= dt;
    if (game.live) {
      zone.airtime += dt;
      game.tvPoints += SCORE.tvPerSecond * dt;
    }
    if (zone.t <= 0 || zone.airtime >= BROADCAST.maxAirtime) moveZone();
  }
  setExcitement(game.live ? 1 : 0);

  // O círculo pisca mais depressa quando estás em direto
  const pulse = 0.5 + 0.5 * Math.sin(now / (game.live ? 90 : 250));
  ringMesh.material.opacity = 0.6 + 0.4 * pulse;
  discMesh.material.opacity = game.live ? 0.18 + 0.1 * pulse : 0.1;

  // A câmara segue-te quando estás no círculo; senão filma o círculo
  const target = game.live ? tmp.set(inv.x, 1.2, inv.z) : tmp.set(zone.x, 1, zone.z);
  look.lerp(target, 1 - Math.exp(-dt * 5));
  const d = tvCam.position.distanceTo(look);
  tvCam.fov = THREE.MathUtils.radToDeg(2 * Math.atan((game.live ? 5 : 11) / 1.78 / 2 / d));
  tvCam.updateProjectionMatrix();
  tvCam.lookAt(look);

  crew.vx = crew.vz = 0;
  crew.ch.root.position.set(crew.x, 0, crew.z);
  crew.ch.root.rotation.y = crew.heading;
  crew.ch.update(dt, 0);

  // Filmar para os ecrãs gigantes (em frames alternados, para poupar)
  if (++frame % quality.feedEvery === 0) {
    for (const s of screens) s.visible = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(feed);
    renderer.render(scene, tvCam);
    renderer.setRenderTarget(null);
    renderer.shadowMap.autoUpdate = true;
    for (const s of screens) s.visible = true;
  }
}
// Mostra a imagem do ecrã gigante no canto inferior esquerdo enquanto estás em direto
export function renderLiveInset() {
  const label = $('live');
  label.classList.toggle('hidden', !game.live);
  if (!game.live) return;
  const w = Math.round(clamp(innerWidth * 0.26, 140, 360)), h = Math.round(w * 9 / 16);
  if (isTouch()) {
    // No telemóvel fica em cima à esquerda, longe do joystick
    const top = 66 + 28;
    label.style.bottom = ''; label.style.top = (top - 26) + 'px'; label.style.left = '8px';
    renderInset(insetScene, insetCam, 8, innerHeight - top - h, w, h);
  } else {
    label.style.top = ''; label.style.left = ''; label.style.bottom = (16 + h + 6) + 'px';
    renderInset(insetScene, insetCam, 16, 16, w, h);
  }
}
