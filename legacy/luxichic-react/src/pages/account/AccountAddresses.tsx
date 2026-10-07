import React, { useState } from 'react';
import { MapPinIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import type { Address } from '../../types/order';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField, TextField } from '../../components/ui/FormField';
import { formatAddress } from '../../components/orders/OrderDetailsView';
import { nigerianStates } from '../../data/states';
import { generateId } from '../../utils/references';

const blank = (): Address => ({ id: generateId('addr'), label: '', country: 'Nigeria', state: '', city: '', street: '', houseNumber: '', landmark: '', isDefault: false });

export function AccountAddresses() {
  const { user, saveAddress, deleteAddress, setDefaultAddress } = useAuth();
  const [editing, setEditing] = useState<Address | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (!user) return null;

  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => editing && setEditing({ ...editing, [k]: e.target.value });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const errs: Record<string, string> = {};
    if (!editing.state) errs.state = 'Please select a state.';
    if (editing.city.trim().length < 2) errs.city = 'Please enter a city.';
    if (editing.street.trim().length < 3) errs.street = 'Please enter a street address.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    saveAddress({ ...editing, label: editing.label?.trim() || 'Address' });
    toast.success('Address saved');
    setEditing(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl text-ink">Saved addresses</h1>
        <Button size="sm" onClick={() => {setErrors({});setEditing(blank());}}><PlusIcon className="h-3.5 w-3.5" aria-hidden /> Add address</Button>
      </div>
      <div className="mt-8">
        {user.addresses.length === 0 ?
        <EmptyState icon={<MapPinIcon className="h-7 w-7" />} title="No saved addresses" text="Save an address to check out faster." actions={<Button onClick={() => setEditing(blank())}>Add address</Button>} /> :

        <ul className="grid gap-4 md:grid-cols-2">
            {user.addresses.map((a) =>
          <li key={a.id} className="flex flex-col rounded-[24px] bg-white p-6">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">{a.label ?? 'Address'}</p>
                  {a.isDefault && <span className="rounded-full bg-blush px-2.5 py-0.5 text-[11px] font-semibold text-pink-deep">Default</span>}
                </div>
                <div className="mt-2 text-sm text-charcoal">{formatAddress(a).map((l) => <p key={l}>{l}</p>)}</div>
                <div className="mt-auto flex flex-wrap gap-4 pt-5 text-xs font-semibold">
                  <button onClick={() => {setErrors({});setEditing({ ...a });}} className="inline-flex items-center gap-1.5 text-ink hover:text-pink-deep"><PencilIcon className="h-3.5 w-3.5" aria-hidden /> Edit</button>
                  {!a.isDefault && <button onClick={() => setDefaultAddress(a.id)} className="text-ink hover:text-pink-deep">Set as default</button>}
                  <button onClick={() => {deleteAddress(a.id);toast('Address deleted');}} className="inline-flex items-center gap-1.5 text-subtle hover:text-red-700"><Trash2Icon className="h-3.5 w-3.5" aria-hidden /> Delete</button>
                </div>
              </li>
          )}
          </ul>
        }
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && user.addresses.some((a) => a.id === editing.id) ? 'Edit address' : 'Add address'} className="max-w-xl">
        {editing &&
        <form onSubmit={save} noValidate className="grid gap-4 p-6 sm:grid-cols-2">
            <TextField id="ad-label" label="Label" placeholder="Home, Office…" wrapperClassName="sm:col-span-2" value={editing.label ?? ''} onChange={set('label')} />
            <SelectField id="ad-state" label="State" value={editing.state} error={errors.state} placeholder="Select state" onChange={set('state')} options={nigerianStates.map((s) => ({ value: s, label: s }))} />
            <TextField id="ad-city" label="City / Area" value={editing.city} error={errors.city} onChange={set('city')} />
            <TextField id="ad-street" label="Street address" wrapperClassName="sm:col-span-2" value={editing.street} error={errors.street} onChange={set('street')} />
            <TextField id="ad-house" label="House / Flat number" optional value={editing.houseNumber ?? ''} onChange={set('houseNumber')} />
            <TextField id="ad-landmark" label="Landmark" optional value={editing.landmark ?? ''} onChange={set('landmark')} />
            <label className="flex items-center gap-3 text-sm text-charcoal sm:col-span-2">
              <input type="checkbox" checked={!!editing.isDefault} onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })} className="h-4 w-4 accent-ink" /> Set as default address
            </label>
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit">Save address</Button>
            </div>
          </form>
        }
      </Modal>
    </div>);

}