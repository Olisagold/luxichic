import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Address, Customer, OrderItem, PaymentMethod } from '@/types/order';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useStorefront } from '@/components/storefront/StorefrontProvider';
import { priceCartLines } from '@/lib/cart/actions';
import { toCartLine } from '@/lib/cart/items';
import { issueTransactionReference, placeOrder } from '@/lib/orders/actions';
import { generateId } from '@/lib/utils/references';
import { isValidEmail, isValidPhone } from '@/lib/utils/validation';

const emptyAddress = (): Address => ({
  id: generateId('addr'),
  country: 'Nigeria',
  state: '',
  city: '',
  street: '',
  houseNumber: '',
  landmark: '',
  instructions: '',
});

export function useCheckout() {
  const params = useSearchParams();
  const buyNow = params.get('mode') === 'buynow';
  const cart = useCart();
  const { user, saveAddress } = useAuth();
  // Issued by the server up front, so the customer sees it on the payment step as their transfer narration.
  const [reference, setReference] = useState<string | undefined>();
  useEffect(() => {
    issueTransactionReference()
      .then(setReference)
      .catch(() => {});
  }, []);
  const storefront = useStorefront();
  const { payOnDeliveryEnabled } = storefront.business;
  const { deliveryFees } = storefront.checkout;
  const router = useRouter();

  const source = buyNow ? (cart.buyNowItem ? [cart.buyNowItem] : []) : cart.activeItems;
  const items: OrderItem[] = source.map(({ savedForLater: _s, ...rest }) => rest);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discount = buyNow ? 0 : cart.discount;

  const savedAddresses = user?.addresses ?? [];
  const defaultAddr = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];

  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer>({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  });
  const [addressId, setAddressId] = useState<string>(defaultAddr?.id ?? 'new');
  const [address, setAddress] = useState<Address>(defaultAddr ? { ...defaultAddr } : emptyAddress());
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('bank_transfer');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');

  // Prefill when a customer signs in mid-checkout.
  useEffect(() => {
    if (!user) return;
    setCustomer((c) => ({
      fullName: c.fullName || user.fullName,
      email: c.email || user.email,
      phone: c.phone || user.phone,
    }));
    const d = user.addresses.find((a) => a.isDefault) ?? user.addresses[0];
    if (d) {
      setAddressId(d.id);
      setAddress({ ...d });
    }
    // Only prefill when a different customer signs in, not on every profile edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!payOnDeliveryEnabled && method === 'pay_on_delivery') setMethod('bank_transfer');
  }, [payOnDeliveryEnabled, method]);

  const deliveryFee = deliveryFees[address.state] ?? 0;

  const chooseAddress = (id: string) => {
    setAddressId(id);
    const found = savedAddresses.find((a) => a.id === id);
    setAddress(
      found
        ? { ...found, instructions: address.instructions }
        : { ...emptyAddress(), instructions: address.instructions },
    );
    setErrors({});
  };

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (customer.fullName.trim().length < 2) e.fullName = 'Please enter your full name.';
      if (!isValidEmail(customer.email)) e.email = 'Please enter a valid email address.';
      if (!isValidPhone(customer.phone)) e.phone = 'Please enter a valid phone number.';
    }
    if (s === 1) {
      if (!address.state) e.state = 'Please select your state.';
      else if (!(address.state in deliveryFees))
        e.state = `We don’t currently deliver to ${address.state}. Please contact us on WhatsApp.`;
      if (address.city.trim().length < 2) e.city = 'Please enter your city.';
      if (address.street.trim().length < 3) e.street = 'Please enter your street address.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  const goTo = (s: number) => setStep(s);

  const place = async () => {
    setPlacing(true);
    setPlaceError('');
    try {
      const res = await placeOrder({
        lines: source.map(toCartLine),
        customer: { fullName: customer.fullName.trim(), email: customer.email.trim(), phone: customer.phone.trim() },
        address,
        paymentMethod: method,
        promoCode: buyNow ? null : cart.promoCode,
        reference,
        expectedTotal: subtotal + deliveryFee - discount,
        fromCart: !buyNow,
      });
      if (!res.ok || !res.orderNumber) {
        setPlaceError(res.error ?? 'We could not place your order. Please try again.');
        setPlacing(false);
        if (res.promoInvalid) cart.removePromo();
        // Show current prices so the customer can check the new total.
        if (res.changed) {
          if (!buyNow) cart.refresh();
          else if (cart.buyNowItem) {
            const [item] = await priceCartLines([toCartLine(cart.buyNowItem)]);
            cart.setBuyNowItem(item ?? null);
          }
        }
        return;
      }
      if (user && addressId === 'new' && saveToAccount) {
        const { instructions: _i, ...rest } = address;
        saveAddress({ ...rest, label: 'Saved address', isDefault: savedAddresses.length === 0 });
      }
      router.push(`/order/${res.orderNumber}`);
      if (buyNow) cart.setBuyNowItem(null);
      else cart.clearActive();
    } catch {
      setPlaceError('We could not place your order. Please check your connection and try again.');
      setPlacing(false);
    }
  };

  return {
    buyNow,
    items,
    subtotal,
    discount,
    deliveryFee,
    promoCode: buyNow ? null : cart.promoCode,
    user,
    savedAddresses,
    step,
    next,
    back,
    goTo,
    customer,
    setCustomer,
    address,
    setAddress,
    addressId,
    chooseAddress,
    saveToAccount,
    setSaveToAccount,
    method,
    setMethod,
    payOnDeliveryEnabled,
    errors,
    placing,
    placeError,
    place,
    reference,
  };
}
