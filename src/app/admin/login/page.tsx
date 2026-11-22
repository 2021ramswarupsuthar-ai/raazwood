import { loginAction } from '../actions';

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 shadow-card ring-1 ring-line/70">
      <h1 className="font-display text-3xl font-semibold">Admin login</h1>
      <form action={loginAction} className="mt-6 space-y-4">
        <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="username" className="field" /></div>
        <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" required autoComplete="current-password" className="field" /></div>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button className="btn btn-primary w-full">Sign in</button>
      </form>
    </div>
  );
}
