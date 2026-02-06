import { MOCK_RATES } from './edit-constants';

export const convertPrice = (
  currentPrice: number,
  fromCurrency: string,
  toCurrency: string
): number => {
  const rateFrom = MOCK_RATES[fromCurrency] || 1;
  const rateTo = MOCK_RATES[toCurrency] || 1;
  
  // Price in base (USD) * rateTo / rateFrom
  return Math.round((currentPrice / rateFrom) * rateTo);
};

export const parseRules = (rulesString: string): string[] => {
  return rulesString
    ? rulesString
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean)
    : [];
};
