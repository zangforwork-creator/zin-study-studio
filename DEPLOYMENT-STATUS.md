# Publication authorization and configuration

Updated 16 November 2026.

- Local implementation, build and checks are complete.
- Sites project registered: `appgprj_6afa0752ea1881918de71089c217a380`.
- Access verified by `get_site`: current user is owner; custom access includes only the owner; no other viewers, groups, editors or external visitors.
- Zin explicitly answered **“Cho phép đưa lên Sites riêng tư”** after being shown the exact payload and destination on 16 November 2026.
- Authorized payload: source code, Notion grades and goals snapshot, course/book metadata, optimized cat art and four textbook source pages. Original full textbooks and future local learning progress are not included.
- The earlier automatic approval rejection required this authorization; the user has now provided it. Preserve owner-only access.

Use the project ID in `.openai/hosting.json`, the Sites source helper with credentials only through stdin, the reviewed pushed source commit and its matching package, and the owner-private save/deploy tool. Confirm native deployment success before treating a URL as live. The publication receipt is kept alongside the project at `../zin-study-studio-publication.json` after successful deployment, avoiding a circular source commit.

Local use: run `Start-Website.cmd`, then open http://127.0.0.1:4173.
