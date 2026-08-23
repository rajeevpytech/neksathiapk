import React from "react";
import { Redirect, Tabs } from "expo-router";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/src/context/AuthContext";
import { Loader } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, radius } from "@/src/theme/theme";

const TABS: { name: string; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { name: "index", label: "Home", icon: "home-outline", activeIcon: "home" },
  { name: "family", label: "Family", icon: "people-outline", activeIcon: "people" },
  { name: "vehicles", label: "Vehicles", icon: "car-outline", activeIcon: "car" },
  { name: "alerts", label: "Alerts", icon: "notifications-outline", activeIcon: "notifications" },
  { name: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {state.routes.map((route: any, index: number) => {
        const meta = TABS.find((t) => t.name === route.name);
        if (!meta) return null;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            testID={`tab-${meta.name}`}
            style={styles.tab}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <Ionicons
              name={focused ? meta.activeIcon : meta.icon}
              size={24}
              color={focused ? colors.brand : colors.muted}
            />
            <Txt style={{ fontSize: 11, marginTop: 2 }} weight={focused ? "600" : "500"} color={focused ? colors.brand : colors.muted}>
              {meta.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { user, initializing } = useAuth();
  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <Loader />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    ...Platform.select({
      ios: { shadowColor: "#0B284D", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: radius.md },
});
