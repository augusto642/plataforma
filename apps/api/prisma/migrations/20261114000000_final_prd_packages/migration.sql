-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "coins" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tower_progress" ADD COLUMN IF NOT EXISTS "previous_square" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tower_progress" ADD COLUMN IF NOT EXISTS "daily_rolls_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tower_progress" ADD COLUMN IF NOT EXISTS "last_roll_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "activity_hint_usages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "hint_level" INTEGER NOT NULL,
    "xp_penalty_percent" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_hint_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guided_projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'junior',
    "prerequisites" JSONB NOT NULL DEFAULT '[]',
    "tech_stack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gitea_template_repo" TEXT,
    "sonar_project_key" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guided_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "guided_project_sprints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tasks" JSONB NOT NULL DEFAULT '[]',
    "base_xp" INTEGER NOT NULL DEFAULT 250,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guided_project_sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_guided_project_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "current_sprint" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "gitea_repo_name" TEXT,
    "sonar_quality_gate" TEXT,
    "sonar_metrics" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_guided_project_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tower_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'support',
    "cost_coins" INTEGER NOT NULL DEFAULT 50,
    "icon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tower_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_tower_inventory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "item_code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tower_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tower_active_effects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "effect_type" TEXT NOT NULL,
    "charges" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tower_active_effects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tower_parties" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL DEFAULT 10,
    "leader_id" UUID NOT NULL,
    "members" JSONB NOT NULL DEFAULT '[]',
    "active_challenge" JSONB,
    "subtasks" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tower_parties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "activity_hint_usages_user_id_activity_id_hint_level_key" ON "activity_hint_usages"("user_id", "activity_id", "hint_level");
CREATE INDEX IF NOT EXISTS "activity_hint_usages_user_id_activity_id_idx" ON "activity_hint_usages"("user_id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "guided_projects_slug_key" ON "guided_projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "guided_project_sprints_project_id_order_key" ON "guided_project_sprints"("project_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_guided_project_progress_user_id_project_id_key" ON "user_guided_project_progress"("user_id", "project_id");
CREATE INDEX IF NOT EXISTS "user_guided_project_progress_user_id_status_idx" ON "user_guided_project_progress"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tower_items_code_key" ON "tower_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_tower_inventory_user_id_item_code_key" ON "user_tower_inventory"("user_id", "item_code");
CREATE INDEX IF NOT EXISTS "user_tower_inventory_user_id_idx" ON "user_tower_inventory"("user_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tower_active_effects_user_id_effect_type_idx" ON "tower_active_effects"("user_id", "effect_type");

-- AddForeignKey
ALTER TABLE "activity_hint_usages" ADD CONSTRAINT "activity_hint_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_hint_usages" ADD CONSTRAINT "activity_hint_usages_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guided_project_sprints" ADD CONSTRAINT "guided_project_sprints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "guided_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_guided_project_progress" ADD CONSTRAINT "user_guided_project_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_guided_project_progress" ADD CONSTRAINT "user_guided_project_progress_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "guided_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tower_inventory" ADD CONSTRAINT "user_tower_inventory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_tower_inventory" ADD CONSTRAINT "user_tower_inventory_item_code_fkey" FOREIGN KEY ("item_code") REFERENCES "tower_items"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tower_active_effects" ADD CONSTRAINT "tower_active_effects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tower_parties" ADD CONSTRAINT "tower_parties_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
