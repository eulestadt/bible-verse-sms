import { normalizePhone } from "./carriers";
import {
  addMessage,
  getRecentHistory,
  getSubscription,
  unsubscribe,
} from "./chat-store";
import { generateChatReply } from "./chat-gemini";
import { sendSmsViaEmail } from "./email";

function normalizeInboundBody(textBody: string): string {
  let body = textBody.trim();
  const quoteIdx = body.search(/\nOn .+ wrote:\s*\n/i);
  if (quoteIdx > 0) body = body.slice(0, quoteIdx).trim();
  return body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

/** Shared handler for AI Chat inbound messages (Twilio SMS or carrier email). */
export async function processInboundChat(phone: string, textBody: string): Promise<void> {
  const sub = getSubscription(phone);
  if (!sub || !sub.active) {
    console.warn("Inbound chat from unregistered phone:", phone);
    return;
  }

  console.log("AI Chat inbound SMS", { phone, carrierId: sub.carrierId });

  const body = normalizeInboundBody(textBody);
  const bodyUpper = body.toUpperCase();

  if (bodyUpper === "STOP") {
    unsubscribe(phone);
    await sendSmsViaEmail(
      phone,
      sub.carrierId,
      "You have been unsubscribed from AI Chat. Sign up again on our website to restart."
    );
    return;
  }
  if (bodyUpper === "HELP") {
    await sendSmsViaEmail(
      phone,
      sub.carrierId,
      "AI Chat: Text our number to chat with AI. Replies are automated. Msg&Data rates may apply. Reply STOP to opt out."
    );
    return;
  }
  if (!body) return;

  const history = getRecentHistory(phone);
  addMessage(phone, "user", body);

  try {
    const reply = await generateChatReply(body, history);
    addMessage(phone, "assistant", reply);
    await sendSmsViaEmail(phone, sub.carrierId, reply);
  } catch (err) {
    console.error("Chat reply error", err);
    await sendSmsViaEmail(phone, sub.carrierId, "Something went wrong. Please try again in a moment.");
  }
}

/** Returns true when the message was handled as AI Chat (active subscriber). */
export async function tryHandleChatSms(from: string, body: string): Promise<boolean> {
  const phone = normalizePhone(from);
  if (!phone) return false;

  const sub = getSubscription(phone);
  if (!sub || !sub.active) return false;

  await processInboundChat(phone, body);
  return true;
}
