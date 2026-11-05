# Switching on leagues, schools and cloud saves

ExamForge works fully offline without this. These steps switch on the online features: school leagues, friends, cloud backup, moving to a new device, and each school's shared study sets. It takes about 5 minutes and Supabase's free plan is enough for hundreds of students.

## 1. Make the database

1. Go to [supabase.com](https://supabase.com), sign up (free), and click **New project**.
2. Give it a name like `examforge`, pick a strong database password (save it somewhere safe), and choose the region closest to you (for Jamaica: **East US**).
3. Wait a minute or two while it sets up.

## 2. Add the ExamForge tables

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

## How it works

- **Joining:** a student picks a username, grade and school. Their device gets a private guest account; only the username, school, grade and XP are visible to others.
- **Schools:** every Jamaican school is pre-loaded (1,607 from the Ministry of Education's *Directory of Educational Institutions 2018–2019*, plus universities and colleges from OpenStreetMap), so students can scroll to theirs by type and parish without typing. Every school page has a **Join with this school** button. For other countries, students search the ExamForge list, then **Search the world map** (OpenStreetMap, from their own browser), or **Add it myself**. How the list was built: [`supabase/import/`](../supabase/import/README.md).
- **School crests:** 37 schools show their real crest or a photo from Wikipedia / Wikimedia Commons. Every other school gets a generated crest from its name. To add a real crest, see [Adding a school's crest](../supabase/import/README.md#adding-a-schools-crest).
- **Leagues:** 9 leagues (Spark → Ember → Flame → Blaze → Torch → Forge → Inferno → Phoenix → Supernova). Weeks end Monday 00:00 Jamaica time. The top 20% of active players move up (at least 30 XP needed), the bottom 20% move down (in leagues with 5+ active players), and anyone who earned nothing drops one league. This runs automatically the first time anyone opens the site in a new week, so no scheduled job is needed.
- **XP limits:** at most 400 XP per update and 5,000 XP per day, so nobody can fake their way to the top.
- **School library:** students can share their own sets with their school. Classmates can browse them, add them to their sets, and the most-saved sets rise to the top.
- **New phone:** Account → **Move to another device** gives a one-time code (XXXX-XXXX-XXXX). Typing it on the new device moves the whole account. Wrong guesses are limited to 10 a day.
- **Removing things:** in the Supabase dashboard's **Table Editor** you can delete any rude username (`profiles`), school (`schools`) or shared set (`shared_sets`).
