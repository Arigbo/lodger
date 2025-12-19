
export const countryToCurrency: { [key: string]: string } = {
    "United States": "USD",
    "United Kingdom": "GBP",
    "Canada": "CAD",
    "Australia": "AUD",
    "Germany": "EUR",
    "France": "EUR",
    "Italy": "EUR",
    "Spain": "EUR",
    "Netherlands": "EUR",
    "Ireland": "EUR",
    "Nigeria": "NGN",
    "Ghana": "GHS",
    "Kenya": "KES",
    "South Africa": "ZAR",
    "India": "INR",
    "China": "CNY",
    "Japan": "JPY",
    "United Arab Emirates": "AED",
    "Saudi Arabia": "SAR",
    // Add more as needed
};

export const currencySymbols: { [key: string]: string } = {
    "USD": "$",
    "GBP": "£",
    "EUR": "€",
    "NGN": "₦",
    "GHS": "GH₵",
    "KES": "KSh",
    "ZAR": "R",
    "INR": "₹",
    "CAD": "C$",
    "AUD": "A$",
    "JPY": "¥",
    "CNY": "¥",
};

// Mock conversion rates (relative to USD)
// In a real app, this would come from an API
export const exchangeRates: { [key: string]: number } = {
    "USD": 1.0,
    "GBP": 0.79,
    "EUR": 0.92,
    "NGN": 1500, // Example volatile rate
    "GHS": 14.5,
    "KES": 130,
    "ZAR": 18.5,
    "INR": 83.5,
    "CAD": 1.36,
    "AUD": 1.51,
    "JPY": 157,
    "CNY": 7.24,
};

export function getCurrencyByCountry(countryName: string): string {
    return countryToCurrency[countryName] || "USD";
}

export function convertCurrency(amount: number, from: string, to: string): number {
    if (from === to) return amount;

    const rateFrom = exchangeRates[from] || 1;
    const rateTo = exchangeRates[to] || 1;

    // Convert to USD first, then to target currency
    const inUSD = amount / rateFrom;
    return inUSD * rateTo;
}
