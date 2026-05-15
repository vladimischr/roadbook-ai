// ============================================================================
// Tracking d'affiliation côté client
// ============================================================================
// Quand un visiteur arrive avec ?ref=SOPHIE25 dans l'URL, on stocke le code
// dans un cookie 30 jours. Si la personne s'inscrit dans cette fenêtre,
// l'attribution se fait au signup (cf. /api/affiliate-attribute).
//
// Cookie plutôt que localStorage : on veut couvrir le cas où l'inscription
// se fait depuis un onglet différent ou après un reload. Cookie avec SameSite=Lax
// pour qu'il survive aux redirects OAuth.

const COOKIE_NAME = "rb_ref";
const COOKIE_DAYS = 30;

/**
 * Validation soft du code côté client. On accepte :
 *  - 3 à 32 caractères
 *  - lettres, chiffres, tirets, underscores
 * La validation forte (existence du code en DB) se fait côté serveur.
 */
function isValidCodeShape(code: string): boolean {
  return /^[A-Za-z0-9_-]{3,32}$/.test(code);
}

function setCookie(value: string) {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_DAYS * 24 * 60 * 60;
  // SameSite=Lax pour survivre aux navigations cross-site (ex : clic depuis
  // un mail). Secure en prod uniquement (Cloudflare le fait déjà via _headers,
  // mais on est défensif).
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

function getCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const raw = match.slice(COOKIE_NAME.length + 1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function clearCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/**
 * À appeler au mount du root component. Lit ?ref= dans l'URL et le
 * persiste dans un cookie 30j. Idempotent : si le cookie existe déjà,
 * il est remplacé (last-touch attribution — l'affilié qui a généré le
 * dernier clic gagne, standard SaaS).
 */
export function captureRefFromUrl() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (!ref) return;
  const trimmed = ref.trim().toUpperCase();
  if (!isValidCodeShape(trimmed)) return;
  setCookie(trimmed);
}

/**
 * Lit le code d'affilié stocké, à appeler juste après un signup réussi
 * pour l'attacher au profil utilisateur via /api/affiliate-attribute.
 */
export function getStoredRefCode(): string | null {
  return getCookie();
}

/**
 * À appeler après une attribution réussie : on libère le cookie pour
 * qu'un futur signup depuis le même device ne réutilise pas l'ancien code.
 */
export function clearRefCode() {
  clearCookie();
}
