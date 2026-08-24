import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Share } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { api } from "@/src/lib/api";
import { LiveShare } from "@/src/lib/types";
import { startBackgroundLocation, stopBackgroundLocation } from "@/src/lib/backgroundLocation";
import { useToast } from "@/src/context/ToastContext";
import { Header, Button, Loader, EmptyState, Badge } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { timeAgo } from "@/src/lib/time";
import { colors, spacing, radius, shadow } from "@/src/theme/theme";

const DURATIONS = [15, 30, 60, 120];

export default function LiveLocation() {
  const { show } = useToast();
  const [shares, setShares] = useState<LiveShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState(30);
  const [creating, setCreating] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [bgMode, setBgMode] = useState<"background" | "foreground">("foreground");
  const watchRef = useRef<Location.LocationSubscription | null>(null);

  const activeShares = shares.filter((s) => s.active);

  const load = useCallback(async () => {
    try {
      const data = await api<LiveShare[]>("/me/live-shares");
      setShares(data);
    } catch (e: any) {
      show(e?.message || "Failed to load shares", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const postLocation = useCallback(async (coords: Location.LocationObjectCoords) => {
    try {
      await api("/me/location", {
        method: "POST",
        body: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? undefined,
          speed_kmh: coords.speed != null && coords.speed >= 0 ? coords.speed * 3.6 : undefined,
        },
      });
    } catch {
      /* best effort */
    }
  }, []);

  const startTracking = useCallback(async () => {
    // Prefer OS background updates (works on installed build); fall back to a
    // foreground watcher (Expo Go / web) so sharing still streams while open.
    const mode = await startBackgroundLocation();
    if (mode === "background") {
      setBgMode("background");
      setTracking(true);
      return;
    }
    if (mode === "denied") return;

    setBgMode("foreground");
    if (watchRef.current) return;
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 25 },
      (loc) => postLocation(loc.coords)
    );
    setTracking(true);
  }, [postLocation]);

  const stopTracking = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    stopBackgroundLocation();
    setTracking(false);
  }, []);

  useEffect(() => {
    if (activeShares.length > 0) startTracking();
    else stopTracking();
    return () => stopTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShares.length]);

  const create = async () => {
    setCreating(true);
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) await Location.requestForegroundPermissionsAsync();
      await api("/me/live-share", { method: "POST", body: { duration_min: duration, label: label.trim() || "Live location" } });
      setLabel("");
      show("Live sharing started", "success");
      load();
    } catch (e: any) {
      show(e?.message || "Could not start sharing", "error");
    } finally {
      setCreating(false);
    }
  };

  const stop = async (id: string) => {
    try {
      await api(`/me/live-share/${id}/stop`, { method: "POST" });
      show("Sharing stopped", "success");
      load();
    } catch (e: any) {
      show(e?.message || "Could not stop", "error");
    }
  };

  const shareLink = async (token: string) => {
    const url = `https://neksathi-live.emergent.host/share/${token}`;
    try {
      await Share.share({ message: `Follow my live location on Nek Sathi: ${url}`, url });
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header title="Live Location" subtitle="Share your journey with trusted people" back />
      {loading ? (
        <Loader />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing["3xl"] }}>
          {tracking && (
            <View style={styles.tracking} testID="live-tracking-banner">
              <View style={styles.pulse} />
              <Txt style={{ color: colors.success }} weight="600">
                {bgMode === "background" ? "Broadcasting live — even in background" : "Broadcasting your location live"}
              </Txt>
            </View>
          )}

          <View style={styles.card}>
            <Txt variant="subtitle" style={{ marginBottom: spacing.md }}>Start a new share</Txt>
            <Txt variant="caption" style={{ marginBottom: spacing.sm }}>DURATION</Txt>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => (
                <Pressable key={d} testID={`live-duration-${d}`} onPress={() => setDuration(d)} style={[styles.chip, duration === d && styles.chipActive]}>
                  <Txt weight="600" color={duration === d ? "#fff" : colors.onSurface}>{d < 60 ? `${d}m` : `${d / 60}h`}</Txt>
                </Pressable>
              ))}
            </View>
            <View style={{ marginTop: spacing.lg }}>
              <Button testID="live-start-button" title="Start sharing" icon="navigate" onPress={create} loading={creating} />
            </View>
          </View>

          <Txt variant="caption" style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>ACTIVE & RECENT SHARES</Txt>
          {shares.length === 0 ? (
            <EmptyState testID="live-empty" icon="navigate-outline" title="No shares yet" subtitle="Start a live share so loved ones can follow your trip in real time." />
          ) : (
            shares.map((s) => (
              <View key={s.id} style={styles.shareRow} testID={`share-${s.id}`}>
                <View style={[styles.shareIcon, { backgroundColor: s.active ? "#D1FAE5" : colors.brandTertiary }]}>
                  <Ionicons name="location" size={20} color={s.active ? colors.success : colors.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <Txt variant="label">{s.label || "Live location"}</Txt>
                    {s.active ? <Badge label="Active" color={colors.success} bg="#D1FAE5" /> : <Badge label="Ended" color={colors.muted} bg={colors.divider} />}
                  </View>
                  <Txt variant="caption">{s.active ? `Expires ${timeAgo(s.expires_at)}` : `Ended ${timeAgo(s.expires_at)}`}</Txt>
                </View>
                {s.active && (
                  <>
                    <Pressable testID={`share-link-${s.id}`} onPress={() => shareLink(s.token)} hitSlop={6} style={{ padding: spacing.sm }}>
                      <Ionicons name="share-social-outline" size={20} color={colors.brand} />
                    </Pressable>
                    <Pressable testID={`share-stop-${s.id}`} onPress={() => stop(s.id)} hitSlop={6} style={{ padding: spacing.sm }}>
                      <Ionicons name="stop-circle-outline" size={20} color={colors.error} />
                    </Pressable>
                  </>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tracking: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, marginRight: spacing.sm },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card },
  chipRow: { flexDirection: "row", gap: spacing.sm },
  chip: { flex: 1, height: 42, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  shareRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.card },
  shareIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
});
