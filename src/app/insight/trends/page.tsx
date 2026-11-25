import { TrendsView } from "@/features/fukutsu-insight/components/trends-view";
import { getStatistics } from "@/features/fukutsu-insight/services/statistics-service";

export default function InsightTrendsPage() {
  return <TrendsView data={getStatistics()} />;
}
