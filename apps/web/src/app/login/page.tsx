import AuthForm from './auth-form';

type Portal = 'farmer' | 'buyer' | 'staff';
type Mode = 'login' | 'signup';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ account?: string; mode?: string }> }) {
  const params = await searchParams;
  const requested = params.account;
  const portal: Portal = requested === 'farmer' || requested === 'staff' ? requested : 'buyer';
  const mode: Mode = params.mode === 'signup' && portal !== 'staff' ? 'signup' : 'login';
  return <AuthForm initialPortal={portal} initialMode={mode} />;
}
