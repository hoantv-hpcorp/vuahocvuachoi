CREATE TABLE IF NOT EXISTS timo_exam (
  id BIGSERIAL PRIMARY KEY,
  grade SMALLINT NOT NULL,
  round VARCHAR(16) NOT NULL,          -- PRELIMINARY | HEAT
  exam_no SMALLINT NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  UNIQUE (grade, round, exam_no)
);

CREATE TABLE IF NOT EXISTS timo_question (
  id BIGSERIAL PRIMARY KEY,
  exam_id BIGINT NOT NULL REFERENCES timo_exam(id),
  number SMALLINT NOT NULL,
  topic VARCHAR(32) NOT NULL,          -- LOGIC | ARITHMETIC | NUMBER_THEORY | GEOMETRY | COMBINATORICS
  type VARCHAR(8) NOT NULL,            -- MCQ | FILL
  content_text TEXT NOT NULL,
  options JSONB,
  correct_answer VARCHAR(64),
  solution_text TEXT,
  points SMALLINT NOT NULL DEFAULT 4,
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (exam_id, number)
);

CREATE TABLE IF NOT EXISTS timo_question_image (
  id BIGSERIAL PRIMARY KEY,
  question_id BIGINT NOT NULL REFERENCES timo_question(id),
  role VARCHAR(24) NOT NULL,           -- SNAPSHOT | FIGURE | SOLUTION_SNAPSHOT | SOLUTION_FIGURE
  seq SMALLINT NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  width INT, height INT,
  sha256 CHAR(64),
  UNIQUE (question_id, role, seq)
);
