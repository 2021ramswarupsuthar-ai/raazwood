import 'server-only';
// Outgoing messages: SMS (MSG91), email (Resend) and WhatsApp (Cloud API). Every channel is optional.
// When a channel is not configured, development prints the message to the server console instead, so the
// whole flow can be tested on localhost without accounts. Production never prints message contents.
const isProd = process.env.NODE_ENV === 'production';

export const smsConfigured = () => Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID);
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const whatsappConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ORDER_TEMPLATE);

function devLog(channel: string, to: string, text: string) {
  if (!isProd) console.info(`\n[dev ${channel}] to ${to}\n${text}\n`);
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<boolean> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
    if (!r.ok) console.error(`message provider error ${r.status} for ${new URL(url).host}`);
    return r.ok;
  } catch (e) {
    console.error(`message provider unreachable: ${new URL(url).host}`, e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Login code by SMS. MSG91 needs a DLT-approved OTP template (TRAI rule for Indian SMS); the template must
 * contain the ##OTP## variable. Returns false when no SMS provider is set up (caller decides what to do).
 */
export async function sendOtpSms(phone10: string, code: string): Promise<boolean> {
  if (!smsConfigured()) {
    devLog('SMS', phone10, `Your Raazwood login code is ${code}. It is valid for 10 minutes.`);
    return false;
  }
  const u = new URL('https://control.msg91.com/api/v5/otp');
  u.searchParams.set('template_id', process.env.MSG91_OTP_TEMPLATE_ID!);
  u.searchParams.set('mobile', `91${phone10}`);
  u.searchParams.set('otp', code);
  return post(u.toString(), { authkey: process.env.MSG91_AUTH_KEY! }, {});
}

/** Transactional SMS via an MSG91 Flow template (optional). Variables are passed as name/value pairs. */
export async function sendFlowSms(phone10: string, vars: Record<string, string>, fallbackText: string): Promise<boolean> {
  const flow = process.env.MSG91_ORDER_FLOW_ID;
  if (!process.env.MSG91_AUTH_KEY || !flow) { devLog('SMS', phone10, fallbackText); return false; }
  return post('https://control.msg91.com/api/v5/flow', { authkey: process.env.MSG91_AUTH_KEY }, { template_id: flow, short_url: '0', recipients: [{ mobiles: `91${phone10}`, ...vars }] });
}

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!emailConfigured()) { devLog('email', to, `${subject}\n\n${text}`); return false; }
  return post('https://api.resend.com/emails', { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }, { from: process.env.EMAIL_FROM, to: [to], subject, html, text });
}

/** WhatsApp Cloud API template message. The template (approved in Meta Business) gets body params in order. */
export async function sendWhatsAppTemplate(phone10: string, params: string[], fallbackText: string): Promise<boolean> {
  if (!whatsappConfigured()) { devLog('WhatsApp', phone10, fallbackText); return false; }
  return post(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }, {
    messaging_product: 'whatsapp',
    to: `91${phone10}`,
    type: 'template',
    template: { name: process.env.WHATSAPP_ORDER_TEMPLATE, language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? 'en' }, components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] },
  });
}
