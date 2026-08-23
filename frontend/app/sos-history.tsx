import React, { useCallback, useState } from "react";
import { View, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { SosEvent } from "@/src/lib/types";
import { useToast } from "@/src/context/ToastContext";
import { Txt } from "@/src/components/Txt";
import { Header, Loader, EmptyState, Badge, Button } from "@/src/components/ui";
import { timeAgo, formatDateTime } from "@/src/lib/time";
import { colors, spacing, radius, shadow } from "@/src/theme/theme";

export default function SosHistory() {
  const { show } = useToast();
  const [events, setEvents] = useState<SosEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<SosEvent[]>("/me/sos-events");
      setEvents(data);
    } catch (e: any) {
      show(e?.message || "Failed to load history", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [show]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const ack = async (id: string) => {
    try {
      await api(`/me/sos-events/${id}/ack`, { method: "POST" });
      setEvents((e) => e.map((x) => (x.id === id ? { ...x, acknowledged: true } : x)));
      show("Marked as acknowledged", "success");
    } catch (e: any) {
      show(e?.message || "Could not acknowledge", "error");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header title="SOS History" subtitle="Your emergency events" back />
      {loading ? (
        <Loader />
      ) : events.length === 0 ? (
        <EmptyState testID="history-empty" icon="time-outline" title="No SOS events" subtitle="Every emergency you trigger will appear here for your records." />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`sos-event-${item.id}`}>
              <View style={styles.rowTop}>
                <View style={styles.iconWrap}>
                  <Ionicons name="warning" size={20} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="label">Emergency alert</Txt>
                  <Txt variant="caption">{timeAgo(item.created_at)}</Txt>
                </View>
                {item.acknowledged ? (
                  <Badge label="Acknowledged" color={colors.success} bg="#D1FAE5" />
                ) : item.escalated ? (
                  <Badge label="Escalated" color={colors.warning} bg="#FEF3C7" />
                ) : (
                  <Badge label="Active" color={colors.error} bg="#FEE2E2" />
                )}
              </View>
              {item.message ? <Txt variant="body" style={{ marginTop: spacing.sm }}>{item.message}</Txt> : null}
              <View style={styles.meta}>
                <Ionicons name="paper-plane-outline" size={14} color={colors.muted} />
                <Txt variant="caption" style={{ marginLeft: 4 }}>
                  {item.notified} notified · {item.channels.join(", ") || "push"}
                </Txt>
              </View>
              {item.latitude != null && (
                <View style={styles.meta}>
                  <Ionicons name="location-outline" size={14} color={colors.muted} />
                  <Txt variant="caption" style={{ marginLeft: 4 }}>
                    {item.latitude.toFixed(4)}, {item.longitude?.toFixed(4)}
                  </Txt>
                </View>
              )}
              <Txt variant="caption" style={{ marginTop: spacing.sm }}>{formatDateTime(item.created_at)}</Txt>
              {!item.acknowledged && (
                <View style={{ marginTop: spacing.md }}>
                  <Button testID={`sos-ack-${item.id}`} title="Mark acknowledged" variant="outline" onPress={() => ack(item.id)} />
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadow.card },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", alignItems: "center", marginTop: spacing.sm },
});
