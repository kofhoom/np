import { Viewer } from './viewer';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { Sky } from 'three/examples/jsm/objects/Sky';
import {
  AmbientLight,
  DirectionalLight,
  Box3,
  Vector3,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Raycaster,
  Vector2,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  SpriteMaterial,
  Sprite,
  CanvasTexture,
  BufferGeometry,
} from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

(BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
(BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
(Mesh.prototype as any).raycast = acceleratedRaycast;

require('./main.css');

const DEV_MODE = true;

const STORAGE_KEY = 'church_viewer_settings';
function loadSettings(): any {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveSettings(data: any): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
const saved = loadSettings();

const loadingEl = document.createElement('div');
loadingEl.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:20px;z-index:999;`;
loadingEl.textContent = '로딩 중...';
document.body.appendChild(loadingEl);

const targetEl = document.createElement('div');
targetEl.className = 'container';
document.body.appendChild(targetEl);

const viewer = new Viewer();
let sky: Sky;

const sunLight = new DirectionalLight(0xfff5e0, saved.sunLightIntensity ?? 3.15);
sunLight.target.position.set(0, 0, 0);
viewer.scene.add(sunLight);
viewer.scene.add(sunLight.target);

const sunAzimuth = saved.sunAzimuth ?? 315;
const sunElevation = saved.sunElevation ?? 19.675;

function updateSun(azDeg: number, elDeg: number): void {
  if (!sky) return;
  const phi = (90 - elDeg) * (Math.PI / 180);
  const theta = azDeg * (Math.PI / 180);
  const x = Math.sin(phi) * Math.cos(theta);
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);
  sky.material.uniforms['sunPosition'].value.set(x, y, z);
  sunLight.position.set(x * 500, y * 500, z * 500);
  sunLight.target.updateMatrixWorld();
}

viewer.initialize(targetEl).then(() => {
  viewer.renderer.toneMapping = ACESFilmicToneMapping;
  viewer.renderer.toneMappingExposure = saved.exposure ?? 0.284;
  viewer.renderer.outputColorSpace = SRGBColorSpace;
  sky = new Sky();
  sky.scale.setScalar(450000);
  viewer.scene.add(sky);
  const u = sky.material.uniforms;
  u['turbidity'].value = 10;
  u['rayleigh'].value = 3;
  u['mieCoefficient'].value = 0.005;
  u['mieDirectionalG'].value = 0.7;
  updateSun(sunAzimuth, sunElevation);
});

const ambient = new AmbientLight(0xffffff, saved.ambientIntensity ?? 1.66);
viewer.scene.add(ambient);

const panel = document.createElement('div');
panel.style.cssText = `position:fixed;top:10px;right:10px;background:rgba(0,0,0,0.75);padding:12px;border-radius:8px;font-family:sans-serif;z-index:100;min-width:290px;max-height:90vh;overflow-y:auto;`;
if (!DEV_MODE) panel.style.display = 'none';
document.body.appendChild(panel);

const titleEl = document.createElement('div');
titleEl.textContent = '설정 컨트롤';
titleEl.style.cssText = 'color:#fff;font-size:14px;font-weight:bold;margin-bottom:8px;';
panel.appendChild(titleEl);

const topRow = document.createElement('div');
topRow.style.cssText = 'display:flex;gap:6px;margin-bottom:10px;';
const saveBtn = document.createElement('button');
saveBtn.textContent = '💾 설정 저장';
saveBtn.style.cssText =
  'flex:1;background:#226622;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:12px;';
const coordBtn = document.createElement('button');
coordBtn.textContent = '📍 좌표 확인';
coordBtn.style.cssText =
  'flex:1;background:#554400;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:12px;';
coordBtn.addEventListener('click', () => {
  const p = viewer.camera.position;
  const t = viewer.cameraControls.target;
  alert(
    `카메라: (${p.x.toFixed(3)}, ${p.y.toFixed(3)}, ${p.z.toFixed(3)})\n타겟: (${t.x.toFixed(3)}, ${t.y.toFixed(3)}, ${t.z.toFixed(3)})`,
  );
});
const hideBtn = document.createElement('button');
hideBtn.textContent = '패널 숨기기';
hideBtn.style.cssText =
  'flex:1;background:#444;color:#fff;border:none;padding:6px;border-radius:4px;cursor:pointer;font-size:12px;';
topRow.appendChild(saveBtn);
topRow.appendChild(coordBtn);
topRow.appendChild(hideBtn);
panel.appendChild(topRow);

hideBtn.addEventListener('click', () => {
  panel.style.display = 'none';
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'h' || e.key === 'H')
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveBtn.click();
  }
});

function makeSlider(
  label: string,
  min: number,
  max: number,
  value: number,
  onChange: (v: number) => void,
): void {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;';
  const lbl = document.createElement('span');
  lbl.textContent = label;
  lbl.style.cssText = 'width:115px;font-size:11px;color:#ccc;flex-shrink:0;';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String((max - min) / 200);
  input.value = String(value);
  input.style.cssText = 'flex:1;';
  const valEl = document.createElement('span');
  valEl.textContent = value.toFixed(2);
  valEl.style.cssText = 'width:38px;font-size:11px;color:#aaa;text-align:right;';
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    valEl.textContent = v.toFixed(2);
    onChange(v);
  });
  wrap.appendChild(lbl);
  wrap.appendChild(input);
  wrap.appendChild(valEl);
  panel.appendChild(wrap);
}

function sep(label: string): void {
  const d = document.createElement('div');
  d.style.cssText =
    'color:#666;font-size:11px;margin:8px 0 3px;border-top:1px solid #333;padding-top:5px;';
  d.textContent = `── ${label} ──`;
  panel.appendChild(d);
}

// ── GLB 로드 ──────────────────────────────────────────────────
const loader = new GLTFLoader();

const GLB_CHUNKS = [
  'data/model/model.part0',
  'data/model/model.part1',
  'data/model/model.part2',
  'data/model/model.part3',
];

(async () => {
  try {
    loadingEl.textContent = '모델 로딩 중...';
    const buffers = await Promise.all(
      GLB_CHUNKS.map(async (url, i) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`chunk ${i} failed: ${res.status}`);
        return res.arrayBuffer();
      }),
    );
    const total = buffers.reduce((s, b) => s + b.byteLength, 0);
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const buf of buffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }
    loader.parse(
      combined.buffer,
      '',
      (gltf) => {
        const model = gltf.scene;
        model.traverse((obj: any) => {
          if (obj.isMesh && obj.geometry) obj.geometry.computeBoundsTree();
        });
        acousticModel = model;
        if (saved.model) {
          model.position.set(saved.model.px, saved.model.py, saved.model.pz);
          model.rotation.set(saved.model.rx, saved.model.ry, saved.model.rz);
          model.scale.set(saved.model.sx, saved.model.sy, saved.model.sz);
        } else {
          model.position.set(0, -11.4688, 0);
          model.rotation.set(-Math.PI, 0.7596, -Math.PI);
        }
        viewer.scene.add(model);
        model.updateMatrixWorld(true);

        const box = new Box3().setFromObject(model);
        const center = new Vector3();
        box.getCenter(center);
        const size = new Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 50;

        sep('모델 변환');
        const modelTC = new TransformControls(viewer.camera, viewer.renderer.domElement);
        modelTC.attach(model);
        modelTC.addEventListener('dragging-changed', (e: any) => {
          viewer.cameraControls.enabled = !e.value;
        });
        viewer.scene.add(modelTC);

        const modelBtnRow = document.createElement('div');
        modelBtnRow.style.cssText = 'display:flex;gap:6px;margin:4px 0;';
        (['이동', '회전', '크기', '숨기기'] as const).forEach((txt, i) => {
          const btn = document.createElement('button');
          btn.textContent = txt;
          btn.style.cssText = `flex:1;background:${i === 0 ? '#2255aa' : '#444'};color:#fff;border:none;padding:4px;border-radius:4px;cursor:pointer;font-size:10px;`;
          btn.addEventListener('click', () => {
            if (i === 3) {
              modelTC.visible = false;
            } else {
              modelTC.visible = true;
              modelTC.setMode(['translate', 'rotate', 'scale'][i] as any);
            }
            modelBtnRow.querySelectorAll('button').forEach((b, j) => {
              (b as HTMLElement).style.background = j === i ? '#2255aa' : '#444';
            });
          });
          modelBtnRow.appendChild(btn);
        });
        panel.appendChild(modelBtnRow);

        sep('전역 설정');
        makeSlider('환경광', 0, 2, saved.ambientIntensity ?? 1.66, (v) => {
          ambient.intensity = v;
        });
        makeSlider('노출', 0.2, 3, saved.exposure ?? 0.284, (v) => {
          viewer.renderer.toneMappingExposure = v;
        });

        sep('☀️ 태양 위치');
        let curAz = sunAzimuth,
          curEl = sunElevation;
        makeSlider('방위각 (좌우)', 0, 360, sunAzimuth, (v) => {
          curAz = v;
          updateSun(curAz, curEl);
        });
        makeSlider('고도 (상하)', -5, 30, sunElevation, (v) => {
          curEl = v;
          updateSun(curAz, curEl);
        });
        makeSlider('태양 빛 강도', 0, 10, saved.sunLightIntensity ?? 3.15, (v) => {
          sunLight.intensity = v;
        });

        saveBtn.addEventListener('click', () => {
          saveSettings({
            ...loadSettings(),
            model: {
              px: model.position.x,
              py: model.position.y,
              pz: model.position.z,
              rx: model.rotation.x,
              ry: model.rotation.y,
              rz: model.rotation.z,
              sx: model.scale.x,
              sy: model.scale.y,
              sz: model.scale.z,
            },
            camera: {
              px: viewer.camera.position.x,
              py: viewer.camera.position.y,
              pz: viewer.camera.position.z,
              tx: viewer.cameraControls.target.x,
              ty: viewer.cameraControls.target.y,
              tz: viewer.cameraControls.target.z,
            },
            ambientIntensity: ambient.intensity,
            exposure: viewer.renderer.toneMappingExposure,
            sunAzimuth: curAz,
            sunElevation: curEl,
            sunLightIntensity: sunLight.intensity,
            emitters: emitters.map((em) => ({
              name: em.name,
              x: em.x,
              y: em.y,
              z: em.z,
              params: { ...em.params },
            })),
          });
          saveBtn.textContent = '✅ 저장됨';
          setTimeout(() => {
            saveBtn.textContent = '💾 설정 저장';
          }, 1500);
        });

        const raycaster = new Raycaster();
        targetEl.addEventListener('dblclick', (e) => {
          const mouse = new Vector2(
            (e.clientX / window.innerWidth) * 2 - 1,
            -(e.clientY / window.innerHeight) * 2 + 1,
          );
          raycaster.setFromCamera(mouse, viewer.camera);
          const hits = raycaster.intersectObject(model, true);
          if (hits.length > 0) {
            const p = hits[0].point;
            viewer.cameraControls.target.set(p.x, p.y, p.z);
            const dx2 = viewer.camera.position.x - p.x,
              dy2 = viewer.camera.position.y - p.y,
              dz2 = viewer.camera.position.z - p.z;
            const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2);
            viewer.cameraControls.minPolarAngle = Math.acos(dy2 / dist2);
            viewer.cameraControls.maxPolarAngle = Math.PI;
            viewer.cameraControls.update();
          }
        });

        viewer.camera.up.set(0, 1, 0);
        viewer.camera.near = 0.01;
        viewer.camera.far = maxDim * 1000;
        if (saved.camera) {
          viewer.camera.position.set(saved.camera.px, saved.camera.py, saved.camera.pz);
          viewer.cameraControls.target.set(saved.camera.tx, saved.camera.ty, saved.camera.tz);
        } else {
          viewer.camera.position.set(-2.0876, -9.8333, 1.9685);
          viewer.cameraControls.target.set(-1.4539, -9.7561, 1.389);
        }
        viewer.camera.updateProjectionMatrix();

        const initTarget = viewer.cameraControls.target;
        const dx = viewer.camera.position.x - initTarget.x,
          dy = viewer.camera.position.y - initTarget.y,
          dz = viewer.camera.position.z - initTarget.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        viewer.cameraControls.minPolarAngle = Math.acos(dy / dist);
        viewer.cameraControls.maxPolarAngle = Math.PI;
        viewer.cameraControls.update();
        loadingEl.remove();
      },
      (err) => console.error('GLB 로드 실패:', err),
    );
  } catch (err) {
    console.error('GLB 로드 실패:', err);
    loadingEl.textContent = 'GLB 로드 실패';
  }
})();

