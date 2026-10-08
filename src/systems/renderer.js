// Motor 3D: renderer, cena, câmara, luzes e pós-processamento (lente GoPro).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.prepend(renderer.domElement);

export const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a1424');
scene.fog = new THREE.Fog('#0a1424', 110, 260);

export const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 600);

// Luzes de jogo noturno; o "sol" segue a câmara para as sombras ficarem nítidas
scene.add(new THREE.HemisphereLight('#cfe0ff', '#24402a', 1.2));
export const sun = new THREE.DirectionalLight('#ffffff', 2.8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

// Lente olho-de-peixe da GoPro
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const fisheye = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, k: { value: 0.18 }, aspect: { value: innerWidth / innerHeight } },
  vertexShader: `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float k; uniform float aspect; varying vec2 vUv;
    void main() {
      vec2 p = vUv * 2.0 - 1.0;
      p.x *= aspect;
      float r2 = dot(p, p), m2 = aspect * aspect + 1.0;
      vec2 q = p * (1.0 + k * r2) / (1.0 + k * m2);
      q.x /= aspect;
      vec4 c = texture2D(tDiffuse, q * 0.5 + 0.5);
      float v = smoothstep(1.05, 0.6, sqrt(r2 / m2));
      gl_FragColor = vec4(c.rgb * v, c.a);
    }`,
});
composer.addPass(fisheye);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  fisheye.uniforms.aspect.value = innerWidth / innerHeight;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

export function render(withFisheye) {
  if (withFisheye) composer.render();
  else renderer.render(scene, camera);
}
