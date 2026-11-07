# Exam Practice Website: MVP Implementation Roadmap

Status: M3 complete (user confirmed 2026-11-08) | Owner: Nathan | Stack: Next.js, Auth0, Supabase (Postgres + Storage), Prisma, Vercel, OpenAI

## 1. MVP goal

A parent signs up, adds a child profile, and the child takes a full grade 2 TIMO paper on a tablet. Parent and child then review the result together on one screen, use AI to understand mistakes, and the attempt is stored in history.

Learning comes first. The total score is for reference only.

## 2. MVP scope

### In scope

- Auth0 login (email, Google, Facebook) and parent accounts
- Child profiles (nickname and grade), multiple per parent
- Exam catalog filtered by grade, TIMO grade 2 content
- Attempt flow: sections, questions with text and figures, multiple choice and free text
- Autosave of every answer, and resume of an unfinished attempt
- Simple submit confirmation
- Server-side grading (trim, case-insensitive)
- One shared review screen for parent and child, in original exam order
- Mark as Correct or Wrong on any row, total recalculated live, no role restriction
- AI buttons on every row: Explain question and How to solve (Vietnamese, suited to the child's grade, cached)
- Attempt history per profile

### Deferred to later phases

- Tap-to-zoom on figures (figures render at a readable fixed size for now)
- Question navigator (answered and unanswered overview)
- Parent PIN gate
- Mascot, avatars, illustrations
- Math formula rendering
- Topic tags, dashboards, practice mode, retry wrong questions
- AI usage cap (revisit if real usage is high)

## 3. State model

Attempt status: `IN_PROGRESS` -> `SUBMITTED` -> `REVIEWED`

| From | To | Trigger |
| --- | --- | --- |
| (none) | `IN_PROGRESS` | Start exam (or Resume an existing open attempt) |
| `IN_PROGRESS` | `IN_PROGRESS` | Answer saved |
| `IN_PROGRESS` | `SUBMITTED` | Submit, then server grades |
| `SUBMITTED` | `REVIEWED` | Save review, or leaving the review screen |
| `REVIEWED` | `REVIEWED` | Override changed again (no new status) |

Rules:

- One open attempt per child per exam. Starting again offers Resume.
- Correct answers are never sent to the browser while the attempt is `IN_PROGRESS`.
- `AttemptAnswer` stores the raw answer, `systemResult`, points awarded at grading time, optional `parentOverride`, and the final result (override if present, otherwise system result).
- `AiExplanation` is cached per question and language.

## 4. Milestones

Estimates are focused working days. Scale them to your real weekly hours.

### M0: Walking skeleton (3 to 5 days)

- [x] Next.js project deployed on Vercel
- [x] Supabase project (Postgres and Storage), Prisma connected
- [x] Auth0 login working end to end
- [x] Prisma schema: User, Profile, Exam, Section, Question, Attempt, AttemptAnswer, AiExplanation
- [x] Import script for grade 2 JSON and figures, with validation (missing images, questions without answers, invalid types)
- [x] Figures uploaded to Supabase Storage

Done when: you log in and see the grade 2 exam list loaded from the real database. **Complete — confirmed by user on 2026-11-08.**

### M1: Profiles and catalog (2 to 3 days)

- [x] Create, edit, delete child profiles (nickname and grade)
- [x] Profile selection
- [x] Exam catalog filtered by grade, with a Start button
- [x] Ownership check on every route (parent owns the profile or attempt); all data access goes through the Next.js server, so this is the security boundary

Done when: a parent can add a child and pick an exam for them. **Complete — confirmed by user on 2026-11-08.**

### M2: Attempt core (5 to 7 days)

The biggest and riskiest milestone.

- [x] Start or resume an attempt (one open attempt per child per exam)
- [x] Question screens: sections, text, figures at a readable fixed size
- [x] Multiple choice and free-text answers
- [x] Autosave on each answer
- [x] Simple submit confirmation, showing how many questions are unanswered
- [x] Verify no correct answers reach the browser before submit

Done when: a child completes a full paper on a tablet, closes the tab midway, and resumes without losing answers. **Complete — confirmed by user on 2026-11-08.**

### M3: Grading and shared review (4 to 5 days)

- [x] Server-side grading on submit (trim, case-insensitive); store system result and points per answer; move to `SUBMITTED`
- [x] Review screen in original exam order: child's answer beside the correct answer
- [x] Gentle marker on rows that need another look (not a red failure list)
- [x] Score shown small and lower on the screen
- [x] Mark as Correct or Wrong on any row, total recalculated live, autosaved
- [x] Save review or leaving the screen moves the attempt to `REVIEWED`
- [x] Review endpoint returns correct answers only when the attempt is `SUBMITTED` or later

Done when: you finish a paper, see the results, override one answer, and the final total updates correctly. **Complete — confirmed by user on 2026-11-08.**

### M4: AI explanations (3 to 4 days)

- [ ] Explain and How to solve buttons on every review row
- [ ] Server-side prompt producing Vietnamese suited to the child's grade
- [ ] Prompt includes the question, the figure, and the stored correct answer; no child details sent
- [ ] Cache by question and language
- [ ] AI-generated label, worded kindly for children

Done when: a second tap on the same question returns instantly, and the output reads naturally to a child of that grade. Test with your children early; expect a few rounds of prompt tuning.

### M5: History and release (3 to 4 days)

- [ ] Attempt history per profile
- [ ] Profile and history deletion
- [ ] Short privacy page
- [ ] Loading and error states
- [ ] Tablet pass: touch targets and readable fonts

Done when: your children use it for a real week without help navigating.

## 5. Timeline summary

| Milestone | Days |
| --- | --- |
| M0 Walking skeleton | 3 to 5 |
| M1 Profiles and catalog | 2 to 3 |
| M2 Attempt core | 5 to 7 |
| M3 Grading and shared review | 4 to 5 |
| M4 AI explanations | 3 to 4 |
| M5 History and release | 3 to 4 |
| Total | 20 to 28 |

## 6. Testing

- Unit tests for grading normalization (trim, case) and attempt state transitions (double submit, reading answers while `IN_PROGRESS`)
- Manual authorization pass in M5: log in as a second parent and confirm another parent's attempts cannot be read by changing an ID in the URL
- Real-use test with the children after M2 and again after M4

## 7. Risks to watch

| Risk | Mitigation |
| --- | --- |
| Lost progress mid-attempt | Autosave each answer, resume flow tested in M2 |
| Correct answers leaking early | Gate on attempt status in every endpoint |
| Free-text answers graded wrongly | Parent override, case-insensitive matching, accepted-answers list later |
| AI explanations confusing for a child | Grade-aware Vietnamese prompt, send stored correct answer and figure, tune with real children |
| Unrestricted AI use by a child | Cache per question and language; revisit a cap if usage grows |
| Product feels too serious | Encouraging wording, gentle row markers, small score |

## 8. Decisions recorded

- Parent and child review together on one screen
- Child may use the override buttons; no role restriction in the MVP
- Review list keeps the original exam order
- Total score is for reference only; encouraging learning is the top priority
- AI prompt is built server-side, Vietnamese suited to the child's grade
- No AI usage cap for now
- Tap-to-zoom and the question navigator are deferred to a later phase

## 9. Open items

- Weekly hours available, to convert day estimates into calendar dates
- Whether an unfinished attempt stays `IN_PROGRESS` indefinitely ("abandoned" as a derived metric) or expires
