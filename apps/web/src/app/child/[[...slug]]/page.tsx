import { ChildApp } from "@/components/child-app";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = ["home"] } = await params;
  return <ChildApp slug={slug} />;
}
