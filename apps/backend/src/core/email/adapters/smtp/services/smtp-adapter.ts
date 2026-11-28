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
      // NOT_SENT only where it is certain: the server answered with a refusal, or there never was
      // a connection. nodemailer says `command: "CONN"` also for a connection lost after DATA.
      const { responseCode, code, syscall, message } = error as {
        responseCode?: number
        code?: string
        syscall?: string
        message: string
      }
      const isRefused = responseCode !== undefined && responseCode >= 400
      const isNeverConnected = code === "EDNS" || syscall === "connect"
      const isNotSent = isRefused || isNeverConnected
      throw new EmailDeliveryError(message, isNotSent ? "NOT_SENT" : "UNKNOWN")
    }
  }
}
