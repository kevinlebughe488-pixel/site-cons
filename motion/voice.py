"""Voix off : synthèse de narration.json avec Piper, traitement de la voix et minutage.

    python3 motion/voice.py              # assemble la voix (prises en cache, synthèse des manquantes)
    python3 motion/voice.py --takes 5    # refait 5 prises par morceau et garde la plus nette

Piper ne dit jamais deux fois une phrase de la même façon. Avec --takes, chaque prise est
transcrite par Whisper et la plus fidèle au texte est gardée en cache (motion/.cache/takes) :
les rendus suivants réutilisent ces prises.

Produit dans motion/build/ :
  voice.wav      voix traitée, 48 kHz mono, calée sur la timeline (intro comprise)
  timeline.json  début et fin de chaque réplique et de chacun de ses morceaux (secondes)
  timeline.js    la même chose pour la page d'animation (window.TIMELINE)
et motion/out/tribune-supporters.srt (sous-titres).
"""
import argparse
import difflib
import hashlib
import json
import re
import subprocess
import tarfile
import unicodedata
import urllib.request
import wave
from pathlib import Path

import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parent
BUILD = ROOT / "build"
OUT = ROOT / "out"
CACHE = ROOT / ".cache"
RELEASES = "https://github.com/k2-fsa/sherpa-onnx/releases/download"
SR = 48000


def fetch(url: str, folder: Path) -> None:
    """Télécharge et décompresse une archive de modèle (une seule fois)."""
    if folder.exists():
        return
    folder.parent.mkdir(parents=True, exist_ok=True)
    archive = folder.parent / "download.tar.bz2"
    print(f"Téléchargement de {url}…")
    urllib.request.urlretrieve(url, archive)
    with tarfile.open(archive) as tar:
        tar.extractall(folder.parent, filter="data")
    archive.unlink()


def load_voice(name: str) -> PiperVoice:
    folder = CACHE / "voices" / f"vits-piper-{name}"
    fetch(f"{RELEASES}/tts-models/vits-piper-{name}.tar.bz2", folder)
    return PiperVoice.load(folder / f"{name}.onnx", config_path=folder / f"{name}.onnx.json")


def synth(voice: PiperVoice, text: str, cfg: SynthesisConfig) -> np.ndarray:
    audio = np.concatenate([c.audio_float_array for c in voice.synthesize(text, syn_config=cfg)])
    # Piper laisse un peu de silence autour : on le retire pour maîtriser les pauses.
    # Marge large au début : l'explosion d'un « P » ou d'un « T » initial est très faible.
    loud = np.flatnonzero(np.abs(audio) > 0.008)
    sr = voice.config.sample_rate
    return audio[max(loud[0] - int(0.09 * sr), 0): loud[-1] + int(0.06 * sr)]


