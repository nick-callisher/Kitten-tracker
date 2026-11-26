# Kitten Tracker

A foster-kitten tracker built for an iPad Air (1st gen, iOS 12 / Safari 12).
Plain HTML, CSS and JavaScript with no build step and no libraries.

## Try it on your PC now

Open `index.html` in Chrome or Edge. For the closest match to the iPad, serve the folder instead:

```powershell
python -m http.server 8123
```

Then go to http://localhost:8123.

## Put it on the iPad (GitHub Pages)

GitHub Pages is free hosting from GitHub: it turns a repository into a website.
Your kitten data is **not** uploaded. It stays on the iPad, and GitHub only serves the app's code.

1. On github.com, click **New repository**, name it `kitten-tracker`, set it to **Public**, and create it.
2. Click **uploading an existing file** and drag in everything from this folder
   (`index.html`, `css`, `js`, the three `icon*.png` files and `README.md`). Click **Commit changes**.
3. Go to **Settings → Pages**. Under *Branch*, choose `main` and `/ (root)`, then **Save**.
4. After a minute the site is at `https://<your-username>.github.io/kitten-tracker/`.
5. On the iPad, open that link in **Safari**, tap **Share → Add to Home Screen**.
6. Always open the app from the Home Screen icon. On iOS 12 that icon keeps its own data, separate from Safari.

To update the app later, upload the changed files to the same repository again.

## Backups

All data is saved only on the device. Use **Settings → Backup & data → Export backup** regularly
and keep the copy in Notes, Files or an email to yourself. **Import backup** restores it.

## Files

- `js/store.js` – data, saving, dates, weight units, dewormer schedule
- `js/board.js` – kanban board and touch drag and drop
- `js/kitten-editor.js` – add/edit kitten form
- `js/calendar.js` – calendar and events
- `js/weights.js` – weight chart and daily table
- `js/settings.js` – settings tab
- `js/app.js` – tabs and alerts
