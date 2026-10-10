/** Structured data for search engines (schema.org), rendered as a JSON-LD script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // `<` is escaped so product text can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
