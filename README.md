# Wedding invitation – Irène & Benjamin

Guest page (countdown, RSVP, guestbook, QR code, PDF ticket) + private dashboard for the newlyweds.
Node.js + Express + SQLite. No build step.

## Quick start

```
cp .env.example .env      # then edit ADMIN_USER / ADMIN_PASSWORD   (Windows: copy)
npm install
npm start
```
- Guests:   http://localhost:3000
- Newlyweds: http://localhost:3000/admin
- Tests:    `npm test`   (in-memory database, writes nothing to disk)
- Dev mode: `npm run dev` (auto-restart on changes)

## Project structure

```
wedding-invitation/
├── server.js                  Entry point: starts the HTTP server
├── package.json
├── .env.example               Copy to .env (never share it)
├── data/                      SQLite file appears here (wedding.db)
│
├── src/                       ── BACKEND (layered architecture) ──
│   ├── app.js                 Builds the Express app (middleware + routes + static pages)
│   ├── config/                Environment variables, paths, limits
│   ├── database/
│   │   ├── connection.js      Opens the SQLite database
│   │   └── migrations.js      Creates tables / upgrades older databases
│   ├── repositories/          Data access: SQL only, no business rules
│   ├── services/              Business rules (validation, personal links, stats, CSV)
│   ├── controllers/           HTTP in/out: read request, call a service, send JSON
│   ├── routes/                URL -> controller mapping (public + admin)
│   ├── middleware/            basicAuth, rateLimit, errorHandler
│   └── utils/                 clean text, CSV cell, HttpError
│
├── tests/                     Automated tests of the services
│
├── public/                    ── GUEST PAGE (served at /) ──
│   ├── index.html             Markup only
│   └── assets/
│       ├── css/main.css
│       ├── images/            hero.jpg (couple photo), ticket-bg.jpg (your invitation image)
│       ├── audio/             music.mp3 (optional)
│       └── js/                ES modules
│           ├── main.js        Starts everything
│           ├── config.js      Date, texts of the calendar event, asset paths   <- edit here
│           ├── state.js       Token (personal link) + current guest
│           ├── services/api.js        Every server call
│           ├── ui/toast.js
│           ├── utils/         dom.js, storage.js
│           └── features/      countdown, calendar, splash (+music), rsvp, qr, guestbook, ticket (PDF)
│
└── admin/                     ── DASHBOARD (served at /admin, password protected) ──
    ├── index.html
    └── assets/ css/admin.css, js/ (api.js, views.js, main.js)
```

### How a request flows

`Browser -> routes -> (middleware) -> controller -> service -> repository -> SQLite`

Example, a guest answers the RSVP:
`POST /api/rsvp` -> `public.routes.js` (rate limit) -> `rsvp.controller.js` -> `rsvp.service.js`
(validates, cleans, applies the personal-link rules) -> `rsvp.repository.js` (INSERT ... ON CONFLICT UPDATE).

Rules of the layers: a controller never writes SQL, a repository never knows about HTTP,
a service never touches `req`/`res`. To add a feature, add a repository method, a service
function, a controller and a route, in that order.

## Where to change things

| I want to change...                          | File |
|-----------------------------------------------|------|
| Countdown date, calendar event, music path     | `public/assets/js/config.js` |
| Names, texts, programme, maps, dress code      | `public/index.html` |
| Colors (`--pur`, `--gold`) and layout          | `public/assets/css/main.css` |
| Couple photo                                   | `public/assets/images/hero.jpg` |
| Invitation image used for the PDF ticket       | `public/assets/images/ticket-bg.jpg` (keep the "Vous convient ..." line empty) |
| Where the guest name is written on the ticket  | `public/assets/js/features/ticket.js` |
| Music (optional)                               | `public/assets/audio/music.mp3` |
| Admin password                                 | `.env` |
| Limits (seats, spam limit)                     | `src/config/index.js` |

## Database

Created automatically on first start (`data/wedding.db`). Tables: `guests` (secret token, name, table),
`rsvps` (answer, phone, seats, note), `messages`. Older databases are upgraded automatically,
no data is lost. Back up with the dashboard's **Exporter CSV** button.

## Personal links and table numbers

Dashboard, "Liens invités" tab: one guest per line. Write `Name | Table` to assign a table
(example: `Julie Mbala | Taittinger`). Each guest gets a private link `/?g=SECRET`.

## Hosting

- Any host that runs Node.js >= 18 and keeps files on disk (VPS, cPanel "Setup Node.js App", ...).
- cPanel: application root = this folder, startup file = `server.js`, then run `npm install`.
- Set `ADMIN_USER`, `ADMIN_PASSWORD` (and optionally `DB_PATH`, `PORT`) as environment variables or in `.env`.
- Use HTTPS so the dashboard password is encrypted.
