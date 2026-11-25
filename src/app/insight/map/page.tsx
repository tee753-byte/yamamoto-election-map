import { StatisticsMap } from "@/features/fukutsu-insight/components/statistics-map";
import { getStatistics } from "@/features/fukutsu-insight/services/statistics-service";

export default function InsightMapPage() {
  return <StatisticsMap data={getStatistics()} />;
}
