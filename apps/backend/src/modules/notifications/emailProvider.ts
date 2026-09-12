/**
 * Email provider abstraction (spec section 38). Real email delivery is
 * explicitly deferred per the original spec — this interface exists so
 * that wiring in a real provider (SendGrid, SES, etc.) later touches
 * ONE file, not every place that wants to send a notification email.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

/**
 * No-op implementation: logs what WOULD have been sent, sends nothing.
 * This is the only implementation that exists right now, by design.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[EmailProvider - NOT ACTUALLY SENT] To: ${message.to} | Subject: ${message.subject}`);
  }
}

export const emailProvider: EmailProvider = new ConsoleEmailProvider();