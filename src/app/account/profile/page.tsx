import { requireCustomer } from '@/server/customer-auth';
import { saveProfileAction } from '../actions';

export default async function Profile({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; welcome?: string }> }) {
  const c = await requireCustomer('/account/profile');
  const { error, saved, welcome } = await searchParams;
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-semibold">{welcome ? 'Welcome to Raazwood!' : 'Your profile'}</h1>
      {welcome && <p className="mt-2 text-ink/70">Your account is ready. Add your name so we can pre-fill checkout for you.</p>}
      {saved && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">Profile saved.</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      <form action={saveProfileAction} className="mt-6 space-y-4 rounded-2xl bg-white p-6 ring-1 ring-line/70">
        <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" defaultValue={c.name} required maxLength={80} autoComplete="name" className="field" /></div>
        <div><label className="label" htmlFor="email">Email (optional, for order updates)</label><input id="email" name="email" type="email" defaultValue={c.email ?? ''} maxLength={120} autoComplete="email" className="field" /></div>
        <div><p className="label">Mobile number</p><p className="text-sm">+91 {c.phone} <span className="text-ink/60">(your login, cannot be changed here)</span></p></div>
        <button className="btn btn-primary">Save profile</button>
      </form>
    </div>
  );
}