// ── 음악 플레이어 (공간음향 HRTF) ─────────────────────────────

interface AudioParams {
  volume: number;
  refDistance: number;
  rolloffFactor: number;
  maxDistance: number;
  distanceModel: DistanceModelType;
  reverbWet: number;
  reverbDuration: number;
  reverbDecay: number;
  earlyReflections: number;
  preDelay: number;
  airAbsorption: number;
  stereoWidth: number;
}

interface AudioEmitter {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  params: AudioParams;
  gainNode: GainNode | null;
  panner: PannerNode | null;
  convolver: ConvolverNode | null;
  wetGain: GainNode | null;
  dryGain: GainNode | null;
  preDelayNode: DelayNode | null;
  spatialInputGain: GainNode | null;
  bypassGain: GainNode | null;
  reflDelays: DelayNode[];
  reflGainNodes: GainNode[];
  marker: Sprite;
  markerSphere: Mesh;
  isInside: boolean;
  lastAutoDuration: number;
}

let audioCtx: AudioContext | null = null;
let compressor: DynamicsCompressorNode | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentTrackIdx = 0;
let tracks: string[] = [];
const bufferCache: Map<number, AudioBuffer> = new Map();

let emitters: AudioEmitter[] = [];
let activeEmitterIdx = 0;
let nextEmitterId = 0;
const activeEm = (): AudioEmitter => emitters[activeEmitterIdx];

