'use client';

import React from 'react';
import { HeartIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { WishlistGrid } from '@/components/account/WishlistGrid';
import { useWishlist } from '@/contexts/WishlistContext';

export function Wishlist() {
  const { ready, signedIn } = useWishlist();

  return (
    <div className="mx-auto max-w-site px-5 pb-24 pt-10 lg:px-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />
      <h1 className="mt-6 font-display text-5xl text-ink md:text-6xl">Wishlist</h1>
      {ready && !signedIn ? (
        <EmptyState
          className="mt-10"
          icon={<HeartIcon className="h-7 w-7" />}
          title="Sign in to see your wishlist"
          text="Your wishlist is saved to your account, so it's there on every device."
          actions={
            <>
              <Button to="/login?redirect=/wishlist">Sign In</Button>
              <Button to="/register?redirect=/wishlist" variant="outline">
                Create Account
              </Button>
            </>
          }
        />
      ) : (
        <div className="mt-10">
          <WishlistGrid />
        </div>
      )}
    </div>
  );
}
