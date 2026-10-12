# Salon booking rules

Agreed 2026-10-12. Enforced on the server in `apps/web/lib/salon/`; the database refuses double-bookings.

## Booking

- Customers request an appointment online; it starts as **Pending** until the salon confirms it. No payment is
  taken online: salon services are paid for after the service.
- Bookable: published services marked bookable, performed by an **active** specialist.
- Start times are on the hour, from the earliest working specialist's start to the last time the service still
  fits before the latest one finishes. A time is free when at least one specialist who performs the service:
  - works that weekday and the whole service fits in their hours,
  - has no closed day/hours (`blocks`) covering it (for the whole salon, this service, or them), and
  - has no other **Pending, Confirmed or Rescheduled** appointment overlapping it.
- Bookings open up to **60 days** ahead and close **1 hour** before the start time. All times are Lagos time.
- **No preference:** the free specialist with the fewest bookings that day is assigned.
- A specialist can never have two active appointments that overlap. The `appointments_no_double_booking`
  constraint enforces this even when two people book the same time at once; the second is offered the next free
  specialist or asked to pick another time.
- Guests can book. A guest appointment joins an account once that account's email is verified (Google sign-in,
  or a confirmation email that was clicked), the same rule as orders.

## Cancelling and rescheduling

- Customers can **cancel or reschedule online any time before the appointment starts**, from the appointment's
  page (linked from their account, or in the browser they booked with). After the start time, or once the
  appointment is completed, rejected or cancelled, they contact the salon on WhatsApp.
- A rescheduled appointment goes **back to Pending** for the salon to confirm the new time. If no specialist is
  chosen, the current one is kept when they're free.
- Cancelled, rejected and completed appointments free their time for others.
- Every change is recorded in the appointment's history ("Cancelled by customer", "Rescheduled by customer" with
  the old and new times).
