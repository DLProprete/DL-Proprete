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
