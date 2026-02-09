# Valentine Challenges Site

A cute, mobile‑friendly multi‑page site to ask “Will you be my Valentine?” with three mini‑challenges that unlock a final question.

## Pages & Flow
- gate.html – Name gate. Only "Zian" (case‑insensitive, trimmed) proceeds.
- hub.html – Challenge hub with 3 cards + a locked finale.
- wordle.html – Wordle‑style game (target word: "stink").
- basketball.html – Swipe/drag to throw the ball into the hoop; make 3 to win.
- wordsearch.html – Find all words: Amsterdam, Tokyo, Osaka, Auckland, Queenstown, Vancouver, New York, Paris.
- finale.html – "Will you be my Valentine?" Yes = celebration; No = try again.

## Run locally
Use any static server. Examples:

Python 3 (built‑in):
```
python3 -m http.server
```
Then open http://localhost:8000/ (index.html redirects to gate.html).

Node (http-server):
```
npm i -g http-server
http-server -p 8000
```

## Deploy to GitHub Pages
1) Commit/push to the `main` branch of this repo.
2) In GitHub: Settings → Pages → Build and deployment:
   - Source: Deploy from a branch
   - Branch: main / root
3) Your site will be available at: https://<your-username>.github.io/valentines.2026/

All links are relative; index.html redirects to gate.html so Pages works from repo root.

## Tech & structure
- Pure HTML/CSS/vanilla JS (no build step)
- Shared CSS: `assets/css/styles.css`
- Shared JS: `assets/js/progress.js` (access/progress), `assets/js/ui.js` (toast, confetti, sfx)
- Games: `assets/js/wordle.js`, `assets/js/basketball.js`, `assets/js/wordsearch.js`
- Assets: `assets/img/` and `assets/sounds/`

Project tree (key files only):
```
index.html
gate.html
hub.html
wordle.html
basketball.html
wordsearch.html
finale.html
assets/
  css/styles.css
  js/progress.js
  js/ui.js
  js/wordle.js
  js/basketball.js
  js/wordsearch.js
  img/
  sounds/README.txt
```

## Progress & access (localStorage)
- `access.granted`: "true" once "Zian" is entered on the gate.
- `progress`: JSON object with flags `{ wordle: bool, basketball: bool, wordsearch: bool }`.
- To reset progress/access, open DevTools → Application/Storage → Local Storage → clear `access.granted` and `progress` (or use your browser’s Clear Site Data for this origin).

## Mobile notes
- Mobile‑first styling, large touch targets.
- Canvas basketball supports touch + mouse.
- Wordle supports on‑screen and physical keyboard.

## Sounds & confetti
- UI helpers in `assets/js/ui.js` include `playSfx(name)`, `toggleMute()`, and `confetti(durationMs)`.
- Add small MP3/OGG files to `assets/sounds/` (e.g., `swish.mp3`, `click.mp3`, `success.mp3`).
- By default SFX are muted; you can call `toggleMute(false)` from the console to enable.

## Troubleshooting
- Redirect loop to gate: ensure you typed "Zian" exactly (case‑insensitive; trims spaces).
- Finale locked: complete all three challenges so that `progress` shows all true.
- GitHub Pages 404: re‑check Pages settings (main / root) and wait a minute for deployment.
- Assets not loading: serve via a static server (file:// won’t run some features cleanly).

## Customization
- Colors/fonts/theme: edit `assets/css/styles.css` variables.
- Personal note: add your message to `finale.html` or `hub.html`.
- Difficulty tuning: adjust basketball physics (gravity, speeds) or wordsearch grid size.
