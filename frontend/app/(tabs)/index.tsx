import React, { useEffect } from "react";
import { View, StyleSheet, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/context/AuthContext";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, radius, fontSize, shadow, FONT } from "@/src/theme/theme";

const AnimatedView = Animated.createAnimatedComponent(View);

function Bento({
  icon,
  title,
  subtitle,
  color,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.bento, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={[styles.bentoIcon, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Txt variant="label" style={{ marginTop: spacing.sm }}>
        {title}
      </Txt>
      <Txt variant="caption" numberOfLines={1}>
        {subtitle}
      </Txt>
    </Pressable>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1, false);
  }, [pulse]);

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.4 }],
    opacity: 0.35 * (1 - pulse.value),
  }));

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing["3xl"] }}
      >
        <LinearGradient colors={[colors.brand, "#123a63"]} style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Txt style={{ color: "rgba(255,255,255,0.75)" }}>Hello, {firstName}</Txt>
              <Txt style={{ color: "#fff", fontSize: fontSize["2xl"], fontFamily: FONT }} weight="600">
                You are protected
              </Txt>
            </View>
            <Pressable testID="dashboard-scan-icon" onPress={() => router.push("/scan")} style={styles.heroIcon}>
              <Ionicons name="qr-code-outline" size={22} color="#fff" />
            </Pressable>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.dot} />
            <Txt style={{ color: "#fff" }} weight="500">
              All systems secure
            </Txt>
          </View>
        </LinearGradient>

        {/* SOS */}
        <View style={styles.sosWrap}>
          <AnimatedView style={[styles.ripple, rippleStyle]} />
          <Pressable
            testID="dashboard-sos-button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
              router.push("/sos");
            }}
            style={({ pressed }) => [styles.sosBtn, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
          >
            <Ionicons name="warning" size={40} color="#fff" />
            <Txt style={{ color: "#fff", fontSize: fontSize["2xl"], marginTop: spacing.xs, fontFamily: FONT }} weight="600">
              SOS
            </Txt>
            <Txt style={{ color: "rgba(255,255,255,0.85)" }}>Tap for emergency</Txt>
          </Pressable>
        </View>

        {/* Bento grid */}
        <View style={styles.grid}>
          <Bento testID="bento-contacts" icon="people-circle-outline" title="Contacts" subtitle="Emergency list" color={colors.brand} onPress={() => router.push("/emergency-contacts")} />
          <Bento testID="bento-live" icon="location-outline" title="Live Location" subtitle="Share journey" color={colors.success} onPress={() => router.push("/live-location")} />
          <Bento testID="bento-video" icon="videocam-outline" title="SOS Video" subtitle="Record evidence" color={colors.brandSecondary} onPress={() => router.push("/sos-video")} />
          <Bento testID="bento-safezones" icon="shield-outline" title="Safe Zones" subtitle="Geofencing" color={colors.warning} onPress={() => router.push("/safe-zones")} />
        </View>

        <Txt variant="caption" style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm }}>
          QUICK ACCESS
        </Txt>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Pressable testID="quick-history" onPress={() => router.push("/sos-history")} style={styles.quickRow}>
            <View style={[styles.quickIcon, { backgroundColor: colors.brandTertiary }]}>
              <Ionicons name="time-outline" size={20} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="label">SOS History</Txt>
              <Txt variant="caption">Past emergency events</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
          <Pressable testID="quick-theft" onPress={() => router.push("/theft-protection")} style={styles.quickRow}>
            <View style={[styles.quickIcon, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="label">Theft Protection</Txt>
              <Txt variant="caption">Device lock & intruder alerts</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  heroRow: { flexDirection: "row", alignItems: "center" },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ADE80", marginRight: spacing.sm },
  sosWrap: { alignItems: "center", justifyContent: "center", marginTop: spacing["2xl"], marginBottom: spacing.xl, height: 240 },
  ripple: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: colors.error },
  sosBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.raised,
    shadowColor: colors.error,
    shadowOpacity: 0.4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, gap: spacing.md, justifyContent: "space-between" },
  bento: {
    width: "47%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  bentoIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  quickIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
});
