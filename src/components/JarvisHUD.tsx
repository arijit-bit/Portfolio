import React, { useEffect, useState, useRef } from "react";
import { jarvisState } from "../utils/jarvisState";
import "./styles/JarvisHUD.css";

interface JarvisHUDProps {
  mode?: "loader" | "floating";
  percent?: number;
}

export const JarvisHUD: React.FC<JarvisHUDProps> = ({
  mode = "loader",
  percent = 0,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [energy, setEnergy] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const hudRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = jarvisState.subscribe(() => {
      setIsSpeaking(jarvisState.getSpeaking());
      setEnergy(jarvisState.energy);
      setIsMuted(jarvisState.isMuted());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!hudRef.current) return;
      const rect = hudRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);
      setMouseOffset({
        x: Math.max(-10, Math.min(10, dx * 10)),
        y: Math.max(-8, Math.min(8, dy * 8)),
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Compute heights for 7 equalizer bars based on energy or loading scan
  const getBarHeights = () => {
    if (isSpeaking) {
      // Modulate bars around center with speech energy
      const base = Math.max(0.2, energy);
      return [
        Math.min(1, base * 0.5 + Math.sin(Date.now() * 0.01) * 0.2),
        Math.min(1, base * 0.8 + Math.cos(Date.now() * 0.012) * 0.25),
        Math.min(1, base * 1.1 + Math.sin(Date.now() * 0.015) * 0.3),
        Math.min(1, base * 1.35 + Math.cos(Date.now() * 0.018) * 0.3),
        Math.min(1, base * 1.1 + Math.sin(Date.now() * 0.014) * 0.3),
        Math.min(1, base * 0.8 + Math.cos(Date.now() * 0.011) * 0.25),
        Math.min(1, base * 0.5 + Math.sin(Date.now() * 0.009) * 0.2),
      ];
    } else if (mode === "loader" && percent < 100) {
      // Gentle scanning radar ripple while loading
      const t = Date.now() * 0.005;
      return [0, 1, 2, 3, 4, 5, 6].map((i) => {
        return Math.sin(t + i * 0.6) * 0.3 + 0.45;
      });
    } else {
      // Idle breathing heartbeat
      const t = Date.now() * 0.002;
      return [0.25, 0.35, 0.55, 0.7, 0.55, 0.35, 0.25].map(
        (h) => h * (0.8 + Math.sin(t) * 0.2)
      );
    }
  };

  const barHeights = getBarHeights();
  const statusText =
    mode === "loader"
      ? percent < 100
        ? `SYSTEM SCANNING // ${percent}%`
        : "SYSTEMS ONLINE // READY"
      : isSpeaking
      ? "J.A.R.V.I.S. // TRANSMITTING"
      : "J.A.R.V.I.S. // STANDBY";

  return (
    <div
      ref={hudRef}
      className={`jarvis-hud-container jarvis-mode-${mode} ${
        isSpeaking ? "jarvis-speaking" : "jarvis-standby"
      }`}
      style={{
        transform: isSpeaking
          ? `translate(${mouseOffset.x}px, ${mouseOffset.y}px)`
          : undefined,
      }}
      data-cursor="disable"
    >
      <div className="jarvis-core-wrapper">
        {/* Holographic soundwave ripples (active when speaking) */}
        {isSpeaking && (
          <>
            <div className="jarvis-ripple jarvis-ripple-1"></div>
            <div className="jarvis-ripple jarvis-ripple-2"></div>
          </>
        )}

        <svg
          className="jarvis-hologram-svg"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer dashed spinning ring */}
          <circle
            className="jarvis-ring-outer"
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 8"
          />

          {/* Middle segmented counter-rotating ring */}
          <circle
            className="jarvis-ring-middle"
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="36 14 58 18"
          />

          {/* Inner compass / tick markers */}
          <circle
            className="jarvis-ring-inner"
            cx="60"
            cy="60"
            r="38"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="2 6"
          />

          {/* Core boundary ring */}
          <circle
            className="jarvis-ring-core"
            cx="60"
            cy="60"
            r="28"
            fill="rgba(0, 240, 255, 0.05)"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>

        {/* Central Audio / Speech Equalizer Bars */}
        <div className="jarvis-bars-container">
          {barHeights.map((h, idx) => (
            <div
              key={idx}
              className="jarvis-bar"
              style={{
                height: `${Math.max(4, h * 30)}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Holographic Tag / Status Text */}
      <div className="jarvis-status-badge">
        <span className="jarvis-status-dot" />
        <span className="jarvis-status-label">{statusText}</span>

        {/* Interactive sound toggle button if floating */}
        {mode === "floating" && (
          <button
            type="button"
            className="jarvis-ctrl-btn"
            onClick={(e) => {
              e.stopPropagation();
              jarvisState.toggleMute();
            }}
            title={isMuted ? "Unmute J.A.R.V.I.S." : "Mute J.A.R.V.I.S."}
          >
            {isMuted ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="1" y1="1" x2="23" y2="23"></line>
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default JarvisHUD;

