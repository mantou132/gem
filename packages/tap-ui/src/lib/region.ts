import { locale } from './locale';

/**ISO 3166-1 alpha-2 */
export const regionCodes =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
    ' ',
  );

/**`CN` => 🇨🇳 */
export function getRegionFlag(code: string) {
  return String.fromCodePoint(...[...code.toUpperCase()].map((char) => 0x1f1a5 + char.charCodeAt(0)));
}

export function getRegionName(code: string, lang = locale.localeCode) {
  return new Intl.DisplayNames(lang, { type: 'region' }).of(code) || code;
}

/**Region inferred from the browser language, e.g. `zh-CN` => `CN`, `zh` => `CN` */
export function getCurrentRegion() {
  return new Intl.Locale(navigator.language).maximize().region;
}

/**Items for `<tap-pat-picker>`, searchable by code and English name */
export function getRegionItems(codes = regionCodes) {
  const names = new Intl.DisplayNames(locale.localeCode, { type: 'region' });
  const enNames = new Intl.DisplayNames('en', { type: 'region' });
  return codes.map((code) => ({
    label: names.of(code) || code,
    value: code,
    icon: getRegionFlag(code),
    keywords: [code, enNames.of(code) || code],
  }));
}
