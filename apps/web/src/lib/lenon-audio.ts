export type Sfx = "tap" | "send" | "receive" | "success" | "star" | "gentle" | "enter";

type WebAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export class LenonAudio {
  private ac: AudioContext | null = null;
  enabled = true;

  private ctx(): AudioContext | null {
    try {
      if (!this.ac) {
        const AudioContextCtor = window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
        if (!AudioContextCtor) return null;
        this.ac = new AudioContextCtor();
      }
    } catch {
      return null;
    }
    if (this.ac.state === "suspended") void this.ac.resume();
    return this.ac;
  }

  private beep(freq: number, dur = 0.15, type: OscillatorType = "sine", vol = 0.12, when = 0) {
    const ac = this.ctx();
    if (!ac || !this.enabled) return;
    const t = ac.currentTime + when;
    const oscillator = ac.createOscillator();
    const gain = ac.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    oscillator.connect(gain);
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    oscillator.start(t);
    oscillator.stop(t + dur + 0.02);
  }

  private haptic(pattern: number | number[]) {
    if (!this.enabled || !("vibrate" in navigator)) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics are best-effort and unsupported on many desktop browsers.
    }
  }

  sfx(name: Sfx) {
    if (!this.enabled) return;
    const C = 523.25;
    const E = 659.25;
    const G = 783.99;
    const A = 880;
    const HI = 1046.5;
    switch (name) {
      case "tap":
        this.beep(430, 0.05, "sine", 0.06);
        this.haptic(8);
        break;
      case "send":
        this.beep(560, 0.07, "sine", 0.08);
        this.haptic(10);
        break;
      case "receive":
        this.beep(680, 0.08, "sine", 0.06);
        break;
      case "success":
        [C, E, G, HI].forEach((freq, index) => this.beep(freq, 0.17, "triangle", 0.1, index * 0.09));
        this.haptic([14, 40, 14, 60]);
        break;
      case "star":
        [G, HI].forEach((freq, index) => this.beep(freq, 0.18, "triangle", 0.09, index * 0.08));
        this.haptic([10, 30, 10]);
        break;
      case "gentle":
        this.beep(300, 0.2, "sine", 0.1);
        this.beep(220, 0.3, "sine", 0.07, 0.09);
        this.haptic([20, 60, 20]);
        break;
      case "enter":
        [E, A, HI].forEach((freq, index) => this.beep(freq, 0.15, "triangle", 0.09, index * 0.07));
        this.haptic([10, 20, 30]);
        break;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this.sfx("tap");
    return this.enabled;
  }
}
