import { STATES } from '@/config/states';

type A = { name?: string; phone?: string; line1?: string; line2?: string | null; city?: string; stateCode?: string; pincode?: string; isDefault?: boolean };

/** Plain form fields (no client JS) shared by the add and edit address forms. */
export default function AddressFields({ a = {}, idPrefix }: { a?: A; idPrefix: string }) {
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="label" htmlFor={id('name')}>Full name</label><input id={id('name')} name="name" defaultValue={a.name} required maxLength={80} autoComplete="name" className="field" /></div>
      <div><label className="label" htmlFor={id('phone')}>Mobile number</label><input id={id('phone')} name="phone" defaultValue={a.phone} required inputMode="tel" autoComplete="tel" className="field" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor={id('line1')}>Address</label><input id={id('line1')} name="line1" defaultValue={a.line1} required minLength={5} maxLength={150} autoComplete="address-line1" placeholder="House no., building, street" className="field" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor={id('line2')}>Landmark / area (optional)</label><input id={id('line2')} name="line2" defaultValue={a.line2 ?? ''} maxLength={150} autoComplete="address-line2" className="field" /></div>
      <div><label className="label" htmlFor={id('pincode')}>Pincode</label><input id={id('pincode')} name="pincode" defaultValue={a.pincode} required inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" autoComplete="postal-code" className="field" /></div>
      <div><label className="label" htmlFor={id('city')}>City</label><input id={id('city')} name="city" defaultValue={a.city} required maxLength={60} autoComplete="address-level2" className="field" /></div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={id('stateCode')}>State</label>
        <select id={id('stateCode')} name="stateCode" defaultValue={a.stateCode ?? ''} required autoComplete="address-level1" className="field">
          <option value="">Select state</option>
          {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" defaultChecked={a.isDefault} /> Use as my default address</label>
    </div>
  );
}
