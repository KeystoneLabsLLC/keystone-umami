-- CreateTable
CREATE TABLE "invitation" (
    "invitation_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "team_id" UUID,
    "team_role" VARCHAR(50),
    "invited_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("invitation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitation_token_hash_key" ON "invitation"("token_hash");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE INDEX "invitation_team_id_idx" ON "invitation"("team_id");

-- CreateIndex
CREATE INDEX "invitation_invited_by_idx" ON "invitation"("invited_by");
