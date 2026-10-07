'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, PackageSearchIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrders } from '@/contexts/OrdersContext';
import { OrderDetailsView } from '@/components/orders/OrderDetailsView';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export function AccountOrderDetail() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { user } = useAuth();
  const { getOrder } = useOrders();
  const order = getOrder(orderNumber);
  const owns = order && user && order.accountEmail?.toLowerCase() === user.email.toLowerCase();

  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-2 text-sm text-subtle hover:text-ink">
        <ArrowLeftIcon className="h-4 w-4" aria-hidden /> All orders
      </Link>
      <div className="mt-6">
        {order && owns ?
        <OrderDetailsView order={order} /> :

        <EmptyState icon={<PackageSearchIcon className="h-7 w-7" />} title="Order not found" text="This order isn’t linked to your account." actions={<Button to="/account/orders">Back to orders</Button>} />
        }
      </div>
    </div>);

}