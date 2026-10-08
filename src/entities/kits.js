// Equipamentos e aspeto dos bonecos.
// O modelo é um só (Xbot); "vestimo-lo" pintando cada zona do corpo com uma cor,
// a partir da posição de cada vértice na pose em T.
import * as THREE from 'three';
import { canvas, texture } from '../world/textures.js';

// Zonas do corpo
export const R = {
  skin: 0, shirt: 1, sleeve: 2, forearm: 3, hand: 4, shorts: 5, knee: 6,
  socks: 7, boots: 8, hair: 9, eyes: 10, trim: 11, sockBand: 12, cuff: 13,
};
const N = 14;

const SKINS = ['#f1d0b5', '#e8b996', '#d29b76', '#b07650', '#8a5636', '#5e3a24'];
const HAIRS = ['#15100c', '#2b1d14', '#4a3020', '#6b4a2b', '#a8793f', '#d9b56c', '#0d0d0d'];
const pick = a => a[Math.floor(Math.random() * a.length)];

export const KITS = {
  home:    { shirt: '#c8102e', sleeve: '#c8102e', trim: '#ffffff', shorts: '#f2f2f2', socks: '#c8102e', boots: '#111111', print: '#ffffff' },
  away:    { shirt: '#f4f4f4', sleeve: '#f4f4f4', trim: '#1b2a4a', shorts: '#1b2a4a', socks: '#f4f4f4', boots: '#c6f432', print: '#1b2a4a' },
  homeGk:  { shirt: '#1aa34a', sleeve: '#1aa34a', trim: '#0b3d1f', shorts: '#111111', socks: '#1aa34a', boots: '#111111', gloves: '#f2f2f2', longSleeves: true, print: '#ffffff' },
  awayGk:  { shirt: '#f4a300', sleeve: '#f4a300', trim: '#222222', shorts: '#222222', socks: '#f4a300', boots: '#ffffff', gloves: '#222222', longSleeves: true, print: '#222222' },
  ref:     { shirt: '#141414', sleeve: '#141414', trim: '#ffd400', shorts: '#141414', socks: '#141414', boots: '#111111', print: '#ffd400' },
  steward: { shirt: '#d4f70f', sleeve: '#24262b', trim: '#c9d1d9', shorts: '#24262b', socks: '#24262b', boots: '#0d0d0d', longSleeves: true, trousers: true, print: '#111111', back: 'SEGURANÇA' },
  police:  { shirt: '#1f2a44', sleeve: '#1f2a44', trim: '#d9e021', shorts: '#182033', socks: '#182033', boots: '#0d0d0d', longSleeves: true, trousers: true, print: '#ffffff', back: 'POLÍCIA' },
  crew:    { shirt: '#2a2d34', sleeve: '#2a2d34', trim: '#e63946', shorts: '#3a3f4a', socks: '#3a3f4a', boots: '#0d0d0d', longSleeves: true, trousers: true, print: '#ffffff', back: 'GOLO TV' },
  invader: { shirt: '#c14bff', sleeve: '#c14bff', trim: '#7a1fb0', shorts: '#3b5b8c', socks: '#3b5b8c', boots: '#f5f5f5', trousers: true },
};

// Tom de pele e cabelo ao acaso (cabelo null = careca)
export function randomLook() {
  return { skin: pick(SKINS), hair: Math.random() < 0.1 ? null : pick(HAIRS), height: 0.95 + Math.random() * 0.1 };
}

// Cor de cada zona para um equipamento + aspeto
export function kitPalette(kit, look, out = Array.from({ length: N }, () => new THREE.Color())) {
  const c = (i, v) => out[i].set(v);
  c(R.skin, look.skin);
  c(R.shirt, kit.shirt);
  c(R.sleeve, kit.sleeve);
  c(R.forearm, kit.longSleeves ? kit.sleeve : look.skin);
  c(R.hand, kit.gloves || look.skin);
  c(R.shorts, kit.shorts);
  c(R.knee, kit.trousers ? kit.shorts : look.skin);
  c(R.socks, kit.trousers ? kit.shorts : kit.socks);
  c(R.boots, kit.boots);
  if (look.hair) c(R.hair, look.hair); else out[R.hair].set(look.skin).multiplyScalar(0.85);
  c(R.eyes, '#1d130d');
  c(R.trim, kit.trim);
  c(R.sockBand, kit.trousers ? kit.shorts : kit.trim);
  c(R.cuff, kit.longSleeves ? kit.sleeve : kit.trim);
  return out;
}

