import React from 'react';

/**
 * The branded wrapper for every customer email: logo on black, the template's text (edited by the admin under
 * Email → Templates), optional detail rows, items and a button, then the contact footer. Tables and inline styles
 * only, as email apps (Gmail, Outlook) ignore most CSS.
 */

export interface EmailContent {
  /** Shown in the inbox list after the subject. */
  preview: string;
  /** The template body, already filled in; blank lines start new paragraphs. */
  body: string;
  details?: { label: string; value: string }[];
  items?: { name: string; detail?: string; quantity: number; amount: string }[];
  totals?: { label: string; value: string; strong?: boolean }[];
  button?: { label: string; href: string };
  /** A short note under the button, e.g. how to send a receipt. */
  note?: string;
}

export interface EmailBrand {
  siteUrl: string;
  businessName: string;
  email: string;
  phone: string;
  whatsapp: string;
}

const INK = '#0A0A0A';
const PINK = '#F0288C';
const MUTED = '#6B6670';
const LINE = '#ECE8EE';
const font = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Paragraphs with line breaks kept and bare links made clickable. */
function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} style={{ margin: '0 0 16px', fontSize: 15, lineHeight: '24px', color: INK }}>
            {p.split('\n').map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {line.split(/(https?:\/\/\S+)/g).map((part, k) =>
                  /^https?:\/\//.test(part) ? (
                    <a key={k} href={part} style={{ color: PINK, wordBreak: 'break-all' }}>
                      {part}
                    </a>
                  ) : (
                    <React.Fragment key={k}>{part}</React.Fragment>
                  ),
                )}
              </React.Fragment>
            ))}
          </p>
        ))}
    </>
  );
}

export function EmailLayout({ content, brand }: { content: EmailContent; brand: EmailBrand }) {
  const { preview, body, details, items, totals, button, note } = content;
  const cell = { padding: '8px 0', fontSize: 14, lineHeight: '20px', borderBottom: `1px solid ${LINE}` } as const;
  return (
    <html lang="en">
      {/* An email document, not a Next.js page. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#F6F3F7', fontFamily: font }}>
        {/* Inbox preview text, hidden in the email itself. */}
        <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden', opacity: 0 }}>{preview}</div>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#F6F3F7' }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: '24px 12px' }}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ maxWidth: 560, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' }}
                >
                  <tbody>
                    <tr>
                      {/* Pure black, to match the logo artwork's background. */}
                      <td align="center" style={{ backgroundColor: '#000000', padding: '20px 24px' }}>
                        <a href={brand.siteUrl}>
                          <img
                            src={`${brand.siteUrl}/email/logo.png`}
                            width={180}
                            height={94}
                            alt={brand.businessName}
                            style={{ display: 'block', border: 0 }}
                          />
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '28px 28px 8px' }}>
                        <Paragraphs text={body} />

                        {details && details.length > 0 && (
                          <table
                            role="presentation"
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            style={{ margin: '4px 0 20px', backgroundColor: '#FBF9FC', borderRadius: 12 }}
                          >
                            <tbody>
                              {details.map((d) => (
                                <tr key={d.label}>
                                  <td style={{ padding: '8px 16px', fontSize: 13, color: MUTED, width: '40%' }}>
                                    {d.label}
                                  </td>
                                  <td style={{ padding: '8px 16px', fontSize: 14, color: INK, fontWeight: 600 }}>
                                    {d.value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {items && items.length > 0 && (
                          <table
                            role="presentation"
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            style={{ margin: '0 0 20px' }}
                          >
                            <tbody>
                              {items.map((it, i) => (
                                <tr key={i}>
                                  <td style={{ ...cell, color: INK }}>
                                    {it.quantity} × {it.name}
                                    {it.detail && (
                                      <span style={{ display: 'block', fontSize: 12, color: MUTED }}>{it.detail}</span>
                                    )}
                                  </td>
                                  <td align="right" style={{ ...cell, color: INK, whiteSpace: 'nowrap' }}>
                                    {it.amount}
                                  </td>
                                </tr>
                              ))}
                              {totals?.map((t) => (
                                <tr key={t.label}>
                                  <td
                                    style={{
                                      padding: '6px 0',
                                      fontSize: 14,
                                      color: t.strong ? INK : MUTED,
                                      fontWeight: t.strong ? 700 : 400,
                                    }}
                                  >
                                    {t.label}
                                  </td>
                                  <td
                                    align="right"
                                    style={{
                                      padding: '6px 0',
                                      fontSize: 14,
                                      color: INK,
                                      fontWeight: t.strong ? 700 : 400,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {t.value}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {button && (
                          <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '4px 0 20px' }}>
                            <tbody>
                              <tr>
                                <td style={{ backgroundColor: INK, borderRadius: 999 }}>
                                  <a
                                    href={button.href}
                                    style={{
                                      display: 'inline-block',
                                      padding: '12px 24px',
                                      fontSize: 14,
                                      fontWeight: 600,
                                      color: '#FFFFFF',
                                      textDecoration: 'none',
                                    }}
                                  >
                                    {button.label}
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                        {note && (
                          <p style={{ margin: '0 0 20px', fontSize: 13, lineHeight: '20px', color: MUTED }}>{note}</p>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '18px 28px 24px', borderTop: `1px solid ${LINE}` }}>
                        <p style={{ margin: 0, fontSize: 12, lineHeight: '19px', color: MUTED }}>
                          Questions? Reply to this email
                          {brand.whatsapp && (
                            <>
                              {' '}
                              or{' '}
                              <a href={`https://wa.me/${brand.whatsapp}`} style={{ color: PINK }}>
                                chat with us on WhatsApp
                              </a>
                            </>
                          )}
                          .
                          {brand.phone && (
                            <>
                              <br />
                              {brand.phone}
                            </>
                          )}
                          <br />
                          <a href={brand.siteUrl} style={{ color: MUTED }}>
                            {brand.siteUrl.replace(/^https?:\/\//, '')}
                          </a>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
