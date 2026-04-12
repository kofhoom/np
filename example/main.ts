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
const DEV_MODE = false;

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
const sunLight = new DirectionalLight(0xfff5e0, saved.sunLightIntensity ?? 3.0);
sunLight.target.position.set(0, 0, 0);
viewer.scene.add(sunLight);
viewer.scene.add(sunLight.target);

const sunAzimuth = saved.sunAzimuth ?? 170;
const sunElevation = saved.sunElevation ?? 2;

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
  viewer.renderer.toneMappingExposure = saved.exposure ?? 0.87;
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

const ambient = new AmbientLight(0xffffff, saved.ambientIntensity ?? 2.0);
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
    makeSlider('환경광', 0, 2, saved.ambientIntensity ?? 2.0, (v) => {
      ambient.intensity = v;
    });
    makeSlider('노출', 0.2, 3, saved.exposure ?? 0.87, (v) => {
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
    makeSlider('태양 빛 강도', 0, 10, saved.sunLightIntensity ?? 3.0, (v) => {
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
      viewer.camera.position.set(-0.845, -9.833, 0.784);
      viewer.cameraControls.target.set(-1.454, -9.756, 1.389);
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
let audioCtx: AudioContext | null = null;
let panner: PannerNode | null = null;
let gainNode: GainNode | null = null;
let convolver: ConvolverNode | null = null;
let wetGain: GainNode | null = null;
let dryGain: GainNode | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentTrackIdx = 0;
let tracks: string[] = [];
let bufferCache: Map<number, AudioBuffer> = new Map();

// 공간 기반 반사음 (Image Source Method)
let acousticModel: any = null; // GLB 로드 후 설정
const roomRaycaster = new Raycaster();
const SPEED_OF_SOUND = 343; // m/s
const REFLECT_DIRS = [
  new Vector3(1, 0, 0), new Vector3(-1, 0, 0),
  new Vector3(0, 1, 0), new Vector3(0, -1, 0),
  new Vector3(0, 0, 1), new Vector3(0, 0, -1),
];
let reflDelays: DelayNode[] = [];
let reflGainNodes: GainNode[] = [];
let lastAcousticUpdate = 0;
let autoRoomMode = true;
let lastAutoDuration = 0;
let roomSizeEl: HTMLElement | null = null;

// 음향 파라미터 초기값 (저장된 값 우선)
const _savedAudio = saved.audioParams ?? {};
let audioParams = {
  volume:           _savedAudio.volume           ?? 1.0,
  refDistance:      _savedAudio.refDistance      ?? 3,
  rolloffFactor:    _savedAudio.rolloffFactor    ?? 0.5,
  maxDistance:      _savedAudio.maxDistance      ?? 100,
  distanceModel:    (_savedAudio.distanceModel   ?? 'inverse') as DistanceModelType,
  reverbWet:        _savedAudio.reverbWet        ?? 0.65,
  reverbDuration:   _savedAudio.reverbDuration   ?? 4.5,
  reverbDecay:      _savedAudio.reverbDecay      ?? 1.2,
  earlyReflections: _savedAudio.earlyReflections ?? 0.7,  // 조기 반사음 강도
  preDelay:         _savedAudio.preDelay         ?? 0.04, // 프리딜레이 (초)
  airAbsorption:    _savedAudio.airAbsorption    ?? 0.6,  // 거리 기반 고음 흡수량
  stereoWidth:      _savedAudio.stereoWidth      ?? 0.5,  // 리버브 스테레오 폭
};

// 추가 오디오 노드 refs
let preDelayNode: DelayNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

// 확산 잔향 꼬리만 생성 (조기 반사음은 레이캐스터로 실시간 처리)
function makeImpulseResponse(
  ctx: AudioContext, duration: number, decay: number, stereoWidth: number
): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * duration);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      const n = Math.random() * 2 - 1;
      const wide = c === 0
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

    // 볼륨 게인
    gainNode = audioCtx.createGain();
    gainNode.gain.value = audioParams.volume;

    // 공간음향 패너
    panner = audioCtx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = audioParams.distanceModel;
    panner.refDistance = audioParams.refDistance;
    panner.rolloffFactor = audioParams.rolloffFactor;
    panner.maxDistance = audioParams.maxDistance;
    panner.coneInnerAngle = 360;
    panner.positionX.value = srcX;
    panner.positionY.value = srcY;
    panner.positionZ.value = srcZ;

    // 프리딜레이 (직접음→잔향 간격, 공간 크기 감각)
    preDelayNode = audioCtx.createDelay(0.5);
    preDelayNode.delayTime.value = audioParams.preDelay;

    // 확산 잔향 꼬리 (diffuse tail)
    convolver = audioCtx.createConvolver();
    convolver.buffer = makeImpulseResponse(
      audioCtx, audioParams.reverbDuration, audioParams.reverbDecay, audioParams.stereoWidth
    );
    wetGain = audioCtx.createGain();
    wetGain.gain.value = audioParams.reverbWet;
    dryGain = audioCtx.createGain();
    dryGain.gain.value = 1.0 - audioParams.reverbWet;

    // 컴프레서 먼저 생성 (이후 노드들이 여기에 연결됨)
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 8;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;

    // 공간 기반 조기 반사음: 6방향 딜레이 라인
    // panner → delay[i] → reflGain[i] → compressor
    reflDelays = [];
    reflGainNodes = [];
    for (let i = 0; i < 6; i++) {
      const d = audioCtx.createDelay(1.0);
      d.delayTime.value = 0.05;
      const g = audioCtx.createGain();
      g.gain.value = 0;
      panner.connect(d);
      d.connect(g);
      g.connect(compressor);
      reflDelays.push(d);
      reflGainNodes.push(g);
    }

    // 그래프:
    // source → gain → panner ──────────────────────→ dryGain ────→ compressor → dest
    //                        → delay[0~5] → reflGain ────────────→ compressor
    //                        → preDelay → convolver → wetGain ───→ compressor
    gainNode.connect(panner);
    panner.connect(dryGain);
    panner.connect(preDelayNode);
    preDelayNode.connect(convolver);
    convolver.connect(wetGain);
    dryGain.connect(compressor);
    wetGain.connect(compressor);
    compressor.connect(audioCtx.destination);
  }
  return audioCtx;
}

function applyAudioParams(): void {
  if (!panner || !gainNode || !wetGain || !dryGain || !convolver || !audioCtx || !preDelayNode) return;
  gainNode.gain.value = audioParams.volume;
  panner.refDistance = audioParams.refDistance;
  panner.rolloffFactor = audioParams.rolloffFactor;
  panner.maxDistance = audioParams.maxDistance;
  panner.distanceModel = audioParams.distanceModel;
  wetGain.gain.value = audioParams.reverbWet;
  dryGain.gain.value = 1.0 - audioParams.reverbWet;
  preDelayNode.delayTime.value = audioParams.preDelay;
  convolver.buffer = makeImpulseResponse(
    audioCtx, audioParams.reverbDuration, audioParams.reverbDecay, audioParams.stereoWidth
  );
}

// 음원 초기 위치 (저장된 값 우선)
let srcX: number = saved.audioSrc?.x ?? -1.45;
let srcY: number = saved.audioSrc?.y ?? -9.76;
let srcZ: number = saved.audioSrc?.z ?? 1.39;

// ── 음원 위치 마커 (씬에 표시) ──────────────────────────────
function makeAudioMarker(): Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx2d = canvas.getContext('2d')!;
  // 반투명 원
  ctx2d.beginPath();
  ctx2d.arc(64, 64, 52, 0, Math.PI * 2);
  ctx2d.fillStyle = 'rgba(80,180,255,0.45)';
  ctx2d.fill();
  ctx2d.strokeStyle = 'rgba(120,210,255,0.9)';
  ctx2d.lineWidth = 5;
  ctx2d.stroke();
  // 🔊 이모지
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

const audioMarker = makeAudioMarker();
audioMarker.position.set(srcX, srcY, srcZ);
viewer.scene.add(audioMarker);

// 구체 (실제 위치 정확히 표시)
const markerSphere = new Mesh(
  new SphereGeometry(0.05, 12, 12),
  new MeshBasicMaterial({ color: 0x55aaff, depthTest: false, transparent: true, opacity: 0.8 })
);
markerSphere.position.set(srcX, srcY, srcZ);
viewer.scene.add(markerSphere);

function applyPannerPos(): void {
  if (!panner) return;
  panner.positionX.value = srcX;
  panner.positionY.value = srcY;
  panner.positionZ.value = srcZ;
  audioMarker.position.set(srcX, srcY, srcZ);
  markerSphere.position.set(srcX, srcY, srcZ);
}

// ── 플레이어 래퍼 (세로 배치) ──
const playerWrap = document.createElement('div');
playerWrap.style.cssText = `
  position:fixed;top:14px;right:14px;
  font-family:sans-serif;font-size:12px;color:#eee;
  display:flex;flex-direction:column;align-items:flex-end;gap:6px;
  z-index:200;user-select:none;
`;
document.body.appendChild(playerWrap);

// 트랙 바
const playerEl = document.createElement('div');
playerEl.style.cssText = `
  display:flex;align-items:center;gap:8px;
  background:rgba(0,0,0,0.55);padding:7px 12px;border-radius:20px;
  backdrop-filter:blur(4px);
`;
playerWrap.appendChild(playerEl);

const prevBtn = document.createElement('span');
prevBtn.textContent = 'prev';
prevBtn.style.cssText = 'cursor:pointer;opacity:0.7;';

const trackNameEl = document.createElement('span');
trackNameEl.textContent = '로딩 중...';
trackNameEl.style.cssText = 'min-width:120px;text-align:center;max-width:200px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;';

const nextBtn = document.createElement('span');
nextBtn.textContent = 'next';
nextBtn.style.cssText = 'cursor:pointer;opacity:0.7;';

// 음원 위치 토글 버튼
const srcToggleBtn = document.createElement('span');
srcToggleBtn.textContent = '🔊';
srcToggleBtn.title = '음원 위치 조정';
srcToggleBtn.style.cssText = 'cursor:pointer;opacity:0.7;font-size:13px;';

playerEl.appendChild(prevBtn);
playerEl.appendChild(trackNameEl);
playerEl.appendChild(nextBtn);
playerEl.appendChild(srcToggleBtn);

// 음원 위치 조정 패널
const srcPanel = document.createElement('div');
srcPanel.style.cssText = `
  display:none;background:rgba(0,0,0,0.7);padding:10px 14px;
  border-radius:10px;backdrop-filter:blur(4px);min-width:220px;
`;
playerWrap.appendChild(srcPanel);

const srcTitle = document.createElement('div');
srcTitle.textContent = '음원 위치';
srcTitle.style.cssText = 'color:#aaa;font-size:10px;margin-bottom:6px;';
srcPanel.appendChild(srcTitle);

function makeSrcSlider(
  label: string, min: number, max: number, initVal: number,
  onChange: (v: number) => void
): void {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;';
  const lbl = document.createElement('span');
  lbl.textContent = label;
  lbl.style.cssText = 'width:14px;color:#ccc;font-size:11px;flex-shrink:0;';
  const inp = document.createElement('input');
  inp.type = 'range'; inp.min = String(min); inp.max = String(max);
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
    applyPannerPos();
  });
  row.appendChild(lbl); row.appendChild(inp); row.appendChild(val);
  srcPanel.appendChild(row);
}

