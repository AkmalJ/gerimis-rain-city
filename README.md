[![make.fun bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/AkmalJ/gerimis-rain-city/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/AkmalJ/gerimis-rain-city/reward.svg)](https://make.fun/bounty/gta6-01)

# GERIMIS — Rain City Crime

An open-world crime game set in an Indonesian highland city where it never
stops drizzling, built on Three.js. In Gerimis the streets stay wet: neon and
warung light pool on the asphalt, angkot and bajaj feel their way through fog,
and POLRESTA GERIMIS responds to trouble with cruisers, roadblocks and the
AIR ONE helicopter.

You play **Damar**, a kid from the bus terminal who became the city's most
reliable wheelman. Work 8 story jobs for the people of Terminal Basah, Pasar
Kabut, Stasiun Kota and Kampung Atas. Out-drive the fog descents. Recover the
12 lost parcels. And take the city back from the ANAK KABUT gang — one rainy
night at a time.

## The look

A slate blue-grey rain world cut against **saturated neon** — hot pink, cyan
and teal signage, amber warung glow, glossy light pools on wet asphalt, and
one vivid red Rintik GT as the focal point of every chase. The sheet is built
to stay readable — and loud — at thumbnail size.

## What the city holds

- **6 districts** — Pusat Gerimis (neon downtown), Terminal Basah, Pasar
  Kabut (the wet market), Stasiun Kota (night trains), Kampung Atas
  (hillside lanterns) and Jalur Kabut (the fog highway)
- **8 story jobs** with stages, givers and dialogue; a **live POLRESTA
  dispatch** panel carrying named units, tactics and distances; wanted
  stars with a sight-and-escape system
- **Travelling bullet streaks** with ejected brass, muzzle stars and impact
  sparks — bullets fly, nothing is a laser
- **3 street races** with pars and best times, **12 hidden parcels**, and a
  stolen-car counter
- **Crew abilities** — Sari's GANTI PLAT, Ujang's PERBAIKAN CEPAT, Ratna's
  MATA ELANG
- A **respect rank ladder**, an Rp economy, health + armour, and
  **save / continue** through the browser
- Weather that never lets up: streak rain, puddle ripples, drifting street
  fog, splash rings, lightning with thunder, headlight cones — and the
  **PETA KOTA GERIMIS** town board on TAB, a poster with the full ledger

## Controls

| Key | Action |
| --- | --- |
| WASD | Walk / drive |
| Mouse | Camera and aim (click the game to lock the pointer) |
| Mouse hold | Fire |
| F | Enter / exit a car |
| Shift | Run / boost |
| Space | Handbrake |
| 1–4 | Weapons: fists, P9, SMG RINTIK, LARAS PETIR 12G |
| Z / X / C | Crew abilities |
| E | Start a street race at its gold beam |
| TAB | Town map board |

## Running it locally

Serve the `game/` folder with any static file server and open `index.html`
in desktop Chrome. The repo ships a tiny one:

```
node serve.ts        # http://localhost:8907
```

## Design notes

The city is one flat 760 m grid of wet streets dressed six different ways,
so every system — dispatch, races, parcels, the town board — reads the same
coherent world. Combat was built around a single rule: a bullet is a thing
that travels. Streaks are pooled meshes with a bright core and a fading
trail, casings are physical, and the muzzle star sits on the true barrel
tip, which is why screenshots can freeze a two-way gunfight mid-exchange.

Entered in the make.fun [GTA 6 bounty](https://make.fun/bounty/gta6-01).
MIT licensed — see LICENSE.
