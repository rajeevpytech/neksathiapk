import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Platform, TextInput, Modal } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import { MapView, Marker, PROVIDER_GOOGLE, isMapSupported } from "@/src/components/maps";
import { api } from "@/src/lib/api";
import { Family } from "@/src/lib/types";
import { useToast } from "@/src/context/ToastContext";
import { Button, Loader, EmptyState } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { timeAgo } from "@/src/lib/time";
import { colors, spacing, radius, shadow, fontSize, FONT } from "@/src/theme/theme";

const DEFAULT = { latitude: 27.7172, longitude: 85.324, latitudeDelta: 0.08, longitudeDelta: 0.08 };

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["30%", "75%"], []);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [code, setCode] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<Family>("/family");
      setFamily(data);
    } catch (e: any) {
      show(e?.message || "Failed to load family", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createFamily = async () => {
    setBusy(true);
    try {
      await api("/family", { method: "POST", body: { name: "My Family" } });
      show("Family created", "success");
      load();
    } catch (e: any) {
      show(e?.message || "Could not create family", "error");
    } finally {
      setBusy(false);
    }
  };

  const joinFamily = async () => {
    if (!code.trim()) {
      show("Enter an invite code", "error");
      return;
    }
    setBusy(true);
    try {
      await api("/family/join", { method: "POST", body: { invite_code: code.trim().toUpperCase() } });
      show("Joined family", "success");
      setJoinModal(false);
      setCode("");
      load();
    } catch (e: any) {
      show(e?.message || "Invalid invite code", "error");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    if (family?.invite_code) {
      await Clipboard.setStringAsync(family.invite_code);
      show("Invite code copied", "success");
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
        <Loader />
      </View>
    );
  }

  if (!family?.in_family) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top + spacing.lg }}>
        <Txt style={{ fontSize: fontSize["2xl"], marginHorizontal: spacing.lg, fontFamily: FONT }} weight="600">Family Guardian</Txt>
        <EmptyState
          testID="family-empty"
          icon="people-outline"
          title="Start your family circle"
          subtitle="Create a circle to see loved ones on a live map, or join one with an invite code."
          action={
            <View style={{ width: 260, gap: spacing.md }}>
              <Button testID="family-create-button" title="Create a family" icon="add" onPress={createFamily} loading={busy} />
              <Button testID="family-join-button" title="Join with code" variant="outline" onPress={() => setJoinModal(true)} />
            </View>
          }
        />
        <JoinModal visible={joinModal} code={code} setCode={setCode} onClose={() => setJoinModal(false)} onJoin={joinFamily} busy={busy} insets={insets} />
      </View>
    );
  }

  const members = family.members ?? [];
  const located = members.filter((m) => m.latitude != null && m.longitude != null);
  const region = located.length
    ? { latitude: located[0].latitude!, longitude: located[0].longitude!, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : DEFAULT;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <MapView style={StyleSheet.absoluteFill} provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined} initialRegion={region} showsUserLocation>
        {located.map((m) => (
          <Marker key={m.member_id} coordinate={{ latitude: m.latitude!, longitude: m.longitude! }} title={m.name} description={m.is_me ? "You" : m.role} pinColor={m.is_me ? colors.brandSecondary : colors.brand} />
        ))}
      </MapView>

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.titlePill}>
          <Ionicons name="people" size={16} color={colors.brand} />
          <Txt weight="600" style={{ marginLeft: spacing.xs }}>{family.name}</Txt>
        </View>
        <Pressable testID="family-invite-pill" onPress={copyCode} style={styles.codePill}>
          <Ionicons name="copy-outline" size={14} color="#fff" />
          <Txt style={{ color: "#fff", marginLeft: spacing.xs }} weight="600">{family.invite_code}</Txt>
        </Pressable>
      </View>

      <BottomSheet ref={sheetRef} index={0} snapPoints={snapPoints} backgroundStyle={styles.sheetBg} handleIndicatorStyle={{ backgroundColor: colors.borderStrong }}>
        <BottomSheetView style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <Txt variant="subtitle">{members.length} member{members.length === 1 ? "" : "s"}</Txt>
          <Txt variant="caption">{located.length} sharing location now</Txt>
        </BottomSheetView>
        <BottomSheetScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}>
          {members.map((m) => (
            <View key={m.member_id} style={styles.memberRow} testID={`member-${m.member_id}`}>
              <View style={styles.memberAvatar}>
                <Txt style={{ color: colors.brand, fontFamily: FONT }} weight="600">{m.name.charAt(0).toUpperCase()}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Txt variant="label">{m.name}{m.is_me ? " (You)" : ""}</Txt>
                  {m.role === "guardian" && <Ionicons name="shield-checkmark" size={14} color={colors.success} />}
                </View>
                <Txt variant="caption">
                  {m.share_location ? (m.last_seen ? `Seen ${timeAgo(m.last_seen)}` : "Location on") : "Location off"}
                </Txt>
              </View>
              {m.battery != null && (
                <View style={styles.battery}>
                  <Ionicons name="battery-half-outline" size={16} color={m.battery < 20 ? colors.error : colors.muted} />
                  <Txt variant="caption" style={{ marginLeft: 2 }}>{m.battery}%</Txt>
                </View>
              )}
            </View>
          ))}

          <View style={styles.inviteCard}>
            <Ionicons name="person-add-outline" size={22} color={colors.brand} />
            <View style={{ flex: 1, marginHorizontal: spacing.md }}>
              <Txt variant="label">Invite family</Txt>
              <Txt variant="caption">Share code {family.invite_code} · up to {family.max_members} members</Txt>
            </View>
            <Pressable testID="family-copy-code" onPress={copyCode} style={styles.copyBtn}>
              <Txt color={colors.brand} weight="600">Copy</Txt>
            </Pressable>
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {!isMapSupported && (
        <View style={styles.webNote}>
          <Txt variant="caption" center>Live family map is available on the mobile app.</Txt>
        </View>
      )}
    </View>
  );
}

function JoinModal({ visible, code, setCode, onClose, onJoin, busy, insets }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.joinSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.grabber} />
        <Txt variant="heading" style={{ marginBottom: spacing.lg }}>Join a family</Txt>
        <View style={styles.codeInput}>
          <Ionicons name="key-outline" size={18} color={colors.muted} />
          <TextInput
            testID="family-code-input"
            placeholder="Enter 6-digit invite code"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
            style={styles.codeInputText}
          />
        </View>
        <Button testID="family-join-submit" title="Join family" onPress={onJoin} loading={busy} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  topBar: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  titlePill: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, ...shadow.card },
  codePill: { flexDirection: "row", alignItems: "center", backgroundColor: colors.brand, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, ...shadow.card },
  sheetBg: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  memberRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  memberAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  battery: { flexDirection: "row", alignItems: "center" },
  inviteCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.brandTertiary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  copyBtn: { backgroundColor: "#fff", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  webNote: { position: "absolute", top: 100, alignSelf: "center", backgroundColor: "#fff", padding: spacing.md, borderRadius: radius.md, ...shadow.card },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  joinSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.lg },
  codeInput: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, height: 54, marginBottom: spacing.lg },
  codeInputText: { flex: 1, fontFamily: FONT, fontSize: 18, letterSpacing: 2, color: colors.onSurface, marginLeft: spacing.sm, height: "100%", ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}) },
});
