/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
import { SITE } from '../data/site.config';

/** A website enquiry: the quote form, the site-visit form or the AMI chat. */
export interface Enquiry {
  kind: 'QUOTE' | 'SITE_VISIT' | 'CHAT';
  /** What it is about, shown as the mail's heading (e.g. the product, or the visit date and place). */
  headline?: string;
  name: string;
  phone: string;
  email?: string;
  /** Label and value rows, in order. Empty values are left out. */
  details: { label: string; value: string }[];
  message?: string;
  /** Label of the message row in the mail; 'Message' when not set. */
  messageLabel?: string;
  transcript?: { visitor: boolean; text: string }[];
  /** Hidden form field: people leave it empty, bots fill it in. */
  honey?: string;
}

/** Why an enquiry did not go: 'busy' = too many from this visitor just now; 'failed' = anything else. */
export class EnquiryError extends Error {
  constructor(readonly reason: 'busy' | 'failed') {
    super(reason);
  }
}

const EMAILJS_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const TIMEOUT_MS = 20000;
/** After this long the forms say the mail is still on its way. */
export const SLOW_AFTER_MS = 6000;

/** At most this many enquiries per visitor in RATE_WINDOW_MS (kept in this browser), to spare the email quota. */
const RATE_LIMIT = 4;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_KEY = 'amsidel.enquiries';

const KIND_LABEL: Record<Enquiry['kind'], string> = {
  QUOTE: 'Quote request',
  SITE_VISIT: 'Site-visit booking',
  CHAT: 'AMI chat enquiry',
};

/** True once the EmailJS keys are filled in (data/site.config.ts). */
export function enquiriesConfigured(): boolean {
  const c = SITE.emailjs as { serviceId: string; templateId: string; publicKey: string };
  return !!(c.serviceId && c.templateId && c.publicKey);
}

/**
 * Emails the enquiry to the team directly from the browser through EmailJS (no backend).
 * The EmailJS template receives the variables listed in README.md > "Enquiry emails". Throws EnquiryError.
 */
export async function sendEnquiry(enquiry: Enquiry): Promise<void> {
  // a bot filled in the hidden field: pretend it went, send nothing
  if (enquiry.honey) return;
  if (!enquiriesConfigured()) {
    console.error('Enquiry email is not set up: fill in SITE.emailjs in src/app/data/site.config.ts');
    throw new EnquiryError('failed');
  }
  const recent = recentSends();
  if (recent.length >= RATE_LIMIT) throw new EnquiryError('busy');

  const c = SITE.emailjs as { serviceId: string; templateId: string; publicKey: string };
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(EMAILJS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: c.serviceId,
        template_id: c.templateId,
        user_id: c.publicKey,
        template_params: templateParams(enquiry),
      }),
      signal: abort.signal,
    });
  } catch {
    throw new EnquiryError('failed');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) throw new EnquiryError('busy');
  if (!res.ok) {
    console.error('EmailJS refused the enquiry:', res.status, await res.text().catch(() => ''));
    throw new EnquiryError('failed');
  }
  rememberSend(recent);
}

