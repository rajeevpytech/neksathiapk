import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable, AppState } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import { useAudioPlayer } from "expo-audio";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/context/ToastContext";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, radius, fontSize, FONT } from "@/src/theme/theme";

const LANG_KEY = "neksathi_sos_lang";
type Phase = "countdown" | "sending" | "sent" | "error";

export default function Sos() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const player = useAudioPlayer(require("../assets/sounds/siren.wav"));

  const [phase, setPhase] = useState<Phase>("countdown");
  const [count, setCount] = useState(5);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [channels, setChannels] = useState<string[]>([]);
  const [notified, setNotified] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triggeredRef = useRef(false);

  useEffect(() => {
    storage.getItem<"en" | "hi">(LANG_KEY, "en").then((v) => v && setLang(v));
  }, []);

  const speakAlert = useCallback((l: "en" | "hi") => {
    const text = l === "hi" ? "मदद करो! यह एक आपातकाल है।" : "Help! This is an emergency.";
    try {
      Speech.speak(text, { language: l === "hi" ? "hi-IN" : "en-US", rate: 1.0, pitch: 1.1 });
    } catch {
      /* ignore */
    }
  }, []);

  const startSiren = useCallback(
    (l: "en" | "hi") => {
      try {
        player.loop = true;
        player.volume = 1.0;
        player.play();
      } catch {
        /* ignore */
      }
      speakAlert(l);
      voiceRef.current = setInterval(() => speakAlert(l), 4000);
      // strong vibration pattern
      const vib = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      vib();
    },
    [player, speakAlert]
  );

  const stopSiren = useCallback(() => {
    try {
      player.pause();
    } catch {
      /* ignore */
    }
    try {
      Speech.stop();
    } catch {
      /* ignore */
    }
    if (voiceRef.current) clearInterval(voiceRef.current);
    voiceRef.current = null;
  }, [player]);

  const trigger = useCallback(async () => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPhase("sending");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      let granted = perm.granted;
      if (!granted && perm.canAskAgain) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.granted;
      }
      if (granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
    } catch {
      /* location optional */
    }

    try {
      const res = await api<{ notified: number; channels: string[] }>("/me/sos", {
        method: "POST",
        body: { latitude, longitude, message: "Emergency! I need help." },
      });
      setNotified(res.notified ?? 0);
      setChannels(res.channels ?? []);
      setPhase("sent");
      startSiren(lang);
    } catch (e: any) {
      setPhase("error");
      show(e?.message || "Could not send SOS", "error");
    }
  }, [lang, startSiren, show]);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          trigger();
          return 0;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        return c - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [trigger]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") stopSiren();
    });
    return () => {
      sub.remove();
      stopSiren();
    };
  }, [stopSiren]);

  const cancel = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    stopSiren();
    router.back();
  };

  const toggleLang = () => {
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    storage.setItem(LANG_KEY, next);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <Pressable testID="sos-lang-toggle" onPress={toggleLang} style={styles.langBtn}>
        <Ionicons name="language" size={16} color="#fff" />
        <Txt style={{ color: "#fff", marginLeft: spacing.xs }} weight="600">
          {lang === "en" ? "English" : "हिंदी"}
        </Txt>
      </Pressable>

      <View style={styles.center}>
        {phase === "countdown" && (
          <>
            <Txt style={{ color: "#fff", fontSize: fontSize.xl }} weight="500">
              Sending SOS in
            </Txt>
            <Txt style={{ color: "#fff", fontSize: 120, fontFamily: FONT }} weight="600">
              {count}
            </Txt>
            <Txt style={{ color: "rgba(255,255,255,0.8)" }} center>
              Alerting your emergency contacts and guardians
            </Txt>
          </>
        )}
        {phase === "sending" && (
          <>
            <Ionicons name="radio-outline" size={80} color="#fff" />
            <Txt style={{ color: "#fff", fontSize: fontSize["2xl"], marginTop: spacing.lg }} weight="600">
              Sending alert…
            </Txt>
            <Txt style={{ color: "rgba(255,255,255,0.8)", marginTop: spacing.sm }}>Getting your location</Txt>
          </>
        )}
        {phase === "sent" && (
          <>
            <View style={styles.sentIcon}>
              <Ionicons name="checkmark" size={56} color={colors.error} />
            </View>
            <Txt style={{ color: "#fff", fontSize: fontSize["2xl"], marginTop: spacing.lg }} weight="600">
              Help is on the way
            </Txt>
            <Txt style={{ color: "rgba(255,255,255,0.85)", marginTop: spacing.sm }} center>
              {notified} contact{notified === 1 ? "" : "s"} notified via {channels.join(", ") || "push"}
            </Txt>
          </>
        )}
        {phase === "error" && (
          <>
            <Ionicons name="close-circle-outline" size={80} color="#fff" />
            <Txt style={{ color: "#fff", fontSize: fontSize.xl, marginTop: spacing.lg }} weight="600">
              Could not send SOS
            </Txt>
            <Pressable
              testID="sos-retry"
              onPress={() => {
                triggeredRef.current = false;
                trigger();
              }}
              style={styles.retry}
            >
              <Txt color={colors.error} weight="600">
                Retry
              </Txt>
            </Pressable>
          </>
        )}
      </View>

      {phase === "countdown" ? (
        <Pressable testID="sos-cancel-button" onPress={cancel} style={styles.cancelBtn}>
          <Txt style={{ color: colors.error, fontSize: fontSize.xl }} weight="600">
            Cancel
          </Txt>
        </Pressable>
      ) : (
        <Pressable testID="sos-stop-button" onPress={cancel} style={styles.stopBtn}>
          <Ionicons name="stop-circle-outline" size={24} color="#fff" />
          <Txt style={{ color: "#fff", fontSize: fontSize.xl, marginLeft: spacing.sm }} weight="600">
            Stop siren & close
          </Txt>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.error, paddingHorizontal: spacing.xl, alignItems: "center" },
  langBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sentIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  cancelBtn: {
    backgroundColor: "#fff",
    width: "100%",
    height: 60,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.3)",
    width: "100%",
    height: 60,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  retry: { backgroundColor: "#fff", paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.lg },
});
