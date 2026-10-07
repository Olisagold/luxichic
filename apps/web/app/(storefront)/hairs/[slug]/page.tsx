export default async function HairsProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <main>Hairs product: {slug}</main>;
}
