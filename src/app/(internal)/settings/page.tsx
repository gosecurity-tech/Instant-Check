import { redirect } from 'next/navigation';

// Settings index redirects to the users sub-page
export default function SettingsPage() {
  redirect('/settings/users');
}
