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

// three-mesh-bvh 패치: BVH 가속 레이캐스팅 활성화
(BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
(BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
(Mesh.prototype as any).raycast = acceleratedRaycast;

require('./main.css');

// ── 배포 설정 ─────────────────────────────────────────────────
// 배포할 때 false 로 바꾸면 설정 패널이 완전히 숨겨집니다
const DEV_MODE = true;

// ── localStorage ─────────────────────────────────────────────
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

// ── 로딩 화면 ────────────────────────────────────────────────
const loadingEl = document.createElement('div');
loadingEl.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-size:20px;z-index:999;`;
loadingEl.textContent = '로딩 중...';
document.body.appendChild(loadingEl);

const targetEl = document.createElement('div');
targetEl.className = 'container';
document.body.appendChild(targetEl);

const viewer = new Viewer();
let sky: Sky;

// 태양 연동 DirectionalLight
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

// ── 패널 ─────────────────────────────────────────────────────
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
  console.log(`카메라 위치: x=${p.x.toFixed(3)}, y=${p.y.toFixed(3)}, z=${p.z.toFixed(3)}`);
  console.log(`타겟 위치:   x=${t.x.toFixed(3)}, y=${t.y.toFixed(3)}, z=${t.z.toFixed(3)}`);
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

// ── GLB 로드 ─────────────────────────────────────────────────
const loader = new GLTFLoader();
loader.load(
  '/data/interior-view-of-orthodox-church-of-al-tahira/source/brand%20new%20interior/interior_view_of_orthodox_church_of_al-tahira%20(1).glb',
  (gltf) => {
    const model = gltf.scene;
    // BVH 빌드 (레이캐스팅 100x 가속)
    model.traverse((obj: any) => {
      if (obj.isMesh && obj.geometry) {
        obj.geometry.computeBoundsTree();
      }
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

    // 모델 TransformControls
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

    // 저장
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
        audioSrc: { x: srcX, y: srcY, z: srcZ },
        audioParams: { ...audioParams },
      });
      saveBtn.textContent = '✅ 저장됨';
      setTimeout(() => {
        saveBtn.textContent = '💾 설정 저장';
      }, 1500);
    });

    // 더블클릭 → 새 타겟 설정 (좌우 회전 기준점 변경)
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
        const dx2 = viewer.camera.position.x - p.x;
        const dy2 = viewer.camera.position.y - p.y;
        const dz2 = viewer.camera.position.z - p.z;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2);
        const newPolar = Math.acos(dy2 / dist2);
        viewer.cameraControls.minPolarAngle = newPolar; // 바닥 방향 제한
        viewer.cameraControls.maxPolarAngle = Math.PI; // 천장 자유
        viewer.cameraControls.update();
        console.log(`새 타겟: x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}, z=${p.z.toFixed(2)}`);
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
      viewer.cameraControls.target.set(-1.4539, -9.7561, 1.3890);
    }
    viewer.camera.updateProjectionMatrix();

    // 초기 수직 각도 → 이 아래로는 못 내려가게
    const initTarget = viewer.cameraControls.target;
    const dx = viewer.camera.position.x - initTarget.x;
    const dy = viewer.camera.position.y - initTarget.y;
    const dz = viewer.camera.position.z - initTarget.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const initPolar = Math.acos(dy / dist);
    viewer.cameraControls.minPolarAngle = initPolar; // 현재 각도 위로는 못 올라감 (바닥 안 보임)
    viewer.cameraControls.maxPolarAngle = Math.PI; // 위쪽(천장)은 자유
    viewer.cameraControls.update();

    loadingEl.remove();
  },
  (xhr) => {
    if (xhr.total > 0)
      loadingEl.textContent = `로딩 중... ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
  },
  (err) => console.error('GLB 로드 실패:', err),
);

// ── 음악 플레이어 (공간음향 HRTF) ────────────────────────────

