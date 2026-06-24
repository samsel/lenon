import { ParentApp } from "@/components/parent-app";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = ["home"] } = await params;
  return <ParentApp slug={slug} />;
}
