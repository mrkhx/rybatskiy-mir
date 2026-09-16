/** Procedural lake soundscape: no downloads, autoplay or gameplay timers. */
export type LakeCue = 'cast' | 'splash' | 'bite' | 'hook' | 'reel' | 'land' | 'release' | 'keep' | 'lost';
export class ForestLakeAudio {
  readonly context = new AudioContext();
  private master = this.context.createGain();
  private ambience = this.context.createGain();
  private noise: AudioBuffer;
  private timer: ReturnType<typeof setInterval>;
  private night = false;
  private spot = '';
  constructor(volume: number) {
    this.master.gain.value = volume;
    this.master.connect(this.context.destination);
    this.ambience.connect(this.master);
    this.noise = this.context.createBuffer(1, this.context.sampleRate * 4, this.context.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource(); source.buffer = this.noise; source.loop = true;
    const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 650;
    source.connect(filter); filter.connect(this.ambience); source.start();
    this.ambience.gain.value = .075;
    this.timer = setInterval(() => {
      if (this.context.state !== 'running') return;
      this.burst(450, .7, .035); // small waves against the bank
      if (Math.random() < .45) {
        const pitch = this.night ? 3800 : 1900 + Math.random() * 1300;
        this.tone(pitch, pitch * 1.25, .10, .018);
        this.tone(pitch * 1.1, pitch * .85, .14, .012, .18);
      }
      if (this.spot.includes('reed')) this.burst(2100, .9, .02);
    }, 2400);
  }
  configure(spot: string, tod: string, wx: string) {
    this.spot = spot; this.night = tod === 'NIGHT';
    const rain = /RAIN|STORM/.test(wx);
    this.ambience.gain.setTargetAtTime(rain ? .15 : .075, this.context.currentTime, .8);
  }
  volume(value: number) { this.master.gain.setTargetAtTime(value, this.context.currentTime, .05); }
  async resume() { await this.context.resume(); }
  async pause() { if (this.context.state !== 'closed') await this.context.suspend(); }
  close() { clearInterval(this.timer); void this.context.close().catch(() => {}); }
  private tone(from: number, to: number, duration: number, level: number, delay = 0) {
    const t = this.context.currentTime + delay;
    const source = this.context.createOscillator(); const gain = this.context.createGain();
    source.frequency.setValueAtTime(from, t); source.frequency.exponentialRampToValueAtTime(to, t + duration);
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level, t + .008); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    source.connect(gain); gain.connect(this.master); source.start(t); source.stop(t + duration + .01);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
  }
  private burst(frequency: number, duration: number, level: number) {
    const source = this.context.createBufferSource(); source.buffer = this.noise;
    const filter = this.context.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .7;
    const gain = this.context.createGain(); const t = this.context.currentTime;
    gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(level, t + .02); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(); source.stop(t + duration);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  cue(cue: LakeCue) {
    if (this.context.state !== 'running') return;
    switch (cue) {
      case 'cast': this.burst(1500, .45, .17); break;
      case 'splash': case 'release': this.burst(850, .55, .25); this.tone(280, 80, .18, .04); break;
      case 'bite': this.burst(1100, .16, .18); this.tone(950, 1300, .12, .08); this.tone(1300, 1000, .12, .06, .17); break;
      case 'hook': this.burst(2400, .13, .2); break;
      case 'reel': for (let i = 0; i < 10; i++) this.tone(380 + i % 2 * 80, 180, .035, .045, i * .055); break;
      case 'land': this.burst(600, .45, .2); break;
      case 'keep': this.burst(350, .2, .12); break;
      case 'lost': this.tone(240, 100, .2, .045); break;
    }
  }
}
