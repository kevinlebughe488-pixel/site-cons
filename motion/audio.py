"""Bande sonore : musique composée par programme, bruitages calés sur l'image, voix off, mixage.

    python3 motion/audio.py      → motion/build/mix.wav (48 kHz stéréo, -14 LUFS)

Entrées : motion/build/voice.wav (voice.py) et motion/build/cues.json (render.mjs --cues).
Rien n'est échantillonné : tous les sons sont synthétisés ici, donc libres de droits.

Musique :
  ouverture   ré mineur, likembé (piano à pouces) sur nappe, tambours qui montent avec la foule
  problème    bourdon grave, battements de cœur, montée de tension
  révélation  ré majeur à 112 BPM, guitares arpégées dans l'esprit de la rumba congolaise,
              basse syncopée, congas, shaker ; accord final sur « Bientôt partout en RDC »
"""
import json
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
SR = 48000
R = np.random.default_rng(2026)


# ---------------------------------------------------------------- outils
def n_(sec: float) -> int:
    return max(1, int(round(sec * SR)))


def tv(n: int) -> np.ndarray:
    return np.arange(n) / SR


def hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def decay(n: int, t60: float) -> np.ndarray:
    return np.exp(-6.91 * tv(n) / t60)


def filt(x, kind, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype=kind, fs=SR, output="sos"), x, axis=-1)


def lp(x, f, o=2):
    return filt(x, "lowpass", f, o)


def hp(x, f, o=2):
    return filt(x, "highpass", f, o)


def bp(x, lo, hi, o=2):
    return filt(x, "bandpass", [lo, hi], o)


def noise(n: int) -> np.ndarray:
    return R.standard_normal(n)


def fade(x, a=0.004, r=0.03):
    n = x.shape[-1]
    e = np.ones(n)
    na, nr = min(n_(a), n), min(n_(r), n)
    e[:na] = np.linspace(0, 1, na)
    e[n - nr:] *= np.linspace(1, 0, nr)
    return x * e


def glide(f0, f1, n, k=0.04):
    """Sinus dont la fréquence glisse de f0 vers f1 (constante de temps k)."""
    f = f1 + (f0 - f1) * np.exp(-tv(n) / k)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def saw(f, n):
    return 2 * ((R.random() + f * tv(n)) % 1.0) - 1


def norm(x, peak=1.0):
    m = np.abs(x).max()
    return x * (peak / m) if m else x


def stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2)


class Bus:
    def __init__(self, dur):
        self.x = np.zeros((2, n_(dur)))

    def add(self, sig, t, gain=1.0, pan=0.0):
        sig = stereo(np.asarray(sig, float), pan)
        i = int(round(t * SR))
        if i < 0:
            sig, i = sig[:, -i:], 0
        j = min(i + sig.shape[1], self.x.shape[1])
        if j > i:
            self.x[:, i:j] += gain * sig[:, : j - i]


def reverb(x, t60=2.2, wet=0.25, tone=5000):
    n = n_(t60)
    ir = np.stack([noise(n), noise(n)]) * decay(n, t60)
    ir = lp(ir, tone)
    ir[:, : n_(0.022)] = 0
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    tail = np.stack([signal.oaconvolve(x[c], ir[c])[: x.shape[1]] for c in range(2)])
    return x + wet * tail


# ---------------------------------------------------------------- instruments
def pad(notes, dur, cutoff=1600, attack=0.6, release=1.4, detune=7):
    n = n_(dur + release)
    out = np.zeros((2, n))
    for m in notes:
        for ch, spread in ((0, -4), (1, 4)):
            for c in (-detune, 0, detune):
                out[ch] += saw(hz(m) * 2 ** ((c + spread) / 1200), n)
    out = lp(out, cutoff, 2)
    e = np.ones(n)
    na, nd = n_(attack), n_(dur)
    e[:na] = np.linspace(0, 1, na) ** 1.5
    e[nd:] = np.linspace(1, 0, n - nd) ** 2
    return out * e / (3 * len(notes))


