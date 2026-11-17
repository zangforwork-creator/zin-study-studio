# Exam and Bookshelf visual update

The latest supplied references guide the compact Exam Countdown and physical-book shelf. Navigation stays Home, Bookshelf and Courses. This update changes presentation and adds a functional bookshelf sort; it does not change the course catalog, source files, exam records, document processing or storage schemas.

Exam Countdown has a purple-to-rose card, decorative hourglass, large calendar-day count, and compact icon-labelled subject rows. Saved exams retain editing, deletion confirmation, undo, notes, completed history, date sorting and the Today clock. With no exams, the configured Consumer Behaviour subject is shown as a planning suggestion with an em dash and “Not scheduled”; no sample date is saved. Add exam remains the entry point for any subject.

Bookshelf keeps the real cover images extracted from the supplied documents, at their actual aspect ratios. CSS adds a spine, page edge, soft shadow and shelf ledge; covers are not repainted. Source title slides remain flat. Cover provenance is in COURSE-COVER-SOURCES.json. The toolbar supports course filtering, title search, Title A–Z, original course order, and Recently attached using actual locally saved attachment timestamps. New course, Add document and source readers remain functional.

Market Pulse and web-case photographs use their original colours at full opacity without the previous desaturation or purple tint. A neutral lower gradient supports white headline readability; the upper photo remains unobstructed. Source credits, original links and missing-image recovery are retained. Publisher availability and source-image resolution remain external limitations.

## Decorative asset provenance

Built-in image generation created a new transparent hourglass illustration. Selected output was converted to WebP, retaining alpha, at 220 × 293 pixels (13,296 bytes). Project asset: `dist/assets/exam-hourglass.webp`. It is decorative, has empty alternative text, and conveys no exam data. No book cover or editorial source image was generated.

Prompt:

> Use case: stylized-concept. Asset type: small decorative illustration for an exam-countdown dashboard. Create a single elegant premium 3D hourglass, full object, upright with a gentle 8-degree tilt, viewed in three-quarter perspective. Transparent glass has a delicate lavender tint, smooth lilac round top and bottom rims, warm peach sand in the bottom chamber and a fine stream falling through the neck. Soft glossy highlights, rounded friendly shapes, subtle compact contact shadow. Palette: lavender, indigo reflections, pale peach and warm cream. Center the complete object with generous transparent padding; tall compact composition. Genuine transparent alpha background. No text, numbers, clocks, hands, logos, watermark, room or other objects.

## Run and verification

Use the existing dependencies and configuration in README.md. Run `npm.cmd run dev` for local preview at http://127.0.0.1:4173. No new dependency, key or storage configuration is required. Data remains local to the browser; use the profile menu for backups. User-added notes and documents remain intact.

Verification commands: `npm.cmd run check`, `npm.cmd test`, `node scripts/two-page-qa.mjs`, `node scripts/courses-qa.mjs`, `node scripts/visual-polish-qa.mjs`, and the Sites build helper. Thirty unit tests, thirteen main browser flows and two catalog recovery/search flows pass. The main suite reports zero automated accessibility violations across 32 views: Home, Bookshelf, Courses and exam dialog, light/dark, at 390/768/1366/1920 px.

The focused visual check covers 12 Home/Bookshelf layouts at 360/390/768/1366/1536/1920 px; cover/text boundaries, actual-photo loading and opacity, empty exam state, real sorting without record mutation, and Today labels at three widths. Screenshots and reports are in `.preview/polish-20/`; the main report is `.preview/two-page/qa.json`. Exam dates in these screenshots exist only in isolated browser test storage, never in the published catalog. Automated checks do not establish complete accessibility or absence of bugs.
