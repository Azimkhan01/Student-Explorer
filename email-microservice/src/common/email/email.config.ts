import 'dotenv/config';
import type SMTPTransport = require('nodemailer/lib/smtp-transport');

export const emailConfig: SMTPTransport.Options & {
  from: string;
} = {
  host: process.env.MAIL_HOST || 'smtp.gmail.com',

  port: Number(process.env.MAIL_PORT) || 587,

  secure: process.env.MAIL_SECURE === 'true',

  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },

  from: process.env.MAIL_FROM || process.env.MAIL_USER || '',
};