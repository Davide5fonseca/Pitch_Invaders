// Estádio: relvado, bancadas com público, publicidade, balizas, bandeirolas e torres de luz.
import * as THREE from 'three';
import { scene } from '../systems/renderer.js';
import { world } from '../state.js';
import { HL, HW, GOAL_W } from '../config.js';
import { texture, pitchTexture, crowdCanvas, adCanvas, netTexture } from './textures.js';

export function buildStadium() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 200), new THREE.MeshLambertMaterial({ color: '#1d5a22' }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
  scene.add(ground);

  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(113, 76), new THREE.MeshLambertMaterial({ map: pitchTexture() }));
  pitch.rotation.x = -Math.PI / 2; pitch.receiveShadow = true;
  scene.add(pitch);

  buildStands();
  buildBoards();
  buildGoals();
  buildCornerFlags();
  buildFloodlights();
}

// Bancadas inclinadas com o público
function buildStands() {
  const crowd = crowdCanvas();
  const stand = (len, distance, yaw) => {
    const D = 32, tilt = THREE.MathUtils.degToRad(55);
    const tex = texture(crowd, [len / 9, D / 6]);
    world.standTexs.push(tex);
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, D), new THREE.MeshLambertMaterial({ map: tex }));
    m.rotation.x = -tilt;
    m.position.set(0, 1.2 + D / 2 * Math.cos(tilt), -distance - D / 2 * Math.sin(tilt));
    g.add(m);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: '#1b2433' }));
    wall.position.set(0, 0.6, -distance + 0.2);
    g.add(wall);
    g.rotation.y = yaw;
    scene.add(g);
  };
  stand(150, 41, 0); stand(150, 41, Math.PI);
  stand(100, 60, -Math.PI / 2); stand(100, 60, Math.PI / 2);
}

function buildBoards() {
  const ad = adCanvas();
  const board = (len, distance, yaw) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.9, 0.12), new THREE.MeshBasicMaterial({ map: texture(ad, [len / 30, 1]) }));
    m.position.set(0, 0.45, -distance);
    const g = new THREE.Group(); g.add(m); g.rotation.y = yaw;
    scene.add(g);
  };
  board(113, 38.5, 0); board(113, 38.5, Math.PI);
  board(78, 57.5, -Math.PI / 2); board(78, 57.5, Math.PI / 2);
}

const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .4 });

function buildGoals() {
  const netMat = new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false });
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    const post = new THREE.CylinderGeometry(0.06, 0.06, 2.44, 10);
    for (const z of [-GOAL_W, GOAL_W]) {
      const p = new THREE.Mesh(post, white); p.position.set(0, 1.22, z); p.castShadow = true; g.add(p);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, GOAL_W * 2, 10), white);
    bar.rotation.x = Math.PI / 2; bar.position.y = 2.44; bar.castShadow = true; g.add(bar);
    const net = (w, h, rep, setup) => {
      const mat = netMat.clone(); mat.map = netMat.map.clone(); mat.map.repeat.set(...rep);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); setup(m); g.add(m);
    };
    net(GOAL_W * 2, 2.44, [30, 10], m => { m.rotation.y = Math.PI / 2; m.position.set(2, 1.22, 0); });
    net(2, GOAL_W * 2, [8, 30], m => { m.rotation.x = -Math.PI / 2; m.position.set(1, 2.44, 0); });
    for (const z of [-GOAL_W, GOAL_W]) net(2, 2.44, [8, 10], m => { m.position.set(1, 1.22, z); });
    g.position.x = s * HL;
    g.rotation.y = s > 0 ? 0 : Math.PI;
    scene.add(g);
  }
}

function buildCornerFlags() {
  const flagMat = new THREE.MeshBasicMaterial({ color: '#ffd166', side: THREE.DoubleSide });
  for (const x of [-HL, HL]) for (const z of [-HW, HW]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5), white);
    pole.position.set(x, 0.75, z);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), flagMat);
    flag.position.set(x + 0.22, 1.35, z);
    scene.add(pole, flag);
  }
}

function buildFloodlights() {
  const poleMat = new THREE.MeshStandardMaterial({ color: '#555b66' });
  const lampMat = new THREE.MeshBasicMaterial({ color: '#fff8e0' });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.7, 45, 8), poleMat);
    pole.position.set(sx * 78, 22.5, sz * 66);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 0.6), lampMat);
    lamp.position.set(sx * 78, 45, sz * 66);
    lamp.lookAt(0, 0, 0);
    scene.add(pole, lamp);
  }
}

// Público aos saltos depois de um golo
export function updateCrowd(now, celebrating) {
  for (const t of world.standTexs) t.offset.y = celebrating ? Math.abs(Math.sin(now * 0.02)) * 0.05 : 0;
}
