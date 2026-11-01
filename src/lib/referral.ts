// Lien d'ambassadeur : https://…/campagnes/xxx?ref=CODE. Le proxy garde le code
// 30 jours dans un cookie ; la prochaine contribution lui est attribuée.
export const REFERRAL_COOKIE = "tribune_ref";
export const REFERRAL_MAX_AGE = 30 * 24 * 3600;
export const REFERRAL_PATTERN = /^[a-z0-9]{6,12}$/;
