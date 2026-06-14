// app/tabs/_layout.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, useRouter, usePathname } from "expo-router";
import { Pressable, Animated, Dimensions, Modal, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack, XStack, Text, View } from "tamagui";
import { Home, Settings, Bell, ChevronLeft, Menu } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAppStore } from "@/shared/lib/stores/app-store";
import UserAvatar from "@/shared/ui/UserAvatar";
import { useFriendsStore } from "@/features/friends/model/friends.store";
import { CustomTabBar } from "@/shared/ui/CustomTabBar";
import { DrawerSidebar } from "@/shared/ui/DrawerSidebar";
import { useDrawerStore } from "@/shared/lib/stores/drawer-store";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;
const TAB_BAR_HEIGHT = 60; // CustomTabBar balandligi

// --- Reusable Badge Component ---
function DotBadge({ value }: { value?: number }) {
  if (!value || value <= 0) return null;
  return (
    <View
      position="absolute"
      top={-4}
      right={-4}
      w={20}
      h={20}
      br={999}
      ai="center"
      jc="center"
      backgroundColor="#2ECC71"
    >
      <Text color="white" fontSize={10} fontWeight="700">
        {value}
      </Text>
    </View>
  );
}

function DrawerOverlay() {
  const { isOpen, close } = useDrawerStore();
  const [mounted, setMounted] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      // Mount the Modal first, then animate in.
      setMounted(true);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -DRAWER_WIDTH,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Unmount the Modal only after the close animation completes.
        setMounted(false);
      });
    }
  }, [isOpen]);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <Animated.View style={{ flex: 1 }}>
        {/* Dark overlay */}
        <Animated.View
          pointerEvents={isOpen ? "auto" : "none"}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(0,0,0,0.5)",
              opacity: overlayOpacity,
            },
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={close} />
        </Animated.View>

        {/* Sidebar panel */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: DRAWER_WIDTH,
            transform: [{ translateX }],
            shadowColor: "#000",
            shadowOffset: { width: 2, height: 0 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 10,
          }}
        >
          <DrawerSidebar onClose={close} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// --- Global Header for all Tabs ---
function GlobalTabsHeader(props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAppStore();
  const fetchAll = useFriendsStore((s) => s.fetchAll);
  const { t } = useTranslation();
  const openDrawer = useDrawerStore((s) => s.open);
  const routeName = props?.route?.name ?? "";
  const isMainPage = routeName === "index";

  const showHomeShortcut =
    routeName === "profile" ||
    routeName === "about" ||
    routeName === "help" ||
    routeName === "public-offer" ||
    routeName === "privacy-policy" ||
    routeName.startsWith("friends") ||
    routeName.startsWith("groups") ||
    routeName.startsWith("sessions");

  const onBackToHome = useCallback(() => router.replace("/tabs"), [router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchAll();
    });
    return () => sub.remove();
  }, [fetchAll]);

  const requestsCount = useFriendsStore(
    (s) => s.requestsRaw?.incoming?.length ?? 0,
  );
  const displayName = user?.username || t("profile.labels.guest", "Guest");
  const userInitial = displayName.slice(0, 1).toUpperCase();

  const handleOpenProfile = useCallback(() => {
    router.push("/tabs/profile");
  }, [router]);

  return (
    <YStack
      bg="$background"
      pt={insets.top}
      borderBottomWidth={0.5}
      borderBottomColor="$borderColor"
    >
      <XStack h={56} ai="center" px="$4" gap="$3">
        {/* Asosiy page da menu burger, boshqa page larda back button */}
        {isMainPage ? (
          <Pressable onPress={openDrawer} hitSlop={12}>
            <Menu size={24} color="$gray11" />
          </Pressable>
        ) : showHomeShortcut ? (
          <Pressable onPress={onBackToHome} hitSlop={12}>
            <XStack
              ai="center"
              gap="$1"
              bg="$gray3"
              px="$2.5"
              py="$1.5"
              br="$10"
              borderWidth={0.5}
              borderColor="$gray5"
            >
              <ChevronLeft size={14} color="$gray10" strokeWidth={2.5} />
              <Text fontSize={12} color="$gray10" fontWeight="600">
                {t("navigation.mainMenu", "Main menu")}
              </Text>
            </XStack>
          </Pressable>
        ) : null}

        {/* Title — markazda */}
        <Text
          fontSize={17}
          fontWeight="600"
          numberOfLines={1}
          flex={1}
          textAlign="center"
          color="$color12"
        >
          {props.options.title}
        </Text>

        {/* Right actions */}
        <XStack ai="center" gap="$3" flexShrink={0}>
          <Pressable
            onPress={() => router.push("/tabs/friends/requests")}
            hitSlop={10}
          >
            <View>
              <Bell size={22} color="$gray11" />
              <DotBadge value={requestsCount} />
            </View>
          </Pressable>

          <Pressable onPress={handleOpenProfile} hitSlop={10}>
            <UserAvatar
              uri={user?.avatarUrl ?? undefined}
              label={userInitial}
              size={36}
              textSize={14}
            />
          </Pressable>
        </XStack>
      </XStack>
    </YStack>
  );
}

