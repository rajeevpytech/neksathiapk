import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Switch, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { NotifyPrefs } from "@/src/lib/types";
import { useToast } from "@/src/context/ToastContext";
import { Txt } from "@/src/components/Txt";
import { ListRow } from "@/src/components/ui";
import { colors, spacing, radius, shadow, fontSize, FONT } from "@/src/theme/theme";

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, setUser } = useAuth();
  const { show } = useToast();
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const togglePref = async (key: keyof NotifyPrefs) => {
    if (saving) return;
    const next = { ...user.notify_prefs, [key]: !user.notify_prefs[key] };
    setUser({ ...user, notify_prefs: next });
    setSaving(true);
    try {
      await api("/auth/me", { method: "PUT", body: { notify_prefs: next } });
    } catch (e: any) {
      setUser({ ...user });
      show(e?.message || "Could not update preference", "error");
    } finally {
      setSaving(false);
    }
  };

  const prefRow = (key: keyof NotifyPrefs, icon: keyof typeof Ionicons.glyphMap, label: string, sub: string) => (
    <View style={styles.prefRow}>
      <View style={[styles.prefIcon]}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="label">{label}</Txt>
        <Txt variant="caption">{sub}</Txt>
      </View>
      <Switch
        testID={`pref-${key}`}
        value={!!user.notify_prefs[key]}
        onValueChange={() => togglePref(key)}
        trackColor={{ true: colors.brand, false: colors.borderStrong }}
        thumbColor="#fff"
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing["3xl"] }}>
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.avatar}>
            {user.avatar_base64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${user.avatar_base64}` }} style={{ width: 80, height: 80, borderRadius: 40 }} contentFit="cover" />
            ) : (
              <Txt style={{ color: "#fff", fontSize: 32, fontFamily: FONT }} weight="600">
                {user.name.charAt(0).toUpperCase()}
              </Txt>
            )}
          </View>
          <Txt style={{ color: "#fff", fontSize: fontSize.xl, marginTop: spacing.md, fontFamily: FONT }} weight="600">
            {user.name}
          </Txt>
          <Txt style={{ color: "rgba(255,255,255,0.8)" }}>{user.email}</Txt>
          <Pressable testID="profile-edit-button" onPress={() => router.push("/edit-profile")} style={styles.editBtn}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Txt style={{ color: "#fff", marginLeft: spacing.xs }} weight="600">Edit profile</Txt>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Txt variant="caption" style={styles.sectionTitle}>SAFETY</Txt>
          <ListRow testID="profile-contacts" icon="people-outline" title="Emergency Contacts" subtitle="Manage your trusted people" onPress={() => router.push("/emergency-contacts")} />
          <ListRow testID="profile-theft" icon="lock-closed-outline" iconBg="#FEE2E2" iconColor={colors.error} title="Theft Protection" subtitle="Device lock & intruder alerts" onPress={() => router.push("/theft-protection")} />
          <ListRow testID="profile-safezones" icon="shield-outline" title="Safe Zones" subtitle="Geofence alerts" onPress={() => router.push("/safe-zones")} />
        </View>

        <View style={styles.section}>
          <Txt variant="caption" style={styles.sectionTitle}>NOTIFICATIONS</Txt>
          <View style={styles.card}>
            {prefRow("push", "notifications-outline", "Push alerts", "Instant device notifications")}
            {prefRow("whatsapp", "logo-whatsapp", "WhatsApp", "Send alerts via WhatsApp")}
            {prefRow("email", "mail-outline", "Email", "Email notifications")}
            {prefRow("incident_alerts", "warning-outline", "Incident alerts", "Crash & SOS events")}
            {prefRow("speed_alerts", "speedometer-outline", "Speed alerts", "Vehicle overspeed warnings")}
          </View>
        </View>

        <View style={styles.section}>
          <Txt variant="caption" style={styles.sectionTitle}>ACCOUNT</Txt>
          <ListRow testID="profile-password" icon="key-outline" title="Change Password" onPress={() => router.push("/change-password")} />
          <ListRow testID="profile-logout" icon="log-out-outline" title="Log out" danger onPress={logout} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.brand, alignItems: "center", paddingBottom: spacing.xl, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  editBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, marginTop: spacing.md },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  sectionTitle: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, paddingHorizontal: spacing.md, ...shadow.card },
  prefRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  prefIcon: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
});
