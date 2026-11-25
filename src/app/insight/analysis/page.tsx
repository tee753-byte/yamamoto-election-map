import { AnalysisView } from "@/features/fukutsu-insight/components/analysis-view";
import { getStatistics } from "@/features/fukutsu-insight/services/statistics-service";

export default function InsightAnalysisPage() {
  return <AnalysisView data={getStatistics()} />;
}
