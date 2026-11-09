
import {
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';

import nodemailer, { type Transporter } from 'nodemailer';
import handlebars, {
    type TemplateDelegate,
} from 'handlebars';

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { emailConfig } from './email.config.js';
import type { SendEmailOptions } from './email.interface.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    private transporter: Transporter;

    private readonly templateCache = new Map<
        string,
        TemplateDelegate
    >();

    constructor() {
        this.transporter = nodemailer.createTransport(emailConfig);

        this.transporter.verify()
            .then(() => {
                this.logger.log('SMTP server connection successful');
            })
            .catch((error: Error) => {
                this.logger.error(
                    `SMTP connection failed: ${error.message}`,
                );
            });
    }

    /**
     * Compile and cache Handlebars templates
     */
    private getTemplate(templateName: string): TemplateDelegate {
        // Validate template name
        if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
            throw new Error('Invalid template name');
        }

        // Return cached template if available
        const cachedTemplate = this.templateCache.get(templateName);

        if (cachedTemplate) {
            return cachedTemplate;
        }

        // Template location:
        // src/common/email/email.service.ts
        // src/common/template/creator-code.hbs

        const templatePath = join(
            __dirname,
            '..',
            'template',
            `${templateName}.hbs`,
        );

        this.logger.log(`Loading email template: ${templatePath}`);

        const templateSource = readFileSync(
            templatePath,
            'utf-8',
        );

        const compiledTemplate = handlebars.compile(templateSource);

        this.templateCache.set(
            templateName,
            compiledTemplate,
        );

        return compiledTemplate;
    }

    /**
     * Send email
     */
    async sendEmail(
        options: SendEmailOptions,
    ): Promise<{ messageId: string }> {
        try {
            const {
                to,
                subject,
                template,
                context = {},
                html,
                text,
                cc,
                bcc,
                replyTo,
                attachments,
            } = options;

            let emailHtml = html;

            // Compile Handlebars template
            if (template) {
                const compiledTemplate = this.getTemplate(template);
                emailHtml = compiledTemplate(context);
            }

            // Validate email content
            if (!emailHtml && !text) {
                throw new Error(
                    'Either HTML, text, or a template must be provided',
                );
            }

            const info = await this.transporter.sendMail({
                from: emailConfig.from,
                to,
                subject,
                html: emailHtml,
                text,
                cc,
                bcc,
                replyTo,
                attachments,
            });

            this.logger.log(
                `Email successfully sent. Message ID: ${info.messageId}`,
            );

            return {
                messageId: info.messageId,
            };
        } catch (error) {
            const err = error as Error;

            this.logger.error(
                `Email sending failed: ${err.message}`,
                err.stack,
            );

            throw new InternalServerErrorException(
                'Unable to send email',
            );
        }
    }
}
