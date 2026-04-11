import { redirect } from 'next/navigation';

export default function TenantHomeRedirect() {
  redirect('/tenant/dashboard');
}