makeSrcSlider('X', -50, 50, srcX, (v) => { srcX = v; });
makeSrcSlider('Y', -50, 50, srcY, (v) => { srcY = v; });
makeSrcSlider('Z', -50, 50, srcZ, (v) => { srcZ = v; });

// ── 음향 파라미터 슬라이더 ──────────────────────────────────
function makeSep2(label: string): void {
  const d = document.createElement('div');
  d.style.cssText = 'color:#555;font-size:10px;margin:8px 0 3px;border-top:1px solid #333;padding-top:4px;';
  d.textContent = `── ${label} ──`;
  srcPanel.appendChild(d);
}

function makeAudioSlider(
  label: string, min: number, max: number, initVal: number,
  onChange: (v: number) => void
): void {
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;';
  const lbl = document.createElement('span');
  lbl.textContent = label;
  lbl.style.cssText = 'width:90px;color:#ccc;font-size:11px;flex-shrink:0;';
  const inp = document.createElement('input');
  inp.type = 'range'; inp.min = String(min); inp.max = String(max);
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
    applyAudioParams();
  });
  row.appendChild(lbl); row.appendChild(inp); row.appendChild(val);
  srcPanel.appendChild(row);
}

makeSep2('볼륨 / 거리');
makeAudioSlider('볼륨', 0, 2, audioParams.volume, (v) => { audioParams.volume = v; });
makeAudioSlider('기준 거리', 0.1, 30, audioParams.refDistance, (v) => { audioParams.refDistance = v; });
makeAudioSlider('감쇠 계수', 0, 5, audioParams.rolloffFactor, (v) => { audioParams.rolloffFactor = v; });
makeAudioSlider('최대 거리', 10, 500, audioParams.maxDistance, (v) => { audioParams.maxDistance = v; });

