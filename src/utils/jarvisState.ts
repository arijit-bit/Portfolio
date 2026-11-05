type Listener = () => void;

class JarvisStateManager {
  private isSpeaking = false;
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private listeners: Set<Listener> = new Set();
  private rafId: number | null = null;
  public energy = 0;

  public subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public getSpeaking(): boolean {
    return this.isSpeaking;
  }

  public setAudio(audioEl: HTMLAudioElement) {
    this.audio = audioEl;

    // Attach speech listeners
    audioEl.addEventListener("play", () => {
      this.isSpeaking = true;
      this.initAnalyser();
      this.startLoop();
      this.notify();
    });

    audioEl.addEventListener("pause", () => {
      this.isSpeaking = false;
      this.stopLoop();
      this.energy = 0;
      this.notify();
    });

    audioEl.addEventListener("ended", () => {
      this.isSpeaking = false;
      this.stopLoop();
      this.energy = 0;
      this.notify();
    });
  }

  private initAnalyser() {
    if (this.analyser || !this.audio || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaElementSource(this.audio);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.75;
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch {
      // AudioContext may fail if already routed or CORS; fall back to simulated wave
    }
  }

  private startLoop() {
    if (this.rafId) return;
    const update = () => {
      if (this.isSpeaking) {
        if (this.analyser && this.dataArray) {
          this.analyser.getByteFrequencyData(this.dataArray);
          let sum = 0;
          for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
          }
          this.energy = sum / (this.dataArray.length * 255);
        } else {
          // Simulated speech oscillation fallback
          const t = performance.now() * 0.005;
          this.energy = (Math.sin(t * 3.5) * 0.5 + 0.5) * 0.7 + (Math.sin(t * 7.2) * 0.3);
        }
        this.notify();
        this.rafId = requestAnimationFrame(update);
      } else {
        this.energy = 0;
        this.rafId = null;
      }
    };
    this.rafId = requestAnimationFrame(update);
  }

  private stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public replay() {
    if (this.audio) {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
    }
  }

  public toggleMute() {
    if (this.audio) {
      this.audio.muted = !this.audio.muted;
      this.notify();
    }
  }

  public isMuted(): boolean {
    return this.audio ? this.audio.muted : false;
  }
}

export const jarvisState = new JarvisStateManager();

