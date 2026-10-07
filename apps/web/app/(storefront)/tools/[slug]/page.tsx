export default async function ToolsProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <main>Tools product: {slug}</main>;
}
