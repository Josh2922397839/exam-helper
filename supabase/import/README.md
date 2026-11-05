# How the Jamaican school list was built

The live database ships with **1,620 Jamaican schools** so students can find theirs without typing. This folder records where they came from and how to add or fix a school.

| Source | What it gave | Licence |
| --- | --- | --- |
| Ministry of Education, Youth & Information: [*Directory of Educational Institutions 2018–2019*](https://moey.gov.jm/wp-content/uploads/2020/05/Directory-of-Educational-Institutions-2018-19-1.pdf) | 1,654 public and independent institutions, each with its 5-digit school code, parish and type | Government publication |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) (Overpass API) | Map coordinates for 202 directory schools, plus 13 universities and colleges missing from the directory | ODbL |
| English Wikipedia infoboxes and [Wikidata](https://www.wikidata.org/) | Real crests (29) or photos (8) for 37 schools | Shown from Wikimedia's servers (links only, nothing copied into this repo). Most crests are the schools' own logos, used here only to identify the school. |

Not included: the 47 public *infant* schools (ages 4–6). Names get " School" added when the directory leaves it off (e.g. "Ardenne High" becomes "Ardenne High School").

## How it was run (once, on 5 Nov 2026)

1. Turned on the `http` extension and made a private `ef_import` schema (not reachable from the website).
2. Pulled every `amenity=school|college|university` in Jamaica from Overpass into `ef_import.raw`.
3. Deployed [`ministry-directory.ts`](ministry-directory.ts) as an Edge Function and called it from SQL for PDF pages 12–54 (public) and 55–91 (independent), storing rows in `ef_import.moey`. Rows that started a batch inherit the type of the row before them.
4. Fetched Wikipedia pages (the *Schools in Jamaica* template, the Jamaican school categories, and every article with a school or university infobox that mentions Jamaica) with their lead image and infobox `logo`/`crest`/`image` file, plus Wikidata logos (P154). The requests used a User-Agent with a contact link and a 0.6 s pause between calls.
5. Matched Wikipedia titles to Ministry names after normalising both (lower case, no punctuation, "St"/"Saint", "Prep"/"Preparatory", no "School", no "(Jamaica)"), plus a few hand-checked aliases (Wolmer's Schools → both Wolmer's, Manning's School → Manning's High School, St. Jago Cathedral Prep → St. Jago Cathedral).
6. Picked one image per school: Wikidata logo → infobox crest → logo-like lead image → photo. Every pick was reviewed by hand. A Commons file called "Kingston College Logo" turned out to be a plain wordmark for a different Kingston College, so it was **not** used.
7. Upserted into `public.schools` (`moey_code`, `name`, `region` = parish, `kind` = Ministry type, `logo`, `logo_kind`, `osm_ref`, `lat`, `lon`), renamed the one hand-added row "Kingson College" to Kingston College (keeping its member), and removed OSM duplicates and non-schools.
8. Cleaned up: deleted the Edge Function and the temporary guest account used to call it, dropped `ef_import` and the `http` extension.

## Adding a school's crest

A crest can come from two places only (a database check blocks anything else):

- **A Wikimedia link** (`https://upload.wikimedia.org/...` or `https://thumb.wikimedia.org/...`)
- **An image shipped with the site** in [`assets/img/schools/`](../../assets/img/schools/), named by the school's Ministry code, e.g. `01037.webp` for Kingston College

For a bundled image: save the crest as a square-ish WebP or PNG of about 256 px, put it in `assets/img/schools/`, deploy the site, then run this in the Supabase SQL editor:

```sql
update public.schools set logo = 'assets/img/schools/01037.webp', logo_kind = 'logo' where moey_code = '01037';
```

Use `logo_kind = 'photo'` for a photo of the school (it gets cropped to fill the badge instead of fitting inside it). If a picture ever fails to load, the site quietly shows the generated crest instead.

Find a school's code with:

```sql
select id, moey_code, name, region, kind, logo from public.schools where name ilike '%kingston college%';
```

Only use crests that the school is happy for students to see. If a school asks for its crest to be removed, set `logo = null` and it goes back to the generated crest.
