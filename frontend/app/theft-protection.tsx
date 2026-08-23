import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAudioPlayer } from "expo-audio";
import * as Device from "expo-device";
import { api } from "@/src/lib/api";
import { Device as DeviceType } from "@/src/lib/types";
import { storage } from "@/src/utils/storage";
import { useToast } from "@/src/context/ToastContext";
import { Header, Button, Loader } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, radius, shadow, fontSize, FONT } from "@/src/theme/theme";

const HERO = "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NTN8MHwxfHNlYXJjaHwxfHxzZWN1cml0eSUyMHNoaWVsZCUyMGxvY2t8ZW58MHx8fHwxNzg3NDU4MzI1fDA&ixlib=rb-4.1.0&q=85&w=1200";
const DEVICE_KEY = "neksathi_device_id";

export default function TheftProtection() {
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const player = useAudioPlayer(require("../assets/sounds/siren.wav"));
  const [permission, requestPermission] = useCameraPermissions();
  const [device, setDevice] = useState<DeviceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cameraModal, setCameraModal] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const load = useCallback(async () => {
    try {
      const devices = await api<DeviceType[]>("/devices");
      const savedId = await storage.getItem<string>(DEVICE_KEY, "");
      const mine = devices.find((d) => d.id === savedId) || devices[0] || null;
      setDevice(mine);
      if (mine) storage.setItem(DEVICE_KEY, mine.id);
    } catch (e: any) {
      show(e?.message || "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Local siren when server marks siren active
  useEffect(() => {
    try {
      if (device?.siren_active) {
        player.loop = true;
        player.volume = 1;
        player.play();
      } else {
        player.pause();
      }
    } catch {
      /* ignore */
    }
  }, [device?.siren_active, player]);

  const enable = async () => {
    setBusy(true);
    try {
      const created = await api<DeviceType>("/devices", {
        method: "POST",
        body: {
          name: Device.deviceName || `${Platform.OS} device`,
          platform: Platform.OS,
          push_token: "pending",
          lock_threshold: 3,
          super_admin_alerts: true,
        },
      });
      await storage.setItem(DEVICE_KEY, created.id);
      setDevice(created);
      show("Theft protection enabled", "success");
    } catch (e: any) {
      show(e?.message || "Could not enable", "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleLock = async () => {
    if (!device) return;
    const path = device.locked ? "unlock" : "lock";
    try {
      const res = await api<{ locked: boolean }>(`/devices/${device.id}/${path}`, { method: "POST", body: {} });
      setDevice({ ...device, locked: res.locked });
      show(res.locked ? "Device locked remotely" : "Device unlocked", res.locked ? "error" : "success");
    } catch (e: any) {
      show(e?.message || "Could not update lock", "error");
    }
  };

  const toggleSiren = async () => {
    if (!device) return;
    const active = !device.siren_active;
    try {
      const res = await api<{ siren_active: boolean }>(`/devices/${device.id}/siren`, { method: "POST", body: { active } });
      setDevice({ ...device, siren_active: res.siren_active });
    } catch (e: any) {
      show(e?.message || "Could not toggle siren", "error");
    }
  };

  const reportSim = async () => {
    if (!device) return;
    setBusy(true);
    try {
      await api(`/devices/${device.id}/sim-swap`, { method: "POST", body: { carrier: "Unknown", new_number: null } });
      show("SIM change reported. Device locked & guardians alerted.", "error");
      load();
    } catch (e: any) {
      show(e?.message || "Could not report", "error");
    } finally {
      setBusy(false);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const req = await requestPermission();
      if (!req.granted) {
        show("Camera permission needed", "error");
        return;
      }
    }
    setCameraModal(true);
  };

  const captureIntruder = async () => {
    if (!device || !cameraRef.current) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
      await api(`/devices/${device.id}/intruder`, {
        method: "POST",
        body: { photo_base64: photo?.base64 || "", attempt_count: 1 },
      });
      setCameraModal(false);
      show("Intruder snapshot uploaded to your account", "success");
    } catch (e: any) {
      show(e?.message || "Could not capture", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <Header title="Theft Protection" back />
        <Loader />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header title="Theft Protection" back />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing["3xl"] }}>
        <View style={styles.hero}>
          <Image source={{ uri: HERO }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(11,40,77,0.95)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.heroContent}>
            <View style={[styles.statusDot, { backgroundColor: device ? "#4ADE80" : "#F87171" }]} />
            <Txt style={{ color: "#fff", fontSize: fontSize.xl, fontFamily: FONT }} weight="600">
              {device ? "Protection active" : "Not protected"}
            </Txt>
            <Txt style={{ color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
              {device ? device.name : "Enable to guard this device"}
            </Txt>
          </View>
        </View>

        {!device ? (
          <View style={{ marginTop: spacing.lg }}>
            <Button testID="theft-enable-button" title="Enable theft protection" icon="shield-checkmark" onPress={enable} loading={busy} />
          </View>
        ) : (
          <>
            <View style={styles.controlsRow}>
              <Pressable testID="theft-lock-button" onPress={toggleLock} style={[styles.control, device.locked && styles.controlActive]}>
                <Ionicons name={device.locked ? "lock-closed" : "lock-open-outline"} size={26} color={device.locked ? "#fff" : colors.brand} />
                <Txt weight="600" color={device.locked ? "#fff" : colors.onSurface} style={{ marginTop: spacing.xs }}>
                  {device.locked ? "Locked" : "Lock"}
                </Txt>
              </Pressable>
              <Pressable testID="theft-siren-button" onPress={toggleSiren} style={[styles.control, device.siren_active && styles.controlDanger]}>
                <Ionicons name="volume-high-outline" size={26} color={device.siren_active ? "#fff" : colors.brandSecondary} />
                <Txt weight="600" color={device.siren_active ? "#fff" : colors.onSurface} style={{ marginTop: spacing.xs }}>
                  {device.siren_active ? "Siren on" : "Siren"}
                </Txt>
              </Pressable>
            </View>

            <Txt variant="caption" style={styles.section}>SECURITY ACTIONS</Txt>
            <Pressable testID="theft-intruder-button" onPress={openCamera} style={styles.actionRow}>
              <View style={[styles.actionIcon, { backgroundColor: colors.brandTertiary }]}>
                <Ionicons name="camera-outline" size={20} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="label">Capture intruder selfie</Txt>
                <Txt variant="caption">Photo saved to your account on failed unlocks</Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
            <Pressable testID="theft-sim-button" onPress={reportSim} style={styles.actionRow}>
              <View style={[styles.actionIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="hardware-chip-outline" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="label">Report SIM change</Txt>
                <Txt variant="caption">Locks device & alerts guardians</Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={18} color={colors.brand} />
              <Txt variant="caption" style={{ flex: 1, marginLeft: spacing.sm }}>
                Full auto-lock, silent intruder capture and SIM-swap detection require the installed app build with Device Admin permission — not Expo Go.
              </Txt>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={cameraModal} animationType="slide" onRequestClose={() => setCameraModal(false)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" />
          <Pressable testID="intruder-close" onPress={() => setCameraModal(false)} style={[styles.camClose, { top: insets.top + spacing.sm }]}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          <View style={[styles.camBar, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Pressable testID="intruder-capture" onPress={captureIntruder} disabled={busy} style={styles.shutter}>
              <View style={styles.shutterInner} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 180, borderRadius: radius.lg, overflow: "hidden", justifyContent: "flex-end" },
  heroContent: { padding: spacing.lg },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginBottom: spacing.sm },
  controlsRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  control: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, paddingVertical: spacing.xl, alignItems: "center", ...shadow.card },
  controlActive: { backgroundColor: colors.brand },
  controlDanger: { backgroundColor: colors.brandSecondary },
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  actionRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.card },
  actionIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  note: { flexDirection: "row", backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  camClose: { position: "absolute", left: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  camBar: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" },
  shutter: { width: 74, height: 74, borderRadius: 37, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
});
