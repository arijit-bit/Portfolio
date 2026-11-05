import { useEffect, useRef, useState } from "react";
import "./styles/Loading.css";
import { useLoading } from "../context/LoadingProvider";

import Marquee from "react-fast-marquee";

const Loading = ({ percent }: { percent: number }) => {
  const { setIsLoading } = useLoading();
  const [loaded, setLoaded] = useState(false);
  const [clicked, setClicked] = useState(false);
  const exitStartedRef = useRef(false);

  useEffect(() => {
    if (percent < 100 || loaded) return;

    const loadedTimeout = setTimeout(() => {
      setLoaded(true);
    }, 150);

    return () => {
      clearTimeout(loadedTimeout);
    };
  }, [loaded, percent]);

  const handleEnter = () => {
    if (!loaded || exitStartedRef.current) return;
    exitStartedRef.current = true;
    setClicked(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 450);

    import("./utils/initialFX")
      .then((module) => {
        try {
          if (module.initialFX) {
            module.initialFX();
          }
        } catch (error) {
          console.error("initialFX failed", error);
        }
      })
      .catch((error) => {
        console.error("Loading screen exit failed", error);
      });
  };

  useEffect(() => {
    if (!loaded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        handleEnter();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [loaded]);

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const { currentTarget: target } = e;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--mouse-x", `${x}px`);
    target.style.setProperty("--mouse-y", `${y}px`);
  }

  return (
    <>
      <div className="loading-header">
        <a href="/#" className="loader-title" data-cursor="disable">
          Logo
        </a>
        <div className={`loaderGame ${clicked && "loader-out"}`}>
          <div className="loaderGame-container">
            <div className="loaderGame-in">
              {[...Array(27)].map((_, index) => (
                <div className="loaderGame-line" key={index}></div>
              ))}
            </div>
            <div className="loaderGame-ball"></div>
          </div>
        </div>
      </div>
      <div
        className={`loading-screen ${loaded ? "loading-screen-ready" : ""}`}
        onClick={loaded ? handleEnter : undefined}
      >
        <div className="loading-marquee">
          <Marquee>
            <span> A Creative Developer</span> <span>A Creative Designer</span>
            <span> A Creative Developer</span> <span>A Creative Designer</span>
          </Marquee>
        </div>

        <div
          className={`loading-hint-wrap ${loaded ? "loading-hint-visible" : ""} ${clicked ? "loading-hint-hidden" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            handleEnter();
          }}
        >
          <button
            className="loading-click-btn"
            type="button"
            data-cursor="disable"
          >
            <span>Click to enter</span>
          </button>
          <div className="loading-arrow-down" aria-hidden="true">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="4" x2="12" y2="18"></line>
              <polyline points="18 12 12 18 6 12"></polyline>
            </svg>
          </div>
        </div>

        <div
          className={`loading-wrap ${clicked ? "loading-clicked" : ""} ${loaded ? "loading-ready" : ""}`}
          onMouseMove={(e) => handleMouseMove(e)}
          onClick={(e) => {
            e.stopPropagation();
            handleEnter();
          }}
          data-cursor={loaded ? "disable" : undefined}
        >
          <div className="loading-hover"></div>
          <div className={`loading-button ${loaded ? "loading-complete" : ""}`}>
            <div className="loading-container">
              <div className="loading-content">
                <div className="loading-content-in">
                  Loading <span>{percent}%</span>
                </div>
              </div>
              <div className="loading-box"></div>
            </div>
            <div className="loading-content2">
              <span>ENTER</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Loading;

export const setProgress = (setLoading: (value: number) => void) => {
  let percent: number = 0;

  let interval = setInterval(() => {
    if (percent <= 50) {
      let rand = Math.round(Math.random() * 5);
      percent = Math.min(percent + rand, 50);
      setLoading(percent);
    } else {
      clearInterval(interval);
      interval = setInterval(() => {
        percent = Math.min(percent + Math.round(Math.random()), 91);
        setLoading(percent);
        if (percent >= 91) {
          clearInterval(interval);
        }
      }, 2000);
    }
  }, 100);

  function clear() {
    clearInterval(interval);
    setLoading(100);
  }

  function loaded() {
    return new Promise<number>((resolve) => {
      clearInterval(interval);
      interval = setInterval(() => {
        if (percent < 100) {
          percent = Math.min(percent + 1, 100);
          setLoading(percent);
        } else {
          resolve(percent);
          clearInterval(interval);
        }
      }, 2);
    });
  }
  return { loaded, percent, clear };
};
