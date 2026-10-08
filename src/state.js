// Estado partilhado entre módulos. São objetos (e não variáveis soltas)
// para que qualquer módulo os possa alterar.
import { CAM_MODES, SCORE } from './config.js';
import { clamp, storageGet } from './utils.js';

export const game = {
  state: 'loading',            // loading → menu → play → over → play …
  overAt: 0,
  time: 0, selfies: 0, goals: 0, dodges: 0, tvPoints: 0, live: false,
  spawnT: 0, spawnCount: 0,
  stamina: 100,
  dashT: 0, dashCd: 0, dashDir: { x: 0, z: -1 },
  shake: 0, celebrate: 0, lastKick: 0,
  best: +storageGet('invasao3d-best', 0) || 0,
};

export const view = {
  camMode: clamp(Math.floor(+storageGet('invasao3d-cam', 0) || 0), 0, CAM_MODES.length - 1),
  yaw: Math.PI, pitch: 0, bobPh: 0,
};

export const world = {
  xbot: null,                  // modelo 3D carregado (ou null → bonecos simples)
  npcs: [], stewards: [],
  star: null, starRing: null,
  invader: null,
  ball: null, ballMesh: null,
  standTexs: [],
};

export const score = () => Math.floor(game.time * SCORE.perSecond) + game.selfies * SCORE.selfie + game.goals * SCORE.goal
  + game.dodges * SCORE.dodge + Math.floor(game.tvPoints);
export const inGame = () => game.state === 'play' || game.state === 'over';

export const camMode = () => CAM_MODES[view.camMode];
export const relControls = () => camMode().id !== 'tv';                       // controlos relativos ao olhar
export const firstPerson = () => camMode().id === 'peito' || camMode().id === 'cabeca';
