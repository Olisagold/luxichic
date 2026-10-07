import React from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LockIcon, ShoppingBagIcon } from 'lucide-react';
import { CheckoutStepper } from '../../components/checkout/CheckoutStepper';
import { OrderItemsList } from '../../components/checkout/OrderItemsList';
import { OrderTotals } from '../../components/checkout/OrderTotals';
import { PaymentMethodSelector } from '../../components/checkout/PaymentMethodSelector';
import { BankTransferInstructions } from '../../components/checkout/BankTransferInstructions';
import { formatAddress } from '../../components/orders/OrderDetailsView';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SelectField, TextAreaField, TextField } from '../../components/ui/FormField';
import { useCheckout } from '../../hooks/useCheckout';
import { nigerianStates } from '../../data/states';
import { formatNaira } from '../../utils/currency';
import { cn } from '../../utils/cn';

const stepTitles = ['Your details', 'Delivery information', 'Review your order', 'Payment method'];

export function Checkout() {
  const c = useCheckout();

  if (!c.items.length) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24">
        <EmptyState
          icon={<ShoppingBagIcon className="h-7 w-7" />}
          title="There’s nothing to check out"
          text="Your cart is empty. Add products from either store to continue."
          actions={<><Button to="/hairs">Shop LUXICHIC Hairs</Button><Button to="/tools" variant="outline">Shop Hair Tools</Button></>} />
        
      </div>);

  }

  const total = c.subtotal + c.deliveryFee - c.discount;
  const setAddr = (k: keyof typeof c.address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
  c.setAddress({ ...c.address, [k]: e.target.value });

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-10 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <h1 className="font-display text-5xl text-ink">Checkout</h1>
        <p className="flex items-center gap-2 text-xs text-subtle"><LockIcon className="h-3.5 w-3.5" aria-hidden /> Your details are only used to process your order.</p>
      </div>
      <div className="mt-8"><CheckoutStepper current={c.step} /></div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
        <section aria-labelledby="step-title" className="rounded-[28px] bg-white p-6 md:p-8">
          <h2 id="step-title" className="font-display text-3xl text-ink">{stepTitles[c.step]}</h2>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={c.step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="mt-6">
              
              {c.step === 0 &&
              <div className="space-y-5">
                  {!c.user &&
                <div className="flex flex-col gap-3 rounded-2xl bg-ivory p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-charcoal">Checking out as a guest — no account needed.</p>
                      <Link to="/login?redirect=/checkout" className="font-semibold text-pink-deep underline-offset-4 hover:underline">Have an account? Sign in</Link>
                    </div>
                }
                  <TextField id="co-name" label="Full name" autoComplete="name" value={c.customer.fullName} error={c.errors.fullName} onChange={(e) => c.setCustomer({ ...c.customer, fullName: e.target.value })} />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField id="co-email" type="email" label="Email address" autoComplete="email" value={c.customer.email} error={c.errors.email} hint="We’ll send your order updates here." onChange={(e) => c.setCustomer({ ...c.customer, email: e.target.value })} />
                    <TextField id="co-phone" type="tel" label="Phone number" autoComplete="tel" value={c.customer.phone} error={c.errors.phone} placeholder="080..." onChange={(e) => c.setCustomer({ ...c.customer, phone: e.target.value })} />
                  </div>
                </div>
              }

              {c.step === 1 &&
              <div className="space-y-5">
                  {c.savedAddresses.length > 0 &&
                <div role="radiogroup" aria-label="Saved addresses" className="grid gap-3 sm:grid-cols-2">
                      {[...c.savedAddresses.map((a) => ({ id: a.id, title: a.label ?? 'Saved address', lines: formatAddress(a) })), { id: 'new', title: 'Use a new address', lines: ['Enter a different delivery address'] }].map((o) =>
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={c.addressId === o.id}
                    onClick={() => c.chooseAddress(o.id)}
                    className={cn('rounded-2xl border p-4 text-left text-sm transition-[border-color] duration-150', c.addressId === o.id ? 'border-ink ring-1 ring-ink' : 'border-line hover:border-charcoal')}>
                    
                          <span className="block font-semibold text-ink">{o.title}</span>
                          {o.lines.map((l) => <span key={l} className="block text-subtle">{l}</span>)}
                        </button>
                  )}
                    </div>
                }
                  {c.addressId === 'new' &&
                <div className="grid gap-5 sm:grid-cols-2">
                      <SelectField id="co-country" label="Country" value={c.address.country} onChange={setAddr('country')} options={[{ value: 'Nigeria', label: 'Nigeria' }]} />
                      <SelectField id="co-state" label="State" value={c.address.state} onChange={setAddr('state')} error={c.errors.state} placeholder="Select state" options={nigerianStates.map((s) => ({ value: s, label: s }))} />
                      <TextField id="co-city" label="City / Area" autoComplete="address-level2" value={c.address.city} onChange={setAddr('city')} error={c.errors.city} />
                      <TextField id="co-house" label="House / Flat number" optional value={c.address.houseNumber ?? ''} onChange={setAddr('houseNumber')} />
                      <TextField id="co-street" label="Street address" autoComplete="street-address" wrapperClassName="sm:col-span-2" value={c.address.street} onChange={setAddr('street')} error={c.errors.street} />
                      <TextField id="co-landmark" label="Nearest landmark" optional wrapperClassName="sm:col-span-2" value={c.address.landmark ?? ''} onChange={setAddr('landmark')} />
                    </div>
                }
                  <TextAreaField id="co-notes" label="Delivery instructions" optional value={c.address.instructions ?? ''} onChange={setAddr('instructions')} placeholder="Gate code, best time to call, etc." />
                  {c.user && c.addressId === 'new' &&
                <label className="flex items-center gap-3 text-sm text-charcoal">
                      <input type="checkbox" checked={c.saveToAccount} onChange={(e) => c.setSaveToAccount(e.target.checked)} className="h-4 w-4 accent-ink" />
                      Save this address to my account
                    </label>
                }
                  {c.address.state && <p className="text-sm text-subtle">Delivery to {c.address.state}: <span className="font-semibold text-ink">{formatNaira(c.deliveryFee)}</span> (sample fee)</p>}
                </div>
              }

              {c.step === 2 &&
              <div className="space-y-6">
                  <OrderItemsList items={c.items} />
                  {!c.buyNow && <Link to="/cart" className="inline-block text-sm font-semibold text-pink-deep underline-offset-4 hover:underline">Edit cart</Link>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-ivory p-4 text-sm">
                      <div className="flex justify-between"><p className="font-semibold text-ink">Contact</p><button className="text-xs font-semibold text-pink-deep" onClick={() => c.goTo(0)}>Edit</button></div>
                      <p className="mt-2 text-charcoal">{c.customer.fullName}</p>
                      <p className="text-subtle">{c.customer.email}</p>
                      <p className="text-subtle">{c.customer.phone}</p>
                    </div>
                    <div className="rounded-2xl bg-ivory p-4 text-sm">
                      <div className="flex justify-between"><p className="font-semibold text-ink">Delivery</p><button className="text-xs font-semibold text-pink-deep" onClick={() => c.goTo(1)}>Edit</button></div>
                      {formatAddress(c.address).map((l) => <p key={l} className="mt-1 text-charcoal">{l}</p>)}
                    </div>
                  </div>
                </div>
              }

              {c.step === 3 &&
              <div className="space-y-6">
                  <PaymentMethodSelector value={c.method} onChange={c.setMethod} payOnDeliveryEnabled={c.payOnDeliveryEnabled} />
                  {c.method === 'bank_transfer' ?
                <BankTransferInstructions amount={total} reference={c.reference} /> :

                <div className="rounded-2xl bg-ivory p-5 text-sm leading-relaxed text-charcoal">
                      <p className="font-semibold text-ink">Pay for your order when it is delivered.</p>
                      <p className="mt-1 text-subtle">Your order stays pending until our team processes and confirms it.</p>
                    </div>
                }
                  {c.placeError && <p className="text-sm text-red-700" role="alert">{c.placeError}</p>}
                </div>
              }
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
            {c.step > 0 ? <Button variant="ghost" onClick={c.back}>Back</Button> : <Button variant="ghost" to="/cart">Back to cart</Button>}
            {c.step < 3 ?
            <Button onClick={c.next}>Continue</Button> :

            <Button variant="pink" size="lg" loading={c.placing} onClick={c.place}>Place Order · {formatNaira(total)}</Button>
            }
          </div>
        </section>

        <aside className="h-fit rounded-[28px] bg-white p-6 lg:sticky lg:top-28" aria-label="Order summary">
          <h2 className="font-display text-2xl text-ink">Summary</h2>
          <div className="mt-2 max-h-72 overflow-y-auto pr-1"><OrderItemsList items={c.items} compact /></div>
          <div className="mt-4 border-t border-line pt-4">
            <OrderTotals subtotal={c.subtotal} deliveryFee={c.address.state ? c.deliveryFee : null} discount={c.discount} promoCode={c.promoCode} />
          </div>
        </aside>
      </div>
    </div>);

}