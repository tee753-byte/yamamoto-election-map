import { InsightOverview } from "@/features/fukutsu-insight/components/overview";
import { getStatistics } from "@/features/fukutsu-insight/services/statistics-service";

export default function InsightPage() {
  return <InsightOverview data={getStatistics()} />;
}
