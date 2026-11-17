# Reference-led Studio redesign

The current interface follows Zin’s supplied image. It keeps Home and Bookshelf, all current data keys, document files, reflections, reading services and exam behavior. New `dist/studio-reference.css` applies the indigo/lavender/peach visual system over the existing components. Home uses 136px desktop navigation, compact greeting/date, two cover cards with labelled previous/next arrows, source badges and a two-column exam panel. Large headlines grow their cards rather than being truncated; mobile stacks the cards and uses labelled bottom navigation. Unknown exam dates and publication dates remain explicitly unknown.

The cover headline opens the full story/case dialog; sources and reflections remain available. Reading freshness and failed-feed recovery stay visible in a compact disclosure. Photo failures use a labelled gradient fallback. Exams retain add/edit/delete/undo, timing, notes, progress and completed history; unscheduled subjects are direct add-exam actions. Original data and document schemas are unchanged. A delayed native dialog-close event is ignored when a new dialog is already open, fixing a loading race during document upload → reader handoff.

Verification results: 26 unit tests and 12 browser acceptance flows passed; 24 automated accessibility views reported zero violations. Main workflows cover PDF/DOCX/PPTX, OCR warnings, backup merge, news failure recovery, date boundaries, CRUD and reload. Visual inspection covers the supplied 1204px reference size, 1366/1920px desktop and 390px mobile; populated exam examples used isolated QA-only dates. More than four exams, long headlines, expanded notes and source details can require additional scrolling. External images/feeds remain dependent on their publishers; no new content or exam dates were invented. No dependency, API key, paid AI or access-policy change.

Build/run/configuration instructions remain in README.md. Screenshots are in `.preview/reference/`; the regression report is `.preview/two-page/qa.json`. These checks do not establish complete accessibility or absence of bugs.

## Prior implementation

# Two-page Studio

Latest scope: complete the first supplied prompt before starting Consumer Behavior Lab’s UX pass. Only Home and Bookshelf remain; the former Study Room, separate news/saved/goals/settings routes, study timer, learning content/schedules and obsolete styles/tests have been removed from the deployed app. Backup/recovery remains a dialog accessible through the avatar/profile.

The replacement keeps the real course catalog, original covers/materials, RSS Worker, case library, source labels, document processing and reflections. The Home order is greeting/date → two-column news/case row → full-width exams. Exam CRUD, duplicate prevention, confirmation/undo, calendar-day calculation in Vietnam, final-day clock, creation-to-date bars, urgency labels, completed list and Bookshelf chips are implemented. The Consumer Behaviour link has one editable value in studio.json.

Active data uses a validated version-two browser record. Migration preserves library data and case reflections; the old record and IndexedDB originals remain intact. Form writes commit only after storage succeeds. Backups merge records by stable IDs and preserve current notes. PDF, DOCX and PPTX processing remains local and source-based, with explicit unsupported/OCR states.

Visual design follows the Lab: navy sidebar with two labelled navigation items, yellow Z. tile, one top-bar search, white/soft-blue surfaces, modern sans type and one italic hero accent, blue action buttons, responsive cards, reduced motion and both themes. No new dependencies or AI calls.

Verification: configured JavaScript checks, build and all 26 unit tests pass. All 12 browser flows pass, including exam boundaries/reload/undo, blocked-storage recovery, original links, RSS rotation/failure/15-minute refresh, PDF/DOCX/PPTX processing, OCR warnings, backup merge and contained card actions. Automated accessibility scans report zero violations across 24 Home/Bookshelf/exam-dialog views in light/dark mode at 390/768/1366/1920 px. Real local-service health returned 70 retained RSS stories and five cases; three upstream sources were unavailable in that environment, so the last successful timestamp and edition remained visible. UI checks also use controlled real-source fixtures to verify recovery without depending on external availability.

Run/configuration and limitations are in README.md. Reports/screenshots are in .preview/two-page. Automated checks are not a guarantee of a bug-free app or complete accessibility. The completed build is packaged through the existing Site source workflow and keeps the original access policy.
