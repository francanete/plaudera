/**
 * One-off script to send all 3 sequence email templates for visual review.
 * Run with: npx tsx scripts/send-test-emails.ts
 */
import { emailTemplates } from "../src/lib/email-templates/sequence-templates";
import { Resend } from "resend";

const TO = "francanete@proton.me";

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set. Load your .env first.");
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const from = "Plaudera <noreply@app.plaudera.com>";

  const only = process.argv[2]; // optional: pass a template key to send just one
  const templates = Object.entries(emailTemplates).filter(
    ([key]) => !only || key === only
  ) as [
    keyof typeof emailTemplates,
    (typeof emailTemplates)[keyof typeof emailTemplates],
  ][];

  for (let i = 0; i < templates.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1500));
    const [key, templateFn] = templates[i];
    const { subject, html } = templateFn();
    // Replace unsubscribe placeholder with a # link for testing
    const finalHtml = html.replace(/\{\{unsubscribe_url\}\}/g, "#");

    console.log(`Sending "${key}"...`);
    const { data, error } = await resend.emails.send({
      from,
      to: [TO],
      subject,
      html: finalHtml,
    });

    if (error) {
      console.error(`  Failed: ${JSON.stringify(error)}`);
    } else {
      console.log(`  Sent! ID: ${data?.id}`);
    }
  }

  console.log("Done — check your inbox.");
}

main();
