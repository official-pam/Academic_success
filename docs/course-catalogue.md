# FUT Minna course catalogue: sources and coverage (24 Oct 2026)

## What's loaded (`supabase/seed_courses.sql`)
- **15 schools, 82 programmes** from the official ePortal programme list:
  https://eportal.futminna.edu.ng/ePortal_V2/utme/. School full names come from each school's website title.
  SAT's full name isn't published, so it's stored as "SAT (full school name not published on the ePortal)".
- **424 courses across 6 programmes**, transcribed from official department documents published on or linked
  from futminna.edu.ng. Each has code, title, credit units, level, semester and compulsory/elective status, and
  each record stores its source document URL.

| Programme | School | Courses | Source document |
| --- | --- | --- | --- |
| Computer Science | SICT | 59 | CCMAS 2024 curriculum (PDF, SICT site) |
| Information Technology | SICT | 60 | IFT CCMAS Students' Handbook 2021–26 (DOCX, SICT site) |
| Mechanical Engineering | SIPET | 86 | Mechanical Engineering Students' Handbook (PDF, SIPET site) |
| Electrical and Electronics Engineering | SEET | 87 | Departmental Handbook 2024–2028 CCMAS (PDF on Dropbox, linked from the EEE page) |
| Quantity Surveying | SET | 70 | QS Students' Handbook CCMAS, 1 Dec 2025 (PDF, SET site) |
| Educational Technology | SSTE | 62 | EDT Students' Handbook CCMAS (PDF, SSTE site) |

**Check performed:** per level and semester, the loaded units equal the "Total" row printed in each handbook
(SIWES is credited in 400 Level second semester, and only the required number of elective units counts).

## Transcription notes
- Where a handbook's course table and its course-description section disagree, the table (programme structure)
  was used. Example: Mechanical Engineering MEE 402–405 are "C" in the table but "E" in the descriptions.
- Codes are kept exactly as printed, even where they look like typos. Example: Educational Technology lists
  FUTM-EDT 321 and 322 under 500 Level.
- EEE lists **FUTM-EEE 524** twice in 500 Level second semester (Industrial Electronics Design, C; and
  Fundamentals of Smart Grid and Microgrid Technologies, E). Only the first is loaded. The committee should confirm
  the correct code for the second.
- SIWES courses (GET 299/399) are stored at the level where they're taken. The handbooks credit them at 400 Level.
- Computer Science: the department web page (futminna.edu.ng/sict/cpt/) differs from the CCMAS 2024 PDF in a few
  places (e.g. MTH 101 2 vs 3 units; CPT 121 vs 112; CPT 524 vs 523). The PDF was used.

## Checked, with no course list available
- All 50 department web pages, every school "Programmes" page and the full page and file index of all school sites
  were searched. The "All Courses" and "Course List" pages are empty theme templates.
- Science Education (SSTE) only publishes a 2025/26 staff course allocation (no units or levels), so it isn't loaded.
- The six newer schools (SAFT, SAHS, SAMET, SBMS, SFAT, SPhS) have no department sites yet.
- The 2023/24 university Student Handbook has no course codes.

## How the remaining 76 programmes get filled
Coordinators or the chairman import each department's official course list (handbook, curriculum or registration
printout). Imported records start as `pending_review` and become visible to members once marked
`committee_verified`. Nothing is invented, and nothing claims to sync with the university.
