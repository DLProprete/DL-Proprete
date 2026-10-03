-- CreateEnum
CREATE TYPE "DisplayTextSize" AS ENUM ('NORMAL', 'LARGE', 'XLARGE');

-- CreateEnum
CREATE TYPE "DisplayTheme" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayContrast" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "displayDyslexicFont" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "displayReducedMotion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "displayTextSize" "DisplayTextSize" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "displayTheme" "DisplayTheme" NOT NULL DEFAULT 'SYSTEM';
