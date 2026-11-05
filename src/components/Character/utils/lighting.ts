import * as THREE from "three";
import { RGBELoader } from "three-stdlib";
import { gsap } from "gsap";

const setLighting = (scene: THREE.Scene) => {
  const directionalLight = new THREE.DirectionalLight(0xc7a9ff, 0);
  directionalLight.intensity = 0;
  directionalLight.position.set(-0.47, -0.32, -1);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xc2a4ff, 0, 100, 3);
  pointLight.position.set(3, 12, 4);
  pointLight.castShadow = true;
  scene.add(pointLight);

  // Stark Arc Reactor / Repulsor subtle ambient light at chest level
  const arcLight = new THREE.PointLight(0x00f0ff, 0, 20, 2);
  arcLight.position.set(0, 10.5, 1.2);
  scene.add(arcLight);

  // Helmet visor eye point light (cool electric white/cyan gleam)
  const eyeLight = new THREE.PointLight(0xe8f4ff, 0, 8, 2);
  eyeLight.position.set(0, 14.1, 1.4);
  scene.add(eyeLight);

  // Left & Right shoulder accent point lights
  const leftShoulderLight = new THREE.PointLight(0x80d8ff, 0, 8, 2);
  leftShoulderLight.position.set(1.6, 12.6, 0.9);
  scene.add(leftShoulderLight);

  const rightShoulderLight = new THREE.PointLight(0x80d8ff, 0, 8, 2);
  rightShoulderLight.position.set(-1.6, 12.6, 0.9);
  scene.add(rightShoulderLight);

  const envState = { intensity: 0.02 };
  new RGBELoader()
    .setPath("/models/")
    .load("char_enviorment.hdr", function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
      scene.environmentIntensity = envState.intensity;
      scene.environmentRotation.set(5.76, 85.85, 1);
    });

  function setPointLight(screenLight: any) {
    if (screenLight && screenLight.material && screenLight.material.opacity > 0.9) {
      pointLight.intensity = screenLight.material.emissiveIntensity * 20;
    }
  }

  /**
   * Movie scene boot sequence:
   * 1. Screen loads in dark silhouette against the purple-tinted background
   * 2. The two helmet eye lights ignite with a crisp power flash
   * 3. The chest Arc Reactor surges to life in a brilliant cyan glow
   * 4. The two shoulder accent lights ignite
   * 5. The full screen lights up: environment, directional, fill lighting, and purple rim bloom
   */
  function playCinematicBootSequence(
    character?: THREE.Object3D | null,
    onScreenLightUp?: () => void
  ) {
    const armorLights = character?.userData?.armorLights;
    const uniforms = armorLights?.uniforms;
    const arcMat = armorLights?.arcMaterial;

    const tl = gsap.timeline();

    // Ensure all lights start completely powered down
    if (uniforms) {
      uniforms.uEyeIntensity.value = 0;
      uniforms.uChestIntensity.value = 0;
      uniforms.uShoulderIntensity.value = 0;
      uniforms.uOtherIntensity.value = 0;
    }
    if (arcMat) arcMat.emissiveIntensity = 0;

    directionalLight.intensity = 0;
    pointLight.intensity = 0;
    arcLight.intensity = 0;
    eyeLight.intensity = 0;
    leftShoulderLight.intensity = 0;
    rightShoulderLight.intensity = 0;
    envState.intensity = 0.02;
    scene.environmentIntensity = 0.02;

    // Phase 0: Dramatic suspense in the dark (0.35s)
    tl.to({}, { duration: 0.35 });

    // Phase 1: Two eye lights ignite & pulse with high-voltage startup
    if (uniforms) {
      tl.to(uniforms.uEyeIntensity, {
        value: 4.5,
        duration: 0.16,
        ease: "power3.in",
      });
      tl.to(uniforms.uEyeIntensity, {
        value: 2.8,
        duration: 0.35,
        ease: "power2.out",
      });
    }
    tl.to(
      eyeLight,
      {
        intensity: 3.5,
        duration: 0.16,
        ease: "power3.in",
      },
      "<"
    );
    tl.to(
      eyeLight,
      {
        intensity: 1.8,
        duration: 0.35,
        ease: "power2.out",
      },
      "<0.16"
    );

    // Short beat between eyes and chest (0.25s)
    tl.to({}, { duration: 0.25 });

    // Phase 2: Chest light (Arc Reactor) surges with cyan brilliance
    if (uniforms) {
      tl.to(uniforms.uChestIntensity, {
        value: 5.0,
        duration: 0.22,
        ease: "power2.inOut",
      });
      tl.to(uniforms.uChestIntensity, {
        value: 3.2,
        duration: 0.38,
        ease: "power2.out",
      });
    }
    if (arcMat) {
      tl.to(
        arcMat,
        {
          emissiveIntensity: 3.0,
          duration: 0.22,
          ease: "power2.inOut",
        },
        "<"
      );
      tl.to(
        arcMat,
        {
          emissiveIntensity: 2.2,
          duration: 0.38,
          ease: "power2.out",
        },
        "<0.22"
      );
    }
    tl.to(
      arcLight,
      {
        intensity: 9.0,
        duration: 0.22,
        ease: "power2.inOut",
      },
      "<"
    );
    tl.to(
      arcLight,
      {
        intensity: 5.0,
        duration: 0.38,
        ease: "power2.out",
      },
      "<0.22"
    );

    // Short beat between chest and shoulders (0.2s)
    tl.to({}, { duration: 0.2 });

    // Phase 3: Shoulder lights ignite and lock in
    if (uniforms) {
      tl.to(uniforms.uShoulderIntensity, {
        value: 4.0,
        duration: 0.18,
        ease: "power2.inOut",
      });
      tl.to(uniforms.uShoulderIntensity, {
        value: 2.6,
        duration: 0.32,
        ease: "power2.out",
      });
    }
    tl.to(
      [leftShoulderLight, rightShoulderLight],
      {
        intensity: 3.5,
        duration: 0.18,
        ease: "power2.inOut",
      },
      "<"
    );
    tl.to(
      [leftShoulderLight, rightShoulderLight],
      {
        intensity: 2.0,
        duration: 0.32,
        ease: "power2.out",
      },
      "<0.18"
    );

    // Phase 3 -> 4: Brief transition into full screen illumination (0.15s)
    tl.to({}, { duration: 0.15 });

    // Phase 4: SCREEN LIGHTS UP! Full cinematic reveal
    tl.add(() => {
      if (onScreenLightUp) onScreenLightUp();
    }, "screenLightUp");

    tl.to(
      envState,
      {
        intensity: 1.0,
        duration: 1.8,
        ease: "power2.out",
        onUpdate: () => {
          scene.environmentIntensity = envState.intensity;
        },
      },
      "screenLightUp"
    );

    tl.to(
      directionalLight,
      {
        intensity: 1.5,
        duration: 1.8,
        ease: "power2.out",
      },
      "screenLightUp"
    );

    tl.to(
      pointLight,
      {
        intensity: 15,
        duration: 1.8,
        ease: "power2.out",
      },
      "screenLightUp"
    );

    // Remaining repulsor and accent lights come online
    if (uniforms) {
      tl.to(
        uniforms.uOtherIntensity,
        {
          value: 2.5,
          duration: 1.4,
          ease: "power2.out",
        },
        "screenLightUp"
      );
    }

    // Atmospheric purple rim bloom ascends behind armor
    tl.to(
      ".character-rim",
      {
        y: "55%",
        opacity: 1,
        duration: 2.0,
        ease: "power2.out",
      },
      "screenLightUp+=0.1"
    );

    return tl;
  }

  function turnOnLights(character?: THREE.Object3D | null) {
    playCinematicBootSequence(character);
  }

  return { setPointLight, turnOnLights, playCinematicBootSequence };
};

export default setLighting;
