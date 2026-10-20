import nodemailer from "nodemailer";
import { env } from "@config/env";

export interface ProductionOrderEmailData {
  productionNumber: string;
  soNumber?: string | null;
  poNumber?: string | null;
  companyName?: string | null;
  brandName?: string | null;
  totalQty?: number | string | null;
  completedAt?: Date | string | null;
}

export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  /**
   * Sends an email to ceo@3qfacility.com when a production order is marked as complete.
   */
  async sendProductionCompletedEmail(orderData: ProductionOrderEmailData): Promise<boolean> {
    try {
      const recipient = env.CEO_EMAIL;
      const subject = `Order Complete Notification - ${orderData.productionNumber}${orderData.soNumber ? ` (SO: ${orderData.soNumber})` : ""
        }`;

      const customMessage = `Dear recipient, your order is complete. Please share PO copy if not so that we will dispatch your order. If already shared, stay calm, we will dispatch your order shortly.`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Order Completed</h2>
          <p style="font-size: 15px; color: #334155; line-height: 1.6; background-color: #f8fafc; padding: 16px; border-radius: 6px; border-left: 4px solid #0284c7;">
            ${customMessage}
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <h3 style="color: #1e293b; font-size: 16px; margin-bottom: 12px;">Order Summary:</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold; width: 40%;">Production Number:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${orderData.productionNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Sales Order (SO):</td>
              <td style="padding: 8px 0; color: #0f172a;">${orderData.soNumber || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">PO Number:</td>
              <td style="padding: 8px 0; color: #0f172a;">${orderData.poNumber || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Company / Brand:</td>
              <td style="padding: 8px 0; color: #0f172a;">${orderData.companyName || "N/A"}${orderData.brandName ? ` / ${orderData.brandName}` : ""}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Total Quantity:</td>
              <td style="padding: 8px 0; color: #0f172a;">${orderData.totalQty != null ? Number(orderData.totalQty).toLocaleString() : "N/A"}</td>
            </tr>
          </table>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
            Sent automatically by 3Q Facility ERP System
          </div>
        </div>
      `;

      const info = await this.getTransporter().sendMail({
        from: env.SMTP_FROM,
        to: recipient,
        subject,
        text: `${customMessage}\n\nOrder Details:\n- Production Number: ${orderData.productionNumber}\n- SO Number: ${orderData.soNumber || 'N/A'}\n- PO Number: ${orderData.poNumber || 'N/A'}\n- Company: ${orderData.companyName || 'N/A'}\n- Brand: ${orderData.brandName || 'N/A'}\n- Quantity: ${orderData.totalQty != null ? Number(orderData.totalQty).toLocaleString() : 'N/A'}`,
        html: htmlContent,
      });

      console.log(`[MailService] Production completion email sent to ${recipient}: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error("[MailService] Failed to send production completion email:", error);
      return false;
    }
  }
}

export const mailService = new MailService();
