-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'FILL');

-- CreateEnum
CREATE TYPE "ImageRole" AS ENUM ('SNAPSHOT', 'FIGURE', 'OPTION', 'SOLUTION_SNAPSHOT', 'SOLUTION_FIGURE');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ExplanationKind" AS ENUM ('EXPLAIN', 'SOLVE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "auth0_id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "year" INTEGER,
    "round" TEXT NOT NULL,
    "exam_no" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "source_file" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "content_text" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "solution_text" TEXT,
    "points" INTEGER NOT NULL,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_images" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "role" "ImageRole" NOT NULL,
    "seq" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sha256" TEXT,

    CONSTRAINT "question_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT,
    "image_id" TEXT,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempt_answers" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "raw_answer" TEXT,
    "system_correct" BOOLEAN,
    "override_correct" BOOLEAN,
    "points_possible" INTEGER,
    "answered_at" TIMESTAMP(3),
    "graded_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_explanations" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "kind" "ExplanationKind" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'vi',
    "content" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_explanations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth0_id_key" ON "users"("auth0_id");

-- CreateIndex
CREATE INDEX "profiles_user_id_idx" ON "profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exams_code_key" ON "exams"("code");

-- CreateIndex
CREATE INDEX "exams_grade_published_idx" ON "exams"("grade", "published");

-- CreateIndex
CREATE UNIQUE INDEX "exams_source_grade_round_exam_no_key" ON "exams"("source", "grade", "round", "exam_no");

-- CreateIndex
CREATE INDEX "questions_exam_id_topic_number_idx" ON "questions"("exam_id", "topic", "number");

-- CreateIndex
CREATE UNIQUE INDEX "questions_exam_id_number_key" ON "questions"("exam_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "question_images_storage_key_key" ON "question_images"("storage_key");

-- CreateIndex
CREATE INDEX "question_images_question_id_role_idx" ON "question_images"("question_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "question_images_question_id_role_seq_key" ON "question_images"("question_id", "role", "seq");

-- CreateIndex
CREATE INDEX "question_options_image_id_idx" ON "question_options"("image_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_question_id_position_key" ON "question_options"("question_id", "position");

-- CreateIndex
CREATE INDEX "attempts_profile_id_updated_at_idx" ON "attempts"("profile_id", "updated_at");

-- CreateIndex
CREATE INDEX "attempts_exam_id_idx" ON "attempts"("exam_id");

-- CreateIndex
CREATE INDEX "attempt_answers_question_id_idx" ON "attempt_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_answers_attempt_id_question_id_key" ON "attempt_answers"("attempt_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_explanations_question_id_kind_language_key" ON "ai_explanations"("question_id", "kind", "language");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_images" ADD CONSTRAINT "question_images_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "question_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_explanations" ADD CONSTRAINT "ai_explanations_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostgreSQL-only invariant not expressible in the Prisma schema.
CREATE UNIQUE INDEX "one_open_attempt_per_profile_exam"
ON "attempts" ("profile_id", "exam_id")
WHERE "status" = 'IN_PROGRESS';
