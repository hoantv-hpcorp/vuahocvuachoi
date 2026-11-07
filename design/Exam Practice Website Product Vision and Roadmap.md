# Exam Practice Website: Product Vision and Roadmap

Status: Draft v1 | Owner: Nathan | Target stack: Next.js, Auth0, Supabase, Vercel, OpenAI

## 1. Vision

A friendly, low-pressure website where primary school children (Grade 1 to 5) practice real math competition papers, starting with TIMO, and where parents can see how their child is doing and help them learn from mistakes.

The product should feel like a playground, not an exam hall. A child opens it, picks a paper, and works through it without fear of failing. A parent logs in, reviews the result, corrects any grading differences, and uses AI-assisted explanations to turn each mistake into learning.

### Problem we are solving

- Competition papers are distributed as PDFs. They are hard to practice on, and nobody records scores or progress.
- Children get a score but no explanation. Many are also learning in English as a second language, so even understanding the question can be a barrier.
- Parents have no simple way to see history, trends, or which questions went wrong.

### Product goals

1. Let a child take a full exam on a tablet or computer with a comfortable, encouraging experience.
2. Grade automatically and fairly, with the parent having the final say.
3. Keep a complete history of every attempt for each child.
4. Help children understand mistakes through AI explanations in Vietnamese, the default language of the product.
5. Make adding new exams cheap, so the content library can grow.

### Non-goals (for now)

- Public marketplace or paid subscriptions.
- Leaderboards or ranking between children (we want low pressure).
- Teacher or classroom management.
- Math formula rendering (KaTeX); the current content has no such questions.
- Parent PIN gate, mascot, and illustrations (planned for later phases; the MVP is text only).

## 2. Users

**Child (Grade 1 to 5).** Takes exams, sees an encouraging result. Not expected to manage accounts. Needs large touch targets, simple wording, friendly visuals.

**Parent.** Creates the account, manages child profiles, chooses which exam a child takes, reviews results, overrides grading, triggers AI explanations, and views history.

**Admin (the owner, initially).** Imports exam content from JSON and figures. Initially a script, not a UI.

## 3. Design principles

1. **Low pressure first.** Encouraging language and a warm tone (text only in the MVP; visuals come later), wrong answers framed as "let's look at this again".
2. **Touch-first.** Assume a tablet. Large buttons, readable fonts, zoomable figures.
3. **Parent has the final word.** The system grades, the parent can override. Both are always stored.
4. **Never lose progress.** Answers are saved as the child goes; an interrupted attempt can be resumed.
5. **Correct answers stay on the server** until the attempt is submitted.
6. **Content-agnostic.** The model supports any exam source, grade, and year, not only TIMO.
7. **Minimal child data.** Nickname and grade only.

## 4. Core concepts

- **Parent account:** managed by Auth0 (email, Google, Facebook).
- **Child profile:** nickname and grade (avatar later, with the visual theme). A parent can have many.
- **Exam:** a paper with source, grade, year, and sections.
- **Section:** a group of questions within an exam.
- **Question:** text, optional figures, type (multiple choice or free text), correct answer, points.
- **Attempt:** one child taking one exam, with a status (in progress, submitted, reviewed).
- **Attempt answer:** the child's raw answer, the system result and points, the optional parent override, and the final result.
- **AI explanation:** cached per question and language, for "explain" and "how to solve".

## 5. Key product decisions made so far

| Topic | Decision |
| --- | --- |
| Authentication | Auth0 with email, Google, Facebook. No custom user management. |
| Profiles | Multiple child profiles per parent account. |
| Database and storage | Supabase: Postgres for data, Storage for exam figures. |
| Hosting | Vercel. |
| AI provider | OpenAI API with a model that accepts image input, called from the server only. |
| Language | Vietnamese is the default for UI and AI explanations. Exam questions stay in their original language. |
| Free-text grading | Trim both ends and compare case-insensitively from day one. A match earns the points. |
| Parent override | In review, each answer has Mark as Correct or Mark as Wrong. Total is recalculated. Finish or Save review persists the changes. |
| Override storage | System result and parent override are stored separately. Final result is the override if present, otherwise the system result. |
| AI in review | Two buttons per question: explain the question, and show how to solve it. |
| Content roadmap | TIMO grade 2 first; likely TIMO grade 1, TIMO grade 3, and FMO next. |
| Visuals | MVP is text only. Mascot, avatars, and illustrations come in a later phase. |
| Math rendering | Not needed. |
| Parent PIN gate | Deferred to a later phase. |

## 6. Roadmap

### Phase 0: Foundations (about 1 to 2 weeks)

Goal: a working skeleton and a clean content pipeline.

- Set up Supabase for Postgres and image storage, and use Prisma for data access.
- Define the data model: User, Profile, Exam, Section, Question, Attempt, AttemptAnswer, AiExplanation.
- Write an import script that loads the TIMO grade 2 JSON and figures, and validates them (missing images, questions without answers, invalid types).
- Set up the Next.js project on Vercel, Auth0 integration, and Supabase Storage for figures.
- Establish a simple text-based design language: colors, fonts, spacing, component library (no mascot or illustrations yet).

