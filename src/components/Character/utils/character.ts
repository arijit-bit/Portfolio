import * as THREE from "three";
import { DRACOLoader, GLTF, GLTFLoader } from "three-stdlib";
import { setCharTimeline, setAllTimeline, setPoseTimeline } from "../../utils/GsapScroll";
import { createRiggedPose } from "./riggedPose";

const setCharacter = (
  renderer: THREE.WebGLRenderer,
  _scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) => {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("/draco/");
  loader.setDRACOLoader(dracoLoader);

  const loadCharacter = () => {
    return new Promise<GLTF | null>((resolve, reject) => {
      try {
        let character: THREE.Object3D;
        loader.load(
          "/models/iron_man_mk85.glb",
          async (gltf) => {
            character = gltf.scene;

            // Normalize scale and position so existing camera keyframes in setCharTimeline still work.
            const TARGET_HEIGHT = 15.67;
            const BASE_Y = -1.3;
            character.updateMatrixWorld(true);
            const size = new THREE.Box3().setFromObject(character).getSize(new THREE.Vector3());
            character.scale.setScalar(TARGET_HEIGHT / size.y);
            character.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(character);
            const center = box.getCenter(new THREE.Vector3());
            character.position.set(-center.x, BASE_Y - box.min.y, -center.z);
            character.userData.baseY = character.position.y;

            // Armor light subsystem uniforms for cinematic boot-up:
            // Controls eyes, chest (Arc Reactor), shoulders, and other body lights independently
            const armorUniforms = {
              uEyeIntensity: { value: 0.0 },
              uChestIntensity: { value: 0.0 },
              uShoulderIntensity: { value: 0.0 },
              uOtherIntensity: { value: 0.0 },
            };
            let arcMaterial: THREE.MeshStandardMaterial | undefined;

            character.traverse((child: any) => {
              if (child.isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.frustumCulled = false;

                if (mesh.material) {
                  const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
                  mesh.material = mat;
                  mat.envMapIntensity = 1.4;

                  if (mat.name === "Lights" || mat.emissiveMap) {
                    // Tag geometry vertices with their armor zone:
                    // 1.0 = Eyes (front of helmet visor)
                    // 2.0 = Chest (Arc Reactor core)
                    // 3.0 = Shoulders (left & right accent lights)
                    // 0.0 = Other lights (repulsors, back, legs)
                    const pos = mesh.geometry?.attributes?.position;
                    if (pos && !mesh.geometry.attributes.aLightKind) {
                      const kindArray = new Float32Array(pos.count);
                      for (let i = 0; i < pos.count; i++) {
                        const x = pos.getX(i);
                        const y = pos.getY(i);
                        const z = pos.getZ(i);

                        if (y > 6.0 && z > 0.4) {
                          kindArray[i] = 1.0; // Eyes
                        } else if (y >= 4.75 && y <= 5.35 && Math.abs(x) < 0.28 && z > 0.4) {
                          kindArray[i] = 2.0; // Chest
                        } else if (y >= 5.35 && y <= 5.85 && Math.abs(x) >= 0.3 && Math.abs(x) <= 0.8) {
                          kindArray[i] = 3.0; // Shoulders
                        } else {
                          kindArray[i] = 0.0; // Other lights
                        }
                      }
                      mesh.geometry.setAttribute(
                        "aLightKind",
                        new THREE.BufferAttribute(kindArray, 1)
                      );
                    }

                    mat.emissiveIntensity = 1.0;
                    if (mat.emissiveMap) {
                      mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                    }

                    // Custom shader hook to dynamically modulate emission per armor subsystem
                    mat.customProgramCacheKey = () => "mk85_armor_cinematic_lights";
                    mat.onBeforeCompile = (shader) => {
                      shader.uniforms.uEyeIntensity = armorUniforms.uEyeIntensity;
                      shader.uniforms.uChestIntensity = armorUniforms.uChestIntensity;
                      shader.uniforms.uShoulderIntensity = armorUniforms.uShoulderIntensity;
                      shader.uniforms.uOtherIntensity = armorUniforms.uOtherIntensity;

                      shader.vertexShader = shader.vertexShader.replace(
                        "#include <common>",
                        `#include <common>
attribute float aLightKind;
varying float vLightKind;
`
                      );

                      shader.vertexShader = shader.vertexShader.replace(
                        "#include <begin_vertex>",
                        `#include <begin_vertex>
vLightKind = aLightKind;
`
                      );

                      shader.fragmentShader = shader.fragmentShader.replace(
                        "#include <common>",
                        `#include <common>
varying float vLightKind;
uniform float uEyeIntensity;
uniform float uChestIntensity;
uniform float uShoulderIntensity;
uniform float uOtherIntensity;
`
                      );

                      shader.fragmentShader = shader.fragmentShader.replace(
                        "#include <emissivemap_fragment>",
                        `#include <emissivemap_fragment>
float kIntensity = uOtherIntensity;
if (vLightKind > 0.5 && vLightKind < 1.5) {
  kIntensity = uEyeIntensity;
} else if (vLightKind > 1.5 && vLightKind < 2.5) {
  kIntensity = uChestIntensity;
} else if (vLightKind > 2.5 && vLightKind < 3.5) {
  kIntensity = uShoulderIntensity;
}
totalEmissiveRadiance *= kIntensity;
`
                      );
                    };
                  } else if (mat.name === "Arc_Reactor") {
                    mat.emissive = new THREE.Color(0x00e5ff);
                    mat.emissiveIntensity = 0.0;
                    arcMaterial = mat;
                  }

                  if (mat.map) {
                    mat.map.colorSpace = THREE.SRGBColorSpace;
                  }
                }
              }
            });

            character.userData.armorLights = {
              uniforms: armorUniforms,
              arcMaterial,
            };

            // Fix face mask upper lip notch/dent on Gold_Part:
            // Mixamo/sculpt artifact where vertices 30606 and 30607 at the center of the upper lip
            // were pulled down into the mouth slit by ~0.013 units instead of following the smooth parabolic arch.
            // Symmetrizing them to match vertices 30610 and 30609 restores the clean, straight horizontal lip line.
            character.traverse((child: any) => {
              if (child.isMesh && child.material?.name === "Gold_Part") {
                const pos = child.geometry?.attributes?.position;
                if (pos && pos.count > 30610) {
                  pos.setY(30606, pos.getY(30610));
                  pos.setZ(30606, pos.getZ(30610));
                  pos.setY(30607, pos.getY(30609));
                  pos.setZ(30607, pos.getZ(30609));
                  pos.needsUpdate = true;
                  child.geometry.computeVertexNormals();
                }
              }
            });

            // Call updateMatrixWorld before creating the pose helper
            character.updateMatrixWorld(true);
            character.userData.pose = createRiggedPose(character);
            (window as any).__char = character;

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
