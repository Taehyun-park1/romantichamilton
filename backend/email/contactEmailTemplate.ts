export interface ContactEmailTemplateData {
  name: string;
  phone: string;
  email: string;
  message: string;
  submittedAt: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInfoRow(label: string, value: string, isLast = false) {
  return `
    <tr>
      <td style="width: 96px; padding: 15px 0; border-bottom: ${isLast ? "0" : "1px solid #E3DDD3"}; color: #8A8178; font-size: 12px; line-height: 1.5; letter-spacing: 0.08em; text-transform: uppercase; vertical-align: top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding: 15px 0; border-bottom: ${isLast ? "0" : "1px solid #E3DDD3"}; color: #171311; font-size: 15px; line-height: 1.6; vertical-align: top;">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

export function renderContactEmailHtml(data: ContactEmailTemplateData) {
  const safeMessage = escapeHtml(data.message).replaceAll("\n", "<br />");

  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Romantic Hamilton 제작 문의</title>
  </head>
  <body style="margin: 0; padding: 0; background: #F8F6F1; color: #171311; font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
      ${escapeHtml(data.name)}님의 새로운 제작 문의가 도착했습니다.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background: #F8F6F1;">
      <tr>
        <td align="center" style="padding: 48px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px;">
            <tr>
              <td style="padding: 0 0 22px; text-align: center;">
                <a href="https://romantichamilton.store" style="color: #171311; font-family: Georgia, 'Times New Roman', serif; font-size: 25px; line-height: 1.2; text-decoration: none;">
                  Romantic Hamilton
                </a>
                <div style="margin-top: 9px; color: #A06A3E; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;">
                  Leather Workshop
                </div>
              </td>
            </tr>
            <tr>
              <td style="background: #22352F; padding: 34px 40px;">
                <div style="color: #CDAA86; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase;">
                  New Contact
                </div>
                <h1 style="margin: 12px 0 0; color: #FFFFFF; font-family: Georgia, 'Times New Roman', serif; font-size: 30px; font-weight: 400; line-height: 1.35;">
                  새로운 제작 문의가<br />도착했습니다.
                </h1>
              </td>
            </tr>
            <tr>
              <td style="background: #FFFFFF; padding: 34px 40px 38px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${renderInfoRow("Name", data.name)}
                  ${renderInfoRow("Phone", data.phone)}
                  ${renderInfoRow("Email", data.email)}
                  ${renderInfoRow("Received", data.submittedAt, true)}
                </table>

                <div style="margin-top: 30px; color: #A06A3E; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase;">
                  Message
                </div>
                <div style="margin-top: 12px; padding: 24px; background: #F4F0EA; color: #352F2B; font-size: 15px; line-height: 1.85; overflow-wrap: anywhere;">
                  ${safeMessage}
                </div>

                <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top: 30px;">
                  <tr>
                    <td style="background: #22352F;">
                      <a href="mailto:${encodeURIComponent(data.email)}" style="display: inline-block; padding: 14px 24px; color: #FFFFFF; font-size: 13px; letter-spacing: 0.04em; text-decoration: none;">
                        문의자에게 답장하기
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin: 20px 0 0; color: #8A8178; font-size: 12px; line-height: 1.7;">
                  메일 앱의 답장 버튼을 눌러도 문의자 이메일로 바로 연결됩니다.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 12px 0; text-align: center; color: #8A8178; font-size: 11px; line-height: 1.7;">
                Romantic Hamilton · Handcrafted Leather Goods<br />
                <a href="https://romantichamilton.store" style="color: #A06A3E; text-decoration: none;">romantichamilton.store</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
