export default async function HairsCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <main>Hairs category: {slug}</main>;
}
