import { config } from "./config.js";

// Sends an SMS. "console" just logs (development); "africastalking" uses the
// Africa's Talking messaging API, which supports Liberian carriers.
export async function sendSms(to, message, log = console) {
  const { provider, atUsername, atApiKey, atSenderId } = config.sms;
  if (provider === "console") {
    log.info({ to, message }, "SMS (console provider)");
    return;
  }
  if (provider === "africastalking") {
    if (!atUsername || !atApiKey) throw new Error("AT_USERNAME and AT_API_KEY are required for Africa's Talking");
    const host = atUsername === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
    const body = new URLSearchParams({ username: atUsername, to, message });
    if (atSenderId) body.set("from", atSenderId);
    const res = await fetch(`https://${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey: atApiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`Africa's Talking error ${res.status}: ${await res.text()}`);
    return;
  }
  throw new Error(`Unknown SMS_PROVIDER "${provider}"`);
}
