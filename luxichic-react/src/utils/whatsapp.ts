import type { Order } from '../types/order';
import type { Appointment } from '../types/salon';
import { formatNaira } from './currency';
import { formatLongDate, formatSlot } from './dates';

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

export function serviceEnquiryMessage(serviceName: string): string {
  return `Hello LUXICHIC, I am interested in booking a ${serviceName.toLowerCase()} appointment. Please provide more information.`;
}

export function receiptMessage(order: Order): string {
  return [
  'Hello LUXICHIC, I have made a bank transfer for my order. My payment receipt is attached.',
  '',
  `Name: ${order.customer.fullName}`,
  `Order number: ${order.orderNumber}`,
  `Transaction reference: ${order.reference}`,
  `Amount transferred: ${formatNaira(order.total)}`,
  'Payment method: Bank Transfer'].
  join('\n');
}

export function appointmentMessage(a: Appointment): string {
  return `Hello LUXICHIC, I am contacting you about my ${a.serviceName} appointment (Ref: ${a.reference}) on ${formatLongDate(a.date)} at ${formatSlot(a.time)}.`;
}

export function orderEnquiryMessage(order: Order): string {
  return `Hello LUXICHIC, I have a question about my order ${order.orderNumber} (Ref: ${order.reference}).`;
}