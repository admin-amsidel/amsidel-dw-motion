# Amsidel Doors & Windows website

A static Angular site (no backend) for the Amsidel Doors & Windows store: home, products, range pages, product pages,
about, projects, site visit, offers and contact, plus the AMI chat assistant. Old `/doors-windows/...` links redirect
to the same page at the root.

The **Amsidel Group** page (the solar-system landing page) is a separate website in `../amsidel-group-web`. Its Doors
& Windows planet opens this site, and the "Amsidel Group" links here open it. Both addresses are set in
`src/app/data/sites.ts` (the same file is in both projects): put the live addresses there once both are deployed.

Enquiries from the quote form, the site-visit form and the AMI chat are emailed **straight from the browser through
EmailJS**. There is no server to run or keep awake.

## Run and build

```bash
npm install
npm start          # http://localhost:4200 (run the Group site on 4201 to test the links between them)
npm run build      # output in dist/amsidel-web/browser
```

The npm scripts run the Angular CLI through `node node_modules/@angular/cli/bin/ng.js` rather than plain `ng`,
because the `&` in the folder name `AMSIDEL D&W` breaks npm's command shims on Windows. Use `npm run ng -- <args>`
for other CLI commands.

Deploy: Cloudflare (`wrangler.jsonc`) serves `dist/amsidel-web/browser` as static files and builds before each deploy.

## Enquiry emails (EmailJS)

Until the three keys below are filled in, the forms and the chat show "couldn't send" with the phone and email
fallback links.

1. Create a free account at <https://www.emailjs.com> (200 emails a month on the free plan).
2. **Email Services → Add New Service**: connect the inbox that sends the mail (e.g. Gmail for amsidelenterprises@gmail.com).
   Copy the **Service ID**.
3. **Email Templates → Create New Template**:
   - **Subject:** `{{subject}}`
   - **To Email:** the inbox that should receive enquiries (e.g. `amsidelenterprises@gmail.com`)
   - **Reply To:** `{{reply_to}}` (the visitor's email when they gave one)
   - **From Name:** `Amsidel Website`
   - **Content:** Edit Content → code view (`</>`), delete everything and put only `{{{content_html}}}` (three
     braces). The website builds the whole mail (header, Call/WhatsApp buttons, details table, footer) in
     `src/app/shared/enquiry.ts`. For a plain-text template use `{{content_text}}` instead.

   Save and copy the **Template ID**.
4. **Account → General**: copy the **Public Key**. Under **Account → Security**, add your website's domain to the
   allowed origins so other sites cannot use the key.
5. Put the three values in `src/app/data/site.config.ts`:

   ```ts
   emailjs: {
     serviceId: 'service_xxxxxxx',
     templateId: 'template_xxxxxxx',
     publicKey: 'xxxxxxxxxxxxxxxx',
   },
   ```

6. Build and deploy, then send a test from the contact page.

Variables available to the template: `subject`, `kind` (Quote request / Site-visit booking / AMI chat enquiry),
`headline`, `from_name`, `phone`, `reply_to`, `details_text`, `message`, `transcript`, `page`, `sent_at`,
`content_text` (everything as plain text) and `content_html` (everything as a formatted table).

Spam and quota protection: a hidden honeypot field drops bot submissions, and each browser can send at most four
enquiries in ten minutes (`src/app/shared/enquiry.ts`).

## Product catalogue

The products come from the catalogue in `../CATALOGUE/complete-catalogue` (9 ranges, 449 products, 33 colour,
profile and glass reference sheets). To update the website after the catalogue changes:

```bash
pip install pillow
# product images -> public/images/catalogue, range banners -> public/images/banners,
# data -> src/app/data/catalogue.generated.ts
python tools/import_catalogue.py "../CATALOGUE/complete-catalogue"
```

The supplier's own codes and brochure pages are never copied to the website; customers only see the Amsidel code
(e.g. `ST-027`).

## Where to change things

| What | File |
|---|---|
| Company details, phone, emails, hours, site-visit slots, EmailJS keys | `src/app/data/site.config.ts` |
| Addresses of this site and the Amsidel Group site | `src/app/data/sites.ts` |
| Offers (header button, Offers page, chat) | `src/app/data/offers.ts` |
| AMI chat wording and common questions | `src/app/data/ami.ts` |
| Product lookups and range renames for old links | `src/app/data/products.ts` |
| Product data (generated, do not edit by hand) | `src/app/data/catalogue.generated.ts` |
