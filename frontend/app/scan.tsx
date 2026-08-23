import React, { useCallback, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform, TextInput, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/context/ToastContext";
import { Button } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, radius, shadow, FONT, fontSize } from "@/src/theme/theme";

type Kind = "qr" | "tag";
const ALERT_TYPES: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "emergency", label: "Emergency", icon: "warning-outline" },
  { key: "wrong_parking", label: "Wrong parking", icon: "car-outline" },
  { key: "theft", label: "Theft", icon: "alert-circle-outline" },
  { key: "fire", label: "Fire", icon: "flame-outline" },
  { key: "towing", label: "Towing", icon: "trail-sign-outline" },
  { key: "sos", label: "SOS", icon: "hand-left-outline" },
];

function extractId(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("/")) {
    const parts = trimmed.split("?")[0].split("/").filter(Boolean);
    return parts[parts.length - 1];
  }
  return trimmed;
}

export default function Scan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<{ kind: Kind; id: string; info: any } | null>(null);
  const [type, setType] = useState("emergency");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [calling, setCalling] = useState(false);

  const onScan = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      const id = extractId(data);
      try {
        const info = await api(`/public/qr/${id}`, { auth: false });
        setResult({ kind: "qr", id, info });
        return;
      } catch {
        /* try tag */
      }
      try {
        const info = await api(`/public/tag/${id}`, { auth: false });
        setResult({ kind: "tag", id, info });
        return;
      } catch {
        show("This QR is not a Nek Sathi tag", "error");
        setTimeout(() => setScanned(false), 1500);
      }
    },
    [scanned, show]
  );

  const submitAlert = async () => {
    if (!result) return;
    setSubmitting(true);
    let latitude: number | undefined;
    let longitude: number | undefined;
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      let granted = perm.granted;
      if (!granted && perm.canAskAgain) granted = (await Location.requestForegroundPermissionsAsync()).granted;
      if (granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      }
    } catch {
      /* optional */
    }
    try {
      const path = result.kind === "qr" ? `/public/qr/${result.id}/alert` : `/public/tag/${result.id}/alert`;
      await api(path, { method: "POST", auth: false, body: { type, message: message.trim() || undefined, latitude, longitude } });
      show("Owner alerted. Thank you!", "success");
      router.back();
    } catch (e: any) {
      show(e?.message || "Could not send alert", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const maskedCall = async () => {
    if (!result) return;
    setCalling(true);
    try {
      const res = await api<any>(`/public/tag/${result.id}/call`, { method: "POST", auth: false, body: {} });
      const number = res?.masked_number || res?.number || res?.phone || res?.call_number;
      if (number) {
        Linking.openURL(`tel:${number}`).catch(() => {});
        show("Connecting your masked call…", "success");
      } else {
        show(res?.message || "Call request sent to owner", "success");
      }
    } catch (e: any) {
      show(e?.message || "Could not place call", "error");
    } finally {
      setCalling(false);
    }
  };

  // Permission gate
  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }
  if (!permission.granted) {
    return (
      <View style={[styles.permWrap, { paddingTop: insets.top }]}>
        <Pressable testID="scan-close-button" onPress={() => router.back()} style={[styles.closeBtn, { top: insets.top + spacing.sm }]}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <Ionicons name="camera-outline" size={64} color="#fff" />
        <Txt style={{ color: "#fff", fontSize: fontSize.xl, marginTop: spacing.lg }} weight="600" center>
          Camera access needed
        </Txt>
        <Txt style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.sm, maxWidth: 280 }} center>
          Scan safety QR tags to report vehicles and belongings.
        </Txt>
        <View style={{ marginTop: spacing.xl, width: 240 }}>
          {permission.canAskAgain ? (
            <Button testID="scan-grant-button" title="Allow camera" onPress={requestPermission} />
          ) : (
            <Button testID="scan-settings-button" title="Open Settings" onPress={() => Linking.openSettings()} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : onScan}
      />
      <View style={[styles.overlay, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Pressable testID="scan-close-button" onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        {!result && (
          <>
            <View style={styles.frame} />
            <Txt style={{ color: "#fff", marginTop: spacing.xl }} center weight="500">
              Point your camera at a Nek Sathi QR tag
            </Txt>
          </>
        )}
      </View>

      {result && (
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.grabber} />
            <View style={styles.resultHead}>
              <View style={styles.resultIcon}>
                <Ionicons name={result.kind === "qr" ? "car" : "pricetag"} size={22} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="subtitle">
                  {result.kind === "qr" ? result.info?.number_plate || "Vehicle" : result.info?.label || result.info?.name || "Tag"}
                </Txt>
                <Txt variant="caption">
                  {result.kind === "qr"
                    ? `${result.info?.vehicle_type || ""}${result.info?.color ? " · " + result.info.color : ""}`
                    : "Personal safety tag"}
                </Txt>
              </View>
            </View>
            <View style={styles.privacyNote}>
              <Ionicons name="lock-closed" size={14} color={colors.success} />
              <Txt variant="caption" style={{ marginLeft: spacing.xs, flex: 1 }} color={colors.success}>
                The owner number stays private. Your report reaches them safely.
              </Txt>
            </View>

            <Txt variant="caption" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>REPORT REASON</Txt>
            <View style={styles.typeGrid}>
              {ALERT_TYPES.map((t) => (
                <Pressable key={t.key} testID={`report-type-${t.key}`} onPress={() => setType(t.key)} style={[styles.typeChip, type === t.key && styles.typeChipActive]}>
                  <Ionicons name={t.icon} size={16} color={type === t.key ? "#fff" : colors.brand} />
                  <Txt style={{ marginLeft: 6 }} weight="600" color={type === t.key ? "#fff" : colors.onSurface}>{t.label}</Txt>
                </Pressable>
              ))}
            </View>

            <View style={styles.msgWrap}>
              <TextInput
                testID="report-message-input"
                placeholder="Add a note (optional)"
                placeholderTextColor={colors.muted}
                value={message}
                onChangeText={setMessage}
                multiline
                style={styles.msgInput}
              />
            </View>

            <Button testID="report-submit-button" title="Send alert to owner" variant="secondary" onPress={submitAlert} loading={submitting} />
            {result.kind === "tag" && (
              <View style={{ marginTop: spacing.md }}>
                <Button testID="report-call-button" title="Call owner (masked)" variant="outline" icon="call-outline" onPress={maskedCall} loading={calling} />
              </View>
            )}
            <Pressable
              testID="scan-again-button"
              onPress={() => {
                setResult(null);
                setMessage("");
                setScanned(false);
              }}
              style={{ alignSelf: "center", marginTop: spacing.lg }}
            >
              <Txt color={colors.brand} weight="600">Scan another</Txt>
            </Pressable>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center" },
  closeBtn: { position: "absolute", left: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  frame: { width: 240, height: 240, borderRadius: radius.lg, borderWidth: 3, borderColor: "#fff", marginTop: "40%" },
  permWrap: { flex: 1, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "72%", ...shadow.raised },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.lg },
  resultHead: { flexDirection: "row", alignItems: "center" },
  resultIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  privacyNote: { flexDirection: "row", alignItems: "center", backgroundColor: "#ECFDF5", borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  typeChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  msgWrap: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: spacing.md, marginVertical: spacing.lg, minHeight: 70 },
  msgInput: { fontFamily: FONT, fontSize: 16, color: colors.onSurface, ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}) },
});
