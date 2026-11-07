Here is what the sample data changed in the design. 

# **Where the data differs from the doc** 

1. **There is no section level.** Each question has a topic (LOGIC, ARITHMETIC, NUMBER_THEORY, GEOMETRY, COMBINATORICS), in consecutive blocks of 5, so each paper has 25 questions. I dropped the Section table and made topic a column on QUESTION. The UI can still group by topic when it renders. 

2. **The file has no grade, source or year.** Exams are identified only by round and examNo, and grade 2 appears only in the file name and image paths. I added source, grade and year to EXAM, plus a unique code such as timo-g2-heat-06 for repeatable imports. The importer needs the grade, source and year from CLI arguments or from top-level fields you add to the JSON. Otherwise it has to guess them from the path. 

3. **Questions are shown as screenshots.** Every question has a SNAPSHOT image and a SOLUTION_SNAPSHOT image, and some also have FIGURE, SOLUTION_FIGURE or OPTION images. That is why QUESTION_IMAGE is its own table with role and seq. Four MCQ options in the sample are images, so QUESTION_OPTION has either text or an image_id. The JSON lists those option images twice, in options and in images, so the importer should match them by storage_key and store each only once. 

# **Two things to settle before you build** 

- **Solution images must stay private.** The sample already contains the official solution (solution_text and solution images). Use a private Supabase bucket and have the server issue short-lived signed URLs only when the attempt is SUBMITTED or later. This is the same gating rule as for correct answers, but it covers files, which are easy to miss. 

- **Fill-in answers are not all plain numbers.** 42 of the 50 FILL answers are integers. The others include letters like D and Q, Even, the symbol □, and full expressions such as 15 + 8 – 6 – 1 = 16 with an en dash and spaces. Trim plus case-insensitive matching will work for the first group but is fragile for the expressions, so those are the ones parents will most often override. 

# **Choices in the diagram** 

- **ATTEMPT_ANSWER rows are created when the attempt starts** , with a null answer. That makes “N unanswered” on the submit confirmation a simple count, which matters now that the navigator is cut. 

- **Final result is derived, not stored.** It is COALESCE(override_correct, system_correct), times the stored points_possible. Storing points_possible at grading time keeps old scores stable if you later correct a question’s points. 

- **Scores are summed from answers** , not stored on ATTEMPT. At family scale that is cheap, and it removes the risk of a stored total drifting out of sync. 

- **Constraints a diagram can’t show:** 

   - unique on (exam_id, number) in QUESTION 

   - unique on (attempt_id, question_id) in ATTEMPT_ANSWER 

   - unique on (question_id, kind, language) in AI_EXPLANATION 

   - a partial unique index so a profile has only one IN_PROGRESS attempt per exam. Prisma can’t declare this one, so it goes in a raw SQL migration. 

One thing from the sample I’d flag: needsReview is false on all 75 questions, so I kept it as needs_review on QUESTION. It’s cheap, and it gives your import validation a place to mark questions that need a human check. 

