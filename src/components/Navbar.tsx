import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import HoverLinks from "./HoverLinks";
import { gsap } from "gsap";
import Lenis from "lenis";
import "./styles/Navbar.css";

gsap.registerPlugin(ScrollTrigger);
export let lenis: Lenis | null = null;

const Navbar = () => {
  useEffect(() => {
    lenis = new Lenis({
      duration: 1.7,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.7,
      touchMultiplier: 2,
      infinite: false,
    });

    lenis.stop();

    lenis.on("scroll", ScrollTrigger.update);

    const updateLenis = (time: number) => {
      lenis?.raf(time * 1000);
    };
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    const handleResize = () => {
      lenis?.resize();
    };

    const handleLinkClick = (e: Event) => {
      if (window.innerWidth <= 1024) return;

      e.preventDefault();
      const elem = e.currentTarget as HTMLAnchorElement;
      const section = elem.getAttribute("data-href");
      if (section && lenis) {
        const target = document.querySelector(section) as HTMLElement | null;
        if (target) {
          lenis.scrollTo(target, {
            offset: 0,
            duration: 1.5,
          });
        }
      }
    };

    const links = document.querySelectorAll(".header ul a");
    links.forEach((elem) => {
      elem.addEventListener("click", handleLinkClick);
    });

    window.addEventListener("resize", handleResize);

    return () => {
      gsap.ticker.remove(updateLenis);
      window.removeEventListener("resize", handleResize);
      links.forEach((elem) => {
        elem.removeEventListener("click", handleLinkClick);
      });
      lenis?.destroy();
      lenis = null;
    };
  }, []);
  return (
    <>
      <div className="header">
        <a href="/#" className="navbar-title" data-cursor="disable">
          Arijit
        </a>
        <a
          href="mailto:arijitpatra204@gmail.com"
          className="navbar-connect"
          data-cursor="disable"
        >
          arijitpatra204@gmail.com
        </a>
        <ul>
          <li>
            <a data-href="#about" href="#about">
              <HoverLinks text="ABOUT" />
            </a>
          </li>
          <li>
            <a data-href="#work" href="#work">
              <HoverLinks text="WORK" />
            </a>
          </li>
          <li>
            <a data-href="#contact" href="#contact">
              <HoverLinks text="CONTACT" />
            </a>
          </li>
        </ul>
      </div>

      <div className="landing-circle1"></div>
      <div className="landing-circle2"></div>
      <div className="nav-fade"></div>
    </>
  );
};

export default Navbar;
