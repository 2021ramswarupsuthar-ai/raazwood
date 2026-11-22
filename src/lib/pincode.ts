// Pincode helpers. The first digits of an Indian PIN map to a postal circle, which is only an APPROXIMATION
// of the state (a few border areas differ). We use it to pre-select the state and warn on mismatch.
// The state chosen by the customer is the authority for tax (place of supply).
import { SOUTH_STATES, DELIVERY_DAYS, SERVICEABLE_STATES } from '../config/store.ts';

export const isValidPincode = (pin: string): boolean => /^[1-9][0-9]{5}$/.test(pin);

const THREE: Record<string, string> = {
  '403': 'GA', '396': 'DD', '605': 'PY', '609': 'PY', '673': 'KL', '737': 'SK', '682': 'KL',
  '246': 'UK', '248': 'UK', '249': 'UK', '262': 'UK', '263': 'UK',
};
const TWO: Record<string, string> = {
  '11': 'DL', '12': 'HR', '13': 'HR', '14': 'PB', '15': 'PB', '16': 'PB', '17': 'HP', '18': 'JK', '19': 'JK',
  '20': 'UP', '21': 'UP', '22': 'UP', '23': 'UP', '24': 'UP', '25': 'UP', '26': 'UP', '27': 'UP', '28': 'UP',
  '30': 'RJ', '31': 'RJ', '32': 'RJ', '33': 'RJ', '34': 'RJ',
  '36': 'GJ', '37': 'GJ', '38': 'GJ', '39': 'GJ',
  '40': 'MH', '41': 'MH', '42': 'MH', '43': 'MH', '44': 'MH',
  '45': 'MP', '46': 'MP', '47': 'MP', '48': 'MP', '49': 'CG',
  '56': 'KA', '57': 'KA', '58': 'KA', '59': 'KA',
  '60': 'TN', '61': 'TN', '62': 'TN', '63': 'TN', '64': 'TN',
  '67': 'KL', '68': 'KL', '69': 'KL',
  '70': 'WB', '71': 'WB', '72': 'WB', '73': 'WB', '74': 'WB',
  '75': 'OD', '76': 'OD', '77': 'OD', '78': 'AS',
};

/** Best-effort state code for a pincode, or null when ambiguous/unknown. */
export function guessStateFromPincode(pin: string): string | null {
  if (!isValidPincode(pin)) return null;
  const p3 = pin.slice(0, 3);
  const p2 = pin.slice(0, 2);
  if (THREE[p3]) return THREE[p3];
  if (p2 === '50') return 'TS'; // 500-509 Telangana
  if (p2 >= '51' && p2 <= '53') return 'AP';
  if (p2 >= '80' && p2 <= '85') {
    const n = Number(p3);
    return n >= 814 && n <= 835 ? 'JH' : 'BR';
  }
  return TWO[p2] ?? null;
}

export const isSouthState = (stateCode: string): boolean => (SOUTH_STATES as readonly string[]).includes(stateCode);

export function isServiceable(stateCode: string): boolean {
  return SERVICEABLE_STATES === 'ALL' || SERVICEABLE_STATES.includes(stateCode.toUpperCase());
}

export function deliveryWindow(stateCode: string): { min: number; max: number } {
  return isSouthState(stateCode) ? DELIVERY_DAYS.south : DELIVERY_DAYS.other;
}
