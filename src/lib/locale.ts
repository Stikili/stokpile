// Locale and currency formatting per SADC/Africa country.

export interface CountryLocale {
  locale: string;
  currency: string;
  currencySymbol: string;
}

export const COUNTRY_LOCALES: Record<string, CountryLocale> = {
  'South Africa': { locale: 'en-ZA', currency: 'ZAR', currencySymbol: 'R' },
  'Botswana':     { locale: 'en-BW', currency: 'BWP', currencySymbol: 'P' },
  'Namibia':      { locale: 'en-NA', currency: 'NAD', currencySymbol: 'N$' },
  'Lesotho':      { locale: 'en-LS', currency: 'LSL', currencySymbol: 'L' },
  'Eswatini':     { locale: 'en-SZ', currency: 'SZL', currencySymbol: 'E' },
  'Zimbabwe':     { locale: 'en-ZW', currency: 'ZWL', currencySymbol: 'Z$' },
  'Mozambique':   { locale: 'pt-MZ', currency: 'MZN', currencySymbol: 'MT' },
  'Zambia':       { locale: 'en-ZM', currency: 'ZMW', currencySymbol: 'K' },
  'Malawi':       { locale: 'en-MW', currency: 'MWK', currencySymbol: 'MK' },
  'Angola':       { locale: 'pt-AO', currency: 'AOA', currencySymbol: 'Kz' },
  'DRC (Congo)':  { locale: 'fr-CD', currency: 'CDF', currencySymbol: 'FC' },
  'Kenya':        { locale: 'en-KE', currency: 'KES', currencySymbol: 'KSh' },
  'Uganda':       { locale: 'en-UG', currency: 'UGX', currencySymbol: 'USh' },
  'Tanzania':     { locale: 'sw-TZ', currency: 'TZS', currencySymbol: 'TSh' },
  'Rwanda':       { locale: 'rw-RW', currency: 'RWF', currencySymbol: 'RF' },
  'Ghana':        { locale: 'en-GH', currency: 'GHS', currencySymbol: 'GH₵' },
  'Nigeria':      { locale: 'en-NG', currency: 'NGN', currencySymbol: '₦' },
  'Ethiopia':     { locale: 'en-ET', currency: 'ETB', currencySymbol: 'Br' },
  'Other':        { locale: 'en-US', currency: 'USD', currencySymbol: '$' },
};

const DEFAULT: CountryLocale = COUNTRY_LOCALES['South Africa'];

export function getLocale(country?: string | null): CountryLocale {
  if (!country) return DEFAULT;
  return COUNTRY_LOCALES[country] ?? DEFAULT;
}

export function formatCurrency(amount: number, country?: string | null): string {
  const { locale, currency } = getLocale(country);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${getLocale(country).currencySymbol}${amount.toFixed(2)}`;
  }
}

export function formatNumber(value: number, country?: string | null): string {
  const { locale } = getLocale(country);
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return value.toString();
  }
}

export function formatDate(date: string | Date, country?: string | null): string {
  const { locale } = getLocale(country);
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

export function formatDateTime(date: string | Date, country?: string | null): string {
  const { locale } = getLocale(country);
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}
