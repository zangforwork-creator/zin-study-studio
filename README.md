# Zin’s Study Studio

Three pages: `#home`, `#bookshelf` and `#courses`. The current design follows Zin’s supplied reference: a narrow indigo sidebar, peach Z. mark, lavender background, rounded white cards, image-cover reading panels and a compact two-column exam dashboard. English is permanent; light mode is the default. Navigation collapses on desktop and becomes a labelled bottom bar on mobile.

Home contains the greeting/date, Market Pulse beside Today’s case study, Exam Countdown, and previews of the current Bookshelf and curated Courses. The previous lesson, review, saved-story, separate news and goal sections and their code/data are removed.

Courses supports title/provider search, provider and Online only filters, source links and catalog-error recovery. AIM’s delivery is explicitly qualified. Global search covers books and external course titles. Course browsing does not alter learning progress or enroll the user.

## Data and configuration

Edit **dist/data/studio.json** for the ten existing courses, their book/cover metadata, initial exams and links. `links.consumerBehaviorLab` is the single editable destination used by the Consumer Behaviour card. The four current university courses follow Zin’s supplied list. External training options are stored separately in `dist/data/online-courses.json`, with official links and a source-check date; see COURSES-SOURCES.md. No exam dates are seeded. Configured initial exams apply on first use; browser edits persist separately.

Exams store subject/course, type, date, optional time/location/note and original creation time. Add/edit validates fields and prevents duplicate submissions. Delete requires confirmation and supports Undo for 30 seconds, including after reload. Upcoming exams sort by deadline; passed exams move to Completed. Days left use calendar dates in **Asia/Ho_Chi_Minh**, not elapsed 24-hour periods. An exam without a time ends at the last millisecond of its date. Today’s clock ticks to the deadline; progress measures calendar time from creation to exam day. Urgency always has a text label.

Storage is browser-local under `zin-studio-v2`; original document bytes remain in `zin-documents-v1` IndexedDB. The old v1 record is left untouched as a recovery copy. Migration carries personal courses, documents, extracted sections and case reflections into the two-page app. No removed learning/saved-story records are loaded as active data. Use the avatar/profile menu for export/import and recovery export. JSON backups contain metadata/text/exams, not original file bytes; keep originals separately. Invalid or blocked storage does not silently overwrite the original or discard form input.

## Reading and documents

The existing Worker RSS and private original-material services are preserved. Market Pulse shows one sourced story at a time with publication date, image credit and original link; previous/next, refresh and a foreground 15-minute refresh work. Failed sources retain the latest available edition and its successful-update timestamp. External feeds/images can remain temporarily unavailable; a missing image is labelled and its source credit remains.

Web case studies retain source, publication/campaign dates, image credit and previous/next. Your documents uses actual extracted passages. No document is sent to an AI service. PDF uploads support 100 MB; DOCX/PPTX support 30 MB. PDF text is extracted only from a selected batch of up to 30 pages; sections are cached. Original bytes are stored locally. Scans need external OCR; unreadable sections show a warning and never create invented text. Legacy `.ppt` can be downloaded from the original materials service but is not supported by browser extraction. Reattaching identical bytes to the same course does not create a second record.

## Run and verify

Node 22+; installed dependencies are unchanged. No new API key or paid service:

```powershell
cd D:\ZinGPT\zin-study-studio
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd run dev
# http://127.0.0.1:4173
# In another terminal:
npm.cmd run qa
```

The browser suite uses installed Chrome, Playwright and `../.tools/axe.min.js`. It exercises empty states, calendar boundaries, forms, storage errors, reload, undo, course chips, sources, RSS failure/refresh, local document formats, backups and both themes at 390/768/1366/1920 px. Fixtures use a separate browser profile; they do not populate the published exam list. Automated accessibility scans do not establish complete WCAG conformance.

The Site identity and restricted audience are retained. The Worker still uses its existing `BUCKET` binding for sourced reading and private originals. No access-policy expansion or original-material deletion occurs.
