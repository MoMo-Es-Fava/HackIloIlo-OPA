import { redirect } from 'next/navigation';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const account = (await searchParams).account === 'farmer' ? 'farmer' : 'buyer';
  redirect(`/login?account=${account}&mode=signup`);
}
