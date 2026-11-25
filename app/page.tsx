import PortfolioApp from "@/src/components/PortfolioApp";
import { getGitHubPortfolioData, readSnapshotFallback } from "@/src/lib/github-service";
import type { GitHubPayload } from "@/src/types/portfolio";

// GitHub data is rendered on the server and re-generated at most once an hour (ISR).
// The first paint is therefore always real data — never "0 contributions", never a warning banner.
export const revalidate = 3600;

export default async function HomePage() {
  let initialData: GitHubPayload | null = null;
  try {
    initialData = await getGitHubPortfolioData();
  } catch {
    try {
      initialData = await readSnapshotFallback();
    } catch {
      initialData = null;
    }
  }

  return <PortfolioApp initialData={initialData} />;
}