let acousticModel: any = null;
const roomRaycaster = new Raycaster();
const insideCheckRaycaster = new Raycaster();
const SPEED_OF_SOUND = 343;
const _s = 1 / Math.sqrt(3);
const REFLECT_DIRS = [
  // 6 축방향
  new Vector3(1, 0, 0),
  new Vector3(-1, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, -1, 0),
  new Vector3(0, 0, 1),
  new Vector3(0, 0, -1),
  // 8 대각선방향 (ico-sphere 근사)
  new Vector3(_s, _s, _s),
  new Vector3(-_s, _s, _s),
  new Vector3(_s, -_s, _s),
  new Vector3(-_s, -_s, _s),
  new Vector3(_s, _s, -_s),
  new Vector3(-_s, _s, -_s),
  new Vector3(_s, -_s, -_s),
  new Vector3(-_s, -_s, -_s),
];

// 재질별 음향 흡수계수 (0=완전반사, 1=완전흡수)
const MATERIAL_ABSORPTION: Record<string, number> = {
  stone: 0.02,
  concrete: 0.03,
  brick: 0.04,
  plaster: 0.05,
  wood: 0.1,
  glass: 0.04,
  metal: 0.02,
  carpet: 0.35,
  fabric: 0.4,
  curtain: 0.5,
  cushion: 0.45,
  foam: 0.6,
  default: 0.05,
};

function getMaterialAbsorption(hit: any): number {
  const mat = hit.object?.material;
  if (!mat) return MATERIAL_ABSORPTION['default'];
  const name = ((Array.isArray(mat) ? mat[0] : mat).name ?? '').toLowerCase();
  for (const [key, val] of Object.entries(MATERIAL_ABSORPTION)) {
    if (key !== 'default' && name.includes(key)) return val;
  }
  return MATERIAL_ABSORPTION['default'];
}
let lastAcousticUpdate = 0;
let autoRoomMode = true;
let spatialMode = true;
let roomSizeEl: HTMLElement | null = null;

function isPointInsideMesh(px: number, py: number, pz: number): boolean {
  if (!acousticModel) return true;
  const origin = new Vector3(px, py, pz);
  let hitCount = 0;
  (insideCheckRaycaster as any).firstHitOnly = true;
  for (const dir of REFLECT_DIRS) {
    insideCheckRaycaster.set(origin, dir);
    if (insideCheckRaycaster.intersectObject(acousticModel, true).length > 0) hitCount++;
  }
  return hitCount >= Math.ceil(REFLECT_DIRS.length * 0.78);
}

function defaultParams(src?: any): AudioParams {
  return {
    volume: src?.volume ?? 1.5,
    refDistance: src?.refDistance ?? 0.1,
    rolloffFactor: src?.rolloffFactor ?? 1.0,
    maxDistance: src?.maxDistance ?? 150,
    distanceModel: (src?.distanceModel ?? 'linear') as DistanceModelType,
    reverbWet: src?.reverbWet ?? 0.7625,
    reverbDuration: src?.reverbDuration ?? 1.56025,
    reverbDecay: src?.reverbDecay ?? 8,
    earlyReflections: src?.earlyReflections ?? 0.7,
    preDelay: src?.preDelay ?? 0.04,
    airAbsorption: src?.airAbsorption ?? 0.6,
    stereoWidth: src?.stereoWidth ?? 0.5,
  };
}

function makeImpulseResponse(
  ctx: AudioContext,
  duration: number,
  decay: number,
  stereoWidth: number,
): AudioBuffer {
  const rate = ctx.sampleRate,
    len = Math.floor(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const n = Math.random() * 2 - 1;
      const wide =
        c === 0
          ? n * (1 - stereoWidth * 0.5) + (Math.random() * 2 - 1) * stereoWidth * 0.5
          : n * (1 - stereoWidth * 0.5) - (Math.random() * 2 - 1) * stereoWidth * 0.5;
      data[i] = wide * Math.pow(Math.max(0, 1 - i / len), decay);
    }
  }
  return buf;
}

function ensureAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(audioCtx.destination);
    for (const em of emitters) createEmitterNodes(em);
  }
  return audioCtx;
}

