/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
import { Component, ElementRef, HostListener, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AMI, AmiFaq } from '../../data/ami';
import { DEFAULT_DIAL, DIAL_CODES, isValidPhone } from '../../data/dial-codes';
import { CATEGORIES, Category, CODE_PREFIX, Product, PRODUCTS, productByCode, productsIn, searchText, Section, sectionsIn } from '../../data/products';
import { SITE, telHref, whatsappHref } from '../../data/site.config';
import { sendEnquiry } from '../enquiry';
import { formatPhone } from '../phone-field';
import { SiteNewsService } from '../site-news.service';

interface ChatLink {
  label: string;
  route?: string[];
  /** Query parameters for `route`. */
  query?: Record<string, string>;
  href?: string;
  download?: string;
}

interface ChatMsg {
  from: 'ami' | 'user';
  text: string;
  links?: ChatLink[];
  product?: Product;
  /** Key/value lines, used for the summary sent to the support team. */
  summary?: [string, string][];
}

interface Choice {
  label: string;
  run: () => void | Promise<void>;
}

/** What a typed message means at this point of the conversation. */
type Step = 'name' | 'phone' | 'browse' | 'query' | 'idle';

const TYPING_MS = 550;

/** Same breakpoint as the full-screen panel in ami-chat.scss. */
const isPhone = () => window.matchMedia('(max-width: 560px)').matches;

/** Extra words visitors use for a range, on top of its slug and short name. */
const CATEGORY_WORDS: Record<string, string[]> = {
  upvc: ['pvc', 'u-pvc', 'ventilator', 'ventilators', 'louver', 'louvre'],
  aluminium: ['aluminum', 'alu', 'facade', 'curtain wall', 'partition', 'partitions', 'wardrobe', 'wardrobes'],
  wpc: ['wood plastic', 'wpc frame', 'wpc frames'],
  steel: ['metal door', 'metal doors', 'iron', 'iron door', 'srk'],
  membrane: ['pvc membrane', 'membrane door', 'carved door'],
  laminated: ['laminate', 'laminates', 'inlay', 'steel rod'],
  skin: ['veneer', 'melamine', 'moulded', 'molded', 'hdf', 'panel door', 'panel doors'],
  frp: ['fibre', 'fiber', 'fibre door', 'fiber door', 'fibreglass', 'fiberglass'],
  designer: ['mahogany', 'wood door', 'wooden', 'wooden door', 'solid wood', 'teak', 'primer door', 'painted door'],
};

/** Designs listed as quick replies at a time; the rest are a link away. */
const MAX_DESIGN_CHOICES = 10;

const SEARCH_INDEX = PRODUCTS.map((p) => ({ p, text: searchText(p) }));

/** Small words that say nothing about a product. */
const STOP_WORDS = new Set(
  (
    'a about an and any are best can cost do does door doors for get have how i in is it like looking me much my need of ' +
    'on please price show some tell that the there this to want we what which will window windows with would you your'
  ).split(' '),
);

/**
 * AMI, a scripted chat assistant: collects name and phone, walks through the ranges, their sections and designs
 * (data/products.ts, from the catalogue), finds designs by code or by words, and emails a
 * visitor's question with the chat details to the team straight from the browser (see enquiry.ts).
 * All wording lives in data/ami.ts.
 */
@Component({
  selector: 'app-ami-chat',
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './ami-chat.html',
  styleUrl: './ami-chat.scss',
})
export class AmiChat implements OnDestroy {
  protected readonly ami = AMI;
  protected readonly site = SITE;
  protected readonly supportTel = telHref(AMI.supportPhone);
  protected readonly whatsapp = SITE.whatsapp ? whatsappHref(AMI.whatsappText) : '';

  /** The offers running today (data/offers.ts). */
  private readonly news = inject(SiteNewsService);

