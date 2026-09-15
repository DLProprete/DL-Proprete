import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const optionalDate = z.union([z.string().regex(dateRegex, "Date invalide"), z.literal("")]).optional();

// Champs de relecture humaine d'un ScannedDocument — jamais actés sans
// passage par cet écran (docs/NUMERISATION-DOCUMENTS.md : "validation
// humaine systématique").
export const scannedDocumentReviewSchema = z.object({
  supplierName: z.string().optional(),
  category: z.union([z.literal(""), z.enum(["COMPTABLE", "ACHATS", "STOCK"])]).optional(),
  amountTtc: z.union([z.literal(""), z.coerce.number().nonnegative()]).optional(),
  documentDate: optionalDate,
  reference: z.string().optional(),
  isSensitive: z.coerce.boolean().default(false),
  // Coché par défaut côté formulaire : si le fournisseur saisi ne
  // correspond à aucun KnownSupplier, on le mémorise pour la prochaine
  // fois (boucle d'apprentissage validée par le spike du 10/09).
  rememberSupplier: z.coerce.boolean().default(false),
});

export type ScannedDocumentReviewInput = z.infer<typeof scannedDocumentReviewSchema>;