def pluck(m, dur=1.2, pick=0.17, dark=1.0):
    f = hz(m)
    n = n_(dur)
    t = tv(n)
    y = np.zeros(n)
    for k in range(1, 16):
        if f * k > 9000 / dark:
            break
        amp = abs(np.sin(np.pi * k * pick)) / k ** (1.0 + 0.4 * dark)
        y += amp * np.sin(2 * np.pi * f * k * t + R.random() * 6.28) * np.exp(-6.91 * t / (dur / k ** 0.55))
    return fade(y, 0.0015, 0.05)


def likembe(m, dur=1.5):
    f = hz(m)
    n = n_(dur)
    t = tv(n)
    y = (np.sin(2 * np.pi * f * t) * decay(n, dur)
         + 0.22 * np.sin(2 * np.pi * f * 5.95 * t) * decay(n, 0.22)
         + 0.07 * np.sin(2 * np.pi * f * 11.3 * t) * decay(n, 0.08))
    click = lp(noise(n_(0.004)), 2500) * 0.25
    y[: len(click)] += click
    return fade(y, 0.001, 0.05)


def bell(m, dur=2.0):
    f = hz(m)
    n = n_(dur)
    t = tv(n)
    y = np.zeros(n)
    for r, a, d in ((1, 1, 1), (2.0, 0.45, 0.7), (2.76, 0.32, 0.5), (5.4, 0.18, 0.28), (8.93, 0.07, 0.14)):
        if f * r < 16000:
            y += a * np.sin(2 * np.pi * f * r * t) * decay(n, dur * d)
    return fade(y, 0.001, 0.05)


def bass(m, dur):
    f = hz(m)
    n = n_(dur + 0.06)
    t = tv(n)
    y = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * saw(f, n)
    y = lp(np.tanh(1.6 * y), 900)
    return fade(y * (0.6 + 0.4 * np.exp(-t / 0.12)), 0.004, 0.06)


def kick(punch=1.0):
    n = n_(0.5)
    y = glide(165 * punch, 46, n, 0.032) * decay(n, 0.5)
    y[: n_(0.004)] += hp(noise(n_(0.004)), 2000) * 0.3
    return np.tanh(1.4 * y)


def clap():
    n = n_(0.25)
    y = np.zeros(n)
    for d in (0, 0.009, 0.019):
        i = n_(d)
        y[i:] += noise(n - i) * decay(n - i, 0.03 if d < 0.019 else 0.2)
    y = bp(y, 900, 5200)
    y += 0.35 * np.sin(2 * np.pi * 190 * tv(n)) * decay(n, 0.1)
    return y


def shaker():
    n = n_(0.09)
    e = np.minimum(1, tv(n) / 0.012) * decay(n, 0.07)
    return hp(noise(n), 5500) * e


def hat(open_=False):
    n = n_(0.35 if open_ else 0.06)
    return hp(noise(n), 7500) * decay(n, 0.3 if open_ else 0.04)


def conga(high=True):
    f0 = 340 if high else 225
    n = n_(0.35)
    t = tv(n)
    f = f0 * (1 + 0.22 * np.exp(-t / 0.012))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(n, 0.28)
    y[: n_(0.008)] += bp(noise(n_(0.008)), 1000, 3500) * 0.5
    return y


def tom(f=95, dur=0.8):
    n = n_(dur)
    y = glide(f * 1.6, f, n, 0.05) * decay(n, dur)
    y[: n_(0.01)] += lp(noise(n_(0.01)), 2500) * 0.4
    return np.tanh(1.3 * y)


def crash(dur=2.8):
    n = n_(dur)
    y = np.stack([hp(noise(n), 3500), hp(noise(n), 3500)]) * decay(n, dur)
    t = tv(n)
    for f in (3150, 4270, 5710, 7330):
        y += 0.05 * np.sin(2 * np.pi * f * t + R.random() * 6) * decay(n, dur * 0.6)
    return lp(y, 12000)


