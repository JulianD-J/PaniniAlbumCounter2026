export const TEAMS = [
  "MEX", "RSA", "KOR", "CZE", "CAN", "BIH", "QAT", "SUI", "BRA", "MAR",
  "HAI", "SCO", "USA", "PAR", "AUS", "TUR", "GER", "CUW", "CIV", "ECU",
  "NED", "JPN", "SWE", "TUN", "BEL", "EGY", "IRN", "NZL", "ESP", "CPV",
  "KSA", "URU", "FRA", "SEN", "IRQ", "NOR", "ARG", "ALG", "AUT", "JOR",
  "POR", "COD", "UZB", "COL", "ENG", "CRO", "GHA", "PAN"
];

export const TEAM_DETAILS: Record<string, { name: string, code: string }> = {
  "MEX": { name: "México", code: "MEX" },
  "RSA": { name: "Sudáfrica", code: "RSA" },
  "ZAF": { name: "South Africa", code: "RSA" },
  "KOR": { name: "Corea del Sur", code: "KOR" },
  "CZE": { name: "República Checa", code: "CZE" },
  "CAN": { name: "Canadá", code: "CAN" },
  "BIH": { name: "Bosnia y Herzegovina", code: "BIH" },
  "QAT": { name: "Qatar", code: "QAT" },
  "SUI": { name: "Suiza", code: "SUI" },
  "CHE": { name: "Switzerland", code: "SUI" },
  "BRA": { name: "Brasil", code: "BRA" },
  "MAR": { name: "Marruecos", code: "MAR" },
  "HAI": { name: "Haití", code: "HAI" },
  "HTI": { name: "Haiti", code: "HAI" },
  "SCO": { name: "Escocia", code: "SCO" },
  "USA": { name: "Estados Unidos", code: "USA" },
  "PAR": { name: "Paraguay", code: "PAR" },
  "PRY": { name: "Paraguay", code: "PAR" },
  "AUS": { name: "Australia", code: "AUS" },
  "TUR": { name: "Turquía", code: "TUR" },
  "GER": { name: "Alemania", code: "GER" },
  "DEU": { name: "Germany", code: "GER" },
  "CUW": { name: "Curazao", code: "CUW" },
  "CIV": { name: "Costa de Marfil", code: "CIV" },
  "ECU": { name: "Ecuador", code: "ECU" },
  "NED": { name: "Países Bajos", code: "NED" },
  "NLD": { name: "Netherlands", code: "NED" },
  "JPN": { name: "Japón", code: "JPN" },
  "SWE": { name: "Suecia", code: "SWE" },
  "TUN": { name: "Túnez", code: "TUN" },
  "BEL": { name: "Bélgica", code: "BEL" },
  "EGY": { name: "Egipto", code: "EGY" },
  "IRN": { name: "Irán", code: "IRN" },
  "NZL": { name: "Nueva Zelanda", code: "NZL" },
  "ESP": { name: "España", code: "ESP" },
  "CPV": { name: "Cabo Verde", code: "CPV" },
  "KSA": { name: "Arabia Saudí", code: "KSA" },
  "SAU": { name: "Saudi Arabia", code: "KSA" },
  "URU": { name: "Uruguay", code: "URU" },
  "URY": { name: "Uruguay", code: "URU" },
  "FRA": { name: "Francia", code: "FRA" },
  "SEN": { name: "Senegal", code: "SEN" },
  "IRQ": { name: "Irak", code: "IRQ" },
  "NOR": { name: "Noruega", code: "NOR" },
  "ARG": { name: "Argentina", code: "ARG" },
  "ALG": { name: "Argelia", code: "ALG" },
  "DZA": { name: "Algeria", code: "ALG" },
  "AUT": { name: "Austria", code: "AUT" },
  "JOR": { name: "Jordania", code: "JOR" },
  "POR": { name: "Portugal", code: "POR" },
  "PRT": { name: "Portugal", code: "POR" },
  "COD": { name: "RD Congo", code: "COD" },
  "UZB": { name: "Uzbekistán", code: "UZB" },
  "COL": { name: "Colombia", code: "COL" },
  "ENG": { name: "Inglaterra", code: "ENG" },
  "CRO": { name: "Croacia", code: "CRO" },
  "HRV": { name: "Croatia", code: "CRO" },
  "GHA": { name: "Ghana", code: "GHA" },
  "PAN": { name: "Panamá", code: "PAN" }
};

export const SPECIALS = ["FWC", ...Array.from({ length: 19 }, (_, i) => `FWC${i + 1}`)];
export const COCA_COLA = Array.from({ length: 14 }, (_, i) => `CC${i + 1}`);

export type StickerStatus = 'missing' | 'obtained' | 'repeated';

export interface StickerData {
  status: StickerStatus;
  count: number;
}

export interface Album {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
