# How to Run "Cross the Road!" – Step by Step

## Option A: Open the game file in your browser (easiest)

1. **Open Finder** (the folder icon in your Mac dock).

2. **Go to your home folder**, then open the folder **`crossing-game`**.
   - Full path: **`/Users/terrysong/crossing-game`**
   - Or: in Finder menu bar click **Go → Home**, then double‑click **crossing-game**.

3. **Find the file named `index.html`** in that folder.

4. **Double‑click `index.html`**.
   - It will open in your default web browser (Safari, Chrome, etc.).
   - The game start screen should appear.

5. **Click the "Start Game" button** and use the arrow keys (or W/A/S/D) to play.

---

## Option B: Run with a local server (from Terminal)

Use this if Option A doesn’t work or the game doesn’t load correctly.

1. **Open Terminal** on your Mac.
   - Press **Cmd + Space**, type **Terminal**, press Enter.
   - Or: **Applications → Utilities → Terminal**.

2. **Go into the game folder** by typing this and pressing Enter:
   ```bash
   cd /Users/terrysong/crossing-game
   ```

3. **Start a simple web server** with one of these:

   **If you have Python 3:**
   ```bash
   python3 -m http.server 8000
   ```

   **If that doesn’t work, try:**
   ```bash
   python -m http.server 8000
   ```

4. **Open your browser** and go to:
   ```
   http://localhost:8000
   ```
   Type that in the address bar and press Enter.

5. You should see the game. **Click "Start Game"** and play.

6. **To stop the server:** go back to Terminal and press **Ctrl + C**.

---

## Quick summary

| What you want to do | What to do |
|---------------------|------------|
| Easiest way         | Double‑click `index.html` in the `crossing-game` folder. |
| Using Terminal      | `cd /Users/terrysong/crossing-game` then `python3 -m http.server 8000`, then open **http://localhost:8000** in the browser. |

---

## Controls (once the game is running)

- **Arrow keys** or **W / A / S / D** – move up, down, left, right.
- Move **up** at least once every **5 seconds** or the eagle will get you.
