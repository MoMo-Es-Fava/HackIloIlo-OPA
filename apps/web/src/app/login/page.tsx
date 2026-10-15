import LoginForm from './login-form';

type Portal = 'farmer' | 'buyer' | 'staff';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const requested = (await searchParams).account;
  const portal: Portal = requested === 'farmer' || requested === 'staff' ? requested : 'buyer';
  return <LoginForm portal={portal} />;
}
