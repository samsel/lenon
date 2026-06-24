import { AdminApp } from "@/components/admin-app";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = ["home"] } = await params;
  return <AdminApp slug={slug} />;
}
