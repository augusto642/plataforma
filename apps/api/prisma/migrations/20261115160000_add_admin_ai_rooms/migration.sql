CREATE TABLE "ai_specialized_rooms" (
    "id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "system_instructions" TEXT NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_specialized_rooms_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ai_chat_messages"
ADD COLUMN "ai_room_id" UUID;

CREATE INDEX "ai_chat_messages_user_id_activity_id_ai_room_id_created_at_idx"
ON "ai_chat_messages"("user_id", "activity_id", "ai_room_id", "created_at");

CREATE UNIQUE INDEX "ai_specialized_rooms_activity_id_slug_key"
ON "ai_specialized_rooms"("activity_id", "slug");

CREATE INDEX "ai_specialized_rooms_activity_id_is_published_idx"
ON "ai_specialized_rooms"("activity_id", "is_published");

ALTER TABLE "ai_chat_messages"
ADD CONSTRAINT "ai_chat_messages_ai_room_id_fkey"
FOREIGN KEY ("ai_room_id") REFERENCES "ai_specialized_rooms"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_specialized_rooms"
ADD CONSTRAINT "ai_specialized_rooms_activity_id_fkey"
FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
