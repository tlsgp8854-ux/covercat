/* Peek sound effects, made with the Web Audio API (no audio files). Short, cute, never harsh.
   sfx.play('on' | 'boo' | 'levelup'). Plays only when sfx.enabled() is true (the app wires it to the Sound setting).
   Browsers only allow audio after a tap, so sfx.unlock() runs on every tap and creates / resumes the AudioContext. */
const sfx = (() => {
  let ac = null, out = null;
  const ctx = () => {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      // a gentle compressor on the master bus, so stacked layers never clip
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -10; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .15;
      out = ac.createGain(); out.gain.value = .9;
      out.connect(comp).connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };
  // one oscillator with a quick attack and an exponential decay
  const tone = ({ type = 'sine', at, dur, peak, freq, to, curve, filter, vib }) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (curve) curve(o.frequency, at); else if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
    g.gain.setValueAtTime(.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + Math.min(.012, dur / 4));
    g.gain.exponentialRampToValueAtTime(.0001, at + dur);
    let node = o;
    if (filter) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; f.Q.value = .7; node.connect(f); node = f; }
    node.connect(g).connect(out);
    if (vib) { // slight vibrato
      const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib[0]; lg.gain.value = vib[1];
      l.connect(lg).connect(o.frequency); l.start(at); l.stop(at + dur + .02);
    }
    o.start(at); o.stop(at + dur + .02);
  };
  const SOUNDS = {
    // Sound on: a soft two-note chime going up (~0.25s, quiet)
    on(t) {
      [[784, 0], [1047, .1]].forEach(([f, d]) => {
        tone({ type: 'sine', at: t + d, dur: .15, peak: .25, freq: f });
        tone({ type: 'triangle', at: t + d, dur: .1, peak: .06, freq: f * 2 });
      });
    },
    // BOO!: a low thump, a bouncy boing with a little vibrato, a tiny squeak on top (~0.55s)
    boo(t) {
      tone({ type: 'sine', at: t, dur: .12, peak: .9, freq: 90, to: 45 });
      tone({ type: 'triangle', at: t + .05, dur: .35, peak: .5, freq: 300, vib: [16, 25], curve: (p, a) => {
        p.exponentialRampToValueAtTime(1200, a + .1);
        p.exponentialRampToValueAtTime(760, a + .18);
        p.exponentialRampToValueAtTime(980, a + .24);
        p.exponentialRampToValueAtTime(520, a + .35);
      } });
      tone({ type: 'sine', at: t + .44, dur: .08, peak: .22, freq: 1800, to: 2400 });
    },
    // LEVEL UP!: a bright rising arpeggio C5 E5 G5 C6, softened by a low-pass, then a short shimmer (~0.7s)
    levelup(t) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const at = t + i * .09;
        tone({ type: 'square', at, dur: .16, peak: .1, freq: f, filter: 2200 });
        tone({ type: 'triangle', at, dur: .18, peak: .2, freq: f });
      });
      tone({ type: 'sine', at: t + .4, dur: .28, peak: .12, freq: 2093 });
      tone({ type: 'sine', at: t + .46, dur: .24, peak: .09, freq: 2637 });
    }
  };
  return {
    enabled: () => true,
    unlock() { if (!this.enabled()) return; try { ctx(); } catch (e) {} },
    play(name) {
      if (!this.enabled() || !SOUNDS[name]) return;
      try { const c = ctx(); SOUNDS[name](c.currentTime + .02); } catch (e) {}
    }
  };
})();