function createEmitterNodes(em: AudioEmitter): void {
  if (!audioCtx || !compressor || em.gainNode) return;
  const p = em.params;
  em.gainNode = audioCtx.createGain();
  em.gainNode.gain.value = p.volume;
  em.panner = audioCtx.createPanner();
  em.panner.panningModel = 'HRTF';
  em.panner.distanceModel = p.distanceModel;
  em.panner.refDistance = p.refDistance;
  em.panner.rolloffFactor = p.rolloffFactor;
  em.panner.maxDistance = p.maxDistance;
  em.panner.coneInnerAngle = 90;
  em.panner.coneOuterAngle = 200;
  em.panner.coneOuterGain = 0.1;
  em.panner.orientationX.value = 0;
  em.panner.orientationY.value = 0;
  em.panner.orientationZ.value = -1;
  em.panner.positionX.value = em.x;
  em.panner.positionY.value = em.y;
  em.panner.positionZ.value = em.z;
  em.preDelayNode = audioCtx.createDelay(0.5);
  em.preDelayNode.delayTime.value = p.preDelay;
  em.convolver = audioCtx.createConvolver();
  em.convolver.buffer = makeImpulseResponse(
    audioCtx,
    p.reverbDuration,
    p.reverbDecay,
    p.stereoWidth,
  );
  em.wetGain = audioCtx.createGain();
  em.wetGain.gain.value = p.reverbWet;
  em.dryGain = audioCtx.createGain();
  em.dryGain.gain.value = 1.0 - p.reverbWet;
  em.reflDelays = [];
  em.reflGainNodes = [];
  for (let i = 0; i < REFLECT_DIRS.length; i++) {
    const d = audioCtx.createDelay(1.0);
    d.delayTime.value = 0.05;
    const g = audioCtx.createGain();
    g.gain.value = 0;
    em.panner.connect(d);
    d.connect(g);
    g.connect(compressor);
    em.reflDelays.push(d);
    em.reflGainNodes.push(g);
  }
  em.spatialInputGain = audioCtx.createGain();
  em.spatialInputGain.gain.value = spatialMode ? 1 : 0;
  em.bypassGain = audioCtx.createGain();
  em.bypassGain.gain.value = spatialMode ? 0 : 1;
  em.gainNode.connect(em.spatialInputGain);
  em.spatialInputGain.connect(em.panner);
  em.panner.connect(em.dryGain);
  em.panner.connect(em.preDelayNode);
  em.preDelayNode.connect(em.convolver);
  em.convolver.connect(em.wetGain);
  em.dryGain.connect(compressor);
  em.wetGain.connect(compressor);
  em.gainNode.connect(em.bypassGain);
  em.bypassGain.connect(compressor);
  if (currentSource) currentSource.connect(em.gainNode);
}

function applyEmitterPos(em: AudioEmitter): void {
  if (em.panner) {
    em.panner.positionX.value = em.x;
    em.panner.positionY.value = em.y;
    em.panner.positionZ.value = em.z;
  }
  em.marker.position.set(em.x, em.y, em.z);
  em.markerSphere.position.set(em.x, em.y, em.z);
  em.isInside = isPointInsideMesh(em.x, em.y, em.z);
  (em.markerSphere.material as MeshBasicMaterial).color.setHex(em.isInside ? 0x55aaff : 0xff3333);
  (em.markerSphere.material as MeshBasicMaterial).opacity = em.isInside ? 0.8 : 1.0;
}

function applyEmitterParams(em: AudioEmitter): void {
  if (
    !em.panner ||
    !em.gainNode ||
    !em.wetGain ||
    !em.dryGain ||
    !em.convolver ||
    !audioCtx ||
    !em.preDelayNode
  )
    return;
  const p = em.params;
  em.gainNode.gain.value = p.volume;
  em.panner.refDistance = p.refDistance;
  em.panner.rolloffFactor = p.rolloffFactor;
  em.panner.maxDistance = p.maxDistance;
  em.panner.distanceModel = p.distanceModel;
  em.wetGain.gain.value = p.reverbWet;
  em.dryGain.gain.value = 1.0 - p.reverbWet;
  em.preDelayNode.delayTime.value = p.preDelay;
  em.convolver.buffer = makeImpulseResponse(
    audioCtx,
    p.reverbDuration,
    p.reverbDecay,
    p.stereoWidth,
  );
}

function setSpatialMode(on: boolean): void {
  spatialMode = on;
  if (!audioCtx) return;
  for (const em of emitters) {
    em.spatialInputGain?.gain.setTargetAtTime(on ? 1 : 0, audioCtx.currentTime, 0.05);
    em.bypassGain?.gain.setTargetAtTime(on ? 0 : 1, audioCtx.currentTime, 0.05);
  }
}

function makeAudioMarker(): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx2d = canvas.getContext('2d')!;
  ctx2d.beginPath();
  ctx2d.arc(64, 64, 52, 0, Math.PI * 2);
  ctx2d.fillStyle = 'rgba(80,180,255,0.45)';
  ctx2d.fill();
  ctx2d.strokeStyle = 'rgba(120,210,255,0.9)';
  ctx2d.lineWidth = 5;
  ctx2d.stroke();
  ctx2d.font = '52px serif';
  ctx2d.textAlign = 'center';
  ctx2d.textBaseline = 'middle';
  ctx2d.fillText('🔊', 64, 64);
  const tex = new CanvasTexture(canvas);
  const mat = new SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new Sprite(mat);
  sprite.scale.set(0.4, 0.4, 0.4);
  return sprite;
}

function createEmitter(
  x: number,
  y: number,
  z: number,
  name: string,
  savedParams?: any,
): AudioEmitter {
  const id = nextEmitterId++;
  const marker = makeAudioMarker();
  const markerSphere = new Mesh(
    new SphereGeometry(0.05, 12, 12),
    new MeshBasicMaterial({ color: 0x55aaff, depthTest: false, transparent: true, opacity: 0.8 }),
  );
  marker.position.set(x, y, z);
  markerSphere.position.set(x, y, z);
  viewer.scene.add(marker);
  viewer.scene.add(markerSphere);
  return {
    id,
    name,
    x,
    y,
    z,
    params: defaultParams(savedParams),
    gainNode: null,
    panner: null,
    convolver: null,
    wetGain: null,
    dryGain: null,
    preDelayNode: null,
    spatialInputGain: null,
    bypassGain: null,
    reflDelays: [],
    reflGainNodes: [],
    marker,
    markerSphere,
    isInside: true,
    lastAutoDuration: 0,
  };
}

