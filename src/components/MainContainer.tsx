import {
  lazy,
  PropsWithChildren,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import About from "./About";
import Career from "./Career";
import Contact from "./Contact";
import Cursor from "./Cursor";
import Landing from "./Landing";
import Navbar from "./Navbar";
import SocialIcons from "./SocialIcons";
import JarvisHUD from "./JarvisHUD";
import WhatIDo from "./WhatIDo";
import Work from "./Work";
import setSplitText from "./utils/splitText";

const TechStack = lazy(() => import("./TechStack"));

const MainContainer = ({ children }: PropsWithChildren) => {
  const [isDesktopView, setIsDesktopView] = useState<boolean>(
    window.innerWidth > 1024
  );
  const resizeHandler = useCallback(() => {
    setSplitText();
    setIsDesktopView((prev) => {
      const next = window.innerWidth > 1024;
      return prev === next ? prev : next;
    });
  }, []);

  useEffect(() => {
    resizeHandler();
    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, [resizeHandler]);

  return (
    <div className="container-main">
      <Cursor />
      <Navbar />
      <SocialIcons />
      <JarvisHUD mode="floating" />
      {isDesktopView && children}
      <div className="container-main">
        <Landing>{!isDesktopView && children}</Landing>
        <About />
        <WhatIDo />
        <Career />
        <Work />
        <Suspense fallback={<div>Loading....</div>}>
          <TechStack />
        </Suspense>
        <Contact />
      </div>
    </div>
  );
};

export default MainContainer;

