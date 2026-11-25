import type { Metadata } from "next";
import LabClient from "@/src/components/lab/LabClient";
import { getGitHubPortfolioData, readSnapshotFallback } from "@/src/lib/github-service";
import type { GitHubPayload } from "@/src/types/portfolio";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Lab · Repository Inspector — Heet Mehta",
  description: "Experiment page: repository filter, inspector and details panel.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/lab" },
};

export default async function LabPage() {
  let data: GitHubPayload | null = null;
  try {
    data = await getGitHubPortfolioData();
  } catch {
    try {
      data = await readSnapshotFallback();
    } catch {
      data = null;
    }
  }
  return <LabClient data={data} />;
}
