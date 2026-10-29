import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline, setPoseTimeline } from "../../utils/GsapScroll";
import { createArmRig, buildArmPartIds } from "./armRig";

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  _scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const armRig = createArmRig();

  // Pivot at the base of the skull / helmet (Z = 2060, Y = -15)
  const headUniforms = {
    uHeadRotation: { value: new THREE.Vector2(0, 0) }, // x: yaw, y: pitch
    uNeckPivot: { value: new THREE.Vector3(0, -15.0, 2060.0) },
  };

  const loadCharacter = () => {
    return new Promise<GLTF | null>((resolve, reject) => {
      try {
        let character: THREE.Object3D;
        loader.load(
          "/models/iron_man.glb",
          async (gltf) => {
            character = gltf.scene;

            // Target scale for passport-sized bust framing (head, neck, shoulders, and chest)
            const scale = 0.0068;
            character.scale.setScalar(scale);

            // Align vertical position so helmet and shoulders sit perfectly at eye level
            character.position.x = 0;
            character.position.y = -1.3;
            character.position.z = 0;
            character.userData.baseY = character.position.y;
            character.userData.headUniforms = headUniforms;
            character.userData.armRig = armRig;

            character.traverse((child: any) => {
              if (child.isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.frustumCulled = false;

                // Precision connected-component topological isolation:
                // Unifies the entire helmet into ONE continuous solid rigid unit:
                // - Upper helmet: skull dome, forehead, eyes, ears, occiput
                // - Faceplate & chin panel
                // - Complete jawline cover: mandible plates, underside cups, cheek guards
                // All body armor, neck, shoulder bumps, and collar remain 100% rigid (weight = 0.0).
                const posAttr = mesh.geometry.attributes.position;
                const indAttr = mesh.geometry.index;
                const vertexCount = posAttr.count;
                const weights = new Float32Array(vertexCount);

                if (indAttr) {
                  const parent = new Int32Array(vertexCount);
                  for (let i = 0; i < vertexCount; i++) parent[i] = i;

                  function find(i: number): number {
                    let root = i;
                    while (root !== parent[root]) root = parent[root];
                    let curr = i;
                    while (curr !== root) {
                      const next = parent[curr];
                      parent[curr] = root;
                      curr = next;
                    }
                    return root;
                  }

                  function union(i: number, j: number) {
                    const rootI = find(i);
                    const rootJ = find(j);
                    if (rootI !== rootJ) parent[rootI] = rootJ;
                  }

                  const indices = indAttr.array;
                  for (let t = 0; t < indices.length; t += 3) {
                    union(indices[t], indices[t + 1]);
                    union(indices[t + 1], indices[t + 2]);
                  }

                  const compBounds = new Map<
                    number,
                    {
                      minZ: number;
                      maxZ: number;
                      minX: number;
                      maxX: number;
                      minY: number;
                      maxY: number;
                    }
                  >();

                  for (let i = 0; i < vertexCount; i++) {
                    const root = find(i);
                    const x = posAttr.getX(i);
                    const y = posAttr.getY(i);
                    const z = posAttr.getZ(i);

                    let b = compBounds.get(root);
                    if (!b) {
                      b = { minZ: z, maxZ: z, minX: x, maxX: x, minY: y, maxY: y };
                      compBounds.set(root, b);
                    } else {
                      if (z < b.minZ) b.minZ = z;
                      if (z > b.maxZ) b.maxZ = z;
                      if (x < b.minX) b.minX = x;
                      if (x > b.maxX) b.maxX = x;
                      if (y < b.minY) b.minY = y;
                      if (y > b.maxY) b.maxY = y;
                    }
                  }

                  for (let i = 0; i < vertexCount; i++) {
                    const root = find(i);
                    const b = compBounds.get(root)!;

                    // Exclude neck, collar, and nape components (rear/side neck flaps)
                    // so they remain 100% stationary and never tear or poke out during head rotation:
                    const isNeckOrNape = b.maxY > 40 && b.maxZ < 2160;

                    // 1. Upper Helmet (skull dome, forehead, eyes, ears, upper faceplate):
                    const isUpperHelmet =
                      !isNeckOrNape &&
                      b.minZ >= 2045 &&
                      b.maxX <= 105 &&
                      b.minX >= -105 &&
                      b.minY >= -175 &&
                      b.maxY <= 115;

                    // 2. Full Jawline Cover & Mandible Plates (chin, jaw wrap, cheek underside):
                    const isJawAndChinCover =
                      b.minZ >= 2000 &&
                      b.maxX <= 88 &&
                      b.minX >= -88 &&
                      b.maxY <= -25 &&
                      b.minY >= -175;

                    // Entire complete helmet rotates as ONE unified solid unit:
                    if (isUpperHelmet || isJawAndChinCover) {
                      weights[i] = 1.0;
                    } else {
                      weights[i] = 0.0;
                    }
                  }
                }

                mesh.geometry.setAttribute(
                  "headWeight",
                  new THREE.BufferAttribute(weights, 1)
                );
                mesh.geometry.setAttribute(
                  "armPart",
                  new THREE.BufferAttribute(buildArmPartIds(mesh.geometry), 1)
                );

                if (mesh.material) {
                  const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
                  mesh.material = mat;
                  mat.envMapIntensity = 1.4;
                  if (mat.emissive) {
                    mat.emissiveIntensity = 2.5;
                  }

                  mat.customProgramCacheKey = () => "ironman_head_arms_v8";
                  mat.onBeforeCompile = (shader: any) => {
                    shader.uniforms.uHeadRotation = headUniforms.uHeadRotation;
                    shader.uniforms.uNeckPivot = headUniforms.uNeckPivot;
                    Object.assign(shader.uniforms, armRig.uniforms);

                    shader.vertexShader = `
                      attribute float headWeight;
                      attribute float armPart;
                      uniform vec2 uHeadRotation;
                      uniform vec3 uNeckPivot;
                      uniform mat3 uShoulderRot[2];
                      uniform mat3 uElbowRot[2];
                      uniform vec3 uShoulderPivot[2];
                      uniform vec3 uElbowPivot[2];

                      mat3 rotateZ(float angle) {
                        float c = cos(angle);
                        float s = sin(angle);
                        return mat3(
                          c, -s, 0.0,
                          s, c, 0.0,
                          0.0, 0.0, 1.0
                        );
                      }

                      mat3 rotateX(float angle) {
                        float c = cos(angle);
                        float s = sin(angle);
                        return mat3(
                          1.0, 0.0, 0.0,
                          0.0, c, -s,
                          0.0, s, c
                        );
                      }
                    ` + shader.vertexShader;

                    shader.vertexShader = shader.vertexShader.replace(
                      "#include <begin_vertex>",
                      `
                      #include <begin_vertex>

                      if (headWeight > 0.5) {
                        vec3 p = position - uNeckPivot;
                        mat3 rotZ = rotateZ(uHeadRotation.x);
                        mat3 rotX = rotateX(uHeadRotation.y);
                        mat3 headRot = rotZ * rotX;
                        transformed = headRot * p + uNeckPivot;
                      }

                      if (armPart > 0.5) {
                        int side = armPart < 2.5 ? 0 : 1;
                        bool fore = (armPart > 1.5 && armPart < 2.5) || (armPart > 3.5);
                        vec3 q = transformed;
                        if (fore) q = uElbowRot[side] * (q - uElbowPivot[side]) + uElbowPivot[side];
                        transformed = uShoulderRot[side] * (q - uShoulderPivot[side]) + uShoulderPivot[side];
                      }
                      `
                    );

                    shader.vertexShader = shader.vertexShader.replace(
                      "#include <beginnormal_vertex>",
                      `
                      #include <beginnormal_vertex>

                      if (headWeight > 0.5) {
                        mat3 rotZNorm = rotateZ(uHeadRotation.x);
                        mat3 rotXNorm = rotateX(uHeadRotation.y);
                        mat3 headRotNorm = rotZNorm * rotXNorm;
                        objectNormal = headRotNorm * objectNormal;
                      }

                      if (armPart > 0.5) {
                        int side = armPart < 2.5 ? 0 : 1;
                        bool fore = (armPart > 1.5 && armPart < 2.5) || (armPart > 3.5);
                        vec3 nn = objectNormal;
                        if (fore) nn = uElbowRot[side] * nn;
                        objectNormal = uShoulderRot[side] * nn;
                      }
                      `
                    );
                  };
                }
              }
            });

            try {
              renderer.compile(character, camera);
            } catch {
              // fallback if synchronous compilation is not required
            }

            resolve(gltf);
            setCharTimeline(character, camera);
            setPoseTimeline(character);
            setAllTimeline();

            dracoLoader.dispose();
          },
          undefined,
          (error) => {
            console.error("Error loading GLTF model:", error);
            reject(error);
          }
        );
      } catch (err) {
        reject(err);
        console.error(err);
      }
    });
  };

  return { loadCharacter };
};

export default setCharacter;
