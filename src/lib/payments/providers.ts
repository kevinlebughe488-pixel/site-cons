// Opérateurs Mobile Money en RDC, avec leurs codes « provider » pawaPay.
// Les codes réellement ouverts sur votre compte pawaPay se vérifient dans
// le back-office (Transactions → « Vérifier la configuration pawaPay »).

export type MobileMoneyProvider = {
  code: string;
  label: string;
  /** Préfixes après l'indicatif 243 (ex. « 81 » pour 081…). */
  prefixes: string[];
};

export const DRC_PROVIDERS: MobileMoneyProvider[] = [
  { code: "VODACOM_MPESA_COD", label: "M-Pesa (Vodacom)", prefixes: ["81", "82", "83"] },
  { code: "AIRTEL_COD", label: "Airtel Money", prefixes: ["97", "98", "99"] },
  { code: "ORANGE_COD", label: "Orange Money", prefixes: ["80", "84", "85", "89"] },
];

export function providerLabel(code: string): string {
  return DRC_PROVIDERS.find((p) => p.code === code)?.label ?? code;
}

export function isKnownProvider(code: string): boolean {
  return DRC_PROVIDERS.some((p) => p.code === code);
}

/** Devine l'opérateur à partir du numéro (243XXXXXXXXX). */
export function guessProvider(msisdn: string | null | undefined): string | null {
  if (!msisdn || !msisdn.startsWith("243")) return null;
  const prefix = msisdn.slice(3, 5);
  return DRC_PROVIDERS.find((p) => p.prefixes.includes(prefix))?.code ?? null;
}
