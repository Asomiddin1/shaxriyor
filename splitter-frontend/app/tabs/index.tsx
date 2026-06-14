import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  View as RNView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { YStack, XStack, Text, View, useTheme } from 'tamagui';
import {
  ScanLine,
  Users,
  FolderOpen,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  Clock,
  ReceiptText,
} from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import UserAvatar from '@/shared/ui/UserAvatar';
import type { SessionHistoryEntry } from '@/features/sessions/api/history.api';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import { useAppStore } from '@/shared/lib/stores/app-store';
// STORE'NI TO'G'RI YO'LDAN CHAQIRING (1-qadamda yaratilgan fayl)
import { useCurrencyStore } from '@/shared/lib/stores/currency.store'; 

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_H = 200;
const HOME_HISTORY_LIMIT = 20;
const DEFAULT_CURRENCY = 'UZS';

// ─── helpers ────────────────────────────────────────────────────────────────

const getSafeLocale = (locale: string) => {
  if (locale.startsWith('jp') || locale.startsWith('ja')) return 'ja-JP';
  if (locale.startsWith('uz')) return 'uz-UZ';
  return 'en-US';
};

const fmtNumber = (n: number, locale = 'en'): string => {
  const value = Math.round(n || 0);
  try {
    return value.toLocaleString(getSafeLocale(locale), {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  } catch {
    const str = value.toString();
    if (locale.startsWith('uz')) {
      return str.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
};

const fmtMoney = (
  n: number,
  currency: string = DEFAULT_CURRENCY,
  locale = 'en'
): string => {
  const value = Math.round(n || 0);
  const safeLocale = getSafeLocale(locale);

  // UZS uchun maxsus holat: valyuta belgisi doim raqamdan keyin turishi uchun
  // Intl.NumberFormat'ni chetlab o'tamiz.
  if (currency === 'UZS') {
    const formattedNum = fmtNumber(value, locale);
    if (locale.startsWith('uz')) return `${formattedNum} so'm`;
    return `${formattedNum} UZS`;
  }

  // Boshqa valyutalar uchun standart format (USD va JPY o'z joyida to'g'ri ishlaydi)
  try {
    return new Intl.NumberFormat(safeLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    const formattedNum = fmtNumber(value, locale);
    if (currency === 'JPY') return `¥${formattedNum}`;
    if (currency === 'USD') return `$${formattedNum}`;
    return `${formattedNum} ${currency}`;
  }
};

const fmtDate = (iso?: string, locale = 'en') => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(getSafeLocale(locale), { day: '2-digit', month: 'short' });
};

// YANGA FUNKSIYA: Kurslar bo'yicha pulni konvertatsiya qilish
const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number => {
  if (fromCurrency === toCurrency || !rates[fromCurrency] || !rates[toCurrency]) {
    return amount;
  }
  const inBase = amount / rates[fromCurrency];
  return inBase * rates[toCurrency];
};

// ─── Stats ──────────────────────────────────────────────────────────────────

interface Stats {
  totalSpent: number;
  totalBills: number;
  avgBill: number;
  thisMonthSpent: number;
  thisMonthBills: number;
  currency: string;
}

// Barcha statiskalarni bitta (tanlangan) valyutada hisoblaymiz
function computeStats(
  sessions: SessionHistoryEntry[],
  targetCurrency: string,
  rates: Record<string, number>
): Stats {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let totalSpent = 0;
  let thisMonthSpent = 0;
  let thisMonthBills = 0;

  for (const s of sessions) {
    const originalCurrency = s.currency || s.payload?.totals?.currency || DEFAULT_CURRENCY;
    const amount = s.grandTotal ?? 0;
    
    // API orqali valyutani konvertatsiya qilamiz
    const convertedAmount = convertCurrency(amount, originalCurrency, targetCurrency, rates);
    
    totalSpent += convertedAmount;
    const ts = s.finalizedAt ? new Date(s.finalizedAt).getTime() : 0;
    if (ts >= monthStart) {
      thisMonthSpent += convertedAmount;
      thisMonthBills++;
    }
  }

  return {
    totalSpent,
    totalBills: sessions.length,
    avgBill: sessions.length ? Math.round(totalSpent / sessions.length) : 0,
    thisMonthSpent,
    thisMonthBills,
    currency: targetCurrency,
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function BalanceCard({
  stats,
  username,
  locale,
}: {
  stats: Stats;
  username: string;
  locale: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={S.cardWrap} mx="$4" mb="$4">
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={S.card}
      >
        <RNView style={S.circle1} />
        <RNView style={S.circle2} />

        <XStack jc="space-between" ai="center" mb="$2">
          <YStack f={1} pr="$2">
            <Text color="rgba(255,255,255,0.6)" fontSize={11} fontWeight="500" letterSpacing={1}>
              {t('home.stats.totalSpent', 'TOTAL SPENT')}
            </Text>
            <Text
              color="white"
              fontSize={26}
              fontWeight="800"
              mt={2}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {fmtMoney(stats.totalSpent, stats.currency, locale)}
            </Text>
          </YStack>
          <View
            w={44}
            h={44}
            br={22}
            ai="center"
            jc="center"
            backgroundColor="rgba(46,204,113,0.2)"
            borderWidth={1}
            borderColor="rgba(46,204,113,0.4)"
          >
            <Wallet size={20} color="#2ECC71" />
          </View>
        </XStack>

        <View h={0.5} backgroundColor="hsla(0, 0%, 100%, 0.12)" my="$2" />

        <XStack jc="space-between" ai="center">
          <YStack ai="center" f={1}>
            <Text color="rgba(255,255,255,0.5)" fontSize={10} fontWeight="500">{t('home.stats.bills', 'BILLS')}</Text>
            <Text color="white" fontSize={16} fontWeight="700" mt={2} numberOfLines={1} adjustsFontSizeToFit>{stats.totalBills}</Text>
          </YStack>
          <View w={0.5} h={32} backgroundColor="rgba(255,255,255,0.12)" />
          <YStack ai="center" f={1} px={4}>
            <Text color="rgba(255,255,255,0.5)" fontSize={10} fontWeight="500">{t('home.stats.avgBill', 'AVG BILL')}</Text>
            <Text color="white" fontSize={16} fontWeight="700" mt={2} numberOfLines={1} adjustsFontSizeToFit>{fmtMoney(stats.avgBill, stats.currency, locale)}</Text>
          </YStack>
          <View w={0.5} h={32} backgroundColor="rgba(255,255,255,0.12)" />
          <YStack ai="center" f={1} px={4}>
            <Text color="rgba(255,255,255,0.5)" fontSize={10} fontWeight="500">{t('home.stats.thisMonth', 'THIS MONTH')}</Text>
            <Text color="#2ECC71" fontSize={16} fontWeight="700" mt={2} numberOfLines={1} adjustsFontSizeToFit>{fmtMoney(stats.thisMonthSpent, stats.currency, locale)}</Text>
          </YStack>
        </XStack>
      </LinearGradient>
    </View>
  );
}

function TxRow({
  bill,
  onPress,
  targetCurrency,
  rates,
  locale,
}: {
  bill: SessionHistoryEntry;
  onPress: () => void;
  targetCurrency: string;
  rates: Record<string, number>;
  locale: string;
}) {
  const originalCurrency = bill.currency || bill.payload?.totals?.currency || DEFAULT_CURRENCY;
  const originalAmount = bill.grandTotal ?? 0;
  
  // Tranzaksiyani ham foydalanuvchi ko'rib turgan valyutaga konvertatsiya qilamiz
  const amount = convertCurrency(originalAmount, originalCurrency, targetCurrency, rates);

  const date = fmtDate(bill.finalizedAt || bill.createdAt, locale);
  const participantCount = bill.participantUniqueIds?.length ?? 0;
  const isCreator = bill.isCreator;
  const { t } = useTranslation();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <XStack px="$4" py="$3" ai="center" gap="$3" borderBottomWidth={0.5} borderBottomColor="$gray4">
        <View w={44} h={44} br={14} ai="center" jc="center" backgroundColor={isCreator ? '#E8F8EF' : '#EEF2FF'}>
          <ReceiptText size={20} color={isCreator ? '#2ECC71' : '#6366F1'} />
        </View>
        <YStack f={1} gap={2}>
          <Text fontSize={14} fontWeight="600" color="$color12" numberOfLines={1}>
            {bill.sessionName || t('home.transactions.billFallback', 'Bill')}
          </Text>
          <XStack ai="center" gap="$1.5">
            <Text fontSize={11} color="$gray9">{date}</Text>
            {participantCount > 0 && (
              <>
                <Text fontSize={11} color="$gray6">·</Text>
                <Text fontSize={11} color="$gray9">{t('home.transactions.people', { count: participantCount })}</Text>
              </>
            )}
          </XStack>
        </YStack>
        <YStack ai="flex-end" gap={2}>
          <XStack ai="center" gap={3}>
            {isCreator ? (
              <ArrowUpRight size={13} color="#2ECC71" />
            ) : (
              <ArrowDownLeft size={13} color="#6366F1" />
            )}
            <Text fontSize={15} fontWeight="700" color={isCreator ? '#2ECC71' : '#6366F1'} numberOfLines={1}>
              {fmtMoney(amount, targetCurrency, locale)}
            </Text>
          </XStack>
          <Text fontSize={10} color="$gray8" fontWeight="500">{targetCurrency}</Text>
        </YStack>
      </XStack>
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user } = useAppStore();
  const themeColors = useTheme();
  const screenBg = themeColors.background?.val ?? '#ffffff';
  const insets = useSafeAreaInsets();
  const scrollPaddingBottom = insets.bottom + 80;

  const sessions = useSessionsHistoryStore((s) => s.sessions);
  const loading = useSessionsHistoryStore((s) => s.loading);
  const initialized = useSessionsHistoryStore((s) => s.initialized);
  const currentLimit = useSessionsHistoryStore((s) => s.limit);
  const fetchHistory = useSessionsHistoryStore((s) => s.fetchHistory);
  const refreshIfStale = useSessionsHistoryStore((s) => s.refreshIfStale);
  const forceRefresh = useSessionsHistoryStore((s) => s.forceRefresh);

  // Valyuta Store
  const { rates, targetCurrency, fetchRates, setTargetCurrency } = useCurrencyStore();

  const hasFetchedRef = useRef(false);
  const [refreshing, setRefreshing] = React.useState(false);

  // Komponent yuklanganda API orqali kurslarni bir marta tortamiz
  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (hasFetchedRef.current) return;
    if (!initialized || (currentLimit ?? 0) < HOME_HISTORY_LIMIT) {
      hasFetchedRef.current = true;
      fetchHistory(HOME_HISTORY_LIMIT).catch(() => {
        hasFetchedRef.current = false;
      });
    }
  }, [initialized, loading, currentLimit]);

  useFocusEffect(
    useCallback(() => {
      refreshIfStale(15_000, HOME_HISTORY_LIMIT).catch(() => {});
    }, [refreshIfStale])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRates(); // Valyuta kurslarini ham yangilaymiz
      await forceRefresh(HOME_HISTORY_LIMIT);
    } finally {
      setRefreshing(false);
    }
  }, [forceRefresh, fetchRates]);

  const stats = useMemo(() => computeStats(sessions, targetCurrency, rates), [sessions, targetCurrency, rates]);
  const locale = i18n.language ?? 'en';
  const username = user?.username ?? 'there';

  const grouped = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const toLabel = (iso?: string) => {
      if (!iso) return t('home.dates.earlier', 'Earlier');
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return t('home.dates.earlier', 'Earlier');
      if (d.toDateString() === today.toDateString()) return t('home.dates.today', 'Today');
      if (d.toDateString() === yesterday.toDateString()) return t('home.dates.yesterday', 'Yesterday');
      return d.toLocaleDateString(getSafeLocale(locale), { weekday: 'long', day: 'numeric', month: 'short' });
    };

    const result: { label: string; items: SessionHistoryEntry[] }[] = [];
    let currentLabel = '';

    for (const s of sessions) {
      const label = toLabel(s.finalizedAt || s.createdAt);
      if (label !== currentLabel) {
        result.push({ label, items: [] });
        currentLabel = label;
      }
      result[result.length - 1].items.push(s);
    }
    return result;
  }, [sessions, locale, t]);

  // Valyutani bosilganda UZS -> USD -> JPY -> UZS ga o'zgartirish qismi
  const toggleCurrency = () => {
    if (targetCurrency === 'UZS') setTargetCurrency('USD');
    else if (targetCurrency === 'USD') setTargetCurrency('JPY');
    else setTargetCurrency('UZS');
  };

  return (
    <RNView style={[S.container, { backgroundColor: screenBg }]}>
      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />
        }
      >
        <View pt="$4">
          {/* TUGMA SHU YERGA QO'SHILDI */}
          <XStack ai="center" jc="flex-end" px="$4" pb="$3">
            <Pressable onPress={toggleCurrency}>
              <View px="$3" py="$1.5" br={16} backgroundColor="$gray3" borderWidth={1} borderColor="$gray4">
                <XStack ai="center" gap="$1.5">
                  <Text fontSize={12} fontWeight="700" color="$color11">
                    {targetCurrency}
                  </Text>
                  <Text fontSize={11}>🔄</Text>
                </XStack>
              </View>
            </Pressable>
          </XStack>

          <BalanceCard stats={stats} username={username} locale={locale} />
        </View>

        {stats.thisMonthBills > 0 && (
          <XStack
            mx="$4"
            mb="$4"
            p="$3"
            br={16}
            backgroundColor="#F0FDF6"
            borderWidth={1}
            borderColor="#BBEED0"
            ai="center"
            gap="$3"
          >
            <View w={36} h={36} br={12} ai="center" jc="center" backgroundColor="#2ECC71">
              <TrendingUp size={18} color="white" />
            </View>
            <YStack f={1}>
              <Text fontSize={13} fontWeight="700" color="#166534">
                {t('home.summary.thisMonth', {
                  amount: fmtMoney(stats.thisMonthSpent, targetCurrency, locale),
                  defaultValue: '{{amount}} this month',
                })}
              </Text>
              <Text fontSize={11} color="#4ADE80">
                {t('home.summary.billsSplit', {
                  count: stats.thisMonthBills,
                  defaultValue: '{{count}} bills split',
                })}
              </Text>
            </YStack>
          </XStack>
        )}

        <View mx="$4" mb="$2">
          <XStack ai="center" jc="space-between">
            <Text fontSize={17} fontWeight="700" color="$color12">{t('home.transactions.title', 'Transactions')}</Text>
            <Pressable onPress={() => router.push('/tabs/sessions/history/')}>
              <XStack ai="center" gap={4}>
                <Text fontSize={13} color="#2ECC71" fontWeight="600">{t('home.transactions.seeAll', 'See all')}</Text>
                <ChevronRight size={14} color="#2ECC71" />
              </XStack>
            </Pressable>
          </XStack>
        </View>

        {loading && !refreshing && (
          <YStack ai="center" py="$6">
            <Text color="$gray9" fontSize={14}>{t('home.transactions.loading', 'Loading transactions...')}</Text>
          </YStack>
        )}

        {!loading && sessions.length === 0 && (
          <YStack ai="center" py="$8" gap="$3">
            <View w={72} h={72} br={24} ai="center" jc="center" backgroundColor="$gray3">
              <ReceiptText size={32} color="$gray8" />
            </View>
            <YStack ai="center" gap="$1">
              <Text fontSize={16} fontWeight="600" color="$gray10">{t('home.transactions.emptyTitle', 'No transactions yet')}</Text>
              <Text fontSize={13} color="$gray8">{t('home.transactions.emptySubtitle', 'Scan a receipt to get started')}</Text>
            </YStack>
            <Pressable onPress={() => router.push('/tabs/scan-receipt')}>
              <View px="$5" py="$3" br={12} backgroundColor="#2ECC71" mt="$1">
                <XStack ai="center" gap="$2">
                  <ScanLine size={16} color="white" />
                  <Text fontSize={14} fontWeight="700" color="white">{t('home.transactions.scanReceipt', 'Scan receipt')}</Text>
                </XStack>
              </View>
            </Pressable>
          </YStack>
        )}

        {grouped.map(({ label, items }) => (
          <View key={label} mb="$2">
            <XStack px="$4" py="$2" ai="center">
              <Text fontSize={12} fontWeight="600" color="$gray9" textTransform="uppercase" letterSpacing={0.5}>
                {label}
              </Text>
            </XStack>
            <View mx="$4" br={16} borderWidth={1} borderColor="$gray4" backgroundColor="$gray2" overflow="hidden">
              {items.map((bill) => (
                <TxRow
                  key={bill.sessionId}
                  bill={bill}
                  targetCurrency={targetCurrency} // Konvertatsiya uchun uzatamiz
                  rates={rates}                   // Konvertatsiya uchun uzatamiz
                  locale={locale}
                  onPress={() =>
                    router.push({
                      pathname: '/tabs/sessions/history/[historyId]',
                      params: { historyId: String(bill.sessionId) },
                    })
                  }
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </RNView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  cardWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0f3460',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    height: CARD_H,
    padding: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.04)',
    top: -60,
    right: -40,
  },
  circle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(46,204,113,0.08)',
    bottom: -30,
    left: 30,
  },
});