export interface SeedKollektion {
  slug: string;
  name: string;
  kurz: string;
  beschreibung: string;
  sortierung: number;
  sichtbarVon: string | null;
  sichtbarBis: string | null;
}

export const kollektionen: SeedKollektion[] = [
  {
    slug: "weihnachten",
    name: "Weihnachten",
    kurz: "Sechs Kisten von 29 bis 69 € – für Team und Kunden.",
    beschreibung:
      "Kaffee, Wintertee, Zimtsterne und Marzipan – zusammengestellt für Schreibtisch, Homeoffice und Kundenbesuch. Alle Kisten außer der Großen sind ohne Alkohol; die Große gibt es auf Wunsch mit Winterpunsch statt Wein. Bestellschluss für den Versand ist der 10. Dezember.",
    sortierung: 1,
    sichtbarVon: null,
    sichtbarBis: "2026-12-23",
  },
  {
    slug: "mitarbeiter",
    name: "Für Mitarbeiter",
    kurz: "Erster Arbeitstag, Projektabschluss, Jubiläum, Geburtstag.",
    beschreibung:
      "Anlässe gibt es das ganze Jahr: der erste Tag im neuen Job, ein abgeschlossenes Projekt, zehn Jahre im Betrieb. Diese Kisten sind immer lieferbar – einzeln an Privatadressen oder gesammelt ins Büro.",
    sortierung: 2,
    sichtbarVon: null,
    sichtbarBis: null,
  },
  {
    slug: "kunden",
    name: "Für Kunden",
    kurz: "Ein Dankeschön nach dem Auftrag, ein Gruß zum Start.",
    beschreibung:
      "Beide Kisten liegen unter 50 € – der Grenze, bis zu der Geschenke an Geschäftspartner als Betriebsausgabe abziehbar sind. Mit Ihrem Logo auf dem Deckel und einer Karte mit Ihrem Text. Details klärt Ihr Steuerberater.",
    sortierung: 3,
    sichtbarVon: null,
    sichtbarBis: null,
  },
  {
    slug: "ostern",
    name: "Ostern",
    kurz: "Kleine Aufmerksamkeit zum Frühling.",
    beschreibung: "Ein Osternest für den Schreibtisch – mit Schokoladenhase, Tee und Gebäck.",
    sortierung: 4,
    sichtbarVon: "2027-02-15",
    sichtbarBis: "2027-03-24",
  },
  {
    slug: "sommer",
    name: "Sommer",
    kurz: "Für Sommerfest, Urlaubsgruß und Halbjahresabschluss.",
    beschreibung: "Holunderblütensirup, Oliven und Grissini – eine Kiste für den Balkon, ganz ohne Alkohol.",
    sortierung: 5,
    sichtbarVon: "2027-06-01",
    sichtbarBis: "2027-08-31",
  },
];