// 저장된 emitter 초기화
(function () {
  const savedEmitters = saved.emitters as any[] | undefined;
  if (savedEmitters && savedEmitters.length > 0) {
    for (const se of savedEmitters)
      emitters.push(
        createEmitter(
          se.x ?? 7.1655,
          se.y ?? 25.24,
          se.z ?? -4.4519,
          se.name ?? `emitter ${nextEmitterId}`,
          se.params,
        ),
      );
  } else {
    emitters.push(
      createEmitter(
        saved.audioSrc?.x ?? 7.1655,
        saved.audioSrc?.y ?? 25.24,
        saved.audioSrc?.z ?? -4.4519,
        'emitter 1',
        saved.audioParams,
      ),
    );
  }
})();

// ── 플레이어 UI ───────────────────────────────────────────────
const playerWrap = document.createElement('div');
playerWrap.style.cssText = `position:fixed;top:14px;right:14px;font-family:sans-serif;font-size:12px;color:#eee;display:flex;flex-direction:column;align-items:flex-end;gap:6px;z-index:200;user-select:none;`;
document.body.appendChild(playerWrap);

const playerEl = document.createElement('div');
playerEl.style.cssText = `display:flex;align-items:center;gap:8px;background:rgba(0,0,0,0.55);padding:7px 12px;border-radius:20px;backdrop-filter:blur(4px);`;
playerWrap.appendChild(playerEl);

const prevBtn = document.createElement('span');
prevBtn.textContent = 'prev';
prevBtn.style.cssText = 'cursor:pointer;opacity:0.7;';

const trackNameEl = document.createElement('span');
trackNameEl.textContent = '로딩 중...';
trackNameEl.style.cssText =
  'min-width:120px;text-align:center;max-width:200px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';

const nextBtn = document.createElement('span');
nextBtn.textContent = 'next';
nextBtn.style.cssText = 'cursor:pointer;opacity:0.7;';

const spatialBtn = document.createElement('span');
spatialBtn.textContent = '360';
spatialBtn.title = '360 공간음향 on/off';
spatialBtn.style.cssText =
  'cursor:pointer;font-size:11px;font-weight:bold;padding:2px 5px;border-radius:4px;background:rgba(80,180,255,0.35);color:#7df;';
spatialBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const next = !spatialMode;
  setSpatialMode(next);
  spatialBtn.style.background = next ? 'rgba(80,180,255,0.35)' : 'rgba(80,80,80,0.4)';
  spatialBtn.style.color = next ? '#7df' : '#888';
});

const srcToggleBtn = document.createElement('span');
srcToggleBtn.textContent = '🔊';
srcToggleBtn.title = DEV_MODE ? '음원 위치 조정' : '볼륨';
srcToggleBtn.style.cssText = 'cursor:pointer;opacity:0.7;font-size:13px;';

playerEl.appendChild(prevBtn);
playerEl.appendChild(trackNameEl);
playerEl.appendChild(nextBtn);
playerEl.appendChild(spatialBtn);
playerEl.appendChild(srcToggleBtn);

// ── 볼륨 노브 패널 (배포 모드) ───────────────────────────────
const volPanel = document.createElement('div');
volPanel.style.cssText = `background:rgba(0,0,0,0.72);padding:14px 16px;border-radius:12px;backdrop-filter:blur(6px);flex-direction:column;align-items:center;gap:8px;min-width:90px;`;
playerWrap.appendChild(volPanel);
volPanel.style.display = 'none';

const volLabel = document.createElement('div');
volLabel.textContent = '볼륨';
volLabel.style.cssText = 'color:#aaa;font-size:10px;';
volPanel.appendChild(volLabel);

const volKnobWrap = document.createElement('div');
volKnobWrap.style.cssText =
  'position:relative;width:56px;height:56px;display:flex;align-items:center;justify-content:center;';

const volRing = document.createElement('div');
volRing.style.cssText =
  'position:absolute;inset:0;border-radius:50%;background:rgba(255,255,255,0.07);border:2px solid rgba(255,255,255,0.15);';
volKnobWrap.appendChild(volRing);

const volKnobInput = document.createElement('input');
volKnobInput.type = 'range';
volKnobInput.min = '0';
volKnobInput.max = '2';
volKnobInput.step = '0.01';
volKnobInput.value = String(activeEm().params.volume);
volKnobInput.style.cssText = `writing-mode:vertical-lr;direction:rtl;width:44px;height:44px;cursor:pointer;-webkit-appearance:slider-vertical;appearance:slider-vertical;opacity:0.01;position:absolute;inset:0;margin:auto;z-index:2;`;
volKnobWrap.appendChild(volKnobInput);

const volNeedle = document.createElement('div');
volNeedle.style.cssText = `position:absolute;bottom:50%;left:50%;width:2px;height:20px;background:#7df;border-radius:2px;transform-origin:bottom center;transform:translateX(-50%) rotate(0deg);pointer-events:none;z-index:1;`;
volKnobWrap.appendChild(volNeedle);

const volValueEl = document.createElement('div');
volValueEl.style.cssText = 'color:#7df;font-size:11px;font-weight:bold;';

function updateVolKnob(v: number): void {
  const deg = (v / 2) * 270 - 135;
  volNeedle.style.transform = `translateX(-50%) rotate(${deg}deg)`;
  volValueEl.textContent = Math.round(v * 100) + '%';
  const em = activeEm();
  em.params.volume = v;
  if (em.gainNode && audioCtx) em.gainNode.gain.setTargetAtTime(v, audioCtx.currentTime, 0.05);
}

volKnobInput.addEventListener('input', () => updateVolKnob(parseFloat(volKnobInput.value)));
updateVolKnob(activeEm().params.volume);

volPanel.appendChild(volKnobWrap);
volPanel.appendChild(volValueEl);