// Zonas do corpo calculadas no shader, píxel a píxel, a partir da posição na pose em T do Xbot
// (metros; o boneco olha para +z, braços esticados em ±x).
// Referências: ombro x=0.15, pulso x=0.71, anca y=1.04, joelho y=0.53, olhos (±0.031, 1.661, 0.083)
const REGION_GLSL = /* glsl */`
int regionAt(vec3 p) {
  float ax = abs(p.x), y = p.y, z = p.z;
  if (ax > 0.2 && y > 1.32) {                                   // braços
    if (ax > 0.69) return ${R.hand};
    if (ax < 0.255) return ${R.sleeve};
    if (ax < 0.275) return ${R.cuff};
    return ${R.forearm};
  }
  if (y > 1.465 && ax < 0.09) {                                 // pescoço e cabeça
    if (y < 1.49) return ${R.trim};                             // gola
    float ex = ax - 0.031, ey = y - 1.661;
    if (z > 0.05 && ex * ex / 0.000144 + ey * ey / 0.000049 < 1.0) return ${R.eyes};
    if (z > 0.05 && y > 1.674 && y < 1.683 && abs(ex) < 0.02) return ${R.hair};      // sobrancelhas
    if (y > 1.71 || (y > 1.6 && z < -0.03) || (y > 1.66 && ax > 0.075 && z < 0.04)) return ${R.hair};
    return ${R.skin};
  }
  if (y > 1.08) return ${R.shirt};
  if (y > 0.69) return ${R.shorts};
  if (y > 0.47) return ${R.knee};
  if (y > 0.44) return ${R.sockBand};
  if (y > 0.12) return ${R.socks};
  return ${R.boots};
}`;

// O X Bot é o manequim feminino da Mixamo: estreitamos as ancas, reduzimos peito e glúteos
// e endireitamos a cintura para um corpo de jogador. Feito na pose em T, antes da animação.
const SHAPE_GLSL = /* glsl */`
  vBind = transformed;
  {
    float y = transformed.y;
    float torso = 1.0 - smoothstep(0.18, 0.22, abs(transformed.x));
    float hip = smoothstep(0.74, 0.86, y) * (1.0 - smoothstep(1.02, 1.14, y));
    float chest = smoothstep(1.16, 1.24, y) * (1.0 - smoothstep(1.36, 1.44, y));
    float waist = smoothstep(1.02, 1.12, y) * (1.0 - smoothstep(1.2, 1.3, y));
    transformed.x *= (1.0 - 0.15 * hip) * (1.0 + 0.17 * waist * torso);
    transformed.z *= 1.0 + 0.12 * waist * torso;
    if (transformed.z < 0.0) transformed.z *= 1.0 - 0.35 * hip;
    if (transformed.z > 0.03) transformed.z = 0.03 + (transformed.z - 0.03) * (1.0 - 0.6 * chest * torso);
  }`;

// Material que pinta cada zona com a cor da paleta (um só shader para todos os bonecos)
export function kitMaterial(palette) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uPalette = { value: palette };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + SHAPE_GLSL);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform vec3 uPalette[${N}];\nvarying vec3 vBind;\n${REGION_GLSL}`)
      .replace('#include <color_fragment>', '#include <color_fragment>\nint reg = regionAt(vBind);\ndiffuseColor.rgb *= uPalette[reg];')
      .replace('#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        if (reg == ${R.boots}) roughnessFactor = 0.35;
        else if (reg == ${R.skin} || reg == ${R.eyes}) roughnessFactor = 0.5;
        else if (reg == ${R.hair}) roughnessFactor = 0.9;`);
  };
  m.customProgramCacheKey = () => 'kit-v2';
  return m;
}

// Número / texto nas costas da camisola
export function makePrint() {
  const [c, g] = canvas(256, 128);
  const map = texture(c);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.16),
    new THREE.MeshStandardMaterial({ map, transparent: true, alphaTest: 0.35, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
  mesh.visible = false;
  mesh.userData.set = (text, color) => {
    g.clearRect(0, 0, 256, 128);
    mesh.visible = !!text;
    if (!text) return;
    const big = String(text).length <= 2;
    let size = big ? 110 : 44;
    g.font = `900 ${size}px "Arial Black", system-ui, sans-serif`;
    const w = g.measureText(text).width;
    const maxW = big ? 236 : 180;              // texto comprido fica no centro (as costas são curvas)
    if (w > maxW) { size *= maxW / w; g.font = `900 ${size}px "Arial Black", system-ui, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = big ? 6 : 3; g.strokeStyle = 'rgba(0,0,0,.35)';
    g.strokeText(text, 128, 68);
    g.fillStyle = color; g.fillText(text, 128, 68);
    map.needsUpdate = true;
  };
  return mesh;
}
