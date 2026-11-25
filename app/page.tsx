import PortfolioApp from "@/src/components/PortfolioApp";
import { readSnapshotFallback } from "@/src/lib/github-service";

export default async function HomePage() {
  let initialData = null;
  try {
    initialData = await readSnapshotFallback();
  } catch {
    initialData = null;
  }

  return <PortfolioApp initialData={initialData} />;
}
