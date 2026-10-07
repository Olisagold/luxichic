import React from 'react';
import { CompassIcon } from 'lucide-react';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';

export function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24">
      <EmptyState
        icon={<CompassIcon className="h-7 w-7" />}
        title="We couldn’t find that page"
        text="The link may be broken or the page may have moved. Let’s get you back to something beautiful."
        actions={
        <>
            <Button to="/">Back to Home</Button>
            <Button to="/hairs" variant="outline">Shop Hair</Button>
          </>
        } />
      
    </div>);

}