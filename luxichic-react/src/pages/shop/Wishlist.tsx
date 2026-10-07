import React from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { WishlistGrid } from '../../components/account/WishlistGrid';

export function Wishlist() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />
      <h1 className="mt-6 font-display text-5xl text-ink md:text-6xl">Wishlist</h1>
      <p className="mt-3 text-sm text-subtle">
        Saved on this device. <Link to="/login" className="font-semibold text-pink-deep underline-offset-4 hover:underline">Sign in</Link> to keep your wishlist with your account.
      </p>
      <div className="mt-10">
        <WishlistGrid />
      </div>
    </div>);

}