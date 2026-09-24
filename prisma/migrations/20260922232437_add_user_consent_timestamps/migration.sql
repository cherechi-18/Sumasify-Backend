-- AlterTable
ALTER TABLE "users" ADD COLUMN     "agreed_to_privacy_at" TIMESTAMP(3),
ADD COLUMN     "agreed_to_terms_at" TIMESTAMP(3);