// 거리 모델 드롭다운
const modelRow = document.createElement('div');
modelRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0;';
const modelLbl = document.createElement('span');
modelLbl.textContent = '감쇠 방식';
modelLbl.style.cssText = 'width:90px;color:#ccc;font-size:11px;flex-shrink:0;';
const modelSel = document.createElement('select');
modelSel.style.cssText = 'flex:1;background:#222;color:#ccc;border:1px solid #444;border-radius:4px;font-size:11px;padding:2px;';
(['inverse', 'linear', 'exponential'] as DistanceModelType[]).forEach((m) => {
  const opt = document.createElement('option');
  opt.value = m; opt.textContent = m;
  if (m === audioParams.distanceModel) opt.selected = true;
  modelSel.appendChild(opt);
});
modelSel.addEventListener('change', () => {
  audioParams.distanceModel = modelSel.value as DistanceModelType;
  applyAudioParams();
});
modelRow.appendChild(modelLbl); modelRow.appendChild(modelSel);
srcPanel.appendChild(modelRow);

makeSep2('리버브 (잔향)');
makeAudioSlider('Wet (잔향량)', 0, 1, audioParams.reverbWet, (v) => { audioParams.reverbWet = v; });
makeAudioSlider('잔향 길이(초)', 0.1, 10, audioParams.reverbDuration, (v) => { audioParams.reverbDuration = v; });
makeAudioSlider('감쇠 곡선', 0.1, 8, audioParams.reverbDecay, (v) => { audioParams.reverbDecay = v; });
makeAudioSlider('조기 반사음', 0, 1.5, audioParams.earlyReflections, (v) => { audioParams.earlyReflections = v; });
makeAudioSlider('프리딜레이(초)', 0, 0.2, audioParams.preDelay, (v) => { audioParams.preDelay = v; });
makeAudioSlider('스테레오 폭', 0, 1, audioParams.stereoWidth, (v) => { audioParams.stereoWidth = v; });

