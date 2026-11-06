# How the Jamaican school list was built

The live database ships with **1,671 Jamaican schools** of every type (infant, primary, all-age, prep, high, technical, special, colleges and universities) so students can find theirs without typing. **76 of them show their real crest.** This folder records where they came from and how to add or fix a school.

| Source | What it gave | Licence |
| --- | --- | --- |
| Ministry of Education, Youth & Information: [*Directory of Educational Institutions 2018–2019*](https://moey.gov.jm/wp-content/uploads/2020/05/Directory-of-Educational-Institutions-2018-19-1.pdf) | 1,654 public and independent institutions, each with its 5-digit school code, parish and type | Government publication |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) (Overpass API) | Map coordinates for 202 directory schools, plus 13 universities and colleges missing from the directory | ODbL |
| English Wikipedia infoboxes and [Wikidata](https://www.wikidata.org/) | Crests for 30 schools | Most are the schools' own logos, used here only to identify the school. |
| Schools' own websites (and two alumni-association sites and a school directory where the school has no site) | Crests for 46 more schools | Same: shown only to identify the school. Every source is listed in [`assets/img/schools/SOURCES.md`](../../assets/img/schools/SOURCES.md). |

Names get " School" added when the directory leaves it off (e.g. "Ardenne High" becomes "Ardenne High School"). The 47 public *infant* schools were added in a second run, along with Norman Manley Law School, the United Theological College of the West Indies, the All American Institute of Medical Sciences and May Pen High School.

## How it was run (once, on 5 Nov 2026)

1. Turned on the `http` extension and made a private `ef_import` schema (not reachable from the website).
2. Pulled every `amenity=school|college|university` in Jamaica from Overpass into `ef_import.raw`.
3. Deployed [`ministry-directory.ts`](ministry-directory.ts) as an Edge Function and called it from SQL for PDF pages 12–54 (public) and 55–91 (independent), storing rows in `ef_import.moey`. Rows that started a batch inherit the type of the row before them.
4. Fetched Wikipedia pages (the *Schools in Jamaica* template, the Jamaican school categories, and every article with a school or university infobox that mentions Jamaica) with their lead image and infobox `logo`/`crest`/`image` file, plus Wikidata logos (P154). The requests used a User-Agent with a contact link and a 0.6 s pause between calls.
5. Matched Wikipedia titles to Ministry names after normalising both (lower case, no punctuation, "St"/"Saint", "Prep"/"Preparatory", no "School", no "(Jamaica)"), plus a few hand-checked aliases (Wolmer's Schools → both Wolmer's, Manning's School → Manning's High School, St. Jago Cathedral Prep → St. Jago Cathedral).
6. Picked one image per school: Wikidata logo → infobox crest → logo-like lead image → photo. Every pick was reviewed by hand. A Commons file called "Kingston College Logo" turned out to be a plain wordmark for a different Kingston College, so it was **not** used.
7. Upserted into `public.schools` (`moey_code`, `name`, `region` = parish, `kind` = Ministry type, `logo`, `logo_kind`, `osm_ref`, `lat`, `lon`), renamed the one hand-added row "Kingson College" to Kingston College (keeping its member), and removed OSM duplicates and non-schools.
8. Cleaned up: deleted the Edge Function and the temporary guest account used to call it, dropped `ef_import` and the `http` extension.

## Second run: every school type and real crests (6 Nov 2026)

1. Re-read the same Ministry PDF with a temporary Edge Function (now deleted) and added the 47 public infant schools.
2. Re-scanned English Wikipedia (school categories, the Schools in Jamaica template and every article with a school or university infobox) and Wikidata for logos, crests and official websites.
3. Found school websites from Wikipedia/Wikidata, the Ministry directory's e-mail domains and likely addresses (`<name>.edu.jm`, `<name>high.com` …), checking each page's title before trusting it, then collected every logo-like image on those home pages.
4. Looked at every candidate by eye. Photos of students, banners, posters, wordmark-only logos and blurry favicons were rejected. A crest only counts when it clearly belongs to that Jamaican school (for example, several look-alike domains belonged to schools in the US, the UK or South Sudan).
5. Trimmed, centred and saved each crest as a 256 px WebP in `assets/img/schools/` (named by Ministry code), and pointed `public.schools.logo` at it. Shipping the files with the site means no third-party requests and they work offline.

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
