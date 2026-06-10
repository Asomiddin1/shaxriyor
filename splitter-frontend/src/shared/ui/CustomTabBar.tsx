// src/shared/ui/CustomTabBar.tsx
import React from "react";
import { Pressable, Platform } from "react-native";
import { XStack, YStack, Text, View } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Users,
  FolderOpen,
  Clock,
  ScanLine,
} from "@tamagui/lucide-icons";
import { useRouter, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";

interface TabItem {
  key: string;
  label: string;
  icon: typeof Home;
  path: string;
  matchPaths: string[];
}

// Tab bar-ni yashirish kerak bo'lgan sahifalar
const HIDE_ON_ROUTES = [
  "/tabs/scan-receipt",
  "/tabs/scan-invite",
  "/tabs/sessions/participants",
  "/tabs/sessions/items-split",
  "/tabs/sessions/finish",
];

export function CustomTabBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  // Agar hozirgi sahifa yashiriladigan ro'yxatda bo'lsa — ko'rsatmaymiz
  const shouldHide = HIDE_ON_ROUTES.some((r) => pathname.startsWith(r));
  if (shouldHide) return null;

  const tabs: TabItem[] = [
    {
      key: "home",
      label: t("navigation.tabs.home", "Home"),
      icon: Home,
      path: "/tabs",
      matchPaths: ["/tabs", "/tabs/index"],
    },
    {
      key: "friends",
      label: t("navigation.tabs.friends", "Friends"),
      icon: Users,
      path: "/tabs/friends",
      matchPaths: ["/tabs/friends"],
    },
    {
      key: "scan",
      label: t("navigation.tabs.scan", "Scan"),
      icon: ScanLine,
      path: "/tabs/scan-receipt",
      matchPaths: ["/tabs/scan-receipt", "/tabs/scan-invite"],
    },
    {
      key: "groups",
      label: t("navigation.tabs.groups", "Groups"),
      icon: FolderOpen,
      path: "/tabs/groups",
      matchPaths: ["/tabs/groups"],
    },
    {
      key: "history",
      label: t("navigation.tabs.history", "History"),
      icon: Clock,
      path: "/tabs/sessions/history/",
      matchPaths: ["/tabs/sessions/history"],
    },
  ];

  const isActive = (tab: TabItem) => {
    return tab.matchPaths.some((p) => pathname.startsWith(p));
  };

  return (
    <YStack
      bg="$background"
      borderTopWidth={0.5}
      borderTopColor="$borderColor"
      pb={Platform.OS === "ios" ? insets.bottom : 8}
    >
      <XStack h={56} ai="center" jc="space-around" px="$2">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          return (
            <Pressable
              key={tab.key}
              onPress={() => router.push(tab.path as any)}
              style={{ flex: 1, alignItems: "center" }}
              hitSlop={8}
            >
              <YStack ai="center" gap={2}>
                {/* Scan butoni boshqacha ko'rinadi */}
                {tab.key === "scan" ? (
                  <View
                    w={48}
                    h={48}
                    br={24}
                    ai="center"
                    jc="center"
                    bg={active ? "#2ECC71" : "$gray4"}
                    mt={-16}
                    shadowColor="$shadowColor"
                    shadowOffset={{ width: 0, height: 2 }}
                    shadowOpacity={0.15}
                    shadowRadius={4}
                    elevation={4}
                  >
                    <Icon size={22} color={active ? "white" : "$gray11"} />
                  </View>
                ) : (
                  <Icon
                    size={22}
                    color={active ? "#2ECC71" : "$gray9"}
                  />
                )}
                {tab.key !== "scan" && (
                  <Text
                    fontSize={10}
                    fontWeight={active ? "700" : "500"}
                    color={active ? "#2ECC71" : "$gray9"}
                    mt={2}
                  >
                    {tab.label}
                  </Text>
                )}
              </YStack>
            </Pressable>
          );
        })}
      </XStack>
    </YStack>
  );
}
