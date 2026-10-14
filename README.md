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
2. Pick **The Giggle Garden**.
3. Camera mode starts with **The Stepping Stone**: step back until Pip can see you.
   Lotus flowers bloom around the pond as you get into place.
4. Swish your arms through the fruit. Fast swishes leave a soft brush trail and slice.
   - Every 3 fruits wakes up a sleepy flower.
   - 3+ fruits in one sweep = **Calligraphy Flow** combo (rainbow ribbon, butterflies).
   - Slice the **Morning Frost** crystal, then hold still like a statue for 3 seconds.
5. At the end, see the garden you painted in a wooden storybook frame.

Keyboard: `Esc` or `P` pauses.

## For grown-ups (Settings)

- **Camera picture**: from *Garden only* (camera hidden) to *Clear mirror*.
  The default is a soft 75% mirror. It only changes how the picture looks;
  body tracking always uses the full camera image.
- Music / sound-effect volume, mute.
- Slicing sensitivity (*Gentle swish* is easiest), round length, calm motion.
- Reset progress.

## Project structure

```
src/
  App.tsx                 screen flow (title → intro → worlds → play → results)
  components/             React screens, HUD, Pip & friends (SVG), settings
  game/
    createGame.ts         Phaser setup (transparent canvas over paper + camera)
    scenes/               CalibrationScene (Stepping Stone), GiggleGardenScene
    entities/Fruit.ts     floaty fruit physics
    effects/              brush trails, slice halves, watercolor blooms, petals
    systems/              LivingGarden (flowers, butterflies), FrostMoment
    tapestry.ts           the paper that absorbs paint as you play
  vision/                 camera, MediaPipe pose tracker, calibration checks, smoothing
  input/inputHub.ts       turns wrists / mouse into two "magic hands"
  art/                    procedural watercolor painter, fruit art, textures, palette
  audio/audio.ts          procedural kalimba/marimba music and organic sound effects
  state/                  settings, saved progress, event bus, shared types
reference/                the concept images used for art direction
```

All artwork and audio are generated in code — no external image or sound files,
so there's nothing to license and nothing that can fail to load.

## Roadmap

- [x] Phase 1–3: foundation, Giggle Garden, real body tracking + calibration
- [x] Morning Frost, Calligraphy Flow combos, Living Tapestry results
- [ ] The Wiggly Waterway (legs & balance) — Bloop the frog
- [ ] The Cloudberry Sky (reaching & jumping) — Misty the cloud
