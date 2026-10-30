import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MIRROR_POSE } from "../Character/utils/riggedPose";

gsap.registerPlugin(ScrollTrigger);

export const setPoseTimeline = (character: THREE.Object3D) => {
  const pose = character.userData.pose;
  if (!pose) return;

  if (window.innerWidth > 1024) {
    gsap
      .timeline({
        scrollTrigger: {
          trigger: ".about-section",
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
      .to(pose.state, {
        progress: 1,
        ease: "power2.inOut",
        duration: 4,
        delay: 2,
        onUpdate: pose.apply,
      });
  }
};

export function setCharTimeline(
  character: THREE.Object3D<THREE.Object3DEventMap> | null,
  camera: THREE.PerspectiveCamera
) {
  let intensity: number = 0;
  setInterval(() => {
    intensity = Math.random();
  }, 200);
  const tl1 = gsap.timeline({
    scrollTrigger: {
      trigger: ".landing-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  const tl2 = gsap.timeline({
    scrollTrigger: {
      trigger: ".about-section",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  const tl3 = gsap.timeline({
    scrollTrigger: {
      trigger: ".whatIDO",
      start: "top top",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  let screenLight: any, monitor: any;
  character?.children.forEach((object: any) => {
    if (object.name === "Plane004") {
      object.children.forEach((child: any) => {
        child.material.transparent = true;
        child.material.opacity = 0;
        if (child.material.name === "Material.027") {
          monitor = child;
          child.material.color.set("#FFFFFF");
        }
      });
    }
    if (object.name === "screenlight") {
      object.material.transparent = true;
      object.material.opacity = 0;
      object.material.emissive.set("#C8BFFF");
      gsap.timeline({ repeat: -1, repeatRefresh: true }).to(object.material, {
        emissiveIntensity: () => intensity * 8,
        duration: () => Math.random() * 0.6,
        delay: () => Math.random() * 0.1,
      });
      screenLight = object;
    }
  });
  let neckBone = character?.getObjectByName("spine005");
  if (window.innerWidth > 1024) {
    if (character) {
      tl1
        .fromTo(character.rotation, { y: 0 }, { y: 0.7, duration: 1 }, 0)
        .to(camera.position, { z: 22 }, 0)
        .fromTo(".character-model", { x: 0 }, { x: "-25%", duration: 1 }, 0)
        .to(".landing-container", { opacity: 0, duration: 0.4 }, 0)
        .to(".landing-container", { y: "40%", duration: 0.8 }, 0)
        .fromTo(".about-me", { y: "-50%" }, { y: "0%" }, 0);

      // In About Me, character.rotation.y is 0.7 rad (~40.1 deg).
      // When MIRROR_POSE is active, rotate the character around 60 deg to the right:
      // 0.7 rad - 60 deg (1.047 rad) = -0.347 rad (~ -20 deg).
      const whatIDoYaw = MIRROR_POSE
        ? 0.7 - THREE.MathUtils.degToRad(60)
        : -0.25;
      tl2
        .to(
          camera.position,
          { z: 52, y: 9.35, duration: 6, delay: 1.5, ease: "power1.inOut" },
          0
        )
        .to(".about-me", { y: "25%", duration: 5, delay: 1.5, ease: "power1.inOut" }, 0)
        .to(".about-me", { opacity: 0, delay: 2.5, duration: 2.5, ease: "power1.inOut" }, 0)
        .fromTo(
          ".character-model",
          { x: "-25%", pointerEvents: "inherit" },
          { pointerEvents: "none", x: "-12%", delay: 1.5, duration: 5, ease: "power1.inOut", immediateRender: false },
          0
        )
        .to(character.rotation, { y: whatIDoYaw, x: 0.08, delay: 2, duration: 4, ease: "power1.inOut" }, 0);

      if (neckBone) {
        tl2.to(neckBone.rotation, { x: 0.6, delay: 2, duration: 3 }, 0);
      }
      if (monitor?.material) {
        tl2.to(monitor.material, { opacity: 1, duration: 0.8, delay: 3.2 }, 0);
      }
      if (screenLight?.material) {
        tl2.to(screenLight.material, { opacity: 1, duration: 0.8, delay: 4.5 }, 0);
      }
      if (monitor) {
        tl2.fromTo(
          monitor.position,
          { y: -10, z: 2 },
          { y: 0, z: 0, delay: 1.5, duration: 3 },
          0
        );
      }

      tl2
        .fromTo(
          ".what-box-in",
          { display: "none" },
          { display: "flex", duration: 0.1, delay: 6.5 },
          0
        )
        .fromTo(
          ".character-rim",
          { opacity: 1, scaleX: 1.4 },
          { opacity: 0, scale: 0, y: "-70%", duration: 5, delay: 1.5 },
          0.3
        );

      tl3
        .fromTo(
          ".character-model",
          { y: "0%" },
          { y: "-100%", duration: 4, ease: "none", delay: 1, immediateRender: false },
          0
        )
        .fromTo(".what-box", { y: 0 }, { y: "15%", duration: 2 }, 0)
        .to(character.rotation, { x: -0.04, duration: 2, delay: 1 }, 0);
    }
  } else {
    if (character) {
      const tM2 = gsap.timeline({
        scrollTrigger: {
          trigger: ".what-box-in",
          start: "top 70%",
          end: "bottom top",
        },
      });
      tM2.to(".what-box-in", { display: "flex", duration: 0.1, delay: 0 }, 0);
    }
  }
}

export function setAllTimeline() {
  const careerTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: ".career-section",
      start: "top 30%",
      end: "100% center",
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  careerTimeline
    .fromTo(
      ".career-timeline",
      { maxHeight: "10%" },
      { maxHeight: "100%", duration: 0.5 },
      0
    )

    .fromTo(
      ".career-timeline",
      { opacity: 0 },
      { opacity: 1, duration: 0.1 },
      0
    )
    .fromTo(
      ".career-info-box",
      { opacity: 0 },
      { opacity: 1, stagger: 0.1, duration: 0.5 },
      0
    )
    .fromTo(
      ".career-dot",
      { animationIterationCount: "infinite" },
      {
        animationIterationCount: "1",
        delay: 0.3,
        duration: 0.1,
      },
      0
    );

  if (window.innerWidth > 1024) {
    careerTimeline.fromTo(
      ".career-section",
      { y: 0 },
      { y: "20%", duration: 0.5, delay: 0.2 },
      0
    );
  } else {
    careerTimeline.fromTo(
      ".career-section",
      { y: 0 },
      { y: 0, duration: 0.5, delay: 0.2 },
      0
    );
  }
}
