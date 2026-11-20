/*
 * Copyright (c) 2026 IANEL Technologies. All rights reserved.
 * Designed and developed by IANEL Technologies.
 */
// Company details used across the site. Fill in the blanks before going live;
// empty values are hidden in the UI rather than shown as placeholders.
export const SITE = {
  company: 'Amsidel Enterprises Private Limited',
  shortName: 'Amsidel',
  brand: 'Amsidel Doors & Windows',
  website: 'www.amsidel.com',
  // shown as plain text only (no mailto link); email links and buttons use `altEmail`
  email: 'info@amsidel.com',
  // second address shown next to `email`, and the one every "email us" link opens
  altEmail: 'amsidelenterprises@gmail.com',
  // Website enquiries (quote form, site-visit form, AMI chat) are emailed straight from the browser through EmailJS
  // (https://www.emailjs.com, free plan: 200 emails a month); there is no backend. The inbox they go to is set in the
  // EmailJS template, not here. Setup steps: README.md > "Enquiry emails". See shared/enquiry.ts.
  emailjs: {
    serviceId: 'service_gw4if4q', // Email Services > your service's ID, e.g. 'service_ab12cd3'
    templateId: 'template_zzctiis', // Email Templates > your template's ID, e.g. 'template_x9y8z7'
    publicKey: 'nXntR4Y95VKQ89ppL', // Account > General > Public Key (safe to publish; lock it to your domain in Account > Security)
  },
  phone: '+91 79072 31647', // company and support line (AMI chat uses it too)
  // WhatsApp Business number, digits only with country code. The WhatsApp button next to the AMI chat uses it.
  whatsapp: '917907231647',
  // Set to true once the WhatsApp Business account is live: also shows WhatsApp links on the
  // contact page and product pages.
  whatsappActive: false,
  address: '', // showroom / office address
  hours: 'Mon – Sat · 9:30 AM – 6:30 PM',
  // Free site-visit booking form (/site-visit). Add towns to `areas` as service expands.
  siteVisit: {
    areas: ['Kothamangalam'],
    slots: ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'],
    closedWeekdays: [0], // Sunday (0 = Sunday … 6 = Saturday)
    maxDaysAhead: 60,
    maxPersons: 10,
  },
  social: {
    facebook: '',
    instagram: '',
    youtube: '',
    linkedin: '',
  },
} as const;

export function telHref(phone: string): string {
  return 'tel:' + phone.replace(/[^\d+]/g, '');
}

export function whatsappHref(text = ''): string {
  return `https://wa.me/${SITE.whatsapp}` + (text ? `?text=${encodeURIComponent(text)}` : '');
}