# ---------------------------------------------------------------- bruitages
def sweep_noise(dur, lo=(300, 1200), hi=(2000, 6500), pan_from=-0.6, pan_to=0.6):
    n = n_(dur)
    t = tv(n) / dur
    env = np.sin(np.pi * t) ** 2
    a, b = bp(noise(n), *lo), bp(noise(n), *hi)
    y = (a * (1 - t) + b * t) * env
    p = pan_from + (pan_to - pan_from) * t
    ang = (p + 1) * np.pi / 4
    return np.stack([y * np.cos(ang), y * np.sin(ang)]) * np.sqrt(2)


def sfx_swoosh():
    return sweep_noise(0.6)


def sfx_whoosh():
    w = sweep_noise(1.0, lo=(150, 900), hi=(1200, 5000), pan_from=-0.8, pan_to=0.8)
    n = w.shape[1]
    return w + stereo(lp(noise(n), 120) * np.sin(np.pi * tv(n) / (n / SR)) ** 2 * 3)


def sfx_swipe():
    return sweep_noise(0.3, lo=(800, 2500), hi=(3000, 8000), pan_from=-0.3, pan_to=0.3)


def sfx_clunk():
    n = n_(0.9)
    t = tv(n)
    y = np.zeros(n)
    th = glide(95, 48, n_(0.35), 0.05) * decay(n_(0.35), 0.35)
    y[: len(th)] += th
    y[: n_(0.02)] += bp(noise(n_(0.02)), 1500, 6000) * decay(n_(0.02), 0.015) * 0.7
    hum = (np.sin(2 * np.pi * 100 * t) + 0.5 * np.sin(2 * np.pi * 200 * t) + 0.25 * np.sin(2 * np.pi * 300 * t)) * decay(n, 0.8)
    return y + 0.07 * hum


def sfx_shimmer():
    # Court (≈ 1,2 s) : ces aigus ressemblent à des consonnes et ne doivent pas déborder sur la voix.
    n = n_(1.4)
    out = np.zeros((2, n))
    for _ in range(40):
        f = 2400 + R.random() * 5000
        i = n_(R.random() * 0.75)
        m = n - i
        s = np.sin(2 * np.pi * f * tv(m)) * decay(m, 0.35) * (0.4 + R.random() * 0.6)
        out[:, i:] += stereo(s, R.random() * 1.6 - 0.8)
    out += stereo(hp(noise(n), 6000) * np.sin(np.pi * tv(n) / 1.4) ** 2 * 0.15)
    return out


def sfx_hit():
    n = n_(1.8)
    return glide(110, 38, n, 0.08) * decay(n, 1.8) + lp(noise(n), 800) * decay(n, 0.25) * 0.4


def sfx_boom():
    n = n_(1.0)
    return np.tanh(1.5 * (glide(140, 44, n, 0.04) * decay(n, 1.0) + bp(noise(n), 200, 2000) * decay(n, 0.12) * 0.35))


def sfx_kick():
    n = n_(0.2)
    y = glide(220, 85, n, 0.015) * decay(n, 0.18)
    y[: n_(0.03)] += bp(noise(n_(0.03)), 800, 4000) * decay(n_(0.03), 0.03) * 0.5
    return y


def sfx_crowd(dur):
    n = n_(dur)
    t = tv(n)
    roar = np.stack([bp(noise(n), 250, 2600), bp(noise(n), 250, 2600)])
    roar *= 1 + 0.45 * np.stack([lp(noise(n), 5), lp(noise(n), 5)]) / 0.05
    voices = np.zeros((2, n))
    for _ in range(36):
        f = 170 + R.random() * 260
        i = n_(R.random() * min(2.5, dur * 0.5))
        m = n - i
        vib = 1 + 0.012 * np.sin(2 * np.pi * (4 + R.random() * 2) * tv(m))
        v = 2 * ((R.random() + np.cumsum(f * vib) / SR) % 1) - 1
        v = bp(v, 450 + R.random() * 300, 1300 + R.random() * 500)
        env = np.minimum(1, tv(m) / (0.3 + R.random() * 0.8)) * np.clip((dur - 1.2 - tv(m) - i / SR) / 1.5 + 1, 0, 1)
        voices[:, i:] += stereo(v * env, R.random() * 1.8 - 0.9)
    env = np.minimum(1, t / 1.2) * np.clip((dur - t) / 2.0, 0, 1)
    return (norm(roar) * 0.5 + norm(voices) * 0.8) * env