makeSep2('공간 감지 (자동)');

// 자동 모드 토글
const autoRow = document.createElement('div');
autoRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;';
const autoToggle = document.createElement('input');
autoToggle.type = 'checkbox'; autoToggle.checked = autoRoomMode;
const autoLbl = document.createElement('span');
autoLbl.textContent = '공간 기반 잔향 자동 조절';
autoLbl.style.cssText = 'color:#ccc;font-size:11px;';
autoRow.appendChild(autoToggle); autoRow.appendChild(autoLbl);
srcPanel.appendChild(autoRow);
autoToggle.addEventListener('change', () => { autoRoomMode = autoToggle.checked; });

// 감지 상태 표시
roomSizeEl = document.createElement('div');
(roomSizeEl as HTMLElement).style.cssText =
  'color:#5af;font-size:10px;margin:4px 0 6px;min-height:14px;';
(roomSizeEl as HTMLElement).textContent = '모델 로드 후 활성화';
srcPanel.appendChild(roomSizeEl as HTMLElement);

makeAudioSlider('반사 강도', 0, 2, audioParams.earlyReflections, (v) => { audioParams.earlyReflections = v; });

// 현재 카메라 위치를 음원 위치로 복사
const snapBtn = document.createElement('button');
snapBtn.textContent = '📍 현재 위치로 설정';
snapBtn.style.cssText = 'margin-top:6px;width:100%;background:#333;color:#ddd;border:none;padding:5px;border-radius:6px;cursor:pointer;font-size:11px;';
snapBtn.addEventListener('click', () => {
  srcX = viewer.camera.position.x;
  srcY = viewer.camera.position.y;
  srcZ = viewer.camera.position.z;
  applyPannerPos();
  // 슬라이더 값 갱신
  srcPanel.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((inp, i) => {
    inp.value = String([srcX, srcY, srcZ][i]);
    (inp.nextSibling as HTMLElement).textContent = [srcX, srcY, srcZ][i].toFixed(2);
  });
  console.log(`음원 위치 설정: x=${srcX.toFixed(3)}, y=${srcY.toFixed(3)}, z=${srcZ.toFixed(3)}`);
});
srcPanel.appendChild(snapBtn);

