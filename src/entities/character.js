// Bonecos: modelo 3D animado (Xbot) "vestido" com equipamentos, ou boneco simples de reserva.
// Todos expõem a mesma interface: { root, setKit(kit), setPrint(texto), update(dt, velocidade) }.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { scene } from '../systems/renderer.js';
import { world } from '../state.js';
import { MODEL_URL } from '../config.js';
import { clamp, lerpAngle } from '../utils.js';
import { labelTexture } from '../world/textures.js';
import { kitPalette, kitMaterial, makePrint, randomLook } from './kits.js';

export async function loadModel() {
  try {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    gltf.scene.updateMatrixWorld(true);
    const h = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).y;
    return { scene: gltf.scene, animations: gltf.animations, scale: h > 0.05 ? 1.8 / h : 1 };
  } catch (e) {
    console.warn('Não foi possível carregar o modelo 3D', e);
    return null;
  }
}

// Posição do número nas costas, na pose em T (metros, antes da escala do boneco)
const PRINT_POS = new THREE.Vector3(0, 1.27, -0.142);
const PRINT_ROT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

function makeXbot(kit, look) {
  const xbot = world.xbot;
  const model = SkeletonUtils.clone(xbot.scene);
  const s = xbot.scale * look.height;
  model.scale.setScalar(s);

  const palette = kitPalette(kit, look);
  const material = kitMaterial(palette);
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.frustumCulled = false;
    o.material = material;
  });
  const root = new THREE.Group();
  root.rotation.order = 'YXZ';                   // rodar (heading) e depois inclinar (mergulho)
  root.add(model);

  // Número/texto nas costas, preso ao osso do peito para acompanhar a animação
  const print = makePrint();
  const spine = model.getObjectByName('mixamorigSpine2');
  if (spine) {
    root.updateMatrixWorld(true);
    const want = new THREE.Matrix4().compose(PRINT_POS.clone().multiplyScalar(s), PRINT_ROT, new THREE.Vector3(1, 1, 1));
    spine.matrixWorld.clone().invert().multiply(want).decompose(print.position, print.quaternion, print.scale);
    spine.add(print);
  }

  const mixer = new THREE.AnimationMixer(model);
  const act = name => {
    const clip = THREE.AnimationClip.findByName(xbot.animations, name);
    if (!clip) return null;
    const a = mixer.clipAction(clip);
    a.play(); a.setEffectiveWeight(0);
    a.time = Math.random() * clip.duration;
    return a;
  };
  const idle = act('idle'), walk = act('walk'), run = act('run') || walk;

  return {
    root,
    setKit(k) { kitPalette(k, look, palette); },
    setPrint(text, color, name) { print.userData.set(text, color, name); },
    // Mistura parado → andar → correr conforme a velocidade
    update(dt, sp) {
      const wI = clamp(1 - sp / 1.6, 0, 1), wR = clamp((sp - 2.2) / 2.8, 0, 1), wW = clamp(1 - wI - wR, 0, 1);
      if (idle) idle.setEffectiveWeight(wI);
      if (walk) { walk.setEffectiveWeight(walk === run ? wW + wR : wW); walk.timeScale = clamp(sp / 1.5, 0.6, 1.8); }
      if (run && run !== walk) { run.setEffectiveWeight(wR); run.timeScale = clamp(sp / 5.5, 0.8, 1.7); }
      mixer.update(dt);
    },
  };
}

// Boneco simples de reserva, caso o modelo não carregue
function makeProcedural(kit, look) {
  const shirt = new THREE.MeshStandardMaterial({ color: kit.shirt, roughness: .7 });
  const shorts = new THREE.MeshStandardMaterial({ color: kit.shorts, roughness: .8 });
  const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: .6 });
  const root = new THREE.Group(), body = new THREE.Group();
  root.rotation.order = 'YXZ';
  root.add(body);
  body.scale.setScalar(look.height);
  const box = (w, h, d, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; return m; };
  const torso = box(.48, .62, .26, shirt); torso.position.y = 1.22; body.add(torso);
  const hips = box(.46, .24, .28, shorts); hips.position.y = .84; body.add(hips);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 12), skin);
  head.position.y = 1.7; head.castShadow = true; body.add(head);
  const limb = (x, y, w, len, mat) => {
    const p = new THREE.Group(); p.position.set(x, y, 0);
    const m = box(w, len, w, mat); m.position.y = -len / 2; p.add(m);
    body.add(p); return p;
  };
  const legL = limb(-.12, .82, .16, .8, skin), legR = limb(.12, .82, .16, .8, skin);
  const armL = limb(-.32, 1.5, .12, .6, shirt), armR = limb(.32, 1.5, .12, .6, shirt);
  let ph = Math.random() * 6;
  return {
    root,
    setKit(k) { shirt.color.set(k.shirt); shorts.color.set(k.shorts); },
    setPrint() {},
    update(dt, s) {
      ph += dt * (3 + s * 1.6);
      const a = Math.min(1, s / 6) * 0.9, sw = Math.sin(ph) * a;
      legL.rotation.x = sw; legR.rotation.x = -sw;
      armL.rotation.x = -sw * .8; armR.rotation.x = sw * .8;
      body.position.y = Math.abs(Math.sin(ph)) * a * .08;
      body.rotation.x = a * .15;
    },
  };
}

// Uma "entidade" é a posição/velocidade no campo + o boneco que a representa
export function makeEntity(kit, x, z, { look = randomLook(), print, printName } = {}) {
  const ch = world.xbot ? makeXbot(kit, look) : makeProcedural(kit, look);
  ch.setPrint(print ?? kit.back, kit.print, printName);
  scene.add(ch.root);
  return { ch, x, z, vx: 0, vz: 0, heading: 0, tilt: 0, lift: 0 };
}

// Coloca o boneco na posição da entidade, roda-o e atualiza a animação.
// e.animSpeed (opcional) força a animação, p. ex. parado enquanto mergulha.
export function place(e, dt, look, fixedHeading) {
  const s = Math.hypot(e.vx, e.vz);
  if (fixedHeading !== undefined) e.heading = fixedHeading;
  else {
    const target = s > 0.3 ? Math.atan2(e.vx, e.vz) : look ? Math.atan2(look.x - e.x, look.z - e.z) : e.heading;
    e.heading = lerpAngle(e.heading, target, 1 - Math.exp(-dt * 10));
  }
  e.ch.root.position.set(e.x, e.lift, e.z);
  e.ch.root.rotation.set(e.tilt, e.heading, 0);
  e.ch.update(dt, e.animSpeed ?? s);
}

export function ring(color, r1, r2) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r1, r2, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .85, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03;
  return m;
}

export function label(text, color) {
  // Tamanho fixo no ecrã: legível de longe, sem tapar a vista quando estás perto
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(text, color), depthTest: false, sizeAttenuation: false }));
  s.scale.set(0.16, 0.034, 1); s.position.y = 2.45; s.renderOrder = 10;
  return s;
}
