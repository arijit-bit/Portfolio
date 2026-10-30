import * as THREE from "three";

export type PoseEntry = {
  x?: number;
  y?: number;
  z?: number;
  twist?: number; // degrees about the bone's long axis
  range?: [number, number]; // portion of the scroll progress (0..1) in which this bone moves
  local?: boolean;          // true = rotate in the bone's own local axes (fingers), false = character space
};
export type PoseValues = Record<string, PoseEntry>;

export const normalizeBoneName = (name: string) =>
  name.replace(/^mixamorig:?/, "").replace(/_\d+$/, "");

// Degrees, in CHARACTER space (faces +Z, Y up, +X = character's left):
//  x = pitch (negative swings an arm/leg forward; positive tilts the torso forward or bends the knees)
//  y = twist about the vertical axis, z = roll (positive lifts the LEFT limb outward, negative the RIGHT limb)
export const ACTION_POSE: PoseValues = {
  // Extended repulsor arm (character's LEFT, screen-right toward cards)
  LeftShoulder: { z: 12, range: [0.1, 0.9] },
  LeftArm:      { x: -84, y: -10, z: 24, range: [0.1, 0.9] },
  LeftForeArm:  { x: -12, twist: 70, range: [0.1, 0.9] },
  LeftHand:     { x: -15, twist: 20, range: [0.3, 1] },

  // Left hand: open palm with fingers spread and slightly bent back
  LeftHandIndex1:  { x: -20, z: 10, local: true, range: [0.3, 0.95] },
  LeftHandMiddle1: { x: -20, local: true, range: [0.3, 0.95] },
  LeftHandRing1:   { x: -20, z: -8, local: true, range: [0.3, 0.95] },
  LeftHandPinky1:  { x: -20, z: -16, local: true, range: [0.3, 0.95] },
  LeftHandThumb1:  { y: -25, local: true, range: [0.3, 0.95] },

  // Back arm (character's RIGHT, screen-left): out and back, elbow bent, fist closed
  RightShoulder: { z: -4, range: [0.1, 0.9] },
  RightArm:      { x: 28, y: -5, z: -32, range: [0.1, 0.9] },
  RightForeArm:  { x: -82, y: -10, range: [0.15, 0.95] },
  RightHand:     { x: 18, z: 8, range: [0.3, 0.95] },

  // Fist: bone-local curl (local X flexes finger segments into palm)
  RightHandIndex1:  { x: 75, local: true, range: [0.4, 0.95] },
  RightHandIndex2:  { x: 80, local: true, range: [0.4, 0.95] },
  RightHandIndex3:  { x: 50, local: true, range: [0.4, 0.95] },
  RightHandMiddle1: { x: 75, local: true, range: [0.4, 0.95] },
  RightHandMiddle2: { x: 80, local: true, range: [0.4, 0.95] },
  RightHandMiddle3: { x: 50, local: true, range: [0.4, 0.95] },
  RightHandRing1:   { x: 75, local: true, range: [0.4, 0.95] },
  RightHandRing2:   { x: 80, local: true, range: [0.4, 0.95] },
  RightHandRing3:   { x: 50, local: true, range: [0.4, 0.95] },
  RightHandPinky1:  { x: 75, local: true, range: [0.4, 0.95] },
  RightHandPinky2:  { x: 80, local: true, range: [0.4, 0.95] },
  RightHandPinky3:  { x: 50, local: true, range: [0.4, 0.95] },
  RightHandThumb1:  { x: 35, y: -20, local: true, range: [0.4, 0.95] },
  RightHandThumb2:  { x: 35, local: true, range: [0.4, 0.95] },

  // Torso twist toward the extended arm + head turned to look along it
  Spine:  { x: 4, y: -5, range: [0, 0.8] },
  Spine1: { x: 5, y: -8, range: [0, 0.8] },
  Spine2: { x: 3, y: -8, range: [0, 0.8] },
  Neck:   { y: 15, range: [0.1, 0.9] },
  Head:   { x: 3, y: 22, z: -4, range: [0.1, 0.9] },

  // Wide stance, knees bent, feet kept flat (foot angles compensate hip + knee angles)
  LeftUpLeg:  { x: -10, z: 18, range: [0, 0.7] },
  LeftLeg:    { x: 22, range: [0, 0.7] },
  LeftFoot:   { x: -12, z: -18, range: [0, 0.7] },
  RightUpLeg: { x: 12, z: -18, range: [0, 0.7] },
  RightLeg:   { x: 26, range: [0, 0.7] },
  RightFoot:  { x: -36, z: 18, range: [0, 0.7] },
};

const smoothstep = (t: number) => t * t * (3 - 2 * t);

