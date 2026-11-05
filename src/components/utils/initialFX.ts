import { TextSplitter } from "../../utils/textSplitter";
import gsap from "gsap";
import { lenis } from "../Navbar";

let hasRunInitialFX = false;

export function initialFX() {
  if (hasRunInitialFX) return;
  hasRunInitialFX = true;

  document.body.style.overflowY = "auto";
  if (lenis) {
    lenis.start();
  }

  const mainElement = document.getElementsByTagName("main")[0];
  if (mainElement) {
    mainElement.classList.add("main-active");
  }

  gsap.to("body", {
    backgroundColor: "#0b080c",
    duration: 0.5,
    delay: 0.2,
  });

  const selectors = [".landing-info h3", ".landing-intro h2", ".landing-intro h1"];
  const elements = selectors.flatMap((selector) =>
    Array.from(document.querySelectorAll(selector))
  );

  const landingText = new TextSplitter(elements, {
    type: "chars,lines",
    linesClass: "split-line",
  });

  gsap.fromTo(
    landingText.chars,
    { opacity: 0, y: 80 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power3.inOut",
      y: 0,
      stagger: 0.025,
      delay: 0.1,
    }
  );

  const TextProps = { type: "chars,lines", linesClass: "split-h2" };
  const landingText1 = new TextSplitter(".landing-h2-1", TextProps);

  gsap.fromTo(
    landingText1.chars,
    { opacity: 0, y: 80 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power3.inOut",
      y: 0,
      stagger: 0.025,
      delay: 0.1,
    }
  );

  gsap.fromTo(
    ".landing-info-h2",
    { opacity: 0, y: 30 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power1.inOut",
      y: 0,
      delay: 0.4,
    }
  );

  gsap.fromTo(
    [".header", ".icons-section", ".nav-fade"],
    { opacity: 0 },
    {
      opacity: 1,
      duration: 1.2,
      ease: "power1.inOut",
      delay: 0.05,
    }
  );
}

export function resetInitialFX() {
  hasRunInitialFX = false;
}
