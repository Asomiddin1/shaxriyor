import { create } from 'zustand';

interface CurrencyState {
  rates: Record<string, number>;
  baseCurrency: string;
  targetCurrency: string;
  isLoading: boolean;
  fetchRates: () => Promise<void>;
  setTargetCurrency: (currency: string) => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  rates: {},
  baseCurrency: 'UZS',
  targetCurrency: 'UZS', // Default valyuta
  isLoading: false,
  setTargetCurrency: (currency) => set({ targetCurrency: currency }),
  fetchRates: async () => {
    set({ isLoading: true });
    try {
      // ExchangeRate-API bepul va ro'yxatdan o'tishni talab qilmaydi
      const res = await fetch('https://open.er-api.com/v6/latest/UZS');
      const data = await res.json();
      if (data && data.rates) {
        set({ rates: data.rates, baseCurrency: data.base_code });
      }
    } catch (error) {
      console.error('Valyuta kurslarini yuklashda xatolik:', error);
    } finally {
      set({ isLoading: false });
    }
  },
}));