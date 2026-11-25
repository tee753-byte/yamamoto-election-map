import "server-only";

import censusJson from "@/features/fukutsu-insight/data/census-2020.json";
import statisticsJson from "@/features/fukutsu-insight/data/statistics.json";
import type {
  CensusData,
  DataSource,
  StatisticsData,
} from "@/features/fukutsu-insight/types/statistics";

const statistics = statisticsJson as StatisticsData;
const census = censusJson as CensusData;

export function getStatistics(): StatisticsData {
  return statistics;
}

export function getInsightSources(): DataSource[] {
  return [...statistics.sources, ...census.sources].filter(
    (source, index, sources) =>
      sources.findIndex((candidate) => candidate.id === source.id) === index,
  );
}
