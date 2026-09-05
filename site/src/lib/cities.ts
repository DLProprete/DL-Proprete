export type City = {
  slug: string;
  name: string;
  intro: string;
  focus: string;
};

export const cities: City[] = [
  {
    slug: "caen",
    name: "Caen",
    intro:
      "Préfecture du Calvados et cœur de l'agglomération Caen la Mer, à quelques minutes de notre siège de Colombelles.",
    focus:
      "Beaucoup de bureaux, de commerces et de copropriétés en centre-ville : nos prestations les plus demandées à Caen sont l'entretien courant de locaux tertiaires et les parties communes d'immeubles, gérées avec les syndics.",
  },
  {
    slug: "herouville-saint-clair",
    name: "Hérouville-Saint-Clair",
    intro:
      "Commune limitrophe de Colombelles — c'est le secteur où nous intervenons le plus rapidement, à quelques minutes de notre siège.",
    focus:
      "Un tissu mixte de résidentiel collectif et de locaux d'entreprise : nettoyage de parties communes de copropriétés et entretien régulier de bureaux, avec la même équipe à chaque passage.",
  },
  {
    slug: "mondeville",
    name: "Mondeville",
    intro:
      "Pôle commercial et industriel de l'agglomération caennaise (zone de Mondeville 2 et ses environs), dans notre périmètre d'intervention direct.",
    focus:
      "Entrepôts, zones logistiques et surfaces commerciales : c'est là que nos prestations de nettoyage industriel et de manutention ponctuelle sont le plus souvent sollicitées.",
  },
];

export function getCity(slug: string): City | undefined {
  return cities.find((city) => city.slug === slug);
}
