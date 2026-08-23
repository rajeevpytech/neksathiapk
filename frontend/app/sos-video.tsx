import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable, Platform, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/context/ToastContext";
import { Button } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, radius, fontSize, FONT } from "@/src/theme/theme";

const DEFAULT_CHUNK = 1_500_000; // base64 chars (~1.5MB), safely < 5MB

export default function SosVideo() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ready = camPerm?.granted && micPerm?.granted;

  const askPerms = async () => {
    if (!camPerm?.granted) await requestCam();
    if (!micPerm?.granted) await requestMic();
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setRecording(true);
    startRef.current = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 60 });
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);
      if (video?.uri) uploadVideo(video.uri, Date.now() - startRef.current);
    } catch (e: any) {
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      show("Recording failed", "error");
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
  };

  const uploadVideo = async (uri: string, durationMs: number) => {
    setUploading(true);
    setProgress(0);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

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

      let chunkSize = DEFAULT_CHUNK;
      let total = Math.ceil(base64.length / chunkSize);

      let init = await api<{ upload_id: string; chunk_max_bytes: number }>("/user/sos-video/init", {
        method: "POST",
        body: { total_chunks: total, duration_ms: Math.round(durationMs), latitude, longitude },
      });

      if (init.chunk_max_bytes && init.chunk_max_bytes < chunkSize) {
        chunkSize = init.chunk_max_bytes;
        total = Math.ceil(base64.length / chunkSize);
        init = await api("/user/sos-video/init", {
          method: "POST",
          body: { total_chunks: total, duration_ms: Math.round(durationMs), latitude, longitude },
        });
      }

      const uploadId = init.upload_id;
      for (let i = 0; i < total; i++) {
        const data = base64.slice(i * chunkSize, (i + 1) * chunkSize);
        await api("/user/sos-video/chunk", { method: "POST", body: { upload_id: uploadId, index: i, data_base64: data } });
        setProgress((i + 1) / total);
      }

      // Resume any missing chunks (idempotent safety)
      try {
        const status = await api<{ missing?: number[] }>(`/user/sos-video/status/${uploadId}`);
        if (status.missing && status.missing.length) {
          for (const i of status.missing) {
            const data = base64.slice(i * chunkSize, (i + 1) * chunkSize);
            await api("/user/sos-video/chunk", { method: "POST", body: { upload_id: uploadId, index: i, data_base64: data } });
          }
        }
      } catch {
        /* ignore */
      }

      await api("/user/sos-video/complete", { method: "POST", body: { upload_id: uploadId } });
      show("SOS video uploaded securely", "success");
      router.back();
    } catch (e: any) {
      show(e?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  if (!camPerm || !micPerm) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  if (!ready) {
    const blocked = !camPerm.canAskAgain || !micPerm.canAskAgain;
    return (
      <View style={[styles.permWrap, { paddingTop: insets.top }]}>
        <Pressable testID="video-close-button" onPress={() => router.back()} style={[styles.closeBtn, { top: insets.top + spacing.sm }]}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        <Ionicons name="videocam-outline" size={64} color="#fff" />
        <Txt style={{ color: "#fff", fontSize: fontSize.xl, marginTop: spacing.lg }} weight="600" center>
          Camera & microphone needed
        </Txt>
        <Txt style={{ color: "rgba(255,255,255,0.7)", marginTop: spacing.sm, maxWidth: 300 }} center>
          Record an evidence video that is securely stored to your account during emergencies.
        </Txt>
        <View style={{ marginTop: spacing.xl, width: 240 }}>
          {blocked ? (
            <Button testID="video-settings-button" title="Open Settings" onPress={() => Linking.openSettings()} />
          ) : (
            <Button testID="video-grant-button" title="Allow access" onPress={askPerms} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" mode="video" />
      <Pressable testID="video-close-button" onPress={() => router.back()} style={[styles.closeBtn, { top: insets.top + spacing.sm }]}>
        <Ionicons name="close" size={26} color="#fff" />
      </Pressable>

      {recording && (
        <View style={[styles.recPill, { top: insets.top + spacing.sm }]}>
          <View style={styles.recDot} />
          <Txt style={{ color: "#fff" }} weight="600">
            {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </Txt>
        </View>
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        {uploading ? (
          <View style={styles.uploadWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Txt style={{ color: "#fff", marginTop: spacing.sm }} weight="600">Uploading {Math.round(progress * 100)}%</Txt>
          </View>
        ) : (
          <>
            <Txt style={{ color: "rgba(255,255,255,0.85)", marginBottom: spacing.md }} center>
              {recording ? "Recording… tap to stop" : "Tap to record SOS evidence"}
            </Txt>
            <Pressable
              testID="video-record-button"
              onPress={recording ? stopRecording : startRecording}
              style={[styles.recordBtn, recording && styles.recordBtnActive]}
            >
              {recording ? <View style={styles.stopSquare} /> : <View style={styles.recInner} />}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  permWrap: { flex: 1, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  closeBtn: { position: "absolute", left: spacing.lg, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  recPill: { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error, marginRight: spacing.sm },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center" },
  recordBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  recordBtnActive: { borderColor: colors.error },
  recInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.error },
  stopSquare: { width: 30, height: 30, borderRadius: 6, backgroundColor: colors.error },
  uploadWrap: { width: "80%", alignItems: "center" },
  progressTrack: { width: "100%", height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.success },
});
