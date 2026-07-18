-- CreateTable
CREATE TABLE "login_attempt" (
    "login_attempt_id" UUID NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempt_pkey" PRIMARY KEY ("login_attempt_id")
);

-- CreateIndex
CREATE INDEX "login_attempt_identifier_created_at_idx" ON "login_attempt"("identifier", "created_at");