// ── 카메라 기준 방향 이동 ──────────────────────────────────
makeSep2('카메라 기준 이동');

// 이동 단위 설정
const stepRow = document.createElement('div');
stepRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin:3px 0 6px;';
const stepLbl = document.createElement('span');
stepLbl.textContent = '이동 단위';
stepLbl.style.cssText = 'width:90px;color:#ccc;font-size:11px;flex-shrink:0;';
const stepInp = document.createElement('input');
stepInp.type = 'number'; stepInp.value = '0.5'; stepInp.step = '0.1'; stepInp.min = '0.01';
stepInp.style.cssText = 'flex:1;background:#222;color:#ccc;border:1px solid #444;border-radius:4px;font-size:11px;padding:2px 4px;';
stepRow.appendChild(stepLbl); stepRow.appendChild(stepInp);
srcPanel.appendChild(stepRow);

function refreshXYZSliders(): void {
  srcPanel.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((inp, i) => {
    if (i > 2) return; // X/Y/Z 슬라이더만
    inp.value = String([srcX, srcY, srcZ][i]);
    (inp.nextSibling as HTMLElement).textContent = [srcX, srcY, srcZ][i].toFixed(2);
  });
}

function moveSrcInCameraDir(axis: 'forward' | 'right' | 'up', sign: number): void {
  const step = parseFloat(stepInp.value) || 0.5;
  const fwd = new Vector3();
  viewer.camera.getWorldDirection(fwd);
  fwd.y = 0; fwd.normalize(); // 수평 전진

  const right = new Vector3();
  right.crossVectors(fwd, new Vector3(0, 1, 0)).normalize();

  let dir = new Vector3();
  if (axis === 'forward') dir.copy(fwd);
  else if (axis === 'right') dir.copy(right);
  else dir.set(0, 1, 0);

  srcX += dir.x * step * sign;
  srcY += dir.y * step * sign;
  srcZ += dir.z * step * sign;
  applyPannerPos();
  refreshXYZSliders();
}