def sfx_thud():
    n = n_(0.4)
    return glide(105, 50, n, 0.03) * decay(n, 0.3) + lp(noise(n), 1500) * decay(n, 0.06) * 0.45


def sfx_drone():
    n = n_(3.5)
    y = sum(saw(hz(m), n) for m in (26, 27, 38))
    env = np.sin(np.pi * tv(n) / 3.5) ** 1.5
    return lp(y, 320) * env + 0.5 * np.sin(2 * np.pi * hz(26) * tv(n)) * env


def sfx_riser(dur):
    n = n_(dur)
    t = tv(n) / dur
    f = 140 * (1800 / 140) ** t
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    air = hp(noise(n), 1500) * (0.2 + 0.8 * t)
    return np.stack([tone + air, tone + hp(noise(n), 1500) * (0.2 + 0.8 * t)]) * t ** 2.2


def sfx_impact():
    n = n_(3.0)
    y = glide(75, 31, n, 0.2) * decay(n, 2.6) * 1.2 + bp(noise(n), 100, 3000) * decay(n, 0.35) * 0.6
    return stereo(np.tanh(1.3 * y)) + crash(3.0) * 0.5


def sfx_logo():
    out = np.zeros((2, n_(2.6)))
    for i, m in enumerate((86, 90, 93, 98)):
        b = bell(m, 2.2)
        out[:, n_(i * 0.06): n_(i * 0.06) + len(b)] += stereo(b, (i - 1.5) * 0.3)[:, : out.shape[1] - n_(i * 0.06)]
    s = sfx_shimmer()
    out[:, : s.shape[1]] += s * 0.5
    bm = sfx_boom()
    out[:, : len(bm)] += stereo(bm) * 0.6
    return out


def sfx_pop():
    n = n_(0.1)
    return glide(450, 1150, n, 0.02) * decay(n, 0.09)


def sfx_click():
    n = n_(0.03)
    return hp(noise(n), 3000) * decay(n, 0.006) * 0.6 + np.sin(2 * np.pi * 2200 * tv(n)) * decay(n, 0.015)


def sfx_notif():
    out = np.zeros(n_(0.8))
    for i, m in enumerate((88, 93)):
        b = bell(m, 0.6)
        out[n_(i * 0.14): n_(i * 0.14) + len(b)] += b[: len(out) - n_(i * 0.14)]
    return out


def sfx_tick():
    n = n_(0.06)
    return np.sin(2 * np.pi * 1450 * tv(n)) * decay(n, 0.05)


def sfx_success():
    out = np.zeros(n_(1.6))
    for i, m in enumerate((86, 90, 93, 98)):
        b = bell(m, 1.2)
        i0 = n_(i * 0.075)
        out[i0: i0 + len(b)] += b[: len(out) - i0]
    return out


def sfx_stamp():
    y = sfx_thud() * 1.2
    y[: n_(0.06)] += bp(noise(n_(0.06)), 600, 3500) * decay(n_(0.06), 0.05) * 0.9
    return y


def sfx_coin():
    n = n_(0.25)
    t = tv(n)
    return sum(a * np.sin(2 * np.pi * f * t) * decay(n, d) for f, a, d in ((3520, 1, 0.2), (5280, 0.5, 0.12), (7900, 0.25, 0.06)))


def sfx_ding():
    return bell(81, 1.4)


def sfx_flag():
    p = pad([50, 57, 62, 66, 69, 74], 1.6, cutoff=2600, attack=0.45, release=1.2)
    c = crash(2.0)[:, ::-1]
    out = np.zeros((2, max(p.shape[1], c.shape[1])))
    out[:, : p.shape[1]] += p * 3
    out[:, : c.shape[1]] += c * 0.25
    return out


