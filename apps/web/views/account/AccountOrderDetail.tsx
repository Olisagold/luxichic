'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PackageSearchIcon } from 'lucide-react';
import { OrderDetailsView } from '@/components/orders/OrderDetailsView';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import type { Order } from '@/types/order';

/** `order` is null unless it belongs to the signed-in account (checked on the server). */
export function AccountOrderDetail({ order }: { order: Order | null }) {
  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm text-subtle hover:text-ink">
        <ArrowLeftIcon className="h-4 w-4" aria-hidden /> All orders
      </Link>
      <div className="mt-6">
        {order ? (
          <OrderDetailsView order={order} />
        ) : (
          <EmptyState
            icon={<PackageSearchIcon className="h-7 w-7" />}
            title="Order not found"
            text="This order isn’t linked to your account."
            actions={<Button to="/account/orders">Back to orders</Button>}
          />
        )}
      </div>
    </div>
  );
}
