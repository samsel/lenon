import { CreatorApp } from "@/components/creator-app";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = ["home"] } = await params;
  return <CreatorApp slug={slug} />;
}