def sfx_ping():
    n = n_(0.8)
    t = tv(n)
    return (np.sin(2 * np.pi * 1320 * t) + 0.4 * np.sin(2 * np.pi * 1980 * t)) * decay(n, 0.6)


def sfx_counter():
    out = np.zeros(n_(1.5))
    tick = np.sin(2 * np.pi * 2000 * tv(n_(0.03))) * decay(n_(0.03), 0.02)
    for k in range(1, 27):
        i = n_(1.35 * (1 - (1 - k / 26) ** (1 / 3)))
        out[i: i + len(tick)] += tick[: len(out) - i]
    return out


SFX = {name[4:]: fn for name, fn in globals().items() if name.startswith("sfx_")}
LEVEL_DB = {
    "clunk": -9, "shimmer": -17, "hit": -11, "kick": -14, "swoosh": -19, "whoosh": -15, "crowd": -13, "boom": -12,
    "thud": -11, "drone": -14, "riser": -13, "impact": -5, "logo": -9, "pop": -17, "swipe": -19, "click": -19,
    "notif": -14, "tick": -21, "success": -12, "stamp": -10, "coin": -27, "ding": -15, "flag": -11, "ping": -18,
    "counter": -21,
}


# ---------------------------------------------------------------- composition
def compose(marks, dur):
    mus = Bus(dur + 4)
    M = marks

    # Ouverture : ré mineur, deux tours de Dm – Bb – F – C jusqu'à l'extinction des projecteurs.
    start, stop = 2.0, M["pb"]
    chord_len = (stop - start) / 8
    beat = chord_len / 4
    chords_a = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]
    mus.add(pad([26, 38, 45], stop + 0.3, cutoff=380, attack=3.0, release=0.8), 0.3, 0.9)
    for i in range(8):
        t = start + i * chord_len
        ch = chords_a[i % 4]
        mus.add(pad(ch, chord_len, cutoff=1300, attack=0.9 if i == 0 else 0.25, release=0.6), t, 0.55 + 0.04 * i)
        if t >= M["adresseEnd"] - 0.4:
            arp = [ch[0] + 24, ch[1] + 24, ch[2] + 24, ch[1] + 24, ch[0] + 36, ch[2] + 24, ch[1] + 24, ch[2] + 24]
            for k, m in enumerate(arp):
                mus.add(likembe(m), t + k * beat / 2, 0.16 + 0.015 * i, pan=0.35 * np.sin(k))
        for b in range(4):
            tb = t + b * beat
            if tb >= 7.0:
                mus.add(kick(0.8), tb, 0.35 if tb < M["tribunes"] - 1.5 else 0.6)
    # Tambours de guerre : la tribune se lève.
    t = M["tribunes"] - 1.6
    k = 0
    while t < stop - 0.05:
        prog = min(1, (t - (M["tribunes"] - 1.6)) / (stop - M["tribunes"] + 1.6))
        mus.add(tom(92 if k % 4 else 70), t, 0.2 + 0.45 * prog, pan=-0.3 if k % 2 else 0.3)
        t += beat / 2
        k += 1
    mus.add(crash(3.0), M["tribunes"] + 1.0, 0.25)

    # Le problème : bourdon, cœur qui bat, notes graves isolées.
    tension_end = M["tout"]
    mus.add(pad([26, 33], tension_end - stop, cutoff=260, attack=1.2, release=0.4), stop + 0.2, 1.1)
    t, k = stop + 1.0, 0
    while t < tension_end - 0.4:
        fast = t > M["argent"]
        mus.add(lp(kick(0.6), 300), t, 0.55)
        mus.add(lp(kick(0.6), 300), t + 0.22, 0.35)
        t += 0.62 if fast else 1.05
    for i, m in enumerate([50, 53, 45, 46, 50, 41]):
        tt = stop + 1.5 + i * 2.1
        if tt < M["argent"] + 1:
            mus.add(pluck(m, 2.4, dark=2.0), tt, 0.35, pan=-0.2 + 0.08 * i)

    # Révélation : ré majeur, 112 BPM, D – A – Bm – G.
    bpm = 112
    beat = 60 / bpm
    bar = 4 * beat
    s16 = beat / 4
    chords = [[62, 66, 69], [57, 61, 64], [59, 62, 66], [55, 59, 62]]
    roots = [38, 33, 35, 31]
    t0, t_end = M["tout"], M["bientot"]
    guitar_arp = [0, 1, 2, 3, 2, 1, 2, 0, 1, 2, 3, 2, 3, 2, 1, 2]
    bass_steps = [(0, 0, 3), (3, 7, 2), (6, 12, 2), (8, 0, 3), (11, 7, 2), (14, 12, 2)]
    nb = int(np.ceil((t_end - t0) / bar))
    for b in range(nb):
        tb = t0 + b * bar
        ci = b % 4
        ch = chords[ci]
        nation = M["nation"] <= tb < M["final"]
        drums = tb >= M["how"] - 0.3
        trust = M["trust"] <= tb < M["nation"]
        mus.add(pad([ch[0] - 12] + ch + ([ch[0] + 12, ch[2] + 12] if nation else []), bar, cutoff=2600 if nation else 1700, attack=0.12, release=0.5), tb, 0.6 if nation else 0.5)
        for s in range(16):
            t = tb + s * s16
            if t >= t_end - 0.02:
                break
            if b >= 1 or s >= 8:
                tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24]
                mus.add(pluck(tones[guitar_arp[s]], 0.9), t, 0.13 if trust else 0.17, pan=0.4)
            if drums and s % 4 == 2:
                mus.add(pluck(ch[(s // 4) % 3] + 12, 0.25, dark=1.4), t, 0.12, pan=-0.45)
            if tb >= t0 + bar and s % 2 == 0 or (drums and s % 2 == 1):
                mus.add(shaker(), t, 0.1 if s % 4 == 2 else 0.06, pan=-0.25)
            if drums:
                if s in (0, 8) or (s == 11 and not trust):
                    mus.add(kick(), t, 0.75 if s != 11 else 0.45)
                if s in (4, 12):
                    mus.add(clap(), t, 0.4)
                if s in (2, 3, 7, 10, 13, 15) and not trust:
                    mus.add(conga(s in (2, 10, 13)), t, 0.24, pan=0.25 if s % 2 else -0.15)
                if s == 14:
                    mus.add(hat(True), t, 0.08, pan=0.3)
            if nation and b % 2 == 1 and s in (12, 14):
                mus.add(tom(110 if s == 12 else 85), t, 0.45)
        if tb >= M["voici"] - 0.2:
            for s, off, length in bass_steps:
                t = tb + s * s16
                if t < t_end - 0.02:
                    mus.add(bass(roots[ci] + off, length * s16 * 0.9), t, 0.5)
    for t in (M["how"], M["nation"], M["final"]):
        mus.add(crash(2.5), t, 0.18)

    # Accord final : « Bientôt partout en RDC ».
    tf = M["bientot"]
    ring = dur - tf + 1
    mus.add(pad([38, 50, 57, 62, 66, 69, 74], ring - 1, cutoff=2400, attack=0.05, release=2.5), tf, 0.75)
    mus.add(kick(1.1), tf, 0.9)
    mus.add(crash(4.0), tf, 0.3)
    mus.add(bass(26, 2.5), tf, 0.6)
    for i, m in enumerate((62, 66, 69, 74, 78, 81)):
        mus.add(pluck(m, 3.0), tf + i * 0.035, 0.18, pan=-0.4 + 0.16 * i)
    for i, m in enumerate((86, 90, 93, 98)):
        mus.add(bell(m, 3.0), tf + 0.4 + i * 0.12, 0.08, pan=0.3 * (i - 1.5))
    return mus.x[:, : n_(dur)]


def place_sfx(cues, marks, dur):
    fx = Bus(dur + 4)
    for c in cues:
        t, name = c["t"], c["name"]
        if name == "riser":
            sig = sfx_riser(marks["tout"] - t)
        elif name == "crowd":
            sig = sfx_crowd(min(7.5, (marks["pb"] if t < marks["pb"] else dur + 0.5) - t + 0.6))
        else:
            sig = SFX[name]()
        fx.add(norm(sig) * 10 ** (LEVEL_DB[name] / 20), t, c["gain"])
    return fx.x[:, : n_(dur)]


def read_wav(path):
    with wave.open(str(path)) as w:
        assert w.getframerate() == SR and w.getsampwidth() == 2
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
        return x.reshape(-1, w.getnchannels()).T


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).T.copy()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def main():
    cues = json.loads((BUILD / "cues.json").read_text())
    marks, dur = cues["marks"], cues["marks"]["end"]
    voice = read_wav(BUILD / "voice.wav")[0]
    voice = np.pad(voice, (0, max(0, n_(dur) - len(voice))))[: n_(dur)]

    print("Composition de la musique…")
    music = compose(marks, dur)
    print("Bruitages…")
    fx = place_sfx(cues["sfx"], marks, dur)

    # Niveaux : voix parlée à -18 dB RMS, musique 12 dB dessous, puis -7 dB de plus quand la voix parle.
    active = np.abs(voice) > 0.02
    speech = lp(voice ** 2, 6)
    voice *= 10 ** ((-18 - rms_db(voice[active])) / 20)
    loud = np.abs(music).max(axis=0) > 1e-3
    music *= 10 ** ((-30 - rms_db(music[:, loud])) / 20)
    presence = np.clip(np.sqrt(np.maximum(speech, 0)) / 0.02, 0, 1)
    presence = np.clip(np.roll(lp(presence, 3), -n_(0.08)), 0, 1)

    # Quand la voix parle, musique et bruitages s'effacent surtout dans sa bande (300 Hz – 5 kHz) :
    # -14 dB dans les médiums, -8 dB dans les graves (les impacts gardent leur poids), -10 dB dans les aigus.
    bg = reverb(music, t60=2.4, wet=0.22) + reverb(fx, t60=1.8, wet=0.2)
    low, high = lp(bg, 300, 4), hp(bg, 5000, 4)
    mid = bg - low - high
    bg = low * (1 - 0.6 * presence) + mid * (1 - 0.8 * presence) + high * (1 - 0.7 * presence)
    v = stereo(voice)
    mix = hp(reverb(v, t60=1.1, wet=0.07, tone=4000) + bg, 25)
    on = presence > 0.5
    print(f"Voix / fond pendant la parole : {rms_db(v[:, on]) - rms_db(bg[:, on]):.1f} dB")
    # Pistes séparées (même gain que le mix) pour contrôler ou rééquilibrer dans un logiciel de montage.
    peak = 0.9 / np.abs(mix).max()
    write_wav(BUILD / "stem-voix.wav", v * peak)
    write_wav(BUILD / "stem-fond.wav", bg * peak)
    mix *= 0.9 / np.abs(mix).max()
    raw = BUILD / "mix-raw.wav"
    write_wav(raw, mix)

    # Mastering : gain pour viser -14 LUFS (réseaux sociaux), puis limiteur à -1,5 dBFS.
    # (Gain avant limiteur : une normalisation dynamique comprimerait la voix.)
    def measure(path):
        out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        return json.loads(out[out.rindex("{"): out.rindex("}") + 1])

    gain = -14 - float(measure(raw)["input_i"])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
                    f"volume={gain:.2f}dB,alimiter=limit=0.84:attack=3:release=80:level=disabled",
                    "-ar", str(SR), "-c:a", "pcm_s16le", BUILD / "mix.wav"], check=True)
    m = measure(BUILD / "mix.wav")
    print(f"Mixage : {BUILD / 'mix.wav'} ({dur:.1f} s, {m['input_i']} LUFS, crête {m['input_tp']} dBTP)")


if __name__ == "__main__":
    main()