const dirGrid = document.createElement('div');
dirGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-top:2px;';

const dirBtns: [string, () => void][] = [
  ['↑ 위',    () => moveSrcInCameraDir('up', 1)],
  ['▲ 앞',   () => moveSrcInCameraDir('forward', 1)],
  ['↓ 아래', () => moveSrcInCameraDir('up', -1)],
  ['◀ 좌',   () => moveSrcInCameraDir('right', -1)],
  ['▼ 뒤',   () => moveSrcInCameraDir('forward', -1)],
  ['▶ 우',   () => moveSrcInCameraDir('right', 1)],
];
dirBtns.forEach(([label, fn]) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = 'background:#2a2a2a;color:#ccc;border:1px solid #444;padding:4px 2px;border-radius:4px;cursor:pointer;font-size:10px;';
  btn.addEventListener('click', fn);
  dirGrid.appendChild(btn);
});
srcPanel.appendChild(dirGrid);

srcToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  srcPanel.style.display = srcPanel.style.display === 'none' ? 'block' : 'none';
});

function getTrackDisplayName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').replace(/-/g, ' ');
}

async function playTrack(idx: number): Promise<void> {
  if (tracks.length === 0) return;
  currentTrackIdx = ((idx % tracks.length) + tracks.length) % tracks.length;

  const ctx = ensureAudioCtx();
  if (ctx.state === 'suspended') await ctx.resume();

  trackNameEl.textContent = '⏳ ' + getTrackDisplayName(tracks[currentTrackIdx]);

  try {
    let audioBuf = bufferCache.get(currentTrackIdx);
    if (!audioBuf) {
      const res = await fetch(`/data/song/${encodeURIComponent(tracks[currentTrackIdx])}`);
      const arrayBuf = await res.arrayBuffer();
      audioBuf = await ctx.decodeAudioData(arrayBuf);
      bufferCache.set(currentTrackIdx, audioBuf);
    }

    if (currentSource) {
      currentSource.onended = null;
      try { currentSource.stop(); } catch {}
      currentSource = null;
    }

    currentSource = ctx.createBufferSource();
    currentSource.buffer = audioBuf;
    currentSource.connect(gainNode!);
    currentSource.onended = () => playTrack(currentTrackIdx + 1);
    currentSource.start(0);

    trackNameEl.textContent = '♪ ' + getTrackDisplayName(tracks[currentTrackIdx]);
  } catch (e) {
    console.error('트랙 로드 실패:', e);
    trackNameEl.textContent = '오류: ' + tracks[currentTrackIdx];
  }
}

