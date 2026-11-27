# Gobble Run — Turkey's Great Escape

![make.fun bounty](https://make.fun/badge/turkey-run-game-01.svg)
![rank](https://make.fun/badge/turkey-run-game-01/Joppy26/turkey-run-game-01/rank.svg)
![reward](https://make.fun/badge/turkey-run-game-01/Joppy26/turkey-run-game-01/reward.svg)

Entry for the [turkey escape game bounty](https://make.fun/bounty/turkey-run-game-01).

## The game

Thanksgiving is coming, and you are the turkey. The farmer is right behind you with his pitchfork, the oven is already roaring in the kitchen, and the carving knife is swinging. Run 1,400 metres from the farmyard, through the barn, across the kitchen, and out the forest gate — or end up as dinner.

**Three stages, one escape:**

1. **The Farmyard** — jump fences and hay bales, grab corn, learn to run.
2. **The Barn** — darker, faster, and the carving knives start swinging from the rafters.
3. **The Kitchen** — the roaring oven and the swinging carving knife. One touch costs a life.

**Decisions that matter:** a stumble lets the farmer close in, and he lunges when he corners you. Haystacks are hiding places — duck in with S while he searches and he loses your trail. Corn is worth 10 points, the forest gate is worth 250, and every clean stretch of running pulls you away from him. Three lives, one turkey, no second Thanksgiving.

## Controls

- **Space / Up / W** (or **click**) — jump
- **A / D** or **← / →** — dart left and right
- **S / ↓** (or click low on the screen) — hide in a haystack
- **Mouse** — move the pointer to steer the turkey
- **Enter** — start, **R** — run again after being caught, **P** — pause, **M** — sound on/off

## HUD

Score, distance run toward the 1,400 m forest gate, three hearts, the stage name, and a farmer-proximity gauge that turns red when he is about to lunge. A "!" flashes over his hat when he spots you.

## Play it

Static files, no build step, no network request. Serve `game/` with any static server and open `game/index.html` in desktop Chrome. Sound is synthesised with WebAudio; there are no audio files. All art is drawn in code — the turkey, the farmer, the farm, the barn and the kitchen.

Screenshot staging: `game/index.html?shot=title`, `?shot=play`, `?shot=caught`, or `?shot=escaped` jumps straight to a staged moment of the game, played forward by the real rules with a seeded autopilot.

## Files

- `game/index.html` — page and menus
- `game/main.js` — game loop, input, state machine, collisions, screenshot staging
- `game/turkey.js` — the player turkey: movement, jumping, hiding, its own drawing
- `game/farmer.js` — the farmer: chase, search and lunge AI, his drawing
- `game/kitchen.js` — the world: farmyard, barn and kitchen stages, oven, knife, haystacks, corn
- `game/hud.js` — HUD, title screen and the caught / escaped end screens
- `game/audio.js` — synthesised gobbles, jumps, hits and the banjo-ish running tune
- `game/style.css` — page chrome for the canvas
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