export default function TabLayout() {
  const { user } = useAppStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const greetingName =
    user?.username || t("home.header.friendFallback", "friend");
  const homeTitle = t("home.header.greeting", { name: greetingName });
  const homeLabel = t("navigation.tabs.home", "Home");
  const settingsTitle = t("navigation.tabs.settings", "Settings");
  const profileTitle = t("profile.title", "Profile");
  const groupsTitle = t("navigation.groups.title", "Groups");
  const newGroupTitle = t("navigation.groups.create", "New group");
  const groupDetailsTitle = t("navigation.groups.details", "Group");
  const scanInviteTitle = t("navigation.scanInvite", "Scan Invite");
  const friendQrTitle = t("navigation.friendQr", "My Friend QR");
  const groupQrTitle = t("navigation.groupQr", "Group QR");
  const scanReceiptTitle = t("navigation.scanReceipt", "Scan Receipt");
  const participantsTitle = t("navigation.participants", "Participants");
  const itemsSplitTitle = t("navigation.itemsSplit", "Items Split");
  const finishTitle = t("navigation.finish", "Finish");
  const historyTitle = t("navigation.history", "Recent bills");
  const historyDetailsTitle = t("navigation.historyDetails", "Bill details");

  return (
    <View flex={1} position="relative">
      {/* Tabs Navigator */}
      <Tabs
        screenOptions={{
          header: (props) => <GlobalTabsHeader {...props} />,
          tabBarStyle: { display: "none" }, // Default tab barni yashiramiz
        }}
      >
        {/* Home & Settings tabs */}
        <Tabs.Screen
          name="index"
          options={{
            href: null,
            title: homeTitle,
            tabBarLabel: homeLabel,
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
            title: settingsTitle,
            tabBarLabel: settingsTitle,
            tabBarIcon: ({ color, size }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            href: null,
            title: profileTitle,
          }}
        />

        {/* Info pages (sidebar) */}
        <Tabs.Screen
          name="about"
          options={{ href: null, title: t("navigation.about", "About") }}
        />
        <Tabs.Screen
          name="help"
          options={{ href: null, title: t("navigation.help", "Help") }}
        />
        <Tabs.Screen
          name="public-offer"
          options={{
            href: null,
            title: t("navigation.publicOffer", "Public offer"),
          }}
        />
        <Tabs.Screen
          name="privacy-policy"
          options={{
            href: null,
            title: t("navigation.privacy", "Privacy policy"),
          }}
        />

        {/* Friends stack */}
        <Tabs.Screen
          name="friends/index"
          options={{ href: null, title: t("friends.title", "Friends") }}
        />
        <Tabs.Screen
          name="friends/search"
          options={{ href: null, title: t("friends.search", "Search") }}
        />
        <Tabs.Screen
          name="friends/requests"
          options={{ href: null, title: t("friends.requests", "Requests") }}
        />

        {/* Groups */}
        <Tabs.Screen
          name="groups/index"
          options={{ href: null, title: groupsTitle }}
        />
        <Tabs.Screen
          name="groups/create"
          options={{ href: null, title: newGroupTitle }}
        />
        <Tabs.Screen
          name="groups/[groupId]"
          options={{ href: null, title: groupDetailsTitle }}
        />

        <Tabs.Screen
          name="scan-invite"
          options={{ href: null, title: scanInviteTitle }}
        />
        <Tabs.Screen
          name="friends/invite"
          options={{ href: null, title: friendQrTitle }}
        />
        <Tabs.Screen
          name="groups/invite"
          options={{ href: null, title: groupQrTitle }}
        />

        <Tabs.Screen
          name="scan-receipt"
          options={{ href: null, title: scanReceiptTitle }}
        />
        <Tabs.Screen
          name="sessions/participants"
          options={{ href: null, title: participantsTitle }}
        />
        <Tabs.Screen
          name="sessions/items-split"
          options={{ href: null, title: itemsSplitTitle }}
        />
        <Tabs.Screen
          name="sessions/finish"
          options={{ href: null, title: finishTitle }}
        />
        <Tabs.Screen
          name="sessions/history/index"
          options={{ href: null, title: historyTitle }}
        />
        <Tabs.Screen
          name="sessions/history/[historyId]"
          options={{ href: null, title: historyDetailsTitle }}
        />
      </Tabs>

      {/* Custom Tab Bar — pastda, safe area ichida */}
      <View
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        pb={insets.bottom}
        bg="$background"
        borderTopWidth={0.5}
        borderTopColor="$borderColor"
        zIndex={997}
      >
        <CustomTabBar />
      </View>

      {/* Drawer overlay — eng ustida */}
      <DrawerOverlay />
    </View>
  );
}