  protected readonly open = signal(false);
  protected readonly teaser = signal(false);
  protected readonly messages = signal<ChatMsg[]>([]);
  protected readonly choices = signal<Choice[]>([]);
  protected readonly typing = signal(false);
  protected readonly step = signal<Step>('name');
  protected readonly draft = signal('');

  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('field');

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private started = false;
  private phoneLayout = false;
  private busy = false;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  /** Collected for the email to the support team. */
  private lead = {
    name: '',
    phone: '',
    types: new Set<string>(),
    designs: new Set<string>(),
    query: '',
  };
  /** The "any question for our team?" prompt shows after the first design only. */
  private supportAsked = false;
  /** What to do once a valid number is entered (or skipped, when it is optional). */
  private afterPhone: (() => Promise<void>) | null = null;
  private phoneRequired = false;

  constructor() {
    this.news.load();
    this.later(() => {
      if (!this.started) this.teaser.set(true);
    }, 4000);
  }

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
    this.releasePhoneLayout();
  }

  // ---- panel ---------------------------------------------------------------------------------------

  protected toggle(): void {
    this.open() ? this.close() : this.show();
  }

  protected show(): void {
    this.open.set(true);
    this.teaser.set(false);
    if (!this.started) {
      this.started = true;
      void this.start();
    }
    if (isPhone()) {
      // don't pop the keyboard straight away on phones, so the greeting stays readable
      this.holdPhoneLayout();
    } else {
      this.later(() => this.input()?.nativeElement.focus(), 50);
    }
  }

  protected close(): void {
    this.open.set(false);
    this.releasePhoneLayout();
  }

  /**
   * Phones: stop the page scrolling behind the full-screen chat, and size the panel to the visible area,
   * so the input stays above the on-screen keyboard (100dvh ignores the keyboard on iOS).
   */
  private holdPhoneLayout(): void {
    if (this.phoneLayout) return;
    this.phoneLayout = true;
    document.body.style.overflow = 'hidden';
    window.visualViewport?.addEventListener('resize', this.fitViewport);
    window.visualViewport?.addEventListener('scroll', this.fitViewport);
    this.fitViewport();
  }

  private releasePhoneLayout(): void {
    if (!this.phoneLayout) return;
    this.phoneLayout = false;
    document.body.style.overflow = '';
    window.visualViewport?.removeEventListener('resize', this.fitViewport);
    window.visualViewport?.removeEventListener('scroll', this.fitViewport);
  }

  private readonly fitViewport = (): void => {
    const vv = window.visualViewport;
    if (!vv) return;
    const style = this.host.nativeElement.style;
    style.setProperty('--ami-vh', `${vv.height}px`);
    style.setProperty('--ami-top', `${vv.offsetTop}px`);
    this.scrollDown();
  };

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close();
  }

  /** On phones the panel covers the page, so following a link inside it closes the chat. */
  protected onLink(): void {
    if (isPhone()) this.close();
  }

  protected restart(): void {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.busy = false;
    this.typing.set(false);
    this.messages.set([]);
    this.choices.set([]);
    this.lead = { name: '', phone: '', types: new Set(), designs: new Set(), query: '' };
    this.supportAsked = false;
    this.afterPhone = null;
    void this.start();
  }

  protected placeholder(): string {
    switch (this.step()) {
      case 'name':
        return 'Type your name…';
      case 'phone':
        return 'Mobile number, e.g. 98765 43210';
      case 'query':
        return 'Type your question…';
      default:
        return 'Type a product code or a question…';
    }
  }

  // ---- input ---------------------------------------------------------------------------------------

  protected async submit(e: Event): Promise<void> {
    e.preventDefault();
    const text = this.draft().trim();
    if (!text || this.busy) return;
    this.draft.set('');
    this.choices.set([]);
    this.push({ from: 'user', text });

    switch (this.step()) {
      case 'name':
        return this.onName(text);
      case 'phone':
        return this.onPhone(text);
      case 'query':
        return this.onQuery(text);
      default:
        return this.onFreeText(text);
    }
  }

  protected pick(c: Choice): void {
    if (this.busy) return;
    this.choices.set([]);
    this.push({ from: 'user', text: c.label });
    void c.run();
  }

  // ---- conversation --------------------------------------------------------------------------------

  private async start(): Promise<void> {
    this.step.set('name');
    await this.say({ text: AMI.greeting });
    await this.say({ text: AMI.askName });
  }

  private async onName(text: string): Promise<void> {
    const name = text
      .replace(/^(hi|hello|hey)[,!.\s]+/i, '')
      .replace(/^(my name is|i am|i'm|this is|name is|name)[:\s]+/i, '')
      .trim();
    if (!/^[\p{L}][\p{L} .'-]{0,48}$/u.test(name)) {
      await this.say({ text: AMI.nameRetry });
      return;
    }
    this.lead.name = name.replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
    await this.askPhone(AMI.askPhone(this.lead.name), false, () => this.welcome());
  }

  /**
   * Asks for the visitor's number, then runs `next`. Optional for general chat (a "Skip" reply is offered);
   * required before a query goes to the support team.
   */
  private async askPhone(text: string, required: boolean, next: () => Promise<void>): Promise<void> {
    this.step.set('phone');
    this.phoneRequired = required;
    this.afterPhone = next;
    await this.say({ text, ...(required ? { links: [this.callLink()] } : {}) });
    this.phoneChoices();
  }

  private phoneChoices(): void {
    this.choices.set(
      this.phoneRequired
        ? [{ label: 'Cancel', run: () => (this.afterPhone = null, this.menu()) }]
        : [
            {
              label: 'Skip for now',
              run: async () => {
                const next = this.afterPhone;
                this.afterPhone = null;
                await this.say({ text: AMI.phoneSkipped });
                await next?.();
              },
            },
          ],
    );
  }

  private async onPhone(text: string): Promise<void> {
    const phone = parsePhone(text);
    if (!phone) {
      await this.say({ text: AMI.phoneRetry });
      this.phoneChoices();
      return;
    }
    this.lead.phone = phone;
    const next = this.afterPhone;
    this.afterPhone = null;
    if (this.phoneRequired) await this.say({ text: AMI.phoneThanks });
    await (next ?? (() => this.showTypes()))();
  }

  private async welcome(): Promise<void> {
    await this.say({ text: AMI.welcome(this.lead.name) });
    await this.showTypes();
  }

  /** The hand-over to the support team, always listed first in the quick replies. */
  private supportChoice(label: string = AMI.supportChoice): Choice {
    return { label, run: () => this.askQuery() };
  }

  private callLink(): ChatLink {
    return { label: `Call support: ${AMI.supportPhone}`, href: telHref(AMI.supportPhone) };
  }

  /** "Offers (2)" while offers run; nothing otherwise. */
  private offersChoice(): Choice[] {
    const n = this.news.offers().length;
    return n ? [{ label: `Offers (${n})`, run: () => this.showOffers() }] : [];
  }

  /** The running offers, with the way to the Offers page. */
  private async showOffers(): Promise<void> {
    this.step.set('browse');
    const offers = this.news.offers();
    if (!offers.length) {
      await this.say({ text: AMI.noOffers, links: [{ label: 'Offers page', route: ['/offers'] }] });
      return this.menu();
    }
    this.lead.types.add('Offers');
    const till = (d?: string) => (d ? ` (till ${new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})` : '');
    await this.say({ text: AMI.offersIntro(offers.length) + '\n' + offers.map((o) => `• ${o.title}${till(o.endDate)}`).join('\n') });
    await this.say({
      text: AMI.offersOutro,
      links: [
        { label: offers.length === 1 ? 'See the offer' : `See all ${offers.length} offers`, route: ['/offers'] },
        { label: 'Book a free site visit', route: ['/site-visit'] },
      ],
    });
    this.choices.set([
      this.supportChoice('Ask about an offer'),
      { label: 'Product types', run: () => this.showTypes() },
      { label: 'Common questions', run: () => this.showFaqs() },
    ]);
  }

  private async showTypes(): Promise<void> {
    this.step.set('browse');
    await this.say({ text: AMI.askType });
    this.choices.set([
      this.supportChoice(),
      ...this.offersChoice(),
      ...CATEGORIES.map((c) => ({ label: c.name, run: () => this.showCategory(c) })),
      { label: 'I have a product code', run: () => this.askCode() },
      { label: 'Common questions', run: () => this.showFaqs() },
    ]);
  }

  private async showCategory(c: Category): Promise<void> {
    this.step.set('browse');
    this.lead.types.add(c.name);
    const items = productsIn(c.slug);
    const sections = sectionsIn(c.slug);
    await this.say({
      text: `${c.name}: ${c.tagline.toLowerCase()}. ${c.description}`,
      links: [{ label: `See all ${items.length} ${c.short} designs`, route: ['/category', c.slug] }],
    });
    if (sections.length === 1) return this.showSection(c, sections[0], false);
    await this.say({ text: AMI.askSection });
    this.choices.set([
      this.supportChoice(),
      ...sections.map((s) => ({ label: `${s.name} (${s.products.length})`, run: () => this.showSection(c, s) })),
      { label: '← Product types', run: () => this.showTypes() },
    ]);
  }

  /** The designs of one section as quick replies (the first few; the rest through the link). */
  private async showSection(c: Category, s: Section, intro = true): Promise<void> {
    this.step.set('browse');
    const shown = s.products.slice(0, MAX_DESIGN_CHOICES);
    const more = s.products.length - shown.length;
    if (intro || more > 0) {
      await this.say({
        text: more > 0 ? `${s.name}: ${s.products.length} designs. Here are the first ${shown.length}.` : `${s.name}: ${s.products.length} designs.`,
        links: [{ label: `See all ${s.name}`, route: ['/products'], query: { type: c.slug, sub: s.name } }],
      });
    }
    await this.say({ text: AMI.askDesign });
    const sections = sectionsIn(c.slug);
    this.choices.set([
      this.supportChoice(),
      ...shown.map((p) => ({ label: designLabel(p), run: () => this.showProduct(p) })),
      ...(sections.length > 1 ? [{ label: `← ${c.short} sections`, run: () => this.showCategory(c) }] : []),
      { label: '← Product types', run: () => this.showTypes() },
    ]);
  }

  /** Designs that match what the visitor typed ("sliding window", "glass door", "mahogany"). */
  private async showMatches(query: string, found: Product[]): Promise<void> {
    this.step.set('browse');
    const shown = found.slice(0, 6);
    await this.say({
      text: AMI.searchFound(found.length, query),
      links: found.length > shown.length ? [{ label: `See all ${found.length} results`, route: ['/products'], query: { q: query } }] : [],
    });
    this.choices.set([
      this.supportChoice(),
      ...shown.map((p) => ({ label: designLabel(p), run: () => this.showProduct(p) })),
      { label: 'Product types', run: () => this.showTypes() },
    ]);
  }

  private async askCode(): Promise<void> {
    this.step.set('browse');
    await this.say({ text: AMI.askCode });
    this.choices.set([this.supportChoice(), { label: '← Product types', run: () => this.showTypes() }]);
  }

  private async showProduct(p: Product): Promise<void> {
    this.lead.designs.add(`${p.code} ${p.name}`);
    this.lead.types.add(CATEGORIES.find((c) => c.slug === p.category)!.name);
    const facts = p.details.map(([k, v]) => `${k}: ${v}`).join('\n');
    await this.say({ text: `Here is ${p.code}, ${p.name} (${p.sub}).${facts ? '\n' + facts : ''}\nTap it to see the full details.`, product: p });
    if (!this.supportAsked) {
      this.supportAsked = true;
      return this.askSupport();
    }
    return this.offerNext(p.category);
  }

  private async askSupport(): Promise<void> {
    this.step.set('browse');
    await this.say({ text: AMI.askSupport });
    this.choices.set([
      this.supportChoice('Yes, I have a query'),
      {
        label: 'No, just browsing',
        run: async () => {
          await this.say({ text: AMI.noQuery(this.lead.name) });
          this.menu();
        },
      },
      { label: 'See more products', run: () => this.showTypes() },
    ]);
  }

  /** After a design when the support question has already been asked. */
  private async offerNext(slug: string): Promise<void> {
    await this.say({ text: AMI.anythingElse });
    const c = CATEGORIES.find((x) => x.slug === slug)!;
    this.choices.set([
      this.supportChoice(),
      { label: `More ${c.short} designs`, run: () => this.showCategory(c) },
      { label: 'I have a product code', run: () => this.askCode() },
      { label: 'Product types', run: () => this.showTypes() },
    ]);
  }

  /** Standing options once the main flow is done. */
  private menu(): void {
    this.step.set('browse');
    this.choices.set([
      this.supportChoice(),
      ...this.offersChoice(),
      { label: 'Product types', run: () => this.showTypes() },
      { label: 'I have a product code', run: () => this.askCode() },
      { label: 'Common questions', run: () => this.showFaqs() },
    ]);
  }

  private async showFaqs(): Promise<void> {
    await this.say({ text: AMI.faqIntro });
    this.choices.set([
      this.supportChoice(),
      ...AMI.faqs.map((f) => ({ label: f.q, run: () => this.answerFaq(f) })),
      { label: '← Product types', run: () => this.showTypes() },
    ]);
  }

  private async answerFaq(f: AmiFaq): Promise<void> {
    const links: ChatLink[] = /site visit|measure/i.test(f.q) ? [{ label: 'Book a free site visit', route: ['/site-visit'] }] : [];
    await this.say({ text: f.a, links });
    this.menu();
  }

  /** Hands over to the support team. The phone number is required here; `pending` is a question already typed. */
  private async askQuery(pending = ''): Promise<void> {
    if (!this.lead.phone) return this.askPhone(AMI.phoneNeeded, true, () => this.askQuery(pending));
    if (pending) return this.onQuery(pending);
    this.step.set('query');
    await this.say({ text: AMI.askQuery, links: [this.callLink()] });
    this.choices.set([{ label: 'Cancel', run: () => (this.step.set('browse'), this.menu()) }]);
  }

  private async onQuery(text: string): Promise<void> {
    this.lead.query = text;
    this.step.set('idle');
    await this.say({ text: AMI.confirmQuery, summary: this.summary() });
    this.choices.set([
      { label: 'Send to support team', run: () => this.send() },
      { label: 'Change my question', run: () => this.askQuery() },
    ]);
  }

  /** A typed message outside the name/phone/query steps: product code, FAQ, product type, or hand it to the team. */
  private async onFreeText(text: string): Promise<void> {
    const lower = ` ${text.toLowerCase()} `;

    const code = text.match(/\b([a-z]{2})\s*-?\s*(\d{1,3})\b/i);
    if (code && CODE_PREFIX.has(code[1].toUpperCase())) {
      const p = productByCode(`${code[1]}-${code[2]}`);
      if (p) return this.showProduct(p);
      await this.say({ text: AMI.codeNotFound(`${code[1].toUpperCase()}-${code[2].padStart(3, '0')}`) });
      return this.showCategory(CATEGORIES.find((x) => x.slug === CODE_PREFIX.get(code[1].toUpperCase()))!);
    }
    const prefix = text.trim().toUpperCase().match(/^([A-Z]{2})-?$/);
    if (prefix && CODE_PREFIX.has(prefix[1])) {
      return this.showCategory(CATEGORIES.find((x) => x.slug === CODE_PREFIX.get(prefix[1]))!);
    }

    // a range named together with more words ("upvc sliding", "frp glass door") searches inside that range
    const cat = CATEGORIES.find((c) =>
      [c.slug, c.short.toLowerCase(), ...(CATEGORY_WORDS[c.slug] ?? [])].some((w) => hasWord(lower, w)),
    );
    const found = findProducts(text, cat?.slug);
    if (cat && found.length && found.length < productsIn(cat.slug).length) return this.showMatches(text.trim(), found);

    const faq = AMI.faqs.find((f) => f.keywords.some((k) => hasWord(lower, k)));
    if (faq) return this.answerFaq(faq);

    if (cat) return this.showCategory(cat);

    if (/brochure|catalog|catalogue|pdf/.test(lower)) {
      await this.say({ text: AMI.noCatalogue, links: [{ label: 'All products', route: ['/products'] }] });
      return this.menu();
    }
    if (/\b(offers?|discounts?|deals?|promo(tion)?s?|sale|festival|diwali|onam|% ?off)\b/.test(lower)) return this.showOffers();
    if (/^\s*(hi|hello|hey|thanks?|thank you|ok|okay)\b/.test(lower)) {
      await this.say({ text: AMI.anythingElse });
      return this.menu();
    }
    if (found.length) return this.showMatches(text.trim(), found);

    await this.say({ text: AMI.notUnderstood });
    this.choices.set([
      { label: 'Yes, send it to the team', run: () => this.askQuery(text) },
      { label: 'No, show product types', run: () => this.showTypes() },
    ]);
  }

  private summary(): [string, string][] {
    const l = this.lead;
    const rows: [string, string][] = [
      ['Name', l.name],
      ['Phone', l.phone],
    ];
    if (l.types.size) rows.push(['Product types', [...l.types].join(', ')]);
    if (l.designs.size) rows.push(['Designs viewed', [...l.designs].join(', ')]);
    rows.push(['Query', l.query]);
    return rows;
  }

  private async send(): Promise<void> {
    this.busy = true;
    this.typing.set(true);
    const l = this.lead;
    try {
      await sendEnquiry({
        kind: 'CHAT',
        name: l.name,
        phone: l.phone,
        // name and phone have their own rows in the mail
        details: this.summary().filter(([k]) => k !== 'Name' && k !== 'Phone').map(([label, value]) => ({ label, value })),
        transcript: this.messages().map((m) => ({ visitor: m.from !== 'ami', text: m.text })),
      });
      this.typing.set(false);
      this.busy = false;
      await this.say({ text: AMI.sent(l.phone) });
      this.menu();
    } catch {
      this.typing.set(false);
      this.busy = false;
      await this.say({ text: AMI.sendFailed, links: [this.callLink(), { label: SITE.altEmail, href: `mailto:${SITE.altEmail}` }] });
      this.choices.set([
        { label: 'Try again', run: () => this.send() },
        { label: 'Product types', run: () => this.showTypes() },
      ]);
    }
  }

  // ---- helpers -------------------------------------------------------------------------------------

  /** Adds an AMI message after a short "typing" pause, so replies don't appear all at once. */
  private say(msg: Omit<ChatMsg, 'from'>): Promise<void> {
    this.busy = true;
    this.typing.set(true);
    this.scrollDown();
    return new Promise((resolve) =>
      this.later(() => {
        this.typing.set(false);
        this.busy = false;
        this.push({ from: 'ami', ...msg });
        resolve();
      }, TYPING_MS),
    );
  }

  private push(msg: ChatMsg): void {
    this.messages.update((m) => [...m, msg]);
    this.scrollDown();
  }

  private scrollDown(): void {
    this.later(() => {
      const el = this.log()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }
}

/** Quick-reply label for a design: "ST-027 · Steel Door 24 SL/ML". */
function designLabel(p: Product): string {
  return `${p.code} · ${p.name}`;
}

/**
 * Designs whose code, name, section or details contain every meaningful word typed (in `range` when given).
 * Range words themselves ("upvc", "fibre") are left out, since the range filter already covers them.
 */
function findProducts(text: string, range?: string): Product[] {
  const rangeWords = new Set(
    CATEGORIES.flatMap((c) => [c.slug, c.short.toLowerCase(), ...(CATEGORY_WORDS[c.slug] ?? [])]).flatMap((w) => w.split(' ')),
  );
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\d&\s-]/gu, ' ')
    .split(/\s+/)
    .filter((w) => !STOP_WORDS.has(w) && !(range && rangeWords.has(w)))
    // plural to singular, so "sliding doors" and "glass panels" still match
    .map((w) => (w.length > 3 ? w.replace(/s$/, '') : w))
    .filter((w) => w.length > 2);
  if (!words.length) return [];
  return SEARCH_INDEX.filter(({ p, text: t }) => (!range || p.category === range) && words.every((w) => t.includes(w))).map(({ p }) => p);
}

/** Whole-word (or whole-phrase) match, so "rate" doesn't match "separate". */
function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\d])${escaped}($|[^\\p{L}\\d])`, 'u').test(text);
}

/**
 * Indian mobile by default; numbers starting with + are matched against the other supported country codes.
 * Returns the number in the "+91 9876543210" format used in enquiry emails, or null when it is not valid.
 */
function parsePhone(value: string): string | null {
  const v = value.trim();
  if (!v.startsWith('+')) return isValidPhone(v, DEFAULT_DIAL) ? formatPhone(DEFAULT_DIAL.iso, v) : null;
  const digits = v.replace(/\D/g, '');
  const d = [...DIAL_CODES]
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((x) => digits.startsWith(x.dial) && isValidPhone(v, x));
  return d ? formatPhone(d.iso, v) : null;
}
