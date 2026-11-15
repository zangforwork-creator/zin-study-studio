# Zin's Study Studio

An English personal learning website for Zin, a Marketing student at VNUIS. A blue editorial dashboard, light/dark themes, and the cat illustrations from the supplied `Image` collection. The bookshelf is inspired by the supplied Khoaverse design notes.

## Run locally

Requires Node.js 22 or newer (verified with Node 26) and a modern browser.

```powershell
cd D:\ZinGPT\zin-study-studio
npm.cmd ci
npm.cmd run build
npm.cmd run dev
```

Open **http://127.0.0.1:4173**. On other shells, `npm` is equivalent to `npm.cmd`. The preview binds only to localhost. There are no API keys or external AI-service requirements. `dist` contains the ready-to-serve site.

## What works

- The Daily: a source-backed five-story reading edition, one reading stream, saved stories, read activity, goals, weekly recall activity and course progress.
- Light and dark themes, responsive navigation, keyboard focus, a skip link and reduced-motion styles.
- Ten real course collections from the checked catalog; create additional courses without altering the source catalog.
- Seventeen transcript entries across three confirmed terms. Eleven recorded 10-point grades and six pending results. GPA remains blank until credits and official conversion rules are confirmed. A personal 4-point target can be saved.
- Six planned qualification courses with local completion checkboxes. IELTS 7.5 and HSK 5 are clearly labelled plans, not verified scores.
- Two source-checked starter lessons and six recall questions from *Marketing: An Introduction*, with diagrams, objectives, key ideas, hypothetical examples, cautions and original source pages.
- A document reader with local PDF, DOCX and PPTX intake; selected-section extraction, source highlights, bookmarks, notes and user-authored source-linked recall cards.
- Optional warm-up, short-answer recall before feedback, hint tracking, self-assessment and saved concept-level review dates.
- Progress backups and validated merge imports; repeat imports and result submissions are deduplicated.

## Storage and privacy

The Sites project is owner-private. Zin explicitly approved publishing the prepared academic reference snapshot to this Site on 16 November 2026. See `DEPLOYMENT-STATUS.md`. Notes, attempts, goals, preferences and extracted sections are stored in browser localStorage. Attached original files are stored in IndexedDB. They are not synchronized through an account or uploaded to an AI provider. Browser profiles/devices have separate progress. Clearing browser storage removes that device's copy.

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

The reading edition was checked **16 November 2026**. It is not a live feed. Briefs distinguish company claims, forecasts and learning connections. Each links to its original publication and shows its date; older economic reports are dated context.

- [TikTok UK LIVE Shopping Report, 12 November 2026](https://newsroom.tiktok.com/tiktokshoplivereport?lang=en-GB)
- [Google Ads November announcements, 9 and 4 November 2026](https://ads-developers.googleblog.com/2026/11/?m=0)
- [IMF October 2026 World Economic Outlook](https://www.imf.org/en/Publications/WEO/Issues/2026/10/13/world-economic-outlook-october-2026)
- [UN DESA September 2026 update](https://desapublications.un.org/publications/world-economic-situation-and-prospects-2026-september-update)

## Verification

```powershell
npm.cmd run check
npm.cmd test
```

- 8 unit tests: scheduling, same-day repetition, assistance, idempotency, real-zero versus pending grades, source counts, backup validation/merge and failed text.
- 14 browser checks: themes, saving/reloading, grade timeline, notes, recall, PDF upload/extraction/cards, errors, source media, hide/restore controls and layout at 390/430/768/1024/1440 px. Seven routes were checked at each width.
- 8 extended browser checks: DOCX, PPTX ordering, duplicate uploads, blank PDF, export/import, malformed backup, keyboard operation and learning with external news requests blocked.
- Automated axe-core checks on seven routes in both themes: no reported violations for the selected WCAG 2 A/AA, 2.1 A/AA and 2.2 AA rules. This is not a complete accessibility certification.
- Browser checks used installed Chrome through Playwright. No JavaScript runtime errors were observed in the main-flow checks.
- Dependency audit after upgrading fflate: zero reported vulnerabilities at check time.

QA screenshots and machine-readable reports are in `.preview/` locally, excluded from publishing source. The optional `accessibility-qa.mjs` expects axe-core at `../.tools/axe.min.js`; extended QA expects a one-page blank PDF fixture at `.preview/blank.pdf`. `browser-qa.mjs` starts a clean test browser, never the user's existing browser profile. Run the local server before browser tests.

## Project layout

- `dist/app.js`: navigation, screens and interactions.
- `dist/core.js`: state validation, backup merge, recall scheduling and metric calculations.
- `dist/documents.js`, `office-worker.js`: local document storage and processing.
- `dist/content.js`: source-checked lessons and the dated news edition.
- `dist/data/reference.json`: imported course and goal snapshot.
- `dist/assets`: optimized original cat images and the four-page source extract.
- `ASSET-SOURCES.json`: mappings to original `Image` files.
- `scripts/import-reference.py`: one-time reference importer; requires the surrounding workspace and Pillow. Normal runs and builds do not require Python.

## Deliberate limits

No live Notion sync, daily news automation, external AI synthesis, OCR, official GPA conversion, verified certificates or cross-device learning sync is claimed. The current release is an operational personal studio with two starter lessons, not a complete synthesis of every textbook. Individual review cards and notes are editable; generated full-chapter lessons are not available. Cross-account authorization is supplied by owner-private Sites hosting; local preview is loopback-only, not a multi-account server.

## News presentation update

The news feed has no industry tabs or category grouping. Story cards use attributed article photos, report covers or publisher previews, with bold headlines and a dark contrast layer in both themes. Source media mappings and provenance are in `dist/news-media.js` and `NEWS-MEDIA-SOURCES.json`. The IMF story uses a text fallback because no suitable source image was verified. Existing saved/read/hidden story IDs remain unchanged; old topic preferences no longer filter the feed.

## Covers and pointer interaction

Consumer Behaviour, Digital Marketing and Introduction to Marketing Career now show first-page covers rendered from the supplied textbooks. `COURSE-COVER-SOURCES.json` records each original file and hash. Two Google news cards have distinct related official Google illustrations; credits link to their documentation pages rather than presenting them as news photographs. Cards lift and gently zoom images on hover or keyboard focus, only with a fine pointer and no reduced-motion preference. Touch layouts remain stable.

## Complete 3D bookshelf

All ten course tiles now use original document artwork: nine PDF cover pages and the original Logistics title slide (explicitly labelled Course slides). Every book face uses its actual source aspect ratio, without cropping or a padded outer frame. CSS perspective, cover creases, page edges, rear boards and contact shadows form the 3D view; hover and keyboard focus adjust the angle. Touch and reduced-motion layouts remain usable. The generated `dist/course-covers.js` and `COURSE-COVER-SOURCES.json` record dimensions and provenance. New courses use a clearly labelled text placeholder until a cover is provided.
