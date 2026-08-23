import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Accelerometer } from "expo-sensors";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/context/ToastContext";
import { Header, Button } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, radius, shadow, fontSize, FONT } from "@/src/theme/theme";

const IMPACT_THRESHOLD_G = 2.6; // total acceleration magnitude in g
const COUNTDOWN = 20;

export default function CrashDetection() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();
  const { show } = useToast();
  const [monitoring, setMonitoring] = useState(false);
  const [lastG, setLastG] = useState(1);
  const [peakG, setPeakG] = useState(0);
  const [impact, setImpact] = useState<{ g: number } | null>(null);
  const [count, setCount] = useState(COUNTDOWN);
  const subRef = useRef<any>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const impactRef = useRef(false);

  const stop = useCallback(() => {
    subRef.current?.remove?.();
    subRef.current = null;
    setMonitoring(false);
  }, []);

  const report = useCallback(
    async (resolution: "safe" | "need_help" | "no_response", g: number) => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.granted) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        }
      } catch {
        /* optional */
      }
      try {
        await api(`/vehicles/${vehicleId}/accident`, {
          method: "POST",
          body: { latitude, longitude, impact_g: Number(g.toFixed(2)), resolution },
        });
        show(
          resolution === "safe" ? "Marked safe. No alert sent." : "Emergency contacts alerted",
          resolution === "safe" ? "success" : "error"
        );
      } catch (e: any) {
        show(e?.message || "Could not report", "error");
      }
      setImpact(null);
      impactRef.current = false;
    },
    [vehicleId, show]
  );

  const triggerImpact = useCallback(
    (g: number) => {
      if (impactRef.current) return;
      impactRef.current = true;
      stop();
      setImpact({ g });
      setCount(COUNTDOWN);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      countdownRef.current = setInterval(() => {
        setCount((c) => {
          if (c <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            report("no_response", g);
            return 0;
          }
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          return c - 1;
        });
      }, 1000);
    },
    [report, stop]
  );

  const start = useCallback(() => {
    setMonitoring(true);
    setPeakG(0);
    Accelerometer.setUpdateInterval(200);
    subRef.current = Accelerometer.addListener(({ x, y, z }) => {
      const g = Math.sqrt(x * x + y * y + z * z);
      setLastG(g);
      setPeakG((p) => (g > p ? g : p));
      if (g >= IMPACT_THRESHOLD_G) triggerImpact(g);
    });
  }, [triggerImpact]);

  useEffect(() => {
    return () => {
      subRef.current?.remove?.();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header title="Crash Detection" subtitle="Automatic impact alerts" back />

      {impact ? (
        <View style={styles.impactWrap}>
          <View style={styles.impactRing}>
            <Txt style={{ color: "#fff", fontSize: 64, fontFamily: FONT }} weight="600">{count}</Txt>
          </View>
          <Txt style={{ color: "#fff", fontSize: fontSize["2xl"], marginTop: spacing.lg }} weight="600">Impact detected</Txt>
          <Txt style={{ color: "rgba(255,255,255,0.85)", marginTop: spacing.sm }} center>
            {impact.g.toFixed(1)}g impact · Are you okay? We will alert your contacts automatically if you do not respond.
          </Txt>
          <View style={{ width: "100%", marginTop: spacing.xl, gap: spacing.md }}>
            <Button testID="crash-safe-button" title="I'm safe" onPress={() => report("safe", impact.g)} />
            <Button testID="crash-help-button" title="I need help" variant="secondary" onPress={() => report("need_help", impact.g)} />
          </View>
        </View>
      ) : (
        <View style={{ padding: spacing.lg }}>
          <View style={styles.gaugeCard}>
            <View style={[styles.gauge, { borderColor: monitoring ? colors.success : colors.border }]}>
              <Txt style={{ fontSize: 40, fontFamily: FONT }} weight="600">{lastG.toFixed(2)}</Txt>
              <Txt variant="caption">g-force</Txt>
            </View>
            <Txt variant="caption" style={{ marginTop: spacing.md }}>Peak this session: {peakG.toFixed(2)}g · Trigger at {IMPACT_THRESHOLD_G}g</Txt>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.brand} />
            <Txt variant="body" style={{ flex: 1, marginLeft: spacing.sm }}>
              Keep this screen open during your ride. If a sudden impact is detected, we will start a countdown and alert your vehicle contacts unless you confirm you are safe.
            </Txt>
          </View>

          <View style={{ marginTop: spacing.xl }}>
            {monitoring ? (
              <Button testID="crash-stop-button" title="Stop monitoring" variant="outline" onPress={stop} />
            ) : (
              <Button testID="crash-start-button" title="Start monitoring" icon="pulse" onPress={start} />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  gaugeCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.xl, alignItems: "center", ...shadow.card },
  gauge: { width: 160, height: 160, borderRadius: 80, borderWidth: 6, alignItems: "center", justifyContent: "center" },
  infoCard: { flexDirection: "row", backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.lg },
  impactWrap: { flex: 1, backgroundColor: colors.error, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  impactRing: { width: 160, height: 160, borderRadius: 80, borderWidth: 6, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
});
