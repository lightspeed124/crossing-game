# Cross the Road!

A Frogger-style game: guide a chicken (or cute character) across parallel roads, railways, rivers, and land while avoiding vehicles, trains, and crocodiles. Move forward every 5 seconds or the eagle will take you!

## How to Play

- **Controls**: Arrow keys or W/A/S/D — move in 4 directions. On iPad and touch devices, use the on-screen D-pad and **JUMP** button.
- **Goal**: Cross from the bottom to the top of the screen without getting hit.
- **Score**: Earn points for each lane you cross. Roads, railways, and rivers give more points. High score is saved in your browser.
- **Lives**: You have 3 lives. Lose one when hit by a vehicle, train, or crocodile—or when you drown or the eagle gets you. Brief invincibility after respawn.
- **Eagle**: If you don’t move **forward (up)** at least once every 5 seconds, an eagle will take you and you lose a life.
- **Crocodiles**: In the river, avoid crocodiles—they’ll get you if you’re not on a log!

- **Trees**: Grass and rest areas are dotted with trees (decoration only—no collision).

## Run the Game

Open `index.html` in a web browser (double-click or use “Open with” your browser). No server or build step required.

From the project folder you can also run a simple server:

```bash
# Python 3
python3 -m http.server 8000

# Then open http://localhost:8000
```

## Background music (optional)

The game alternates between two BGM tracks. To use real songs:

1. **Add two MP3 files** to the `sounds/` folder:
   - `sounds/bgm1.mp3` — first track
   - `sounds/bgm2.mp3` — second track

2. **Use free, legal music** (e.g. CC0 or royalty-free). Good sources:
   - [OpenGameArt.org](https://opengameart.org) — CC0 and CC-licensed game music
   - [Pixabay Music](https://pixabay.com/music) — free for personal/commercial use
   - [Free Music Archive](https://freemusicarchive.org) — filter by license
   - [cc0music.wtf](https://www.cc0music.wtf) — CC0 game-style tracks

Download two tracks you like, rename them to `bgm1.mp3` and `bgm2.mp3`, and put them in `sounds/`. If the files are missing, BGM simply won’t play.

## Deploy / iPad

The game works on iPad and other tablets:

- **Touch controls**: On-screen D-pad and JUMP button appear automatically on touch devices.
- **Layout**: Responsive; the canvas scales to fit the screen and respects safe areas (notch, home indicator).
- **Audio**: BGM and SFX start after the first tap (e.g. “Start Game”), which satisfies iOS audio policies.

**Deploy steps (choose one):**

- **Netlify:** Drag the project folder onto [app.netlify.com/drop](https://app.netlify.com/drop), or run `npx netlify deploy --prod` (install CLI: `npm i -g netlify-cli`).
- **Vercel:** Run `npx vercel` in the project folder and follow the prompts; then `npx vercel --prod` for production.
- **GitHub Pages:** Push the repo to GitHub → Settings → Pages → Source: main branch, folder: root (or /docs if you use that).

Serve over HTTPS so that all features (e.g. audio) work as expected.

## Files

- `index.html` — Page and canvas
- `style.css` — Layout and UI
- `game.js` — Game logic, lanes, obstacles, crocodiles, collision, scoring, lives, eagle timer
- `audio.js` — BGM and sound effects (Web Audio API)