// ── DEV 모드: 음원 패널 ───────────────────────────────────────
const srcPanel = document.createElement('div');
srcPanel.style.cssText = `display:none;background:rgba(0,0,0,0.7);padding:10px 14px;border-radius:10px;backdrop-filter:blur(4px);min-width:220px;`;
playerWrap.appendChild(srcPanel);

const srcTitle = document.createElement('div');
srcTitle.textContent = '음원 위치';
srcTitle.style.cssText = 'color:#aaa;font-size:10px;margin-bottom:6px;';
srcPanel.appendChild(srcTitle);

function makeSrcSlider(
  label: string,
  min: number,
  max: number,
  initVal: number,
  onChange: (v: number) => void,
): void {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;';
  const lbl = document.createElement('span');
  lbl.textContent = label;
  lbl.style.cssText = 'width:14px;color:#ccc;font-size:11px;flex-shrink:0;';
  const inp = document.createElement('input');
  inp.type = 'range';
  inp.min = String(min);
  inp.max = String(max);
  inp.step = String((max - min) / 400);
  inp.value = String(initVal);
  inp.style.cssText = 'flex:1;';
  const val = document.createElement('span');
  val.textContent = initVal.toFixed(2);
  val.style.cssText = 'width:42px;font-size:11px;color:#aaa;text-align:right;';
  inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    val.textContent = v.toFixed(2);
    onChange(v);
    applyEmitterPos(activeEm());
  });
  row.appendChild(lbl);
  row.appendChild(inp);
  row.appendChild(val);
  srcPanel.appendChild(row);
}

function makeSep2(label: string): void {
  const d = document.createElement('div');
  d.style.cssText =
    'color:#555;font-size:10px;margin:8px 0 3px;border-top:1px solid #333;padding-top:4px;';
  d.textContent = `── ${label} ──`;
  srcPanel.appendChild(d);
}

function makeAudioSlider(
  label: string,
  min: number,
  max: number,
  initVal: number,
  onChange: (v: number) => void,
): void {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;';
  const lbl = document.createElement('span');
  lbl.textContent = label;
  lbl.style.cssText = 'width:90px;color:#ccc;font-size:11px;flex-shrink:0;';
  const inp = document.createElement('input');
  inp.type = 'range';
  inp.min = String(min);
  inp.max = String(max);
  inp.step = String((max - min) / 400);
  inp.value = String(initVal);
  inp.style.cssText = 'flex:1;';
  const val = document.createElement('span');
  val.textContent = initVal.toFixed(2);
  val.style.cssText = 'width:42px;font-size:11px;color:#aaa;text-align:right;';
  inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    val.textContent = v.toFixed(2);
    onChange(v);
    applyEmitterParams(activeEm());
  });
  row.appendChild(lbl);
  row.appendChild(inp);
  row.appendChild(val);
  srcPanel.appendChild(row);
}

const em0 = activeEm();
makeSrcSlider('X', -50, 50, em0.x, (v) => {
  activeEm().x = v;
});
makeSrcSlider('Y', -50, 50, em0.y, (v) => {
  activeEm().y = v;
});
makeSrcSlider('Z', -50, 50, em0.z, (v) => {
  activeEm().z = v;
});

makeSep2('볼륨 / 거리');
makeAudioSlider('볼륨', 0, 2, em0.params.volume, (v) => {
  activeEm().params.volume = v;
});
makeAudioSlider('기준 거리', 0.1, 30, em0.params.refDistance, (v) => {
  activeEm().params.refDistance = v;
});
makeAudioSlider('감쇠 계수', 0, 5, em0.params.rolloffFactor, (v) => {
  activeEm().params.rolloffFactor = v;
});
makeAudioSlider('최대 거리', 10, 500, em0.params.maxDistance, (v) => {
  activeEm().params.maxDistance = v;
});

const distModelRow = document.createElement('div');
distModelRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;';
const distModelLbl = document.createElement('span');
distModelLbl.textContent = '감쇠 방식';
distModelLbl.style.cssText = 'width:90px;color:#ccc;font-size:11px;flex-shrink:0;';
const distModelSel = document.createElement('select');
distModelSel.style.cssText =
  'flex:1;background:#222;color:#ccc;border:1px solid #444;border-radius:4px;font-size:11px;padding:2px;';
(['inverse', 'linear', 'exponential'] as DistanceModelType[]).forEach((m) => {
  const opt = document.createElement('option');
  opt.value = m;
  opt.textContent = m;
  if (m === em0.params.distanceModel) opt.selected = true;
  distModelSel.appendChild(opt);
});
distModelSel.addEventListener('change', () => {
  activeEm().params.distanceModel = distModelSel.value as DistanceModelType;
  applyEmitterParams(activeEm());
});
distModelRow.appendChild(distModelLbl);
distModelRow.appendChild(distModelSel);
srcPanel.appendChild(distModelRow);

makeSep2('리버브 (잔향)');
makeAudioSlider('Wet (잔향량)', 0, 1, em0.params.reverbWet, (v) => {
  activeEm().params.reverbWet = v;
});
makeAudioSlider('잔향 길이(초)', 0.1, 10, em0.params.reverbDuration, (v) => {
  activeEm().params.reverbDuration = v;
});
makeAudioSlider('감쇠 곡선', 0.1, 8, em0.params.reverbDecay, (v) => {
  activeEm().params.reverbDecay = v;
});
makeAudioSlider('조기 반사음', 0, 1.5, em0.params.earlyReflections, (v) => {
  activeEm().params.earlyReflections = v;
});
makeAudioSlider('프리딜레이(초)', 0, 0.2, em0.params.preDelay, (v) => {
  activeEm().params.preDelay = v;
});
makeAudioSlider('스테레오 폭', 0, 1, em0.params.stereoWidth, (v) => {
  activeEm().params.stereoWidth = v;
});

makeSep2('공간 감지 (자동)');