// 리스너 위치 업데이트 (카메라 따라 이동)
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



  // 공간 기반 조기 반사음 + 자동 음향 파라미터
  if (acousticModel && reflDelays.length === 6) {
    const now = Date.now();
    if (now - lastAcousticUpdate > 200) {
      lastAcousticUpdate = now;
      (roomRaycaster as any).firstHitOnly = true;

      const wallDists: number[] = [];

      for (let i = 0; i < 6; i++) {
        roomRaycaster.set(viewer.camera.position, REFLECT_DIRS[i]);
        const hits = roomRaycaster.intersectObject(acousticModel, true);
        if (hits.length > 0) {
          const wallDist = hits[0].distance;
          wallDists.push(wallDist);
          const delayTime = Math.min((2 * wallDist) / SPEED_OF_SOUND, 0.9);
          // 딜레이 타임 변화 시 팅팅 소리 방지: 긴 time constant (0.6s)
          reflDelays[i].delayTime.setTargetAtTime(delayTime, audioCtx.currentTime, 0.6);
          const reflGain = Math.min(0.35, audioParams.earlyReflections / (wallDist * 0.5 + 1));
          reflGainNodes[i].gain.setTargetAtTime(reflGain, audioCtx.currentTime, 0.4);
        } else {
          wallDists.push(audioParams.maxDistance);
          reflGainNodes[i].gain.setTargetAtTime(0, audioCtx.currentTime, 0.4);
        }
      }

      // ── 자동 공간 음향 계산 ───────────────────────────────
      if (autoRoomMode && wetGain && dryGain && preDelayNode) {
        const avgDist = wallDists.reduce((a, b) => a + b, 0) / wallDists.length;
        const srcDist = viewer.camera.position.distanceTo(new Vector3(srcX, srcY, srcZ));

        // 방 크기 → 프리딜레이 (공간이 클수록 직접음-잔향 간격 증가)
        const autoPreDelay = Math.min(0.12, Math.max(0.005, avgDist * 0.004));

        // wet = 거리 성분 × 방 크기 성분
        // - 음원에서 멀수록: 직접음 약해지고 반사음 비율 증가 → wet↑
        // - 방이 클수록: 더 많은 반사 → wet↑
        const distFactor = Math.min(1.0, srcDist / (audioParams.refDistance * 3));
        const roomFactor = Math.min(1.0, avgDist / 30);
        const autoWet = Math.min(0.88, Math.max(0.1, 0.15 + distFactor * 0.45 + roomFactor * 0.3));

        // 볼륨: panner가 거리 감쇠 처리하지만, 방 크기에 따라 전체 레벨 보정
        // 큰 공간일수록 소리가 퍼져서 작아지는 것을 반영
        const autoVol = Math.min(1.8, Math.max(0.3, audioParams.volume * (1.0 / (roomFactor * 0.5 + 1) + 0.5)));

        // 모든 전환에 긴 time constant → 부드럽고 자연스러운 변화
        wetGain.gain.setTargetAtTime(autoWet, audioCtx.currentTime, 1.2);
        dryGain.gain.setTargetAtTime(1.0 - autoWet, audioCtx.currentTime, 1.2);
        preDelayNode.delayTime.setTargetAtTime(autoPreDelay, audioCtx.currentTime, 1.0);
        if (gainNode) gainNode.gain.setTargetAtTime(autoVol, audioCtx.currentTime, 1.2);

        // IR은 실시간 교체 안 함 (클릭 소음 원인) → 처음 한 번만 생성
        if (lastAutoDuration === 0 && convolver && audioCtx) {
          lastAutoDuration = Math.min(7.0, Math.max(0.5, avgDist * 0.18));
          convolver.buffer = makeImpulseResponse(
            audioCtx, lastAutoDuration, audioParams.reverbDecay, audioParams.stereoWidth
          );
        }

        if (roomSizeEl != null) {
          (roomSizeEl as HTMLElement).textContent =
            `공간: ~${avgDist.toFixed(1)}m  음원거리: ${srcDist.toFixed(1)}m  wet: ${(autoWet * 100).toFixed(0)}%  vol: ${autoVol.toFixed(2)}`;
        }
      }
    }
  }
}, 50);

prevBtn.addEventListener('click', () => playTrack(currentTrackIdx - 1));
nextBtn.addEventListener('click', () => playTrack(currentTrackIdx + 1));
// 첫 클릭 / 터치 시 자동재생 시작 (브라우저 autoplay 정책)
const startAudio = () => {
  document.removeEventListener('click', startAudio);
  document.removeEventListener('touchstart', startAudio);
  playTrack(0);
};
document.addEventListener('click', startAudio);
document.addEventListener('touchstart', startAudio);

// 트랙 목록 로드
fetch('/data/song/tracks.json')
  .then((r) => r.json())
  .then((list: string[]) => {
    tracks = list;
    trackNameEl.textContent = getTrackDisplayName(tracks[0] ?? '트랙 없음');
  })
  .catch(() => { trackNameEl.textContent = '트랙 없음'; });
