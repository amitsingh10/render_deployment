export const USERNAME_DOMAIN = "stall.sswastik.app";

export function normalizeUsername(u: string) {
  return u.trim().toLowerCase().replace(/\s+/g, "");
}

/** Login ID → auth email. Admin keeps a real email; stall IDs get a synthetic one. */
export function loginToEmail(login: string) {
  const v = login.trim();
  return v.includes("@") ? v : `${normalizeUsername(v)}@${USERNAME_DOMAIN}`;
}
