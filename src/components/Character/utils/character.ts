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
                  if (mat.emissiveMap) {
                    mat.emissiveIntensity = 2.5;
                    mat.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                  }
                  if (mat.map) {
                    mat.map.colorSpace = THREE.SRGBColorSpace;
                  }
                }
              }
            });

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
