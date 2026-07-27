import type { CollaborationTicketPayload } from "./collaboration.types.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64Url = (value: Uint8Array) => {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
};

const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const signingKey = (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

export const createCollaborationTicket = async (
  payload: CollaborationTicketPayload,
  secret: string,
) => {
  const encodedPayload = toBase64Url(
    encoder.encode(JSON.stringify(payload)),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    encoder.encode(encodedPayload),
  );
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
};

export const verifyCollaborationTicket = async (
  ticket: string,
  secret: string,
): Promise<CollaborationTicketPayload | null> => {
  const [encodedPayload, encodedSignature, extra] = ticket.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await signingKey(secret),
      fromBase64Url(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      decoder.decode(fromBase64Url(encodedPayload)),
    ) as Partial<CollaborationTicketPayload>;
    if (
      payload.version !== 1 ||
      typeof payload.connectionId !== "string" ||
      typeof payload.clientId !== "string" ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Date.now() ||
      (payload.permission !== "read" && payload.permission !== "write") ||
      (payload.resourceType !== "note" &&
        payload.resourceType !== "kanbanProject" &&
        payload.resourceType !== "calendar") ||
      typeof payload.resourceId !== "string" ||
      !payload.resourceId ||
      !payload.user ||
      typeof payload.user.id !== "string" ||
      typeof payload.user.name !== "string" ||
      (payload.user.image !== null &&
        typeof payload.user.image !== "string")
    ) {
      return null;
    }
    return payload as CollaborationTicketPayload;
  } catch {
    return null;
  }
};
