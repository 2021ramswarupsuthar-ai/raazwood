import { prisma } from '@/server/db';
import { requireCustomer } from '@/server/customer-auth';
import AddressFields from '@/components/AddressFields';
import { stateByCode } from '@/config/states';
import { deleteAddressAction, saveAddressAction } from '../actions';

export default async function Addresses({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const c = await requireCustomer('/account/addresses');
  const { error, saved } = await searchParams;
  const addresses = await prisma.address.findMany({ where: { customerId: c.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold">Saved addresses</h1>
      {saved && <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800" role="status">Address saved.</p>}
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}

      {addresses.length === 0 ? <p className="mt-4 text-ink/70">No saved addresses yet. Add one below, or tick &quot;Save this address&quot; at checkout.</p> : (
        <ul className="mt-6 space-y-4">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-2xl bg-white p-5 ring-1 ring-line/70">
              <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold">{a.name} {a.isDefault && <span className="ml-2 rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand-dark">Default</span>}</p>
                  <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                  <p>{a.city}, {stateByCode(a.stateCode)?.name} {a.pincode}</p>
                  <p className="text-ink/60">+91 {a.phone}</p>
                </div>
                <form action={deleteAddressAction.bind(null, a.id)}><button className="text-sm text-ink/60 underline hover:text-red-700">Delete</button></form>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-brand-dark">Edit</summary>
                <form action={saveAddressAction.bind(null, a.id)} className="mt-4 space-y-4">
                  <AddressFields a={a} idPrefix={`a-${a.id}`} />
                  <button className="btn btn-primary">Save changes</button>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10 rounded-2xl bg-white p-6 ring-1 ring-line/70">
        <h2 className="font-display text-2xl font-semibold">Add an address</h2>
        <form action={saveAddressAction.bind(null, null)} className="mt-4 space-y-4">
          <AddressFields a={{ name: c.name, phone: c.phone }} idPrefix="new" />
          <button className="btn btn-primary">Add address</button>
        </form>
      </section>
    </div>
  );
}
