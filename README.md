# Fruitopia — The Magical Moving Garden

A gentle, motion-controlled fruit-slicing game for children. Stand in front of the webcam,
swish your arms to slice floating fruit, and watch a sleepy watercolor garden wake up.
Low stimulation by design: no flashes, no screen shake, no fail buzzers.

## Run it

```bash
npm install      # also copies the body-tracking runtime + model into /public
npm run dev      # opens http://localhost:5173
```

Webcam access works on `localhost` or any `https://` address.

## Play online

**https://npallavii.github.io/fruitninja/**

To publish an update: commit your changes, then run `npm run deploy`.
It builds the game and pushes it to the `gh-pages` branch, which GitHub Pages serves
(live about a minute later).

## How to play

1. **Play** → choose **Play with my body** (webcam) or **Mouse or touch**.
2. Pick a world. Camera mode starts with **The Stepping Stone**: step back until Pip can see you.
3. Play for one round, then see the garden you painted in a wooden storybook frame.

| World | Friend | Movement | How it plays |
|---|---|---|---|
| **The Giggle Garden** | Pip the red panda | Arms | Swish through floating fruit. 3+ in one sweep = **Calligraphy Flow** combo. |
| **The Wiggly Waterway** | Bloop the frog | Legs & balance | Step/stomp beside rolling melons to splash them. Stand on the **glowing lily pad** to make a lotus bloom. If your feet are hidden, hands work too. |
| **The Cloudberry Sky** | Misty the cloud | Reaching & jumping | Touch rising lanterns to pop them (higher = bonus). Each pop grows a **rainbow bridge**. **Jump** (or reach) to catch the golden star. |

In every world: successes wake up sleepy flowers, and the **Morning Frost** crystal asks for a 3-second statue pose.

### Character voices

Pip, Bloop and Misty speak their lines aloud, each in their own voice (Pip bright and bouncy,
Bloop low and slow, Misty soft and dreamy), using the browser's built-in speech engine.
Tap any character to hear them again. Voices can be turned off or quieter in Settings.
Best in Chrome or Edge (Edge has the most natural voices).

Keyboard: `Esc` or `P` pauses.

## For grown-ups (Settings)

- **Camera picture**: from *Garden only* (camera hidden) to *Clear mirror*.
  The default is a soft 75% mirror. It only changes how the picture looks;
  body tracking always uses the full camera image.
- Music / sound-effect volume, mute, character voices on/off and voice volume.
- Slicing sensitivity (*Gentle swish* is easiest), round length, calm motion.
- Reset progress.

## Project structure

```
src/
  App.tsx                 screen flow (title → intro → worlds → play → results)
  components/             React screens, HUD, Pip & friends (SVG), settings
  game/
    createGame.ts         Phaser setup (transparent canvas over paper + camera)
    scenes/               LevelScene (shared base), CalibrationScene, Giggle / Waterway / Sky
    entities/Fruit.ts     floaty fruit physics
    effects/              brush trails, slice halves, watercolor blooms, petals
    systems/              LivingGarden (flowers, butterflies), FrostMoment
    tapestry.ts           the paper that absorbs paint as you play
  vision/                 camera, MediaPipe pose tracker, calibration checks, smoothing
  input/inputHub.ts       turns wrists / mouse into two "magic hands"
  art/                    procedural watercolor painter, fruit art, textures, palette
  audio/audio.ts          procedural kalimba/marimba music and organic sound effects
  audio/voice.ts          character voices (speech synthesis tuned per character)
  state/                  settings, saved progress, event bus, shared types
reference/                the concept images used for art direction
```

All artwork and audio are generated in code — no external image or sound files,
so there's nothing to license and nothing that can fail to load.

## Roadmap

- [x] Phase 1–3: foundation, Giggle Garden, real body tracking + calibration
- [x] Morning Frost, Calligraphy Flow combos, Living Tapestry results
- [x] Character voices (Pip, Bloop, Misty)
- [x] The Wiggly Waterway (legs & balance) — Bloop the frog
- [x] The Cloudberry Sky (reaching & jumping) — Misty the cloud
