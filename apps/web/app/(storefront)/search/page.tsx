import type { Metadata } from 'next';
import { SearchResults } from '@/views/shop/SearchResults';

export const metadata: Metadata = { title: 'Search' };

export default function SearchResultsPage() {
  return <SearchResults />;
}
