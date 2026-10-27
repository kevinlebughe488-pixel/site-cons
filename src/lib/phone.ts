// Numéros de téléphone. En base, on stocke le format international sans « + »
// (ex. 243812345678), qui est aussi le format attendu par pawaPay.

function digitsOnly(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  return digits;
}

/** Numéro mobile congolais (RDC) au format 243XXXXXXXXX, ou null s'il est invalide. */
export function normalizeDrcPhone(input: string): string | null {
  let digits = digitsOnly(input);
  if (digits.length === 10 && digits.startsWith("0")) digits = `243${digits.slice(1)}`;
  if (digits.length === 9) digits = `243${digits}`;
  return /^243[89]\d{8}$/.test(digits) ? digits : null;
}

/** Numéro international quelconque (supporters de la diaspora), ou null. */
export function normalizeAnyPhone(input: string): string | null {
  const drc = normalizeDrcPhone(input);
  if (drc) return drc;
  const digits = digitsOnly(input);
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function formatPhone(msisdn: string | null | undefined): string {
  if (!msisdn) return "—";
  if (/^243\d{9}$/.test(msisdn)) {
    return `+243 ${msisdn.slice(3, 5)} ${msisdn.slice(5, 8)} ${msisdn.slice(8)}`;
  }
  return `+${msisdn}`;
}

export function maskPhone(msisdn: string | null | undefined): string {
  if (!msisdn) return "—";
  const formatted = formatPhone(msisdn);
  let seen = 0;
  const total = formatted.replace(/\D/g, "").length;
  return formatted.replace(/\d/g, (d) => (++seen > 5 && seen <= total - 3 ? "•" : d));
}
