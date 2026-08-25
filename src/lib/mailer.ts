import nodemailer from "nodemailer";

interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export async function sendEmailWithAttachment(opts: {
  to: string;
  subject: string;
  text: string;
  attachments?: MailAttachment[];
}) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachments: opts.attachments,
  });
}
