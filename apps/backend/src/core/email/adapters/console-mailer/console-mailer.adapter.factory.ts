import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { ConsoleMailerAdapter } from "./services/console-mailer-adapter"

export class ConsoleMailerAdapterFactory {
  static create(options: { isFailing?: boolean } = {}): EmailService {
    return new ConsoleMailerAdapter(options.isFailing)
  }
}
