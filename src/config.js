// Todos os números para afinar o jogo estão aqui.

// Campo (medidas reais em metros)
export const HL = 52.5;          // meio comprimento
export const HW = 34;            // meia largura
export const GOAL_W = 3.66;      // meia largura da baliza
export const BR = 0.24;          // raio da bola (um pouco maior que o real, para se ver bem)

// Cor de destaque do invasor (anel e mini-mapa). Os equipamentos estão em entities/kits.js
export const COLORS = { invader: '#c14bff' };

// Invasor (m/s)
export const PLAYER = {
  run: 6.8, sprint: 9.2,
  dash: 17, dashTime: 0.18, dashCooldown: 1.3,
  staminaDrain: 30, staminaRegen: 15,
};

// Seguranças e polícia
export const STEWARDS = {
  poolSize: 18, startCount: 2, spawnEvery: 7, spawnMinDist: 25,
  speedGrowth: 0.045,                         // m/s ganhos por segundo de jogo
  steward: { base: [4.9, 5.5], cap: 7.4, lead: [0.3, 0.9] },
  police: { base: 7.2, cap: 8.6, lead: 0.25, after: 25, every: 3 },
  catchDist: 0.9,
};

// Mergulho dos seguranças para te agarrar
export const DIVE = {
  range: 3.4, minRange: 1.2,     // distância a que decidem atirar-se
  chancePerSec: 1.6,             // probabilidade por segundo quando estão a essa distância
  speed: 10.5, time: 0.42,       // velocidade e duração do voo
  reach: 0.95,                   // alcance dos braços esticados
  downTime: 1.5, getUpTime: 0.5, // tempo no chão e a levantar-se
  cooldown: [4, 7],
};

// Círculo da câmara de TV / ecrã gigante
export const BROADCAST = {
  radius: 5, moveEvery: 14, maxAirtime: 6, minDistFromPlayer: 18,
};

export const SCORE = { perSecond: 10, selfie: 100, goal: 300, dodge: 50, tvPerSecond: 40 };

export const CAM_MODES = [
  { id: 'tv', name: 'TV', fov: 50 },
  { id: 'ombro', name: 'Ombro', fov: 65 },
  { id: 'peito', name: 'GoPro peito', fov: 110 },
  { id: 'cabeca', name: 'Cabeça', fov: 78 },
];

export const MOUSE_SENSITIVITY = 0.0022;

export const MODEL_URL = import.meta.env.BASE_URL + 'models/Xbot.glb';
