import { Suspense } from 'react';
import LoadoutClient from '@/components/LoadoutClient';

export default function LoadoutPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading loadout...</div>}>
      <LoadoutClient />
    </Suspense>
  );
}