class Judge:
    """Note une prise : ressemblance entre la transcription Whisper et le texte attendu."""

    def __init__(self) -> None:
        import sherpa_onnx

        folder = CACHE / "sherpa-onnx-whisper-small"
        fetch(f"{RELEASES}/asr-models/sherpa-onnx-whisper-small.tar.bz2", folder)
        self.rec = sherpa_onnx.OfflineRecognizer.from_whisper(
            encoder=str(folder / "small-encoder.int8.onnx"),
            decoder=str(folder / "small-decoder.int8.onnx"),
            tokens=str(folder / "small-tokens.txt"),
            language="fr",
            task="transcribe",
            num_threads=4,
        )

    @staticmethod
    def norm(text: str) -> str:
        text = unicodedata.normalize("NFD", text.lower())
        text = "".join(c for c in text if unicodedata.category(c) != "Mn")
        return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())

    def score(self, audio: np.ndarray, sr: int, expected: str) -> tuple[float, str]:
        n = round(len(audio) * 16000 / sr)
        spectrum = np.fft.rfft(np.concatenate([np.zeros(sr // 5), audio, np.zeros(sr // 5)]))
        pcm = np.fft.irfft(spectrum[: n // 2 + 1], n) * (n / len(audio))
        stream = self.rec.create_stream()
        stream.accept_waveform(16000, pcm.astype(np.float32))
        self.rec.decode_stream(stream)
        heard = stream.result.text.strip()
        return difflib.SequenceMatcher(None, self.norm(expected), self.norm(heard)).ratio(), heard


def srt_time(t: float) -> str:
    ms = round(t * 1000)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def main() -> None:
    args = argparse.ArgumentParser()
    args.add_argument("--takes", type=int, default=0, help="nombre de prises à comparer par morceau")
    args.add_argument("--only", nargs="*", help="limiter --takes à ces répliques (id)")
    opts = args.parse_args()

    spec = json.loads((ROOT / "narration.json").read_text())
    voice = load_voice(spec["voice"])
    sr = voice.config.sample_rate
    cfg = SynthesisConfig(length_scale=spec["lengthScale"], noise_scale=0.6, noise_w_scale=0.75)
    judge = Judge() if opts.takes else None
    takes = CACHE / "takes"
    takes.mkdir(parents=True, exist_ok=True)

    def take(line_id: str, shown: str, spoken: str) -> np.ndarray:
        key = hashlib.sha1(json.dumps([spec["voice"], spec["lengthScale"], spoken]).encode()).hexdigest()[:16]
        path = takes / f"{key}.npy"
        retake = judge and (not opts.only or line_id in opts.only)
        if path.exists() and not retake:
            return np.load(path)
        if retake:
            scored = []
            for _ in range(opts.takes):
                audio = synth(voice, spoken, cfg)
                score, heard = judge.score(audio, sr, shown)
                scored.append((score, heard, audio))
            score, heard, best = max(scored, key=lambda s: s[0])
            print(f"  {score:.2f}  {shown}  →  {heard}")
        else:
            best = synth(voice, spoken, cfg)
        np.save(path, best.astype(np.float32))
        return best

    pieces, lines, t = [np.zeros(round(spec["intro"] * sr))], [], spec["intro"]
    for line in spec["lines"]:
        parts = []
        for i, (shown, spoken) in enumerate(zip(line["text"], line.get("say", line["text"]))):
            if i:
                pieces.append(np.zeros(round(spec["partPause"] * sr)))
                t += spec["partPause"]
            audio = take(line["id"], shown, spoken)
            pieces.append(audio)
            parts.append({"text": shown, "start": round(t, 3), "end": round(t + len(audio) / sr, 3)})
            t += len(audio) / sr
        lines.append({"id": line["id"], "scene": line["scene"], "start": parts[0]["start"], "end": parts[-1]["end"], "parts": parts})
        pieces.append(np.zeros(round(line["pause"] * sr)))
        t += line["pause"]
    duration = round(lines[-1]["end"] + spec["outro"], 3)

    scenes = {}
    for line in lines:
        scene = scenes.setdefault(line["scene"], {"start": line["start"], "end": line["end"]})
        scene["end"] = line["end"]
    timeline = {"duration": duration, "fps": 30, "scenes": scenes, "lines": {l["id"]: l for l in lines}}

    BUILD.mkdir(exist_ok=True)
    OUT.mkdir(exist_ok=True)
    raw = BUILD / "voice-raw.wav"
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(np.concatenate(pieces), -1, 1) * 32767).astype(np.int16).tobytes())

    # Voix chaude et présente : graves arrondis, présence vers 3 kHz, sifflantes adoucies,
    # compression légère. (Pas de changement de hauteur : il brouille l'articulation de Piper.)
    chain = ",".join([
        f"aresample={SR}",
        "highpass=f=70",
        "equalizer=f=130:t=o:w=1:g=2.5",
        "equalizer=f=350:t=o:w=1:g=-1.5",
        "equalizer=f=3200:t=o:w=1.2:g=2",
        "deesser=i=0.3",
        "acompressor=threshold=0.125:ratio=2.5:attack=8:release=120:makeup=1.6",
    ])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", chain, "-ac", "1", "-ar", str(SR), BUILD / "voice.wav"], check=True)

    (BUILD / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1))
    (BUILD / "timeline.js").write_text("window.TIMELINE = " + json.dumps(timeline, ensure_ascii=False) + ";\n")

    srt = []
    for n, line in enumerate(lines, 1):
        srt.append(f"{n}\n{srt_time(line['start'])} --> {srt_time(line['end'] + 0.3)}\n{' '.join(p['text'] for p in line['parts'])}\n")
    (OUT / "tribune-supporters.srt").write_text("\n".join(srt))
    print(f"Voix : {len(lines)} répliques, durée totale {duration:.1f} s")
    for name, s in scenes.items():
        print(f"  {name:15} {s['start']:6.1f} → {s['end']:6.1f}")


if __name__ == "__main__":
    main()
