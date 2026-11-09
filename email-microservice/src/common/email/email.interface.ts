export interface EmailAttachment {
  filename?: string;
  content?: string | Buffer;
  path?: string;
  href?: string;
  contentType?: string;
  encoding?: string;
  cid?: string;
}

export interface SendEmailOptions {
  to: string | string[];

  subject: string;

  template?: string;

  context?: Record<string, any>;

  html?: string;

  text?: string;

  cc?: string | string[];

  bcc?: string | string[];

  replyTo?: string;

  attachments?: EmailAttachment[];
}