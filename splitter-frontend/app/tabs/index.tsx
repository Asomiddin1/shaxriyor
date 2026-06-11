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

import UserAvatar from '@/shared/ui/UserAvatar';
import type { SessionHistoryEntry } from '@/features/sessions/api/history.api';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import { useAppStore } from '@/shared/lib/stores/app-store';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_H = 200;
const HOME_HISTORY_LIMIT = 20;
const DEFAULT_CURRENCY = 'UZS';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number, currency: string = DEFAULT_CURRENCY, locale = 'en') =>
  `${n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${currency}`;

const fmtShort = (value: number): string => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
};

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en', { day: '2-digit', month: 'short' });
};

const fmtDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// pick dominant currency from sessions list
function dominantCurrency(sessions: SessionHistoryEntry[]): string {
  if (!sessions.length) return DEFAULT_CURRENCY;
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    const c = s.currency || s.payload?.totals?.currency || DEFAULT_CURRENCY;
    counts[c] = (counts[c] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? DEFAULT_CURRENCY;
}

// ─── Stats ──────────────────────────────────────────────────────────────────

interface Stats {
  totalSpent: number;
  totalBills: number;
  avgBill: number;
  thisMonthSpent: number;
  thisMonthBills: number;
  currency: string;
}

function computeStats(sessions: SessionHistoryEntry[]): Stats {
  const currency = dominantCurrency(sessions);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let totalSpent = 0;
  let thisMonthSpent = 0;
  let thisMonthBills = 0;

  for (const s of sessions) {
    const c = s.currency || s.payload?.totals?.currency || DEFAULT_CURRENCY;
    if (c !== currency) continue;
    const amount = s.grandTotal ?? 0;
    totalSpent += amount;
    const ts = s.finalizedAt ? new Date(s.finalizedAt).getTime() : 0;
    if (ts >= monthStart) {
      thisMonthSpent += amount;
      thisMonthBills++;
    }
  }

  return {
    totalSpent,
    totalBills: sessions.length,
    avgBill: sessions.length ? Math.round(totalSpent / sessions.length) : 0,
    thisMonthSpent,
    thisMonthBills,
    currency,
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function BalanceCard({ stats, username }: { stats: Stats; username: string }) {
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
          <YStack>
            <Text color="rgba(255,255,255,0.6)" fontSize={11} fontWeight="500" letterSpacing={1}>
              TOTAL SPENT
            </Text>
            <Text color="white" fontSize={28} fontWeight="800" mt={2}>
              {fmtShort(stats.totalSpent)}{' '}
              <Text color="rgba(255,255,255,0.7)" fontSize={14} fontWeight="500">
                {stats.currency}
              </Text>
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

        <View h={0.5} backgroundColor="rgba(255,255,255,0.12)" my="$2" />

        <XStack jc="space-between" ai="center">
          <YStack ai="center" f={1}>
            <Text color="rgba(255,255,255,0.5)" fontSize={10} fontWeight="500">BILLS</Text>
            <Text color="white" fontSize={18} fontWeight="700" mt={2}>{stats.totalBills}</Text>
          </YStack>
          <View w={0.5} h={32} backgroundColor="rgba(255,255,255,0.12)" />
          <YStack ai="center" f={1}>
            <Text color="rgba(255,255,255,0.5)" fontSize={10} fontWeight="500">AVG BILL</Text>
            <Text color="white" fontSize={18} fontWeight="700" mt={2}>{fmtShort(stats.avgBill)}</Text>
          </YStack>
          <View w={0.5} h={32} backgroundColor="rgba(255,255,255,0.12)" />
          <YStack ai="center" f={1}>
            <Text color="rgba(255,255,255,0.5)" fontSize={10} fontWeight="500">THIS MONTH</Text>
            <Text color="#2ECC71" fontSize={18} fontWeight="700" mt={2}>{fmtShort(stats.thisMonthSpent)}</Text>
          </YStack>
        </XStack>
      </LinearGradient>
    </View>
  );
}

function TxRow({
  bill,
  onPress,
  currency,
  locale,
}: {
  bill: SessionHistoryEntry;
  onPress: () => void;
  currency: string;
  locale: string;
}) {
  const amount = bill.grandTotal ?? 0;
  const c = bill.currency || bill.payload?.totals?.currency || currency;
  const date = fmtDate(bill.finalizedAt || bill.createdAt);
  const participantCount = bill.participantUniqueIds?.length ?? 0;
  const isCreator = bill.isCreator;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <XStack px="$4" py="$3" ai="center" gap="$3" borderBottomWidth={0.5} borderBottomColor="$gray4">
        <View w={44} h={44} br={14} ai="center" jc="center" backgroundColor={isCreator ? '#E8F8EF' : '#EEF2FF'}>
          <ReceiptText size={20} color={isCreator ? '#2ECC71' : '#6366F1'} />
        </View>
        <YStack f={1} gap={2}>
          <Text fontSize={14} fontWeight="600" color="$color12" numberOfLines={1}>
            {bill.sessionName || 'Bill'}
          </Text>
          <XStack ai="center" gap="$1.5">
            <Text fontSize={11} color="$gray9">{date}</Text>
            {participantCount > 0 && (
              <>
                <Text fontSize={11} color="$gray6">·</Text>
                <Text fontSize={11} color="$gray9">{participantCount} people</Text>
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
            <Text fontSize={15} fontWeight="700" color={isCreator ? '#2ECC71' : '#6366F1'}>
              {fmtShort(amount)}
            </Text>
          </XStack>
          <Text fontSize={10} color="$gray8" fontWeight="500">{c}</Text>
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

  const sessions = useSessionsHistoryStore((s) => s.sessions);
  const loading = useSessionsHistoryStore((s) => s.loading);
  const initialized = useSessionsHistoryStore((s) => s.initialized);
  const currentLimit = useSessionsHistoryStore((s) => s.limit);
  const fetchHistory = useSessionsHistoryStore((s) => s.fetchHistory);
  const refreshIfStale = useSessionsHistoryStore((s) => s.refreshIfStale);
  const forceRefresh = useSessionsHistoryStore((s) => s.forceRefresh);

  const hasFetchedRef = useRef(false);
  const [refreshing, setRefreshing] = React.useState(false);

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
      await forceRefresh(HOME_HISTORY_LIMIT);
    } finally {
      setRefreshing(false);
    }
  }, [forceRefresh]);

  const stats = useMemo(() => computeStats(sessions), [sessions]);
  const locale = i18n.language ?? 'en';
  const username = user?.username ?? 'there';

  const grouped = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const toLabel = (iso?: string) => {
      if (!iso) return 'Earlier';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return 'Earlier';
      if (d.toDateString() === today.toDateString()) return 'Today';
      if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return d.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' });
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
  }, [sessions]);

  return (
    // ✅ FIX: RNView(flex:1) wraps ScrollView so it has a bounded height.
    // Without this, ScrollView expands to fit all content and never scrolls.
    <RNView style={[S.container, { backgroundColor: screenBg }]}>
      <ScrollView
        style={S.scroll}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ECC71" />
        }
      >
        {/* ── Balance card ── */}
        <View pt="$4">
          <BalanceCard stats={stats} username={username} />
        </View>

        {/* ── This month summary strip ── */}
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
                {fmt(stats.thisMonthSpent, stats.currency, locale)} this month
              </Text>
              <Text fontSize={11} color="#4ADE80">
                {stats.thisMonthBills} bill{stats.thisMonthBills !== 1 ? 's' : ''} split
              </Text>
            </YStack>
          </XStack>
        )}

        {/* ── Transactions ── */}
        <View mx="$4" mb="$2">
          <XStack ai="center" jc="space-between">
            <Text fontSize={17} fontWeight="700" color="$color12">Transactions</Text>
            <Pressable onPress={() => router.push('/tabs/sessions/history/')}>
              <XStack ai="center" gap={4}>
                <Text fontSize={13} color="#2ECC71" fontWeight="600">See all</Text>
                <ChevronRight size={14} color="#2ECC71" />
              </XStack>
            </Pressable>
          </XStack>
        </View>

        {/* Loading state */}
        {loading && !refreshing && (
          <YStack ai="center" py="$6">
            <Text color="$gray9" fontSize={14}>Loading transactions...</Text>
          </YStack>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <YStack ai="center" py="$8" gap="$3">
            <View w={72} h={72} br={24} ai="center" jc="center" backgroundColor="$gray3">
              <ReceiptText size={32} color="$gray8" />
            </View>
            <YStack ai="center" gap="$1">
              <Text fontSize={16} fontWeight="600" color="$gray10">No transactions yet</Text>
              <Text fontSize={13} color="$gray8">Scan a receipt to get started</Text>
            </YStack>
            <Pressable onPress={() => router.push('/tabs/scan-receipt')}>
              <View px="$5" py="$3" br={12} backgroundColor="#2ECC71" mt="$1">
                <XStack ai="center" gap="$2">
                  <ScanLine size={16} color="white" />
                  <Text fontSize={14} fontWeight="700" color="white">Scan receipt</Text>
                </XStack>
              </View>
            </Pressable>
          </YStack>
        )}

        {/* Grouped transaction list */}
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
                  currency={stats.currency}
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
  // ✅ FIX: outer container bounds the height so ScrollView can scroll
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  // ✅ FIX: scroll fills its bounded parent
  scroll: {
    flex: 1,
  },
  // ✅ bottom padding so last card isn't hidden behind tab bar
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
    paddingBottom:100,
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