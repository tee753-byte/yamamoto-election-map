export type AgeGroup = {
  label: string;
  value: number;
};

export type PopulationSummary = {
  date: string;
  population: number;
  households: number;
  male: number;
  female: number;
  young: number;
  working: number;
  elderly: number;
  agingRate: number;
  ageGroups: AgeGroup[];
};

export type TownStatistics = Omit<PopulationSummary, "date"> & {
  code: string;
  name: string;
};

export type TrendPoint = PopulationSummary;

export type DataSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  referenceDate: string;
  acquiredDate: string;
  unit: string;
  updateFrequency: string;
  license: string;
  notes: string;
};

export type StatisticsData = {
  generatedAt: string;
  dataKind: "実データ" | "デモデータ";
  officialHeadline: {
    asOf: string;
    population: number;
    households: number;
    male: number;
    female: number;
    monthChange: number;
    yearChange: number;
    elderly: number;
    agingRate: number;
    sourceUrl: string;
  };
  latestRegional: {
    date: string;
    totals: PopulationSummary;
    towns: TownStatistics[];
  };
  trend: TrendPoint[];
  townTrend: Array<{
    code: string;
    name: string;
    values: Array<
      Pick<PopulationSummary, "date" | "population" | "households" | "agingRate">
    >;
  }>;
  sources: DataSource[];
};

export type BoundaryProperties = {
  keyCode: string;
  prefectureCode: string;
  cityCode: string;
  areaCode: string;
  prefectureName: string;
  cityName: string;
  name: string;
  duplicateFlag: string;
  classificationCode: string;
};

export type CensusArea = {
  code: string;
  hierarchyLevel: number;
  name: string;
  population: number | null;
  male: number | null;
  female: number | null;
  households: number | null;
  young: number | null;
  working: number | null;
  elderly: number | null;
  agingRate: number | null;
  ageGroups: Array<{ label: string; value: number | null }>;
};

export type CensusData = {
  generatedAt: string;
  dataKind: "実データ";
  referenceDate: string;
  areas: CensusArea[];
  sources: DataSource[];
};
