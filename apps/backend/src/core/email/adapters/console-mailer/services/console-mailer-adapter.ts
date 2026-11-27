import { EmailDeliveryError } from "@/core/email/interfaces/email-delivery.error"
import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { Injectable } from "@nestjs/common"

/** Distinct `href` targets of an e-mail, in the order they appear. */
export function extractLinks(html: string): string[] {
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(([, href]) => href.replace(/&amp;/g, "&"))
  return [...new Set(links)]
}

/**
 * Local stand-in for a mail server: prints who the e-mail is for and the links
 * in it (the part a developer needs to click through), not the HTML.
 */
@Injectable()
export class ConsoleMailerAdapter implements EmailService {
  /** `isFailing` plays an outage of the provider (EMAIL_SIMULATE_FAILURE). */
  constructor(private readonly isFailing = false) {}

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (this.isFailing) throw new EmailDeliveryError("Simulated provider outage", "NOT_SENT")
    const links = extractLinks(html)
    console.log(`
      ====== Email Sent ======
      To: ${to}
      Subject: ${subject}
      ${links.length > 0 ? links.map((link) => `Link: ${link}`).join("\n      ") : "(no links)"}
      ========================
    `)
  }
}
