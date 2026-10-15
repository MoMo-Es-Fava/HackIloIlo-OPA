// Image credits / licensing.
// Photos are stored locally under /public/images so the app is self-contained
// and has no runtime dependency on third-party hotlinking.

export interface Credit {
  file: string;
  title: string;
  author: string;
  source: string;
  license: string;
  licenseUrl: string;
}

export const imageCredits: Credit[] = [
  {
    file: "/images/nagacadan-farmers.jpg",
    title: "Nagacadan Rice Terraces, Kiangan, Ifugao",
    author: "Shubert Ciencia",
    source: "https://commons.wikimedia.org/wiki/File:Nagacadan_Rice_Terraces.jpg",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
  },
  {
    file: "/images/ifugao-terraces.jpg",
    title: "Ifugao Rice Terraces",
    author: "Giovanni G. Navata",
    source: "https://commons.wikimedia.org/wiki/File:Ifugao_Rice_Terraces.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
  },
  {
    file: "/images/sunset-ifugao.jpg",
    title: "Sunset at Ifugao rice terraces",
    author: "Engracioabad",
    source: "https://commons.wikimedia.org/wiki/File:Sunset_at_Ifugao_rice_terraces.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  },
];
