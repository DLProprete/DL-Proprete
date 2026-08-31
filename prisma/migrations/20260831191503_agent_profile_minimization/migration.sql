-- Principe de minimisation (docs/SPEC.md §8) : la paie est externalisee,
-- rien dans l'outil n'a besoin de la date de naissance de l'agent
-- (audit du 31/08/2026, Mo10).

/*
  Warnings:

  - You are about to drop the column `birthDate` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "birthDate";
