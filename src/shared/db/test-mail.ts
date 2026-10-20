import { mailService } from "@shared/services/mail.service.js";

async function main() {
  console.log("Testing mailService.sendProductionCompletedEmail()...");

  const testOrder = {
    productionNumber: "PRD-TEST-00001",
    soNumber: "SO-99999",
    poNumber: "PO-SAMPLE-123",
    companyName: "Sample Client Ltd",
    brandName: "Sample Brand",
    totalQty: 50000,
    completedAt: new Date(),
  };

  const success = await mailService.sendProductionCompletedEmail(testOrder);
  if (success) {
    console.log("SUCCESS: Completion notification email sent successfully.");
  } else {
    console.log("NOTICE: Email send failed (or SMTP server unavailable). Check SMTP settings in .env.");
  }
}

main().catch((err) => {
  console.error("Error running test-mail script:", err);
  process.exit(1);
});
