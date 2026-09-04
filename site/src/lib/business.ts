export const site = {
  name: "DL Propreté",
  url: "https://www.dlproprete.fr",
  description:
    "Nettoyage industriel et tertiaire, négoce de produits d'entretien, manutention et petits dépannages de maintenance pour les entreprises et copropriétés du Calvados.",
} as const;

export const business = {
  name: "DL Propreté",
  foundedYear: 2011,
  foundedLabel: "avril 2011",
  siren: "531 739 241",
  email: "contact@dlproprete.fr",
  // TODO: numéro à renseigner — utilisé dans le footer, la page contact et les données structurées.
  phone: null as string | null,
  address: {
    street: "3 rue de Verdun",
    postalCode: "14460",
    city: "Colombelles",
  },
  serviceArea: ["Calvados", "Normandie"],
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
