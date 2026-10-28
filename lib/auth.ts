export const SESSION_COOKIE = "vm_sesion";
export const SESSION_DURACION_SEG = 60 * 60 * 24 * 7; // 7 días

export function usuarioEsperado(): string {
  return process.env.APP_USER || "este";
}

export function passwordEsperado(): string {
  return process.env.APP_PASSWORD || "1914";
}

function aHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function clave(secreto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

export async function firmarToken(usuario: string): Promise<string> {
  const key = await clave(passwordEsperado());
  const firma = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`vida-y-ministerio:${usuario}`),
  );
  return `${usuario}.${aHex(firma)}`;
}

export async function tokenValido(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const esperado = await firmarToken(usuarioEsperado());
  if (token.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ esperado.charCodeAt(i);
  }
  return diff === 0;
}

export async function credencialesCorrectas(usuario: string, password: string): Promise<boolean> {
  const u = usuarioEsperado();
  const p = passwordEsperado();
  if (usuario.length !== u.length || password.length !== p.length) return false;
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u.charCodeAt(i) ^ usuario.charCodeAt(i);
  for (let i = 0; i < p.length; i++) diff |= p.charCodeAt(i) ^ password.charCodeAt(i);
  return diff === 0;
}
