import { redirect } from 'next/navigation';

export default function SuperAdminHomeRedirect() {
  redirect('/super-admin/dashboard');
}
