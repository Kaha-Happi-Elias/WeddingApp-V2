# Wedding invitation – Irène & Benjamin

A wedding invitation site with:
- **Guest page** (`/`): countdown, RSVP, guestbook ("Mots Doux"), QR pass, map.
- **Personal links** (`/?g=SECRET`): one private link per guest, name pre-filled and locked.
- **Newlyweds' dashboard** (`/admin`): who accepted / declined / hasn't answered, every message, personal links, search, CSV export, delete.
- **Database**: SQLite. It is created automatically. You install nothing extra.

## 1. Folder layout

```
wedding-invitation/
├── server.js            ← the server + database code
├── package.json         ← list of dependencies
├── .env                 ← YOUR settings (you create it, see step 3)
├── .env.example         ← template for .env
├── public/              ← what guests see
│   ├── index.html
│   └── hero.jpg         ← (optional) your couple photo
├── admin/
│   └── admin.html       ← the private dashboard
└── data/
    └── wedding.db       ← created automatically on first start
```

Put all the files exactly like this in one folder.

## 2. Install Node.js (once)

Download the **LTS** version from https://nodejs.org and install it.
Check it worked: open a terminal and run `node -v` (should print v18 or higher).

## 3. Set your admin password

In the project folder, copy `.env.example` to a new file named `.env`:

- Mac/Linux: `cp .env.example .env`
- Windows: `copy .env.example .env`

Open `.env` and choose your own values:

```
ADMIN_USER=irene-benjamin
ADMIN_PASSWORD=a-long-password-only-you-know
```

## 4. Start it

In a terminal, inside the project folder:

```
npm install
npm start
```

Then open:
- Guests: http://localhost:3000
- Newlyweds: http://localhost:3000/admin (your browser asks for the username and password from `.env`)

## 5. The database

You have nothing to create by hand. On first start, `server.js` creates the file
`data/wedding.db` and these tables. If you already ran the first version, your existing
database is upgraded automatically and keeps all its data:

| Table      | Columns                                                       |
|------------|---------------------------------------------------------------|
| `guests`   | id, token (secret, unique), name, created_at                  |
| `rsvps`    | id, name, name_key (unique), status (`accepted`/`declined`), guest_id, created_at, updated_at |
| `messages` | id, author, text, created_at                                  |

- A guest who answers twice **updates** their answer (matched by name, case-insensitive).
- **Back it up**: copy `data/wedding.db` somewhere safe (also `wedding.db-wal` if present).
- To look inside: install "DB Browser for SQLite" (free) and open the file.

## 6. Personal links for each guest

1. Open `/admin` and click the **Liens invités** tab.
2. Paste your guests' names, one per line, then click **Créer les liens**.
3. For each guest, click **Copier le lien** or **WhatsApp** (opens WhatsApp with a ready message).
4. Send each guest their own link. It looks like `https://your-site/?g=Xk3f9aB2cD_e`.

When a guest opens their link:
- their name is filled in and locked (they can't answer for someone else),
- the page greets them ("Cher(e) Julie"),
- their QR pass carries their secret code,
- the messages they write are signed with their real name,
- their answer shows in your dashboard, and pending guests show as "En attente".

A guest can change their answer any time from the same link. Deleting a guest in the
dashboard removes their link and their answer. The plain link `/` keeps working for anyone
you didn't create a link for (they type their name).

## 7. The PDF ticket

Once a guest presses **Confirmer ma venue**, a "Merci d'avoir confirmé votre présence" card appears
with their QR code and a **Télécharger mon billet (PDF)** button just below it. The card and the
button are hidden for guests who have not answered or who declined.

The ticket is your own invitation (`public/ticket-bg.jpg`) with the guest's name written on the
"Vous convient ..." line, plus a footer with a thank-you message and the guest's QR code.
It is created in the guest's browser, so nothing extra is installed on the server, but the
guest's phone needs internet access to load the PDF library and fonts.

To use a different invitation design, replace `public/ticket-bg.jpg` with an image of the same
proportions (3:4 portrait, about 1086 x 1448 px) whose "Vous convient ..." line is empty. The
name is drawn at the position set in `drawTicket()` (look for `'Vous convient '`).

## 8. Page design (inspired by your video)

The guest page opens with a cover card ("Ouvrir l'invitation"), then the couple photo, the verse,
the countdown to the town hall (07/11/2026 at 10h30), the programme timeline, the two maps,
the RSVP form (phone, number of seats, notes), the QR code + PDF ticket, and the guestbook.

- **Music (optional)**: save an mp3 as `public/music.mp3`. It starts when the guest opens the invitation,
  and a play/pause button appears on the photo. Without the file, no button is shown.
- **Table number**: in the dashboard, "Liens invités" tab, write `Name | Table` (e.g. `Julie Mbala | Taittinger`).
  The guest sees "Numéro de table" in their RSVP form.
- **Colors**: change `--pur` (purple) and `--gold` at the top of the style block in `public/index.html`.

## 9. Customize

- Names, date, place, texts → edit `public/index.html`.
- Countdown date → `WEDDING_DATE` at the top of the `<script>` in `public/index.html`.
- Couple photo → save it as `public/hero.jpg` (portrait, ~1200px wide is plenty).
- Colors → the `:root{...}` line at the top of the `<style>` (`--gold` is the main color).

## 10. Put it online

The server must run somewhere and the database file must **persist**.
- **Not Vercel / Netlify**: they don't keep files, so the database would be wiped.
- **Render.com, Railway, Fly.io, or a VPS** work. On Render/Railway: create a Node web service
  from your code, build command `npm install`, start command `npm start`, add environment variables
  `ADMIN_USER` and `ADMIN_PASSWORD`, and **attach a persistent disk/volume**, then set
  `DB_PATH` to a file on that disk (e.g. `/data/wedding.db`).
- Use HTTPS (the platforms above give it for free) so your admin password is encrypted.

## Security notes
- Change `ADMIN_PASSWORD`. The server warns you if you leave the default.
- Guest text is always shown as plain text (no HTML injection).
- Writes are limited to 20 per minute per visitor to reduce spam.
