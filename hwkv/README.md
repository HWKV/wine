# HWKV — Helshoogte Wine Culture Society
## Setup Guide

---

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project — name it `hwkv`
3. Go to **SQL Editor** and paste the entire contents of `supabase_schema.sql`
4. Run it — this creates all tables and seeds all 28 members

---

### 2. Get Your API Keys

In Supabase → **Settings → API**:
- Copy **Project URL**
- Copy **anon public** key

Open `js/config.js` and replace:
```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

---

### 3. Set Admin Passphrase

Open `admin/admin.js` and change:
```js
const ADMIN_PASSPHRASE = 'HWKV-SECRETARIAT';
```
to something only you know.

---

### 4. Deploy to GitHub Pages

```bash
# Create a new repo on GitHub (e.g. hwkv-portal)
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOURUSERNAME/hwkv-portal.git
git push -u origin main
```

Then in GitHub → your repo → **Settings → Pages**:
- Source: `main` branch, root `/`
- Your site will be at: `https://YOURUSERNAME.github.io/hwkv-portal/`

---

### 5. Sending Member Links (Secretive Method)

Each member has a unique link. In the admin dashboard under **Members**, 
click any `?key=PRIMUM-XXX-0` box to copy it.

Their full link looks like:
```
https://yourusername.github.io/hwkv-portal/?key=PRIMUM-LAC-0
```

**How to send it discreetly:**
- Print it on a small card and post it in the physical postbox (stays on brand)
- Send from `noreply@hwkv.co.za` (set up free with Resend.com) — looks official, not personal
- The site auto-logs them in when they click the link — no code typing needed

---

### 6. Creating a Tasting

In admin → **Tastings → New Tasting**:
- Set date, capacity (default 20), RSVP method (FCFS or Ballot)
- Set RSVP opens/closes datetime — members will see a live countdown
- To open RSVP manually: click **Open RSVP** on the tasting card

---

### 7. The Ballot System

When a tasting uses **Ballot** method:
1. Members RSVP during the window — all show as "pending"
2. When you're ready: admin → RSVPs tab → select tasting → **Run Ballot**
3. System randomly selects `capacity` members → confirmed, rest → waitlist

---

### File Structure

```
hwkv/
├── index.html          ← Member portal
├── css/style.css       ← All styles
├── js/
│   ├── config.js       ← Supabase keys (fill in)
│   ├── i18n.js         ← EN/AFR translations
│   └── app.js          ← Portal logic
├── admin/
│   ├── index.html      ← Admin dashboard
│   ├── admin.css       ← Admin styles
│   └── admin.js        ← Admin logic
└── supabase_schema.sql ← Run this first
```

---

### Adding a New Member Later

Admin → Members → **+ Add Member**  
Give them a code in the format: `SECUND-XXX-0` (for second generation)

Their link is immediately active.
