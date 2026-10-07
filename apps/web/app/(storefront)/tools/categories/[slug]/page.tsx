export default async function ToolsCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <main>Tools category: {slug}</main>;
}