interface AudioParams {
  volume: number; refDistance: number; rolloffFactor: number;
  maxDistance: number; distanceModel: DistanceModelType;
  reverbWet: number; reverbDuration: number; reverbDecay: number;
  earlyReflections: number; preDelay: number;
  airAbsorption: number; stereoWidth: number;
}

interface AudioEmitter {
  id: number; name: string;
  x: number; y: number; z: number;
  params: AudioParams;
  gainNode: GainNode | null; panner: PannerNode | null;
  convolver: ConvolverNode | null; wetGain: GainNode | null;
  dryGain: GainNode | null; preDelayNode: DelayNode | null;
  spatialInputGain: GainNode | null; bypassGain: GainNode | null;
  reflDelays: DelayNode[]; reflGainNodes: GainNode[];
  marker: Sprite; markerSphere: Mesh;
  isInside: boolean; lastAutoDuration: number;
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

// 공간 기반 반사음 (Image Source Method)
let acousticModel: any = null;
const roomRaycaster = new Raycaster();
const insideCheckRaycaster = new Raycaster();
const SPEED_OF_SOUND = 343;
const REFLECT_DIRS = [
  new Vector3(1,0,0), new Vector3(-1,0,0),
  new Vector3(0,1,0), new Vector3(0,-1,0),
  new Vector3(0,0,1), new Vector3(0,0,-1),
];
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
  return hitCount >= 5;
}

function defaultParams(src?: any): AudioParams {
  return {
    volume: src?.volume ?? 1.5, refDistance: src?.refDistance ?? 0.1,
    rolloffFactor: src?.rolloffFactor ?? 1.0, maxDistance: src?.maxDistance ?? 20,
    distanceModel: (src?.distanceModel ?? 'linear') as DistanceModelType,
    reverbWet: src?.reverbWet ?? 0.7625, reverbDuration: src?.reverbDuration ?? 1.56025,
    reverbDecay: src?.reverbDecay ?? 8, earlyReflections: src?.earlyReflections ?? 0.7,
    preDelay: src?.preDelay ?? 0.04, airAbsorption: src?.airAbsorption ?? 0.6,
    stereoWidth: src?.stereoWidth ?? 0.5,
  };
}

function makeImpulseResponse(ctx: AudioContext, duration: number, decay: number, stereoWidth: number): AudioBuffer {
  const rate = ctx.sampleRate, len = Math.floor(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const n = Math.random() * 2 - 1;
      const wide = c === 0
        ? n*(1-stereoWidth*0.5)+(Math.random()*2-1)*stereoWidth*0.5
        : n*(1-stereoWidth*0.5)-(Math.random()*2-1)*stereoWidth*0.5;
      data[i] = wide * Math.pow(Math.max(0, 1-i/len), decay);
    }
  }
  return buf;
}

function ensureAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -18; compressor.knee.value = 8;
    compressor.ratio.value = 3; compressor.attack.value = 0.003; compressor.release.value = 0.25;
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
  em.panner.coneInnerAngle = 90; em.panner.coneOuterAngle = 200; em.panner.coneOuterGain = 0.1;
  em.panner.orientationX.value = 0; em.panner.orientationY.value = 0; em.panner.orientationZ.value = -1;
  em.panner.positionX.value = em.x; em.panner.positionY.value = em.y; em.panner.positionZ.value = em.z;
  em.preDelayNode = audioCtx.createDelay(0.5);
  em.preDelayNode.delayTime.value = p.preDelay;
  em.convolver = audioCtx.createConvolver();
  em.convolver.buffer = makeImpulseResponse(audioCtx, p.reverbDuration, p.reverbDecay, p.stereoWidth);
  em.wetGain = audioCtx.createGain(); em.wetGain.gain.value = p.reverbWet;
  em.dryGain = audioCtx.createGain(); em.dryGain.gain.value = 1.0 - p.reverbWet;
  em.reflDelays = []; em.reflGainNodes = [];
  for (let i = 0; i < 6; i++) {
    const d = audioCtx.createDelay(1.0); d.delayTime.value = 0.05;
    const g = audioCtx.createGain(); g.gain.value = 0;
    em.panner.connect(d); d.connect(g); g.connect(compressor);
    em.reflDelays.push(d); em.reflGainNodes.push(g);
  }
  em.spatialInputGain = audioCtx.createGain(); em.spatialInputGain.gain.value = spatialMode ? 1 : 0;
  em.bypassGain = audioCtx.createGain(); em.bypassGain.gain.value = spatialMode ? 0 : 1;
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
  if (!em.panner || !em.gainNode || !em.wetGain || !em.dryGain || !em.convolver || !audioCtx || !em.preDelayNode) return;
  const p = em.params;
  em.gainNode.gain.value = p.volume;
  em.panner.refDistance = p.refDistance; em.panner.rolloffFactor = p.rolloffFactor;
  em.panner.maxDistance = p.maxDistance; em.panner.distanceModel = p.distanceModel;
  em.wetGain.gain.value = p.reverbWet; em.dryGain.gain.value = 1.0 - p.reverbWet;
  em.preDelayNode.delayTime.value = p.preDelay;
  em.convolver.buffer = makeImpulseResponse(audioCtx, p.reverbDuration, p.reverbDecay, p.stereoWidth);
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
  canvas.width = 128; canvas.height = 128;
  const ctx2d = canvas.getContext('2d')!;
  ctx2d.beginPath(); ctx2d.arc(64, 64, 52, 0, Math.PI * 2);
  ctx2d.fillStyle = 'rgba(80,180,255,0.45)'; ctx2d.fill();
  ctx2d.strokeStyle = 'rgba(120,210,255,0.9)'; ctx2d.lineWidth = 5; ctx2d.stroke();
  ctx2d.font = '52px serif'; ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
  ctx2d.fillText('🔊', 64, 64);
  const tex = new CanvasTexture(canvas);
  const mat = new SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new Sprite(mat);
  sprite.scale.set(0.4, 0.4, 0.4);
  return sprite;
}

function createEmitter(x: number, y: number, z: number, name: string, savedParams?: any): AudioEmitter {
  const id = nextEmitterId++;
  const marker = makeAudioMarker();
  const markerSphere = new Mesh(
    new SphereGeometry(0.05, 12, 12),
    new MeshBasicMaterial({ color: 0x55aaff, depthTest: false, transparent: true, opacity: 0.8 })
  );
  marker.position.set(x, y, z);
  markerSphere.position.set(x, y, z);
  viewer.scene.add(marker);
  viewer.scene.add(markerSphere);
  return {
    id, name, x, y, z, params: defaultParams(savedParams),
    gainNode: null, panner: null, convolver: null,
    wetGain: null, dryGain: null, preDelayNode: null,
    spatialInputGain: null, bypassGain: null,
    reflDelays: [], reflGainNodes: [],
    marker, markerSphere, isInside: true, lastAutoDuration: 0,
  };
}

function removeEmitter(idx: number): void {
  if (emitters.length <= 1) return;
  const em = emitters[idx];
  viewer.scene.remove(em.marker);
  viewer.scene.remove(em.markerSphere);
  try { em.gainNode?.disconnect(); em.panner?.disconnect(); em.convolver?.disconnect(); em.wetGain?.disconnect(); em.dryGain?.disconnect(); } catch {}
  emitters.splice(idx, 1);
  if (activeEmitterIdx >= emitters.length) activeEmitterIdx = emitters.length - 1;
}

// 저장된 emitter 초기화
(function() {
  const savedEmitters = saved.emitters as any[] | undefined;
  if (savedEmitters && savedEmitters.length > 0) {
    for (const se of savedEmitters)
      emitters.push(createEmitter(se.x ?? 7.1655, se.y ?? 25.24, se.z ?? -4.4519, se.name ?? `emitter ${nextEmitterId}`, se.params));
  } else {
    emitters.push(createEmitter(