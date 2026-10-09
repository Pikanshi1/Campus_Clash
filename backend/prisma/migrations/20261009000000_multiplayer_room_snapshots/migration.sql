CREATE TABLE "MultiplayerRoomSnapshot" (
    "code" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MultiplayerRoomSnapshot_pkey" PRIMARY KEY ("code")
);

CREATE INDEX "MultiplayerRoomSnapshot_updatedAt_idx" ON "MultiplayerRoomSnapshot"("updatedAt");