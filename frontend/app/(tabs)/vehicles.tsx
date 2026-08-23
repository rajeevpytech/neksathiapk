import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { Vehicle } from "@/src/lib/types";
import { useToast } from "@/src/context/ToastContext";
import { Txt } from "@/src/components/Txt";
import { Loader, EmptyState, Badge, Button } from "@/src/components/ui";
import { colors, spacing, radius, shadow, fontSize, FONT } from "@/src/theme/theme";

const TYPE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  car: "car-sport-outline",
  motorcycle: "bicycle-outline",
  scooter: "bicycle-outline",
  truck: "bus-outline",
};

export default function Vehicles() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<Vehicle[]>("/vehicles");
      setVehicles(data);
    } catch (e: any) {
      show(e?.message || "Failed to load vehicles", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontSize: fontSize["2xl"], fontFamily: FONT }} weight="600">Vehicles</Txt>
          <Txt variant="caption">QR tags, tracking & lost mode</Txt>
        </View>
        <Pressable testID="vehicles-scan-button" onPress={() => router.push("/scan")} style={styles.scanBtn}>
          <Ionicons name="scan-outline" size={22} color={colors.brand} />
        </Pressable>
      </View>

      {loading ? (
        <Loader />
      ) : vehicles.length === 0 ? (
        <EmptyState
          testID="vehicles-empty"
          icon="car-outline"
          title="No vehicles registered"
          subtitle="Add a vehicle to get a QR tag, live tracking and overspeed alerts."
          action={<Button testID="vehicles-empty-add" title="Add vehicle" icon="add" onPress={() => router.push("/vehicle/new")} full={false} />}
        />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          renderItem={({ item }) => (
            <Pressable testID={`vehicle-${item.id}`} onPress={() => router.push(`/vehicle/${item.id}`)} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.vIcon, { backgroundColor: item.lost_mode ? "#FEE2E2" : colors.brandTertiary }]}>
                  <Ionicons name={TYPE_ICON[item.vehicle_type] || "car-outline"} size={24} color={item.lost_mode ? colors.error : colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="subtitle">{item.number_plate}</Txt>
                  <Txt variant="caption">{item.make_model || item.vehicle_type}{item.color ? ` · ${item.color}` : ""}</Txt>
                </View>
                {item.lost_mode ? <Badge label="Lost mode" color={colors.error} bg="#FEE2E2" /> : <Badge label="Safe" color={colors.success} bg="#D1FAE5" />}
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.metaItem}>
                  <Ionicons name="qr-code-outline" size={16} color={colors.muted} />
                  <Txt variant="caption" style={{ marginLeft: 4 }}>QR tag active</Txt>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="speedometer-outline" size={16} color={colors.muted} />
                  <Txt variant="caption" style={{ marginLeft: 4 }}>Limit {item.speed_limit_kmh} km/h</Txt>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}

      {(vehicles.length > 0 || !loading) && (
        <Pressable testID="vehicles-fab" onPress={() => router.push("/vehicle/new")} style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  scanBtn: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  vIcon: { width: 52, height: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginRight: spacing.sm },
  cardBottom: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
  metaItem: { flexDirection: "row", alignItems: "center" },
  fab: { position: "absolute", right: spacing.lg, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", ...shadow.raised },
});
