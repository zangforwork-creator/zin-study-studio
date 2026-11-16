# Zin's Study Studio

An English personal learning website for Zin, a Marketing student at VNUIS. The blue and gold palette combines navy, royal blue, bright blue, ice blue, gold and soft yellow in light/dark themes, with the cat illustrations from the supplied `Image` collection. The bookshelf is inspired by the supplied Khoaverse design notes.

## Run locally

Requires Node.js 22 or newer (verified with Node 26) and a modern browser.

```powershell
cd D:\ZinGPT\zin-study-studio
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

Open **http://127.0.0.1:4173**. On other shells, `npm` is equivalent to `npm.cmd`. The preview binds only to localhost. There are no API keys or external AI-service requirements. The build produces a Worker at `dist/server/index.js` and assets at `dist/client`; source client files remain under `dist`. Local reading data is stored under the ignored `.preview/reading` directory.

## What works

- The Daily: five RSS-sourced headlines, source dates and update status, saved stories, read activity, weekly recall activity and a daily case-study panel.
- One continuous page: sidebar items scroll to The Daily, My Bookshelf, Study Room, Market Pulse, Saved Stories and Settings. Course collections, lessons, reading and recall open inline. The sticky toolbar stays available, the active sidebar item follows scrolling, and navigation supports deep links and browser Back/Forward.
- My Bookshelf: original 3D cover proportions, page edges, rear boards and shadows. The duplicate suggested shelf on The Daily has been removed. Light and dark themes, responsive navigation, keyboard focus, a skip link and reduced-motion styles.
- Ten real course collections from the checked catalog; create additional courses without altering the source catalog.
- Two source-checked starter lessons and six recall questions from *Marketing: An Introduction*, with diagrams, objectives, key ideas, hypothetical examples, cautions and original source pages.
- A document reader with local PDF, DOCX and PPTX intake; selected-section extraction, source highlights, bookmarks, notes and user-authored source-linked recall cards.
- Optional warm-up, short-answer recall before feedback, hint tracking, self-assessment and saved concept-level review dates.
- Progress backups and validated merge imports; repeat imports and result submissions are deduplicated.

## Storage and privacy

The Sites project is owner-private. Zin explicitly approved publishing the prepared academic reference snapshot to this Site on 16 November 2026. See `DEPLOYMENT-STATUS.md`. Notes, attempts, goals, preferences and extracted sections are stored in browser localStorage. Attached original files are stored in IndexedDB. They are not synchronized through an account or uploaded to an AI provider. Browser profiles/devices have separate progress. Clearing browser storage removes that device's copy.

The hosted reading service stores only public-source RSS news and web case metadata in Sites R2 (`BUCKET`). The private Sites access boundary protects its reader and updater. Uploaded original files and extracted document cases never enter this server. Case reading and reflections persist locally and merge into progress backups. Saved live-story metadata is cached separately on the browser, up to 500 stories; progress backups preserve saved IDs but do not include that metadata cache.

Export a JSON progress backup in **Studio Settings**. It includes notes, extracted text, cards and review history, but **not original document files**. Keep originals separately and reattach them after restore. Backups contain personal learning data and should be stored privately.

The prepared source contains the Notion reference snapshot, optimized cat illustrations, book metadata and a four-page source extract from the supplied textbook. Full textbooks are not included in the deployment payload; attach them from `Kho-tai-lieu-mon-hoc` as needed.

## Document support and limits

- PDF: up to 100 MB; original pages render with PDF.js. Select up to 30 pages per extraction batch. The view uses PDF page numbers, which may differ from printed numbers.
- DOCX: up to 30 MB; body text is one logical section, not an invented pagination. Original layout, images and tables are not reconstructed.
- PPTX: up to 30 MB; slide text follows numeric slide order. Visual relationships and charts are not interpreted.
- Legacy `.ppt` (including `Supply Chain.ppt`) must be exported as `.pptx` or PDF first.
- Scanned pages and unreadable sections produce warnings, not invented highlights. There is no OCR or automatic AI synthesis in this release. Source highlights are selected original sentences, not a complete synthesis.
- A content hash identifies each file version. Re-uploading the same bytes does not duplicate a document in a course. New versions retain older cards, notes and review history.

## Metrics and scheduling

The app separates lesson completion, self-assessed recall, repeated spaced evidence and news reading. It never uses opening a page as proof of understanding. Course progress only counts the defined starter lessons, not an assumed full syllabus.

The review heuristic uses 1, 3, 7, 14 and 30 days. Independent successful recalls at least 24 hours apart advance one stage. Same-day recalls do not advance. Hints, blank recall or viewing the answer before recall cap the interval at one day. An incorrect answer returns to one day; effort reduces the stage and caps at three days. Two independent successes on separate days are labelled spaced evidence, not a validated mastery score or recall probability. All ratings are self-assessed.

The 5/15/25 minute choices select up to 3/7/12 cards. They are planning budgets, not measured study duration. No inactive time is reported as study time.

## News sources and freshness

The Worker fetches official RSS/Atom, validates publisher links and dates, deduplicates stories and saves an edition in R2. The browser checks every 15 minutes while visible; requests refresh an edition older than 15 minutes. Source failures preserve the last successful news and timestamp, with per-source error status. A deployed cloud update task refreshes content while the page is closed; see `READING-UPDATES.md` and the publication receipt for the saved schedule state.

- [VnExpress Business RSS](https://vnexpress.net/rss/kinh-doanh.rss) and [World RSS](https://vnexpress.net/rss/the-gioi.rss), offered by the [publisher RSS directory](https://vnexpress.net/rss).
- [Google Ads & Commerce RSS](https://blog.google/products/ads-commerce/rss/). Quiet or older sources retain their publication dates; no new event is invented.
- [Brands Vietnam Campaigns](https://www.brandsvietnam.com/campaign/): short original case summaries and direct source links. The first five cases were checked on 16 November 2026. Direct automated access may be blocked; the scheduled curator can use supported browsing and retains the checked catalogue when access fails. A daily reading choice rotates from the catalogue independently of whether a new campaign was published that day. Unknown publication dates remain unknown; campaign periods are labelled separately.
- Document cases use only extracted original text with a direct page/section link. No full case analysis or AI synthesis is claimed. Reading cases never raises course mastery.

## Verification

```powershell
npm.cmd run check
npm.cmd test
# With npm.cmd run dev running in another terminal:
node scripts/single-page-qa.mjs
node scripts/reading-qa.mjs
node scripts/accessibility-qa.mjs
```

- 16 unit tests: scheduling, assistance, idempotency, real-zero versus pending grades, backup merge, failed text, RSS/Atom parsing, matching source images, URL restrictions, future dates, cached fallback, provenance validation, case-reading persistence and writer origin restrictions.
- 16 browser checks for the continuous page: all six sections stay mounted during navigation; Goals & Growth and its home panel are absent; old goals links return to The Daily; original 3D covers; inline courses; search; draft preservation and saved notes; recall and deduplicated review persistence; saved stories; PDF upload/extraction/source-linked cards; deep links and Back/Forward; navigation without horizontal overflow at 390/430/768/1024/1440 px; keyboard, both themes and reduced motion; unique DOM IDs and no observed JavaScript runtime errors.
- The older browser, extended, bookshelf and card-effects scripts describe the previous separate-screen layout. Use `single-page-qa.mjs` for current navigation and cover checks.
- Automated axe-core checks on seven routes in both themes: no reported violations for the selected WCAG 2 A/AA, 2.1 A/AA and 2.2 AA rules. This is not a complete accessibility certification.
- Browser checks used installed Chrome through Playwright. No JavaScript runtime errors were observed in the main-flow checks.
- Dependency audit after upgrading fflate: zero reported vulnerabilities at check time.

QA screenshots and machine-readable reports are in `.preview/` locally, excluded from publishing source. The optional `accessibility-qa.mjs` expects axe-core at `../.tools/axe.min.js`; extended QA expects a one-page blank PDF fixture at `.preview/blank.pdf`. `browser-qa.mjs` starts a clean test browser, never the user's existing browser profile. Run the local server before browser tests.

## Project layout

- `dist/app.js`: navigation, screens and interactions.
- `dist/reading.js`, `dist/reading.css`: live-reading state, safe source links, daily case selection, source-document excerpts and clear image frames.
- `worker/feeds.js`, `worker/index.js`: RSS/Atom intake, case validation, owner-private reading endpoints and R2 persistence.
- `READING-UPDATES.md`, `scripts/reading-service.mjs`: unattended updater instructions and credential-safe writer/readback.
- `dist/bookshelf.css`, `dist/single-page.css`: shared 3D books, responsive continuous sections and sticky navigation.
- `dist/palette.css`: the supplied blue/gold tones and foreground/background combinations for both themes.
- `dist/core.js`: state validation, backup merge, recall scheduling and metric calculations.
- `dist/documents.js`, `office-worker.js`: local document storage and processing.
- `dist/content.js`: source-checked lessons and legacy news retained for older saved IDs; live news comes from the reading service.
- `dist/data/reference.json`: imported course and goal snapshot.
- `dist/assets`: optimized original cat images and the four-page source extract.
- `ASSET-SOURCES.json`: mappings to original `Image` files.
- `scripts/import-reference.py`: one-time reference importer; requires the surrounding workspace and Pillow. Normal runs and builds do not require Python.

## Deliberate limits

No live Notion sync, external AI synthesis, OCR, official GPA conversion, verified certificates or cross-device learning sync is claimed. The current release has two starter lessons, not a complete synthesis of every textbook. Individual cards and notes are editable; generated full-chapter lessons are unavailable. Cross-account authorization is supplied by owner-private Sites hosting; local preview is loopback-only. RSS is periodically polled rather than a real-time wire feed; publisher outages, access controls and publication cadence can delay updates. A saved cloud schedule alone is not proof that a later scheduled run succeeded.

## News presentation update

The news feed is a single reading stream. RSS images are tied to their article URL and shown uncropped in a separate 16:9 frame, with text below the image and no tint overlay. A failed image leaves a stable labelled placeholder. News-reading and case-reading activity stay separate from course evidence. Existing saved/read/hidden story IDs are preserved.

## Covers and pointer interaction

Consumer Behaviour, Digital Marketing and Introduction to Marketing Career now show first-page covers rendered from the supplied textbooks. `COURSE-COVER-SOURCES.json` records each original file and hash. Two Google news cards have distinct related official Google illustrations; credits link to their documentation pages rather than presenting them as news photographs. Cards lift and gently zoom images on hover or keyboard focus, only with a fine pointer and no reduced-motion preference. Touch layouts remain stable.

## Complete 3D bookshelf

All ten course tiles now use original document artwork: nine PDF cover pages and the original Logistics title slide (explicitly labelled Course slides). Every book face uses its actual source aspect ratio, without cropping or a padded outer frame. CSS perspective, cover creases, page edges, rear boards and contact shadows form the 3D view; hover and keyboard focus adjust the angle. Touch and reduced-motion layouts remain usable. The generated `dist/course-covers.js` and `COURSE-COVER-SOURCES.json` record dimensions and provenance. New courses use a clearly labelled text placeholder until a cover is provided.

## Continuous-page update

The duplicate “Keep your curiosity going” shelf has been removed; all original 3D books remain in My Bookshelf. Main navigation scrolls to sections. Course, lesson, document and review content opens inline. News refreshes update only reading sections and preserve lesson drafts and the viewport. Existing browser storage keys, course IDs, document versions and review history are preserved.

## Blue and gold update

The six tones interpreted from Zin's latest image are `#050D4B`, `#08418B`, `#0877BB`, `#D8E9F5`, `#F0BA1B`, `#F5E56B`. Navy anchors the sidebar, blues structure content and links, and gold highlights the study action. Both light and dark themes use this palette. Goals & Growth remains removed, and the existing single-page navigation, 3D books, storage and backup schema are unchanged.
