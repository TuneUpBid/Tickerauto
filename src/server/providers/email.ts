export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.info(`[email:console] to=${message.to} subject=${message.subject}\n${message.text}`);
  }
}

export function getEmailProvider(): EmailProvider {
  return new ConsoleEmailProvider();
}
