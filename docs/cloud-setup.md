# Switching on leagues, schools and cloud saves

Zing works fully offline without this. These steps switch on the online features: school leagues, friends, cloud backup, moving to a new device, and each school's shared study sets. It takes about 5 minutes and Supabase's free plan is enough for hundreds of students.

## 1. Make the database

1. Go to [supabase.com](https://supabase.com), sign up (free), and click **New project**.
2. Give it a name like `examforge`, pick a strong database password (save it somewhere safe), and choose the region closest to you (for Jamaica: **East US**).
3. Wait a minute or two while it sets up.

## 2. Add the Zing tables

1. In your project, open **SQL Editor** → **New query**.
2. Open [`supabase/schema.sql`](../supabase/schema.sql) from this repo, copy **all** of it, paste it in, and click **Run**. You should see "Success". (It's safe to run again later if the file is updated.)

## 3. Turn on guest sign-in

Students join with just a nickname. There's no email or password, so they need "anonymous" sign-ins:

1. Go to **Authentication** → **Sign In / Providers** (on some dashboards: **Authentication → Providers**).
2. Turn on **Allow anonymous sign-ins** and save.
3. Go to **Authentication** → **Rate Limits** and raise **anonymous sign-ins** to about **300 per hour**. The default (about 30 per hour per internet address) can block a whole class joining at once on school Wi-Fi.

## 4. Connect the website

1. Go to **Project Settings** → **API** (or **Data API**).
2. Copy the **Project URL** and the **anon / public** key.
3. Paste them into [`assets/js/config.js`](../assets/js/config.js):

   ```js
   window.EF_CONFIG = {
     supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
     supabaseKey: 'YOUR-ANON-PUBLIC-KEY'
   };
   ```

4. In [`sw.js`](../sw.js), raise the number in `VERSION` by one (for example `ef-v8` → `ef-v9`) so phones load the new settings.
5. Commit and push. Vercel redeploys on its own.

> The **anon** key is meant to be public; the database only lets it call the safe `ef_*` functions. **Never** put the `service_role` key in the website.

## 5. Zing AI for Magic import (optional)

1. Make a free [Cloudflare](https://dash.cloudflare.com) account (an adult should own it). Open **Workers AI** → **Use REST API** → **Create a Workers AI API Token** → **Create API Token** → **Copy API Token**, and copy the **Account ID** on the same page.
2. In Supabase, open **Edge Functions** → **Secrets** and add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. Never put them in the website or paste them in a chat.
3. Deploy the functions from this repo: `supabase functions deploy zing-ai` and `supabase functions deploy zing-ai-sample` (or paste each `index.ts` into **Edge Functions → Deploy a new function**). Keep **Verify JWT** on.
4. Make sure the latest [`supabase/schema.sql`](../supabase/schema.sql) has been run (it adds the AI limits, shared decks and deck leaderboards).

The functions only accept requests from the site's address (`https://exam-helper.edgeone.app`, plus `localhost` for testing). If the site moves, change `ORIGINS` at the top of `zing-ai/index.ts` and `SITE_ORIGIN` in `zing-ai-sample/index.ts`, then deploy again.

## How it works

- **Joining:** a student picks a username, grade and school. Their device gets a private guest account; only the username, school, grade and XP are visible to others.
- **Schools:** every Jamaican school is pre-loaded (1,607 from the Ministry of Education's *Directory of Educational Institutions 2018–2019*, plus universities and colleges from OpenStreetMap), so students can scroll to theirs by type and parish without typing. Every school page has a **Join with this school** button. For other countries, students search the Zing list, then **Search the world map** (OpenStreetMap, from their own browser), or **Add it myself**. How the list was built: [`supabase/import/`](../supabase/import/README.md).
- **School crests:** 76 schools show their real crest, shipped with the site in `assets/img/schools/` (sources in [SOURCES.md](../assets/img/schools/SOURCES.md)). Every other school gets a generated crest from its name. To add a real crest, see [Adding a school's crest](../supabase/import/README.md#adding-a-schools-crest).
- **Leagues:** 9 leagues (Spark → Ember → Flame → Blaze → Torch → Forge → Inferno → Phoenix → Supernova). Weeks end Monday 00:00 Jamaica time. The top 20% of active players move up (at least 30 XP needed), the bottom 20% move down (in leagues with 5+ active players), and anyone who earned nothing drops one league. This runs automatically the first time anyone opens the site in a new week, so no scheduled job is needed.
- **XP limits:** at most 400 XP per update and 5,000 XP per day, so nobody can fake their way to the top.
- **Shared decks and the school library:** students share decks by link, and can list them in their school's library. Classmates can save them, the most-saved rise to the top, owners get coins for every save (`profiles.deck_saves`), and each shared deck has a leaderboard (`deck_xp`, at most 600 XP a day per deck per student).
- **New phone:** Account → **Move to another device** gives a one-time code (XXXX-XXXX-XXXX). Typing it on the new device moves the whole account. Wrong guesses are limited to 10 a day.
- **Removing things:** in the Supabase dashboard's **Table Editor** you can delete any rude username (`profiles`), school (`schools`) or shared set (`shared_sets`).