Exit criteria: grade 2 exam data is in the database and a logged-in user can see it.

### Phase 1: MVP, the child can take an exam and the parent can review (about 4 to 6 weeks)

1. Auth0 login and parent accounts.
2. Create, edit, and delete child profiles with nickname and grade.
3. Exam catalog, filtered by grade.
4. Profile selection, then start an exam.
5. Attempt flow: sections, questions with text and figures, multiple choice and free-text answers, tap-to-zoom on figures.
6. Autosave of each answer, and resume of an unfinished attempt.
7. Question navigator showing answered and unanswered questions, plus a friendly confirmation before submit.
8. Server-side grading with trim and case-insensitive matching.
9. Result screen: encouraging summary, total points, list of questions marked correct or wrong.
10. Review mode: child's answer, correct answer, parent override with live total preview, and Save review.
11. AI "Explain question" and "How to solve" buttons, calling the OpenAI API from the server with the figure attached, answering in Vietnamese, caching per question, and a note that content is AI-generated.
12. Attempt history per profile.

Exit criteria: a parent can sign up, add a child, let the child complete a grade 2 TIMO paper, review and override the result, use the AI buttons, and see the attempt in history.

### Phase 2: Learning insights and polish (about 4 to 6 weeks)

- Parent PIN gate for history and profile settings.
- Flag for review during an attempt, shown in the question navigator.
- Practice mode with optional timer, hint, and instant feedback; exam mode with no feedback until the end.
- Topic tags on questions and strengths and weaknesses per child.
- Parent dashboard: score trend over time, comparison across attempts of the same exam.
- Retry wrong questions as a short quiz.
- Thumbs-down on AI explanations, with regeneration.
- Optional per-profile language setting for AI explanations (Vietnamese is the default).
- Accepted-answers list per question, informed by how often parents override.

### Phase 3: Engagement and growth

- Visual theme with illustrations, avatars, and a mascot, plus gentle gamification: stars, badges, streaks. No rankings.
- Per-question time tracking.
- Printable or PDF result report.
- More exams (likely TIMO grade 1, TIMO grade 3, and FMO), then other grades up to Grade 5, with filters by source, grade, and year.
- Admin UI for importing and managing exams.
- Additional UI languages beyond Vietnamese.
- Read-aloud for younger children.
- Offline tolerance with local answer storage and later sync.
- Read-only sharing of results with a second parent or teacher.

## 7. Success measures

Since this starts as a family tool, keep the measures simple:

- A child can finish a full exam without help navigating the app.
- Share of attempts that are completed (not abandoned).
- Parent override rate per question, as a signal of grading problems.
- How often AI explanations are used, and how often they are marked as bad.
- Number of exams practiced per child per month.
- Parent feedback: does the child ask to use it again?

## 8. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Free-text answers graded wrongly | Parent override, case-insensitive matching, accepted-answers list later. |
| Correct answers leaking to the browser | Grade only on the server and never send answers before submission. |
| AI gives wrong or confusing explanations | Pass the stored correct answer in the prompt, send the figure with the question, label output as AI-generated, allow thumbs-down and regeneration. |
| AI cost grows | Cache per question and language, rate limit per account, call from the server only. |
| Child data privacy | Collect minimal data, allow full profile and history deletion, publish a short privacy page, do not send child details to the AI. |
| Exam content copyright | Fine for private family use; check licensing before any public or paid release. |
| Child loses progress when interrupted | Autosave and resume. |
| Past results change when content is corrected | Store the points awarded on each answer at grading time. |
| Product feels too serious for children | Test with the actual children early and adjust tone and visuals. |

## 9. Resolved questions

Every open question is settled, so nothing blocks the start of Phase 0.

| Question | Decision |
| --- | --- |
| Database | Supabase (Postgres) |
| Data access | Prisma on Supabase Postgres |
| Access path | All database and storage access goes through the Next.js server; no direct browser access |
| Hosting and images | Vercel for hosting, Supabase Storage for figures |
| AI provider | OpenAI API, using a model with image input |
| AI cost | Covered by the owner; no spending limit set |
| Languages | Vietnamese is the default for UI and explanations; exam questions stay in their original language |
| Free-text matching | Trim and case-insensitive from day one |
| Next exams | Likely TIMO grade 1, TIMO grade 3, and FMO; the FMO format is almost identical to TIMO, so the same exam model applies |
| Mascot and visuals | Undecided; MVP is text only, visuals considered in a later phase |

## 10. Next steps

1. Review this document and correct anything that no longer matches your intent.
2. Design the data model, including the answer override and AI cache tables.
3. Define the main API routes and page map.
4. Build Phase 0 and import the grade 2 data.
