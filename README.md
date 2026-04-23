# Project Report

## Project

Personal portfolio website for `ArijitPatra`, built with `React`, `Vite`, `Three.js`, `GSAP`, and `Lenis`.

## Recent UI Updates

### Identity and Resume

- Updated the displayed full name to `ArijitPatra`.
- Adjusted landing-page name splitting so the UI still formats the name cleanly.
- Added resume download support through `public/ArijitPatra-Resume.pdf`.
- Connected the resume button so clicking it downloads the provided PDF.

### Work Section

- Updated project names in the UI to:
  - `AIMS`
  - `Travalog`
  - `Friday AI`
  - `Spotify Clone`
- Added subtitle support for cleaner project titles.
- Added `Live Demo` and `GitHub` action buttons in project cards.
- Updated project descriptions and highlights in the portfolio config.
- Replaced screenshot-heavy project previews with a custom SVG-based visual card system that better matches the existing dark UI.
- Fixed project preview overlap in the work section by moving preview text into a dedicated footer area below the SVG artwork.
- Improved work-card spacing so descriptions and action buttons are less likely to be cropped.

## Performance Optimization Work Done

### 1. Tech Stack Section Optimization

Files:
- `src/components/TechStack.tsx`

Changes made:
- Reduced sphere geometry complexity from `28x28` segments to `24x24`.
- Reduced total sphere count:
  - desktop: from `30` to `18`
  - mobile: to `12`
- Removed expensive environment and postprocessing work:
  - removed `Environment`
  - removed `EffectComposer`
  - removed `N8AO`
- Added `IntersectionObserver` so the tech stack canvas only mounts when the section is near the viewport.
- Used `frameloop="demand"` when the section is inactive to avoid constant rendering.
- Lowered canvas DPR:
  - desktop max DPR capped at `1.5`
  - mobile max DPR capped at `1`
- Added `powerPreference: "high-performance"` to the WebGL context.
- Simplified lighting for a cheaper render path.
- Stabilized repeated computations using:
  - `useMemo` for materials
  - `useMemo` for sphere data
  - `useCallback` for the observer handler
  - `React.memo` for `SphereGeo`
  - `React.memo` for `Pointer`
- Reduced texture overhead by disabling mipmaps and using lighter filtering.

### 2. Character Scene Optimization

Files:
- `src/components/Character/Scene.tsx`

Changes made:
- Disabled antialiasing for the hero renderer to reduce GPU cost.
- Capped pixel ratio to `Math.min(window.devicePixelRatio, 1.5)`.
- Added `powerPreference: "high-performance"` to the Three.js renderer.
- Added `IntersectionObserver` so animation work pauses when the character area is offscreen.
- Added document visibility handling so rendering pauses when the browser tab is hidden.
- Fixed listener lifecycle cleanup for:
  - `mousemove`
  - `touchstart`
  - `touchend`
  - `touchmove`
  - `resize`
- Reworked the animation loop cleanup using stored `requestAnimationFrame` ids.
- Replaced state-based character storage with `useRef` to avoid unnecessary rerenders.

### 3. Resize and Scroll Lifecycle Cleanup

Files:
- `src/components/MainContainer.tsx`
- `src/components/Navbar.tsx`

Changes made:
- Reworked `resizeHandler` in `MainContainer` with `useCallback`.
- Prevented repeated resize listener setup caused by effect dependency churn.
- Optimized viewport state updates so desktop/mobile state changes only trigger when the value actually changes.
- Improved `Lenis` cleanup in `Navbar`:
  - stored the animation frame id
  - canceled RAF on cleanup
  - removed added event listeners correctly
  - reset exported `lenis` reference to `null` on destroy
- Replaced inline link listeners with reusable handlers for better cleanup and less hidden work.

## Result

The site now scrolls more smoothly, especially around the hero 3D area and the tech stack section. The work section is visually cleaner, the project cards no longer overlap in the preview area, and the resume download flow is now functional.

## Verification

The project was verified with:

```bash
npm run build
```

Build status:
- Passed successfully after the optimizations and layout fixes.

## Remaining Known Note

- The bundle still contains a large `TechStack` chunk because `Three.js`, `Rapier`, and related 3D dependencies are heavy.
- If needed, the next major optimization step would be to replace the physics-driven tech stack with a lighter animation approach or further reduce the 3D asset cost.
