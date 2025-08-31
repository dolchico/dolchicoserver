-- AlterEnum
ALTER TYPE "OTPType" ADD VALUE 'ACCOUNT_DELETE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pendingDeleteExpiry" TIMESTAMP(3),
ADD COLUMN     "pendingDeleteOtp" TEXT;