/** The variables the EmailJS template can use. */
function templateParams(e: Enquiry): Record<string, string> {
  const kind = KIND_LABEL[e.kind];
  const title = `Enquiry from ${e.name}`;
  const email = e.email?.trim() ?? '';
  const message = e.message?.trim() ?? '';
  // every field gets a row so the team sees what the visitor left blank; the message row only when the form has one
  const rows: [string, string][] = [
    ['Name', e.name],
    ['Phone', e.phone],
    ...(e.kind === 'CHAT' && !email ? [] : [['Email', email || '—'] as [string, string]]),
    ...e.details.map((d) => [d.label, d.value?.trim() || '—'] as [string, string]),
    ...(e.message !== undefined ? [[e.messageLabel ?? 'Message', message || '—'] as [string, string]] : []),
  ];
  const sentAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const page = typeof window === 'undefined' ? '' : window.location.href;
  const transcript = (e.transcript ?? []).map((t) => `${t.visitor ? e.name || 'Visitor' : 'AMI'}: ${t.text}`).join('\n');

  const text = [
    title,
    `${kind}${e.headline ? ' – ' + e.headline : ''}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    ...(transcript ? ['', 'Chat transcript:', transcript] : []),
    '',
    `Sent ${sentAt} from ${page}`,
  ].join('\n');

  const phoneDigits = e.phone.replace(/\D/g, '');
  const contentHtml = html({ kind, title, headline: e.headline ?? '', rows, transcript: e.transcript ?? [], name: e.name, email, phoneDigits, phone: e.phone, sentAt, page });

  return {
    subject: title,
    kind,
    headline: e.headline ?? '',
    from_name: e.name,
    phone: e.phone,
    // digits only with country code, for tel: and wa.me links
    phone_digits: phoneDigits,
    reply_to: email,
    details_text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
    message,
    transcript,
    page,
    sent_at: sentAt,
    content_text: text,
    // the whole mail, ready to send: the EmailJS template's content only needs {{{content_html}}}
    content_html: contentHtml,
    // same values under the names EmailJS's default "Contact Us" template uses, so even that one fills in
    name: e.name,
    email,
    title,
    time: sentAt,
  };
}

interface MailParts {
  kind: string;
  title: string;
  headline: string;
  rows: [string, string][];
  transcript: { visitor: boolean; text: string }[];
  name: string;
  email: string;
  phone: string;
  phoneDigits: string;
  sentAt: string;
  page: string;
}

const GOLD = '#8f6d38';
const FONT = 'Arial,Helvetica,sans-serif';

/** The complete branded mail. Inline styles and tables only, so Gmail, Outlook and phone mail apps show it alike. */
function html(m: MailParts): string {
  const td = `padding:10px 14px;border-bottom:1px solid #eee6d8;vertical-align:top;font:14px/1.5 ${FONT}`;
  const button = (href: string, label: string, bg: string) =>
    `<td style="padding:0 8px 8px 0"><a href="${esc(href)}" style="display:inline-block;padding:10px 18px;background:${bg};color:#ffffff;text-decoration:none;border-radius:4px;font:600 14px ${FONT}">${esc(label)}</a></td>`;
  const buttons = [
    m.phoneDigits ? button(`tel:+${m.phoneDigits}`, `Call ${m.phone}`, GOLD) : '',
    m.phoneDigits ? button(`https://wa.me/${m.phoneDigits}`, 'WhatsApp', '#25d366') : '',
    m.email ? button(`mailto:${m.email}`, 'Email customer', '#1c1a17') : '',
  ].join('');
  const transcript = m.transcript.length
    ? `<h3 style="margin:24px 0 8px;font:600 15px ${FONT};color:#111">Chat transcript</h3>` +
      m.transcript
        .map(
          (t) =>
            `<p style="margin:0 0 6px;font:14px/1.5 ${FONT}"><b style="color:${t.visitor ? '#111' : GOLD}">${esc(t.visitor ? m.name || 'Visitor' : 'AMI')}:</b> <span style="white-space:pre-line">${esc(t.text)}</span></p>`,
        )
        .join('')
    : '';

  return [
    `<div style="margin:0;padding:24px 12px;background:#f4f1ec;font-family:${FONT}">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e6dfd3;border-radius:8px;overflow:hidden">`,
    // header
    `<tr><td style="background:#1c1a17;padding:22px 28px">`,
    `<p style="margin:0;font:700 18px ${FONT};color:#ffffff;letter-spacing:.04em">AMSIDEL</p>`,
    `<p style="margin:2px 0 0;font:12px ${FONT};color:#c9a96e;letter-spacing:.14em;text-transform:uppercase">Doors &amp; Windows</p>`,
    `</td></tr>`,
    `<tr><td style="height:4px;background:${GOLD};line-height:4px;font-size:0">&nbsp;</td></tr>`,
    // title
    `<tr><td style="padding:24px 28px 0">`,
    `<p style="margin:0;font:600 12px ${FONT};letter-spacing:.12em;text-transform:uppercase;color:${GOLD}">${esc(m.kind)}${m.headline ? ' · ' + esc(m.headline) : ''}</p>`,
    `<h2 style="margin:6px 0 4px;font:600 22px ${FONT};color:#111">${esc(m.title)}</h2>`,
    `<p style="margin:0;font:14px/1.5 ${FONT};color:#555">A new enquiry has come in through the website. Please respond at the earliest.</p>`,
    `</td></tr>`,
    // quick actions
    buttons ? `<tr><td style="padding:18px 28px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${buttons}</tr></table></td></tr>` : '',
    // details
    `<tr><td style="padding:18px 28px 0">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #eee6d8">`,
    ...m.rows.map(
      ([k, v], i) =>
        `<tr style="background:${i % 2 ? '#ffffff' : '#faf8f4'}"><td style="${td};width:38%;color:#666">${esc(k)}</td><td style="${td};color:#111;white-space:pre-line"><b>${esc(v)}</b></td></tr>`,
    ),
    `</table>`,
    transcript,
    `</td></tr>`,
    // footer
    `<tr><td style="padding:24px 28px 0">&nbsp;</td></tr>`,
    `<tr><td style="padding:16px 28px;background:#faf8f4;border-top:1px solid #eee6d8">`,
    `<p style="margin:0;font:12px/1.5 ${FONT};color:#999">Sent automatically from the Amsidel website · ${esc(m.sentAt)}${m.page ? `<br>Page: ${esc(m.page)}` : ''}</p>`,
    `</td></tr>`,
    `</table>`,
    `</div>`,
  ].join('');
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

function recentSends(): number[] {
  try {
    const list = JSON.parse(localStorage.getItem(RATE_KEY) ?? '[]') as number[];
    const since = Date.now() - RATE_WINDOW_MS;
    return Array.isArray(list) ? list.filter((t) => typeof t === 'number' && t > since) : [];
  } catch {
    return [];
  }
}

function rememberSend(recent: number[]): void {
  try {
    localStorage.setItem(RATE_KEY, JSON.stringify([...recent, Date.now()]));
  } catch {
    /* private mode: no limit kept, nothing else lost */
  }
}