const autoRow = document.createElement('div');
autoRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;';
const autoToggle = document.createElement('input');
autoToggle.type = 'checkbox';
autoToggle.checked = autoRoomMode;
const autoRoomLabel = document.createElement('span');
autoRoomLabel.textContent = '공간 기반 잔향 자동 조절';
autoRoomLabel.style.cssText = 'color:#ccc;font-size:11px;';
autoRow.appendChild(autoToggle);
autoRow.appendChild(autoRoomLabel);
srcPanel.appendChild(autoRow);
autoToggle.addEventListener('change', () => {
  autoRoomMode = autoToggle.checked;
});

roomSizeEl = document.createElement('div');
roomSizeEl.style.cssText = 'color:#5af;font-size:10px;margin:4px 0 6px;min-height:14px;';
roomSizeEl.textContent = '모델 로드 후 활성화';
srcPanel.appendChild(roomSizeEl);

makeAudioSlider('반사 강도', 0, 2, em0.params.earlyReflections, (v) => {
  activeEm().params.earlyReflections = v;
});

const snapBtn = document.createElement('button');
snapBtn.textContent = '📍 현재 위치로 설정';
snapBtn.style.cssText =
  'margin-top:6px;width:100%;background:#333;color:#ddd;border:none;padding:5px;border-radius:6px;cursor:pointer;font-size:11px;';
snapBtn.addEventListener('click', () => {
  const em = activeEm();
  em.x = viewer.camera.position.x;
  em.y = viewer.camera.position.y;
  em.z = viewer.camera.position.z;
  applyEmitterPos(em);
  srcPanel.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((inp, i) => {
    if (i > 2) return;
    const vals = [em.x, em.y, em.z];
    inp.value = String(vals[i]);
    (inp.nextSibling as HTMLElement).textContent = vals[i].toFixed(2);
  });
});
srcPanel.appendChild(snapBtn);

makeSep2('카메라 기준 이동');

const stepRow = document.createElement('div');
stepRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0 6px;';
const stepLbl = document.createElement('span');
stepLbl.textContent = '이동 단위';
stepLbl.style.cssText = 'width:90px;color:#ccc;font-size:11px;flex-shrink:0;';
const stepInp = document.createElement('input');
stepInp.type = 'number';
stepInp.value = '0.5';
stepInp.step = '0.1';
stepInp.min = '0.01';
stepInp.style.cssText =
  'flex:1;background:#222;color:#ccc;border:1px solid #444;border-radius:4px;font-size:11px;padding:2px 4px;';
stepRow.appendChild(stepLbl);
stepRow.appendChild(stepInp);
srcPanel.appendChild(stepRow);

function refreshXYZSliders(): void {
  const em = activeEm();
  srcPanel.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((inp, i) => {
    if (i > 2) return;
    const vals = [em.x, em.y, em.z];
    inp.value = String(vals[i]);
    (inp.nextSibling as HTMLElement).textContent = vals[i].toFixed(2);
  });
}

function moveSrc(axis: 'forward' | 'right' | 'up', sign: number): void {
  const step = parseFloat(stepInp.value) || 0.5;
  const fwd = new Vector3();
  viewer.camera.getWorldDirection(fwd);
  fwd.y = 0;
  fwd.normalize();
  const right = new Vector3();
  right.crossVectors(fwd, new Vector3(0, 1, 0)).normalize();
  const dir = new Vector3();
  if (axis === 'forward') dir.copy(fwd);
  else if (axis === 'right') dir.copy(right);
  else dir.set(0, 1, 0);
  const em = activeEm();
  em.x += dir.x * step * sign;
  em.y += dir.y * step * sign;
  em.z += dir.z * step * sign;
  applyEmitterPos(em);
  refreshXYZSliders();
}

const dirGrid = document.createElement('div');
dirGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:2px;';

const dirBtns: [string, () => void][] = [
  ['↑ 위', () => moveSrc('up', 1)],
  ['▲ 앞', () => moveSrc('forward', 1)],
  ['↓ 아래', () => moveSrc('up', -1)],
  ['◀ 좌', () => moveSrc('right', -1)],
  ['▼ 뒤', () => moveSrc('forward', -1)],
  ['▶ 우', () => moveSrc('right', 1)],
];
dirBtns.forEach(([label, fn]) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText =
    'background:#2a2a2a;color:#ccc;border:1px solid #444;padding:4px 2px;border-radius:4px;cursor:pointer;font-size:10px;';
  btn.addEventListener('click', fn);
  dirGrid.appendChild(btn);
});
srcPanel.appendChild(dirGrid);

srcToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (DEV_MODE) {
    srcPanel.style.display = srcPanel.style.display === 'none' ? 'block' : 'none';
    volPanel.style.display = 'none';
  } else {
    const showing = volPanel.style.display !== 'none';
    volPanel.style.display = showing ? 'none' : 'flex';
    srcPanel.style.display = 'none';
  }
});

// ── 플레이어 함수 ──────────────────────────────────────────────
function updateNavButtons(): void {
  prevBtn.style.visibility = currentTrackIdx === 0 ? 'hidden' : 'visible';
  nextBtn.style.visibility = currentTrackIdx === tracks.length - 1 ? 'hidden' : 'visible';
}

function getTrackDisplayName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/-/g, ' ');
}

async function playTrack(idx: number): Promise<void> {
  if (tracks.length === 0) return;
  currentTrackIdx = ((idx % tracks.length) + tracks.length) % tracks.length;
  updateNavButtons();
  const ctx = ensureAudioCtx();
  if (ctx.state === 'suspended') await ctx.resume();
  trackNameEl.textContent = '⏳ ' + getTrackDisplayName(tracks[currentTrackIdx]);
  try {
    let audioBuf = bufferCache.get(currentTrackIdx);
    if (!audioBuf) {
      const res = await fetch(`data/song/${encodeURIComponent(tracks[currentTrackIdx])}`);
      const arrayBuf = await res.arrayBuffer();
      audioBuf = await ctx.decodeAudioData(arrayBuf);
      bufferCache.set(currentTrackIdx, audioBuf);
    }
    if (currentSource) {
      currentSource.onended = null;
      try {
        currentSource.stop();
      } catch {}
      currentSource = null;
    }
    currentSource = ctx.createBufferSource();
    currentSource.buffer = audioBuf;
    for (const em of emitters) {
      if (em.gainNode) currentSource.connect(em.gainNode);
    }
    currentSource.onended = () => {
      if (currentTrackIdx < tracks.length - 1) playTrack(currentTrackIdx + 1);
    };
    currentSource.start(0);
    trackNameEl.textContent = '♪ ' + getTrackDisplayName(tracks[currentTrackIdx]);
  } catch (e) {
    console.error('트랙 로드 실패:', e);
    trackNameEl.textContent = '오류: ' + tracks[currentTrackIdx];
  }
}

