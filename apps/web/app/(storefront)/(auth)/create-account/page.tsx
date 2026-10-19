import { redirect } from 'next/navigation';

/** Old prototype address for "create an account after your order"; accounts are created on Register now. */
export default function CreateAccountPage() {
  redirect('/register');
}
