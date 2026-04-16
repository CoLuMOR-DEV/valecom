import { Suspense } from 'react';
import TopupClient from '@/components/TopupClient';

export default function TopupPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading top-up options...</div>}>
      <TopupClient />
    </Suspense>
  );
}