// ── 음향 루프 (50ms) ──────────────────────────────────────────
setInterval(() => {
  if (!audioCtx || audioCtx.state !== 'running') return;
  const pos = viewer.camera.position;
  const fwd = new Vector3();
  viewer.camera.getWorldDirection(fwd);
  const up = viewer.camera.up;
  const l = audioCtx.listener;
  l.positionX.value = pos.x;
  l.positionY.value = pos.y;
  l.positionZ.value = pos.z;
  l.forwardX.value = fwd.x;
  l.forwardY.value = fwd.y;
  l.forwardZ.value = fwd.z;
  l.upX.value = up.x;
  l.upY.value = up.y;
  l.upZ.value = up.z;

  if (acousticModel) {
    const now = Date.now();
    if (now - lastAcousticUpdate > 200) {
      lastAcousticUpdate = now;
      (roomRaycaster as any).firstHitOnly = true;

      const wallDists: number[] = [];
      const wallAbsorptions: number[] = [];
      for (let i = 0; i < REFLECT_DIRS.length; i++) {
        roomRaycaster.set(viewer.camera.position, REFLECT_DIRS[i]);
        const hits = roomRaycaster.intersectObject(acousticModel, true);
        if (hits.length > 0) {
          wallDists.push(hits[0].distance);
          wallAbsorptions.push(getMaterialAbsorption(hits[0]));
        } else {
          wallDists.push(100);
          wallAbsorptions.push(MATERIAL_ABSORPTION['default']);
        }
      }

      const listenerIsInside = isPointInsideMesh(pos.x, pos.y, pos.z);

      for (const em of emitters) {
        if (!em.gainNode || !audioCtx) continue;

        if (em.reflDelays.length === REFLECT_DIRS.length) {
          for (let i = 0; i < REFLECT_DIRS.length; i++) {
            const wallDist = wallDists[i];
            const absorption = wallAbsorptions[i];
            const delayTime = Math.min((2 * wallDist) / SPEED_OF_SOUND, 0.9);
            em.reflDelays[i].delayTime.setTargetAtTime(delayTime, audioCtx.currentTime, 0.6);
            const reflGain =
              wallDist < 100
                ? Math.min(
                    0.35,
                    (em.params.earlyReflections * (1 - absorption)) / (wallDist * 0.5 + 1),
                  )
                : 0;
            em.reflGainNodes[i].gain.setTargetAtTime(reflGain, audioCtx.currentTime, 0.4);
          }
        }

        if (autoRoomMode && em.wetGain && em.dryGain && em.preDelayNode) {
          const avgDist = wallDists.reduce((a, b) => a + b, 0) / wallDists.length;
          const srcDist = viewer.camera.position.distanceTo(new Vector3(em.x, em.y, em.z));
          const bothInside = em.isInside && listenerIsInside;

          if (!bothInside) {
            em.wetGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
            em.dryGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
            em.gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
          } else {
            const autoPreDelay = Math.min(0.12, Math.max(0.005, avgDist * 0.004));
            const distFactor = Math.min(1.0, srcDist / (em.params.refDistance * 3));
            const roomFactor = Math.min(1.0, avgDist / 30);
            const autoWet = Math.min(
              0.88,
              Math.max(0.1, 0.15 + distFactor * 0.45 + roomFactor * 0.3),
            );
            const autoVol = Math.min(1.8, Math.max(0.02, em.params.volume / (srcDist * 0.15 + 1)));
            const autoStereoWidth = Math.min(1.0, Math.max(0.05, avgDist / 25));

            em.wetGain.gain.setTargetAtTime(autoWet, audioCtx.currentTime, 1.2);
            em.dryGain.gain.setTargetAtTime(1.0 - autoWet, audioCtx.currentTime, 1.2);
            em.preDelayNode.delayTime.setTargetAtTime(autoPreDelay, audioCtx.currentTime, 1.0);
            em.gainNode.gain.setTargetAtTime(autoVol, audioCtx.currentTime, 1.2);

            if (em.lastAutoDuration === 0 && em.convolver) {
              em.lastAutoDuration = Math.min(7.0, Math.max(0.5, avgDist * 0.18));
              em.convolver.buffer = makeImpulseResponse(
                audioCtx,
                em.lastAutoDuration,
                em.params.reverbDecay,
                autoStereoWidth,
              );
            }

            if (roomSizeEl && em === activeEm()) {
              roomSizeEl.textContent = `공간: ~${avgDist.toFixed(1)}m  음원거리: ${srcDist.toFixed(1)}m  wet: ${(autoWet * 100).toFixed(0)}%  vol: ${autoVol.toFixed(2)}  stereo: ${autoStereoWidth.toFixed(2)}`;
            }
          }
        }
      }
    }
  }
}, 50);

prevBtn.addEventListener('click', () => playTrack(currentTrackIdx - 1));
nextBtn.addEventListener('click', () => playTrack(currentTrackIdx + 1));

const startAudio = () => {
  document.removeEventListener('click', startAudio);
  document.removeEventListener('touchstart', startAudio);
  playTrack(0);
};
document.addEventListener('click', startAudio);
document.addEventListener('touchstart', startAudio);

fetch('data/song/tracks.json')
  .then((r) => r.json())
  .then((list: string[]) => {
    tracks = list;
    trackNameEl.textContent = getTrackDisplayName(tracks[0] ?? '트랙 없음');
    updateNavButtons();
    // 유저가 이미 클릭했지만 tracks가 아직 안 로드됐던 경우 → 지금 재생
    if (audioCtx) playTrack(0);
  })
  .catch(() => {
    trackNameEl.textContent = '트랙 없음';
  });
