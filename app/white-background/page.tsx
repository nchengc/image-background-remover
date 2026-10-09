import type { Metadata } from "next";
import ScenarioPage from "@/components/ScenarioPage";
import { getScenario } from "@/lib/scenarios";

const scenario = getScenario("white-background")!;

export function generateMetadata(): Metadata {
  return {
    title: scenario.title,
    description: scenario.description,
    keywords: scenario.keywords,
    alternates: { canonical: `/${scenario.slug}` },
    openGraph: {
      title: scenario.title,
      description: scenario.description,
      url: `/${scenario.slug}`,
      type: "article",
    },
  };
}

export default function Page() {
  return <ScenarioPage scenario={scenario} />;
}
