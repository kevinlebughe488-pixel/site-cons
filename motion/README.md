# Film de lancement Tribune Supporters

Film de présentation (motion design, 1920×1080, 30 i/s, ~2 min) avec voix off masculine en français,
musique et bruitages. Tout est généré par programme à partir de ce dossier.

| Fichier | Rôle |
| --- | --- |
| [`narration.json`](narration.json) | Texte de la voix off, découpé en répliques ; `say` donne la graphie prononcée (noms de villes, opérateurs) |
| [`voice.py`](voice.py) | Synthèse de la voix (Piper, voix `fr_FR-tom-medium`), sélection des meilleures prises, minutage |
| [`scene/`](scene) | La scène animée : HTML/CSS + GSAP, calée sur le minutage de la voix |
| [`render.mjs`](render.mjs) | Capture image par image (Chromium/Playwright) et encodage MP4 |
| [`audio.py`](audio.py) | Musique composée par programme, bruitages synchronisés, mixage et mastering (−14 LUFS) |

## Les sept tableaux

1. **Ouverture** — le stade s'allume, l'étoile de la RDC, « Congolaises, Congolais, mes chers compatriotes », la tribune se lève.
2. **Le problème** — les projecteurs s'éteignent : terrains abîmés, jeunes sans équipement, déplacements impossibles, « où va l'argent ? ».
3. **Révélation** — « Aujourd'hui, tout change » : le logo Tribune se dessine.
4. **Comment ça marche** — un projet, le paiement M-Pesa / Airtel Money / Orange Money, la validation sur le téléphone.
5. **Confiance** — clubs vérifiés, campagnes contrôlées, registre, versements par tranches sur preuves, remboursement.
6. **La nation** — le drapeau, de Kinshasa à Lubumbashi, les 26 chefs-lieux de province.
7. **Final** — « Le club, c'est vous. Bientôt partout en RDC. »

Le club montré dans l'application est volontairement « Votre club » : aucun vrai club n'apparaît.

## Refaire le film

Prérequis : Python 3, Node 18+, ffmpeg, Chromium pour Playwright.

```bash
pip install piper-tts sherpa-onnx scipy numpy
python3 motion/voice.py            # voix + minutage (prises en cache)
node motion/render.mjs --cues      # repères de montage et de bruitages
python3 motion/audio.py            # musique, bruitages, mixage → build/mix.wav
node motion/render.mjs             # images → build/frames (~3 600 images)
node motion/render.mjs --encode    # → out/tribune-supporters.mp4
```

Les modèles (voix Piper, Whisper pour le contrôle) sont téléchargés dans `motion/.cache` au premier lancement.

**Changer le texte** : modifiez `narration.json`, puis relancez toute la chaîne ; les animations se recalent
seules sur le nouveau minutage. Pour une réplique mal prononcée, ajoutez une graphie phonétique dans `say`, puis
`python3 motion/voice.py --takes 6 --only <id>` : six prises sont transcrites par Whisper et la plus fidèle est gardée.

**Contrôler une image** : `node motion/render.mjs --stills 12.5,40` écrit des captures dans `build/stills`.
Pour un aperçu dans le navigateur avec le son, servez le dossier `motion/` et ouvrez `scene/index.html?play`
(cliquez pour lancer).

**Pistes séparées** : `build/stem-voix.wav` et `build/stem-fond.wav` permettent de rééquilibrer le mix
dans un logiciel de montage. Les sous-titres sont dans `out/tribune-supporters.srt`.

## Crédits et licences

- Voix : modèle Piper [`fr_FR-tom-medium`](https://github.com/rhasspy/piper) (jeu de données
  [Tjiho/French-tts-model-piper](https://git.bksp.space/Tjiho/French-tts-model-piper), AGPLv3).
  Pour une diffusion commerciale à grande échelle, une voix enregistrée par un comédien congolais reste préférable :
  remplacez `build/voice.wav` (même minutage) ou ajustez `narration.json` à son enregistrement.
- Contrôle de prononciation : Whisper (MIT) via sherpa-onnx.
- Animation : [GSAP](https://gsap.com) 3.15 (licence standard gratuite), dans `scene/vendor`.
- Polices : Barlow Condensed et Source Sans 3 (SIL Open Font License), dans `scene/fonts`.
- Musique et bruitages : synthétisés par `audio.py`, sans échantillon externe.
