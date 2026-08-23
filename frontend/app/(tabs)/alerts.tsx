import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { Alert } from "@/src/lib/types";
import { Txt } from "@/src/components/Txt";
import { Loader, EmptyState } from "@/src/components/ui";
import { timeAgo } from "@/src/lib/time";
import { colors, spacing, radius, shadow, fontSize, FONT } from "@/src/theme/theme";

function iconFor(type?: string): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  const t = (type || "").toLowerCase();
  if (t.includes("sos") || t.includes("accident") || t.includes("crash")) return { icon: "warning", color: colors.error, bg: "#FEE2E2" };
  if (t.includes("speed") || t.includes("overspeed")) return { icon: "speedometer-outline", color: colors.warning, bg: "#FEF3C7" };
  if (t.includes("zone") || t.includes("geofence")) return { icon: "shield-checkmark-outline", color: colors.success, bg: "#D1FAE5" };
  if (t.includes("scan") || t.includes("qr") || t.includes("tag")) return { icon: "qr-code-outline", color: colors.brand, bg: colors.brandTertiary };
  if (t.includes("family") || t.includes("invite")) return { icon: "people-outline", color: colors.brand, bg: colors.brandTertiary };
  return { icon: "notifications-outline", color: colors.brand, bg: colors.brandTertiary };
}

export default function Alerts() {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<Alert[]>("/alerts?limit=100");
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Txt style={{ fontSize: fontSize["2xl"], fontFamily: FONT }} weight="600">
          Alerts
        </Txt>
        <Txt variant="caption">Incidents & safety notifications</Txt>
      </View>
      {loading ? (
        <Loader />
      ) : alerts.length === 0 ? (
        <EmptyState testID="alerts-empty" icon="shield-checkmark-outline" title="Everything is secure" subtitle="No recent alerts. You'll see incidents, SOS events and safe-zone activity here." />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(i, idx) => i.id || String(idx)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          renderItem={({ item }) => {
            const cfg = iconFor(item.type);
            return (
              <View style={styles.card} testID={`alert-${item.id}`}>
                <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="label" numberOfLines={1}>{item.title || item.type || "Notification"}</Txt>
                  {item.message ? <Txt variant="body" numberOfLines={2} style={{ marginTop: 2 }}>{item.message}</Txt> : null}
                  <Txt variant="caption" style={{ marginTop: spacing.xs }}>{item.created_at ? timeAgo(item.created_at) : ""}</Txt>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  card: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.card },
  iconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
});
