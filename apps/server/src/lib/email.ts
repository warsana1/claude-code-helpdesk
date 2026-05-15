import sgMail from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendReplyEmail({
  to,
  toName,
  subject,
  text,
  html,
  inReplyTo,
}: {
  to: string;
  toName: string;
  subject: string;
  text: string;
  html?: string | null;
  inReplyTo?: string | null;
}) {
  if (!process.env.SENDGRID_API_KEY || !process.env.SUPPORT_EMAIL) return;

  await sgMail.send({
    to: { email: to, name: toName },
    from: {
      email: process.env.SUPPORT_EMAIL,
      name: process.env.SUPPORT_NAME ?? "Support",
    },
    subject,
    text,
    ...(html ? { html } : {}),
    headers: {
      ...(inReplyTo
        ? { "In-Reply-To": inReplyTo, References: inReplyTo }
        : {}),
    },
  });
}
