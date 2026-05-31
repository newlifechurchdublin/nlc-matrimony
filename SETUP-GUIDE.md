# New Life Church — Matrimony Profiles
### Simple setup guide

The system has **3 free parts**, all in Google + one web link:

1. **Google Form** — families / Pastor fill in a profile (with photo).
2. **Google Sheet** — every form answer becomes one row. *This is the database.*
3. **Apps Script** — a tiny program that (a) **builds** the Form + Sheet for you in one click, and (b) **safely serves** the data to the search page (it checks the PIN before sending anything).
4. **Search page** — a web link the Pastor & trusted helpers open to search profiles as photo cards.

> ⚠️ **Do every Google step below while logged in as `newlifekids.elearning@gmail.com`**, so the Form, Sheet, and all photos live in that one account.

---

## Part A — Build the Form + Sheet automatically (1 click)

1. Go to **https://script.google.com** → **New project**.
2. Delete the sample code. Open **`Apps-Script-Code.gs`** (in this folder), copy **everything**, and paste it in.
3. Near the top, change the line `const PIN = '1234';` to a PIN of your choice.
4. In the toolbar, choose the function **`setup`** → click **Run**.
5. The first time, Google asks you to **Authorize** → choose the `newlifekids.elearning` account → *Advanced* → *Go to project (unsafe)* → **Allow**.
   *(This “unsafe” warning is normal for your own scripts.)*
6. Click **Execution log** (or **View → Logs**). It prints **3 links** — keep them:
   - **FORM (edit)** — to add the Photo question (next step)
   - **FORM (share)** — the link you give families to submit
   - **SHEET** — your database

✅ Your Form (with all 16 questions) and Sheet now exist — no typing needed.

---

## Part B — Add the one Photo question (Google blocks scripts from this)

1. Open the **FORM (edit)** link from the log.
2. Click **＋** to add a question → set its type to **File upload** → click **Continue/OK** when asked.
3. Title it exactly **Photo**, allow only **Image**, limit to **1 file**, and mark it **Required**.
4. *(Optional)* drag it to the top so it’s the first question.

> Naming it **Photo** matters — the page finds the picture column by that word.

---

## Part C — Let the photos show on the page

Form photo uploads go to a private Drive folder. Share it so the page can display them:
1. Open **Google Drive** → find the folder named like
   **“New Life Church — Matrimony Profile (File responses)”**.
2. Right-click → **Share** → *General access* → **Anyone with the link** → **Viewer** → **Done**.

*(Only people who already have your page + PIN ever see the photo links, so this is safe.)*

---

## Part D — Publish the backend (Deploy)

1. Back in the Apps Script editor, click **Deploy → New deployment**.
2. Gear icon → choose **Web app**. Set:
   - **Execute as:** Me (`newlifekids.elearning@gmail.com`)
   - **Who has access:** **Anyone**
3. Click **Deploy** → **Authorize** if asked → **copy the Web app URL** (it ends in `/exec`).

➡️ **Send that `/exec` URL to finish the page.** It gets pasted into the page’s
`API_URL` setting (and the page’s PIN is set to match your script’s PIN).

> The page is **public to open, but useless without the PIN** — the script refuses to send
> any profile data unless the correct PIN is provided. That keeps real people’s details safe.

---

## How everyone uses it day-to-day

- **Add a profile:** open the **FORM (share)** link → fill in → attach photo → submit.
- **Search:** open the **page link** → enter the **PIN** → type in the search box (name, job,
  place, church…) and/or use the **Gender / Marital status / Age** filters.
- Tap any card for full details, then **Call** or **WhatsApp** the contact directly.
- New profiles appear after you tap **↻ Refresh data**.

---

## Sharing with trusted helpers

Just send them the **page link + the PIN**. The PIN keeps casual people out; for 50–100 profiles
among trusted church members this is plenty. Please don’t post the link publicly.

---

## Updating later

- **Change the PIN:** edit `const PIN` in the script **and** the page’s PIN, then in Apps Script
  do **Deploy → Manage deployments → Edit → Version: New version → Deploy**.
- **Remove a profile (married/withdrawn):** delete that row in the **Sheet**, then **Refresh** the page.

---

## Quick troubleshooting

| Problem | Fix |
|---------|-----|
| Page says *“Almost there / Not connected”* | The Web app `/exec` URL hasn’t been added to the page yet. |
| *“Wrong PIN”* even when correct | The page PIN must match `const PIN` in the script; re-deploy a **New version** after changes. |
| Photos show as a letter circle | Do **Part C** — share the *File responses* folder as *Anyone with the link → Viewer*. |
| New profile not showing | Tap **↻ Refresh data**. |
| Logo / Pastor photo missing | Keep `logo.png` & `Pastorandfamily.png` next to the page. |
