import { SMTPConfig } from "@/core/email/adapters/smtp/interfaces/smtp-config.interface"
import { EmailDeliveryError } from "@/core/email/interfaces/email-delivery.error"
import { EmailService } from "@/core/email/interfaces/email-service.interface"
import { Injectable } from "@nestjs/common"
import * as nodemailer from "nodemailer"

@Injectable()
export class SMTPAdapter implements EmailService {
  private readonly transporter: nodemailer.Transporter

  constructor(private readonly config: SMTPConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    })
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.user,
        to,
        subject,
        html,
      })
    } catch (error) {
      // Refused by the server, or never connected: nothing was sent. Anything else may have been.
      const { responseCode, command, message } = error as {
        responseCode?: number
        command?: string
        message: string
      }
      const isRefused = responseCode !== undefined || command === "CONN"
      throw new EmailDeliveryError(message, isRefused ? "NOT_SENT" : "UNKNOWN")
    }
  }
}
