export const site = {
  name: "DL Propreté",
  url: "https://www.dlproprete.fr",
  description:
    "Nettoyage industriel et tertiaire, négoce de produits d'entretien, manutention et petits dépannages de maintenance pour les entreprises et copropriétés de Caen et ses alentours.",
} as const;

export const business = {
  name: "DL Propreté",
  foundedYear: 2011,
  foundedLabel: "avril 2011",
  foundedDateLabel: "18 avril 2011",
  siren: "531 739 241",
  siret: "531 739 241 00044",
  vatNumber: "FR64531739241",
  legalForm: "SAS (société par actions simplifiée)",
  shareCapital: "7 000,00 €",
  rcs: "531 739 241 R.C.S. Caen",
  publicationDirector: "Cassandre Lemière",
  founder: "Dominique Lemière",
  leader: "Cassandre Lemière",
  teamSize: 16,
  email: "contact@dlproprete.fr",
  phone: "06 33 58 18 34",
  hours: {
    label: "Lundi – vendredi, 8h – 18h",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "18:00",
  },
  address: {
    street: "3 rue de Verdun",
    postalCode: "14460",
    city: "Colombelles",
  },
  serviceArea: ["Caen et ses alentours"],
} as const;

export const services = [
  {
    slug: "nettoyage-industriel",
    title: "Nettoyage industriel",
    summary:
      "Sites de production, ateliers, entrepôts logistiques : nettoyage des sols techniques, machines et zones de production, dans le respect des normes d'hygiène et de sécurité.",
  },
  {
    slug: "nettoyage-batiments",
    title: "Nettoyage des bâtiments",
    summary:
      "Entretien courant et remise en état de bureaux, commerces et parties communes de copropriétés : sols, vitrerie, sanitaires.",
  },
  {
    slug: "negoce-produits-entretien",
    title: "Négoce de produits d'entretien",
    summary:
      "Fourniture de produits et consommables professionnels — détergents, hygiène, papeterie sanitaire — pour équiper durablement vos locaux.",
  },
  {
    slug: "manutention-depannages",
    title: "Manutention & petits dépannages",
    summary:
      "Appui ponctuel en manutention et petites interventions de maintenance des locaux, en complément de nos prestations de nettoyage.",
  },
] as const;
