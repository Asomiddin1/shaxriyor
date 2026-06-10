// src/shared/ui/DrawerSidebar.tsx
import React from "react";
import { Pressable, ScrollView, Platform } from "react-native";
import { YStack, XStack, Text, View, Separator } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Users,
  FolderOpen,
  Clock,
  Settings,
  User,
  ScanLine,
  LogOut,
  X,
} from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAppStore } from "@/shared/lib/stores/app-store";
import UserAvatar from "@/shared/ui/UserAvatar";

interface DrawerMenuItem {
  key: string;
  label: string;
  icon: typeof Home;
  path: string;
  section: "main" | "secondary";
}

interface DrawerSidebarProps {
  onClose: () => void;
}

export function DrawerSidebar({ onClose }: DrawerSidebarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout } = useAppStore();

  const displayName = user?.username || t("profile.labels.guest", "Guest");
  const userEmail = user?.email || "";
  const userInitial = displayName.slice(0, 1).toUpperCase();

  const menuItems: DrawerMenuItem[] = [
    {
      key: "home",
      label: t("navigation.tabs.home", "Home"),
      icon: Home,
      path: "/tabs",
      section: "main",
    },
    {
      key: "friends",
      label: t("friends.title", "Friends"),
      icon: Users,
      path: "/tabs/friends",
      section: "main",
    },
    {
      key: "groups",
      label: t("navigation.groups.title", "Groups"),
      icon: FolderOpen,
      path: "/tabs/groups",
      section: "main",
    },
    {
      key: "scan",
      label: t("navigation.scanReceipt", "Scan Receipt"),
      icon: ScanLine,
      path: "/tabs/scan-receipt",
      section: "main",
    },
    {
      key: "history",
      label: t("navigation.history", "Recent bills"),
      icon: Clock,
      path: "/tabs/sessions/history/",
      section: "main",
    },
    {
      key: "profile",
      label: t("profile.title", "Profile"),
      icon: User,
      path: "/tabs/profile",
      section: "secondary",
    },
    {
      key: "settings",
      label: t("navigation.tabs.settings", "Settings"),
      icon: Settings,
      path: "/tabs/settings",
      section: "secondary",
    },
  ];

  const mainItems = menuItems.filter((i) => i.section === "main");
  const secondaryItems = menuItems.filter((i) => i.section === "secondary");

  const handleNavigate = (path: string) => {
    onClose();
    setTimeout(() => {
      router.push(path as any);
    }, 150);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    router.replace("/");
  };

  return (
    <YStack
      flex={1}
      bg="$background"
      pt={insets.top + 8}
      pb={Platform.OS === "ios" ? insets.bottom : 16}
    >
      {/* Header - User info */}
      <YStack px="$4" pb="$4">
        <XStack ai="center" jc="space-between" mb="$3">
          <XStack ai="center" gap="$3">
            <UserAvatar
              uri={user?.avatarUrl ?? undefined}
              label={userInitial}
              size={52}
              textSize={20}
            />
            <YStack>
              <Text fontSize={16} fontWeight="700" color="$color12">
                {displayName}
              </Text>
              {userEmail ? (
                <Text fontSize={12} color="$gray9" mt={2}>
                  {userEmail}
                </Text>
              ) : null}
            </YStack>
          </XStack>
          <Pressable onPress={onClose} hitSlop={12}>
            <X size={22} color="$gray9" />
          </Pressable>
        </XStack>
      </YStack>

      <Separator borderColor="$borderColor" />

      {/* Menu Items */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main navigation */}
        <YStack px="$3" gap="$1">
          {mainItems.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable key={item.key} onPress={() => handleNavigate(item.path)}>
                <XStack
                  ai="center"
                  gap="$3"
                  px="$3"
                  py="$3"
                  br="$4"
                  hoverStyle={{ bg: "$gray3" }}
                  pressStyle={{ bg: "$gray3" }}
                >
                  <View
                    w={36}
                    h={36}
                    br={12}
                    ai="center"
                    jc="center"
                    bg="$gray3"
                  >
                    <Icon size={18} color="$gray11" />
                  </View>
                  <Text fontSize={15} fontWeight="500" color="$color12">
                    {item.label}
                  </Text>
                </XStack>
              </Pressable>
            );
          })}
        </YStack>

        <Separator borderColor="$borderColor" my="$3" mx="$4" />

        {/* Secondary navigation */}
        <YStack px="$3" gap="$1">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable key={item.key} onPress={() => handleNavigate(item.path)}>
                <XStack
                  ai="center"
                  gap="$3"
                  px="$3"
                  py="$3"
                  br="$4"
                  hoverStyle={{ bg: "$gray3" }}
                  pressStyle={{ bg: "$gray3" }}
                >
                  <View
                    w={36}
                    h={36}
                    br={12}
                    ai="center"
                    jc="center"
                    bg="$gray3"
                  >
                    <Icon size={18} color="$gray11" />
                  </View>
                  <Text fontSize={15} fontWeight="500" color="$color12">
                    {item.label}
                  </Text>
                </XStack>
              </Pressable>
            );
          })}
        </YStack>
      </ScrollView>

      <Separator borderColor="$borderColor" />

      {/* Logout */}
      <YStack px="$3" pt="$3">
        <Pressable onPress={handleLogout}>
          <XStack
            ai="center"
            gap="$3"
            px="$3"
            py="$3"
            br="$4"
            hoverStyle={{ bg: "$red2" }}
            pressStyle={{ bg: "$red2" }}
          >
            <View
              w={36}
              h={36}
              br={12}
              ai="center"
              jc="center"
              bg="$red3"
            >
              <LogOut size={18} color="$red10" />
            </View>
            <Text fontSize={15} fontWeight="500" color="$red10">
              {t("profile.actions.logout", "Log out")}
            </Text>
          </XStack>
        </Pressable>
      </YStack>
    </YStack>
  );
}
