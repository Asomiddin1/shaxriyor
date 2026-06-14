// src/shared/ui/DrawerSidebar.tsx
import React from "react";
import { Pressable, ScrollView, Platform, Share } from "react-native";
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
  Info,
  Share2,
  HelpCircle,
  FileText,
  ShieldCheck,
  Moon, // <-- Moon ikonkasini import qildik
  Sun,
} from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAppStore } from "@/shared/lib/stores/app-store";
import UserAvatar from "@/shared/ui/UserAvatar";

interface DrawerMenuItem {
  key: string;
  label: string;
  icon: typeof Home;
  path?: string;
  action?: () => void;
  keepOpen?: boolean;
  section: "main" | "secondary" | "info";
}

interface DrawerSidebarProps {
  onClose: () => void;
}

export function DrawerSidebar({ onClose }: DrawerSidebarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, logout, theme, toggleTheme } = useAppStore();

  const displayName = user?.username || t("profile.labels.guest", "Guest");
  const userEmail = user?.email || "";
  const userInitial = displayName.slice(0, 1).toUpperCase();

  const handleShare = async () => {
    try {
      await Share.share({
        message: t("share.message", "Do'stlaringiz bilan ilovani ulashing!"),
        url: "https://your-app-link.com",
      });
    } catch (e) {}
  };

  // Tungi rejimni o'zgartirish funksiyasi
  const handleToggleDarkMode = () => {
    toggleTheme();
  };

  const menuItems: DrawerMenuItem[] = [
    {
      key: "settings",
      label: t("navigation.tabs.settings", "Settings"),
      icon: Settings,
      path: "/tabs/profile",
      section: "secondary",
    },
    // Dark mode tugmasi Settings tagidan qo'shildi
    {
      key: "dark-mode",
      label:
        theme === "dark"
          ? t("navigation.lightMode", "Kunduzgi rejim")
          : t("navigation.darkMode", "Tungi rejim"),
      icon: theme === "dark" ? Sun : Moon,
      action: handleToggleDarkMode,
      keepOpen: true,
      section: "secondary",
    },
    {
      key: "about",
      label: t("navigation.about", "Dastur haqida"),
      icon: Info,
      path: "/tabs/about",
      section: "info",
    },
    {
      key: "share",
      label: t("navigation.share", "Do'stlarga ulashish"),
      icon: Share2,
      action: handleShare,
      section: "info",
    },
    {
      key: "help",
      label: t("navigation.help", "Yordam"),
      icon: HelpCircle,
      path: "/tabs/help",
      section: "info",
    },
    {
      key: "public-offer",
      label: t("navigation.publicOffer", "Ommaviy oferta"),
      icon: FileText,
      path: "/tabs/public-offer",
      section: "info",
    },
    {
      key: "privacy",
      label: t("navigation.privacy", "Maxfiylik siyosati"),
      icon: ShieldCheck,
      path: "/tabs/privacy-policy",
      section: "info",
    },
  ];

  const mainItems = menuItems.filter((i) => i.section === "main");
  const secondaryItems = menuItems.filter((i) => i.section === "secondary");
  const infoItems = menuItems.filter((i) => i.section === "info");

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

  const renderItem = (item: DrawerMenuItem) => {
    const Icon = item.icon;
    const onPress = item.action
      ? () => {
          if (!item.keepOpen) onClose();
          item.action!();
        }
      : () => handleNavigate(item.path!);

    return (
      <Pressable key={item.key} onPress={onPress}>
        <XStack
          ai="center"
          gap="$3"
          px="$3"
          py="$3"
          br="$4"
          hoverStyle={{ bg: "$gray3" }}
          pressStyle={{ bg: "$gray3" }}
        >
          <View w={36} h={36} br={12} ai="center" jc="center" bg="$gray3">
            <Icon size={18} color="$gray11" />
          </View>
          <Text fontSize={15} fontWeight="500" color="$color12">
            {item.label}
          </Text>
        </XStack>
      </Pressable>
    );
  };

  return (
    <YStack
      flex={1}
      bg="$background"
      pt={insets.top + 8}
      pb={Platform.OS === "ios" ? insets.bottom : 16}
    >
      {/* Header - User info (mt="$4" orqali sal pastga tushirildi) */}
      <YStack px="$4" pb="$4" mt="$4">
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

      {/* Scrollable Menu */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Main navigation */}
        {mainItems.length > 0 && (
          <>
            <YStack px="$3" gap="$1">
              {mainItems.map(renderItem)}
            </YStack>
            <Separator borderColor="$borderColor" my="$3" mx="$4" />
          </>
        )}

        {/* Secondary navigation */}
        <YStack px="$3" gap="$1">
          {secondaryItems.map(renderItem)}
        </YStack>

        <Separator borderColor="$borderColor" my="$3" mx="$4" />

        {/* Info navigation */}
        <YStack px="$3" gap="$1">
          {infoItems.map(renderItem)}
        </YStack>

        <Separator borderColor="$borderColor" my="$3" mx="$4" />

        {/* Logout — oxirgi element */}
        <YStack px="$3">
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
              <View w={36} h={36} br={12} ai="center" jc="center" bg="$red3">
                <LogOut size={18} color="$red10" />
              </View>
              <Text fontSize={15} fontWeight="500" color="$red10">
                {t("profile.actions.logout", "Log out")}
              </Text>
            </XStack>
          </Pressable>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
