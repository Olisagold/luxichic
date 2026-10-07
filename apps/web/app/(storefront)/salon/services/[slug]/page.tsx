export default async function SalonServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <main>Service: {slug}</main>;
}
