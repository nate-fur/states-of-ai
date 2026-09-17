import { DossierPage } from "@/components/map/dossier-page";

export default async function StatePage({
  params,
  searchParams,
}: {
  params: Promise<{ abbr: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const { abbr } = await params;
  const { c } = await searchParams;
  return <DossierPage abbr={abbr.toUpperCase()} compare={c?.toUpperCase() ?? null} />;
}
