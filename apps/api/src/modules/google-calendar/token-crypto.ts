const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
};

const fromBase64Url = (value: string) => {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const deriveAesKey = async (secret: string) => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
};

export const encryptCalendarToken = async (token: string, secret: string) => {
  const key = await deriveAesKey(secret);
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    key,
    encoder.encode(token),
  );
  return `v1.${toBase64Url(initializationVector)}.${toBase64Url(
    new Uint8Array(ciphertext),
  )}`;
};

export const decryptCalendarToken = async (
  encryptedToken: string,
  secret: string,
) => {
  const [version, initializationVector, ciphertext] =
    encryptedToken.split(".");
  if (version !== "v1" || !initializationVector || !ciphertext) {
    throw new Error("The saved Google Calendar token is invalid.");
  }
  const key = await deriveAesKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64Url(initializationVector) },
    key,
    fromBase64Url(ciphertext),
  );
  return decoder.decode(plaintext);
};

const importSigningKey = (secret: string) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

export const createSignedCalendarState = async (
  payload: Record<string, unknown>,
  secret: string,
) => {
  const encodedPayload = toBase64Url(
    encoder.encode(JSON.stringify(payload)),
  );
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(encodedPayload),
  );
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
};

export const readSignedCalendarState = async <T>(
  state: string,
  secret: string,
): Promise<T | null> => {
  const [encodedPayload, encodedSignature] = state.split(".");
  if (!encodedPayload || !encodedSignature) return null;
  const key = await importSigningKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(encodedSignature),
    encoder.encode(encodedPayload),
  );
  if (!valid) return null;

  try {
    return JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as T;
  } catch {
    return null;
  }
};
