import * as THREE from "three";

// Model space is Z-up, front = -Y. +X is the character's LEFT arm.
export const ELBOW_Z = 1290; // boundary between upper arm and forearm/hand

export interface ArmPose {
  pitch: number;
  roll: number;
  flex: number;
  yaw?: number;
}

export interface ArmRig {
  uniforms: {
    uShoulderRot: { value: THREE.Matrix3[] };
    uElbowRot: { value: THREE.Matrix3[] };
    uShoulderPivot: { value: THREE.Vector3[] };
    uElbowPivot: { value: THREE.Vector3[] };
  };
  pose: {
    posX: ArmPose;
    negX: ArmPose;
  };
  apply: () => void;
}

export const createArmRig = (): ArmRig => {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const uniforms = {
    uShoulderRot: { value: [new THREE.Matrix3(), new THREE.Matrix3()] },
    uElbowRot: { value: [new THREE.Matrix3(), new THREE.Matrix3()] },
    uShoulderPivot: { value: [v(320, 0, 1720), v(-320, 0, 1720)] },
    uElbowPivot: { value: [v(480, 0, 1300), v(-480, 0, 1300)] },
  };

  // Degrees. pitch = about X (negative swings the arm forward),
  // roll = about Y (+X arm: negative = outward, -X arm: positive = outward),
  // flex = elbow bend about X (negative bends the forearm forward/up).
  const pose = {
    posX: { pitch: 0, roll: 0, flex: 0, yaw: 0 },
    negX: { pitch: 0, roll: 0, flex: 0, yaw: 0 },
  };

  const e = new THREE.Euler();
  const m4 = new THREE.Matrix4();
  const rad = THREE.MathUtils.degToRad;

  const apply = () => {
    (["posX", "negX"] as const).forEach((k, i) => {
      const p = pose[k];
      e.set(rad(p.pitch), rad(p.roll), rad(p.yaw || 0), "XYZ");
      uniforms.uShoulderRot.value[i].setFromMatrix4(m4.makeRotationFromEuler(e));
      e.set(rad(p.flex), 0, 0, "XYZ");
      uniforms.uElbowRot.value[i].setFromMatrix4(m4.makeRotationFromEuler(e));
    });
  };
  apply();

  return { uniforms, pose, apply };
};

/** 0 = body, 1 = +X upper arm, 2 = +X forearm/hand, 3 = -X upper arm, 4 = -X forearm/hand */
export function buildArmPartIds(geo: THREE.BufferGeometry): Float32Array {
  const pos = geo.attributes.position;
  const index = geo.index;
  const n = pos.count;
  const out = new Float32Array(n);
  if (!index) return out;

  // 1. weld vertices that share a position (UV/normal seams split them)
  const weld = new Int32Array(n);
  const seen = new Map<string, number>();
  let count = 0;
  for (let i = 0; i < n; i++) {
    const key = `${Math.round(pos.getX(i) * 10)}|${Math.round(pos.getY(i) * 10)}|${Math.round(pos.getZ(i) * 10)}`;
    let id = seen.get(key);
    if (id === undefined) {
      id = count++;
      seen.set(key, id);
    }
    weld[i] = id;
  }

  // 2. connected components (union-find)
  const parent = new Int32Array(count);
  for (let i = 0; i < count; i++) parent[i] = i;
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const ia = index.array;
  for (let t = 0; t < ia.length; t += 3) {
    const a = find(weld[ia[t]]),
      b = find(weld[ia[t + 1]]),
      c = find(weld[ia[t + 2]]);
    parent[a] = c;
    parent[b] = c;
  }

  // 3. per-component bounds (minX, maxX, minZ, maxZ)
  const bd = new Float32Array(count * 4);
  for (let r = 0; r < count; r++) {
    bd[r * 4] = Infinity;
    bd[r * 4 + 1] = -Infinity;
    bd[r * 4 + 2] = Infinity;
    bd[r * 4 + 3] = -Infinity;
  }
  for (let i = 0; i < n; i++) {
    const r = find(weld[i]) * 4;
    const x = pos.getX(i),
      z = pos.getZ(i);
    if (x < bd[r]) bd[r] = x;
    if (x > bd[r + 1]) bd[r + 1] = x;
    if (z < bd[r + 2]) bd[r + 2] = z;
    if (z > bd[r + 3]) bd[r + 3] = z;
  }

  // 4. classify by component centre
  for (let i = 0; i < n; i++) {
    const r = find(weld[i]) * 4;
    const cx = (bd[r] + bd[r + 1]) / 2;
    const cz = (bd[r + 2] + bd[r + 3]) / 2;
    if (Math.abs(cx) > 270 && cz > 1000 && cz < 1950) {
      out[i] = (cx > 0 ? 1 : 3) + (cz < ELBOW_Z ? 1 : 0);
    }
  }
  return out;
}