export const createRiggedPose = (
  character: THREE.Object3D,
  target: PoseValues = ACTION_POSE
) => {
  character.updateWorldMatrix(true, true);
  const charInv = character.getWorldQuaternion(new THREE.Quaternion()).invert();

  const bones: Record<
    string,
    {
      bone: THREE.Bone;
      restLocal: THREE.Quaternion;
      restWorld: THREE.Quaternion;
      axis: THREE.Vector3;
    }
  > = {};
  character.traverse((o: any) => {
    if (!o.isBone) return;
    bones[normalizeBoneName(o.name)] = {
      bone: o,
      restLocal: o.quaternion.clone(),
      restWorld: charInv.clone().multiply(o.getWorldQuaternion(new THREE.Quaternion())),
      axis: (() => {
        const c = o.children.find((ch: any) => ch.isBone);
        return c ? c.position.clone().normalize() : new THREE.Vector3(0, 1, 0);
      })(),
    };
  });

  // Foot planting: lower the Hips so the lowest foot stays at its rest height (character space)
  const hips = bones["Hips"]?.bone;
  const feet = ["LeftFoot", "RightFoot"].map((k) => bones[k]?.bone).filter(Boolean) as THREE.Bone[];
  const restHipsPos = hips?.position.clone();
  const _v = new THREE.Vector3();
  const lowestFootY = () => {
    character.updateWorldMatrix(true, true);
    return Math.min(...feet.map((f) => character.worldToLocal(f.getWorldPosition(_v)).y));
  };
  const restFootY = feet.length ? lowestFootY() : 0;

  // Repulsor palm light and chest reactor light
  const palmLight = new THREE.PointLight(0x8ae0ff, 0, 8);
  const leftHandBone = bones["LeftHand"]?.bone;
  if (leftHandBone) {
    palmLight.position.set(0, 0.5, 0.2);
    leftHandBone.add(palmLight);
  }

  const chestLight = new THREE.PointLight(0xa0e4ff, 0, 10);
  const spine2Bone = bones["Spine2"]?.bone;
  if (spine2Bone) {
    chestLight.position.set(0, 0.6, 1.2);
    spine2Bone.add(chestLight);
  }

  const state = { progress: 0 };
  const mouseHead = { yaw: 0, pitch: 0 }; // hero section mouse tracking
  const e = new THREE.Euler(),
    D = new THREE.Quaternion(),
    inv = new THREE.Quaternion(),
    conj = new THREE.Quaternion(),
    tw = new THREE.Quaternion();
  const rad = THREE.MathUtils.degToRad;

  const apply = () => {
    const mouseWeight = 1 - state.progress;
    for (const key in target) {
      const b = bones[key];
      if (!b) continue;
      const t = target[key];
      let p = state.progress;
      if (t.range) {
        p = smoothstep(
          THREE.MathUtils.clamp((p - t.range[0]) / (t.range[1] - t.range[0]), 0, 1)
        );
      }

      let pitch = (t.x ?? 0) * p;
      let yaw = (t.y ?? 0) * p;
      let roll = (t.z ?? 0) * p;

      if (key === "Head") {
        yaw += mouseHead.yaw * mouseWeight;
        pitch += mouseHead.pitch * mouseWeight;
      } else if (key === "Neck") {
        yaw += mouseHead.yaw * 0.15 * mouseWeight;
        pitch += mouseHead.pitch * 0.15 * mouseWeight;
      }

      e.set(rad(pitch), rad(yaw), rad(roll), "XYZ");
      D.setFromEuler(e);

      if (t.local) {
        b.bone.quaternion.copy(b.restLocal).multiply(D);
      } else {
        inv.copy(b.restWorld).invert();
        conj.copy(inv).multiply(D).multiply(b.restWorld);
        b.bone.quaternion.copy(b.restLocal).multiply(conj);
      }
      if (t.twist) {
        b.bone.quaternion.multiply(tw.setFromAxisAngle(b.axis, rad(t.twist * p)));
      }
    }

    if (hips && restHipsPos && feet.length) {
      hips.position.copy(restHipsPos);
      const dy = restFootY - lowestFootY();
      if (Math.abs(dy) > 1e-5) {
        const l = character.worldToLocal(hips.getWorldPosition(new THREE.Vector3()));
        l.y += dy;
        hips.position.copy(hips.parent!.worldToLocal(character.localToWorld(l)));
      }
    }

    // Ramp palm repulsor and chest reactor lights
    const glowProgress = smoothstep(
      THREE.MathUtils.clamp((state.progress - 0.2) / 0.8, 0, 1)
    );
    palmLight.intensity = glowProgress * 1.5;
    chestLight.intensity = glowProgress * 1.2;

    character.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (
          child.material.name === "Lights" ||
          child.material.name === "Arc_Reactor"
        ) {
          child.material.emissiveIntensity = THREE.MathUtils.lerp(
            2.5,
            4.0,
            glowProgress
          );
        }
      }
    });
  };

  const missing = Object.keys(target).filter((k) => !bones[k]);
  if (missing.length) {
    console.warn("riggedPose: bones not found:", missing);
  }

  apply();
  return { bones, target, state, mouseHead, palmLight, chestLight, apply };
};
