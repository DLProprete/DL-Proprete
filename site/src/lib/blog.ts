export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  body: string[];
};

export const posts: BlogPost[] = [
  {
    slug: "frequence-nettoyage-bureaux",
    title: "À quelle fréquence faire nettoyer ses bureaux ?",
    description:
      "Sanitaires, sols, postes de travail : la fréquence d'entretien ne devrait pas être la même partout. Quelques repères pour ajuster un contrat sans payer pour du superflu.",
    date: "2026-09-01",
    body: [
      "La question revient à chaque devis : faut-il un passage quotidien, ou trois fois par semaine suffisent ? La réponse dépend moins de la surface que de l'usage des locaux.",
      "Les sanitaires et les zones de passage (accueil, couloirs) se salissent au rythme de la fréquentation : dans un bureau de 10 personnes, un passage quotidien reste souvent justifié. Dans un espace peu fréquenté (archives, salle de réunion utilisée une fois par semaine), l'entretien peut être hebdomadaire sans perte de confort perçu.",
      "Les postes de travail eux-mêmes n'ont pas besoin d'un nettoyage quotidien systématique — un dépoussiérage hebdomadaire suffit dans la plupart des cas, sauf activité spécifique (accueil de public, restauration sur site).",
      "Le bon réflexe : ne pas caler la fréquence sur la surface en m², mais sur trois critères — le nombre de personnes présentes, la présence ou non de public, et la sensibilité de l'activité (santé, agroalimentaire, laboratoire ont leurs propres contraintes). Un contrat bien ajusté distingue souvent plusieurs fréquences selon les zones plutôt qu'un seul rythme pour tout le local.",
      "C'est ce qu'on fait à chaque devis : on regarde l'usage réel avant de proposer un rythme, plutôt que d'appliquer une grille standard.",
    ],
  },
  {
    slug: "nettoyage-industriel-sols-techniques",
    title: "Nettoyage d'atelier : pourquoi un sol technique ne se traite pas comme un bureau",
    description:
      "Résidus de production, zones de circulation d'engins, normes d'hygiène spécifiques : le nettoyage industriel obéit à des contraintes que le nettoyage tertiaire n'a pas. Ce qui change concrètement.",
    date: "2026-09-08",
    body: [
      "Un sol de bureau et un sol d'atelier n'ont rien en commun une fois qu'on regarde ce qu'ils reçoivent au quotidien : poussières fines, résidus d'huile ou de production, passages de chariots élévateurs. Le protocole de nettoyage doit s'adapter à ce que le sol encaisse, pas seulement à sa surface.",
      "Première différence : la sécurité prime sur l'esthétique. Un sol gras ou glissant dans une zone de circulation d'engins est un risque d'accident, pas juste un défaut de propreté. Les zones de passage et les abords de machines demandent donc une vigilance et une fréquence différentes du reste de l'atelier.",
      "Deuxième différence : certains résidus de production (huiles, poussières spécifiques à l'activité) ne partent pas avec un nettoyage standard — ils demandent des produits et parfois du matériel adaptés (autolaveuse, dégraissant professionnel) qu'un entretien de bureau n'utilise jamais.",
      "Troisième différence : les horaires d'intervention se calent souvent sur l'activité de production, pas sur une plage fixe — tôt le matin avant la reprise, ou en horaires décalés pour ne pas gêner les équipes. Un contrat de nettoyage industriel se construit avec les contraintes de production du site, pas l'inverse.",
      "Le point de départ reste le même que pour un bureau : observer l'usage réel des lieux avant de proposer un protocole, plutôt que de plaquer une méthode générique sur un site industriel.",
    ],
  },
  {
    slug: "changer-de-prestataire-nettoyage",
    title: "Changer de prestataire de nettoyage : ce qu'il faut vérifier avant de signer",
    description:
      "Un contrat de nettoyage s'engage souvent sur plusieurs mois. Quelques points à vérifier avant de changer de prestataire, pour éviter les mauvaises surprises en cours d'année.",
    date: "2026-09-12",
    body: [
      "Changer de prestataire de nettoyage n'est pas qu'une question de tarif — c'est aussi accepter de renégocier ou de reconduire un engagement sur plusieurs mois. Quelques points valent la peine d'être vérifiés avant de signer, au-delà du prix affiché sur le devis.",
      "Le périmètre exact des prestations d'abord : un devis qui ne détaille pas précisément les zones couvertes, la fréquence par zone et la durée de prestation prévue laisse la porte ouverte à des interprétations différentes une fois le contrat en cours. Mieux vaut un devis détaillé qu'un forfait vague, même si le premier semble plus long à lire.",
      "La durée d'engagement et les conditions de sortie ensuite : un contrat de 12 mois reconductible tacitement est courant dans le secteur, mais le délai de préavis avant échéance doit être clair et raisonnable — ni un engagement qui se prolonge sans qu'on s'en rende compte, ni une porte de sortie si étroite qu'elle rend le changement de prestataire impossible en pratique.",
      "La gestion des remplacements en cas d'absence : un agent malade ou en congé ne doit pas se traduire par un site non traité. Vérifier comment le prestataire gère les remplacements — et si cette information circule vers le client — évite de découvrir le problème après coup.",
      "Enfin, la facturation : au réel (les heures effectivement passées) ou au prévu (les heures planifiées au contrat) ne donnent pas le même type de facture ni la même prévisibilité budgétaire d'un mois sur l'autre. Autant savoir lequel des deux modèles on signe.",
    ],
  },
  {
    slug: "entretien-parties-communes-copropriete",
    title: "Entretien des parties communes de copropriété : qui décide de quoi",
    description:
      "Fréquence, périmètre, budget : l'entretien des parties communes se décide en assemblée générale, mais certains choix reviennent au syndic entre deux AG. Point rapide sur qui fait quoi.",
    date: "2026-09-01",
    body: [
      "Dans une copropriété, l'entretien des parties communes (hall, escaliers, ascenseurs, extérieurs) est une charge collective — mais la décision ne se prend pas toujours au même endroit.",
      "Le contrat d'entretien lui-même (choix du prestataire, fréquence, budget annuel) relève en principe d'un vote en assemblée générale, sur proposition du syndic. C'est aussi en AG que se décide un changement de prestataire ou une modification substantielle de la fréquence.",
      "Entre deux assemblées, le syndic gère le contrat en cours : il peut ajuster des détails d'organisation (horaires de passage, points de vigilance signalés par les copropriétaires) sans repasser par un vote, tant que ça reste dans le cadre déjà voté.",
      "Pour un prestataire, ça change la manière de travailler : les échanges du quotidien se font avec le syndic, mais toute évolution de fond (fréquence, périmètre, tarif) doit être documentée pour être présentée en assemblée. C'est pour ça qu'on fournit un compte-rendu régulier et modifiable — pas juste une facture — à nos clients syndics.",
      "Un point souvent oublié : les menues réparations constatées pendant l'entretien (ampoule grillée, poignée desserrée) ne relèvent pas toujours du contrat de nettoyage. Autant le préciser dès le devis pour éviter les malentendus en cours d'année.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return posts.find((post) => post.slug === slug);
}
