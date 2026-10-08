// Todos os números para afinar o jogo estão aqui.

// Campo (medidas reais em metros)
export const HL = 52.5;          // meio comprimento
export const HW = 34;            // meia largura
export const GOAL_W = 3.66;      // meia largura da baliza
export const BR = 0.24;          // raio da bola (um pouco maior que o real, para se ver bem)

export const COLORS = {
  home: '#d0202a', away: '#f4f4f4', homeGk: '#1aa34a', awayGk: '#f4a300',
  ref: '#1a1a1a', invader: '#c14bff', steward: '#ffcc00', police: '#1f3a93',
};

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

export const SCORE = { perSecond: 10, selfie: 100, goal: 300 };

export const CAM_MODES = [
  { id: 'tv', name: 'TV', fov: 50 },
  { id: 'ombro', name: 'Ombro', fov: 65 },
  { id: 'peito', name: 'GoPro peito', fov: 110 },
  { id: 'cabeca', name: 'Cabeça', fov: 78 },
];

export const MOUSE_SENSITIVITY = 0.0022;

export const MODEL_URL = import.meta.env.BASE_URL + 'models/Xbot.glb';
