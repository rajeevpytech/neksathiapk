import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Switch, Modal, Platform, TextInput, Share } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { MapView, Marker, PROVIDER_GOOGLE } from "@/src/components/maps";
import { api } from "@/src/lib/api";
import { Vehicle, VehicleContact, TrackPoint } from "@/src/lib/types";
import { useToast } from "@/src/context/ToastContext";
import { Header, Loader, Badge, Button } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { formatDateTime } from "@/src/lib/time";
import { colors, spacing, radius, shadow, FONT } from "@/src/theme/theme";

export default function VehicleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [contacts, setContacts] = useState<VehicleContact[]>([]);
  const [track, setTrack] = useState<TrackPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, c, t] = await Promise.all([
        api<Vehicle>(`/vehicles/${id}`),
        api<VehicleContact[]>(`/vehicles/${id}/contacts`).catch(() => []),
        api<TrackPoint[]>(`/vehicles/${id}/track?limit=50`).catch(() => []),
      ]);
      setVehicle(v);
      setContacts(c);
      setTrack(t);
    } catch (e: any) {
      show(e?.message || "Failed to load vehicle", "error");
    } finally {
      setLoading(false);
    }
  }, [id, show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleLost = async () => {
    if (!vehicle) return;
    const enabled = !vehicle.lost_mode;
    setVehicle({ ...vehicle, lost_mode: enabled });
    try {
      await api(`/vehicles/${id}/lost_mode`, { method: "POST", body: { enabled } });
      show(enabled ? "Lost mode enabled" : "Lost mode disabled", enabled ? "error" : "success");
    } catch (e: any) {
      setVehicle({ ...vehicle, lost_mode: !enabled });
      show(e?.message || "Could not update", "error");
    }
  };

  const addContact = async () => {
    if (contacts.length >= 4) {
      show("Maximum 4 contacts", "error");
      return;
    }
    if (!cName.trim() || !cPhone.trim()) {
      show("Enter name and phone", "error");
      return;
    }
    setSaving(true);
    try {
      const created = await api<VehicleContact>(`/vehicles/${id}/contacts`, { method: "POST", body: { name: cName.trim(), phone: cPhone.trim() } });
      setContacts((c) => [...c, created]);
      setModal(false);
      setCName("");
      setCPhone("");
      show("Contact added", "success");
    } catch (e: any) {
      show(e?.message || "Could not add contact", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeContact = async (cid: string) => {
    try {
      await api(`/vehicles/${id}/contacts/${cid}`, { method: "DELETE" });
      setContacts((c) => c.filter((x) => x.id !== cid));
    } catch (e: any) {
      show(e?.message || "Could not remove", "error");
    }
  };

  const deleteVehicle = async () => {
    try {
      await api(`/vehicles/${id}`, { method: "DELETE" });
      show("Vehicle deleted", "success");
      router.back();
    } catch (e: any) {
      show(e?.message || "Could not delete", "error");
    }
  };

  const shareQr = async () => {
    if (!vehicle) return;
    const url = `https://neksathi-live.emergent.host/qr/${vehicle.qr_id}`;
    try {
      await Share.share({ message: `Scan this Nek Sathi tag to report about my vehicle ${vehicle.number_plate}: ${url}` });
    } catch {
      /* ignore */
    }
  };

  if (loading || !vehicle) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <Header title="Vehicle" back />
        <Loader />
      </View>
    );
  }

  const last = track[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header
        title={vehicle.number_plate}
        subtitle={vehicle.make_model || vehicle.vehicle_type}
        back
        right={
          <Pressable testID="vehicle-delete-button" onPress={deleteVehicle} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </Pressable>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing["3xl"] }}>
        {/* QR card */}
        <View style={styles.qrCard}>
          <View style={styles.qrBox}>
            <QRCode value={vehicle.qr_id} size={140} color={colors.brand} backgroundColor="#fff" />
          </View>
          <Txt variant="caption" center style={{ marginTop: spacing.md }}>Anyone can scan this tag to safely alert you — your number stays private.</Txt>
          <View style={{ marginTop: spacing.md, alignSelf: "stretch" }}>
            <Button testID="vehicle-share-qr" title="Share QR tag" variant="outline" icon="share-social-outline" onPress={shareQr} />
          </View>
        </View>

        {/* Lost mode */}
        <View style={[styles.card, { flexDirection: "row", alignItems: "center" }]}>
          <View style={[styles.icon, { backgroundColor: vehicle.lost_mode ? "#FEE2E2" : colors.brandTertiary }]}>
            <Ionicons name="alert-circle-outline" size={22} color={vehicle.lost_mode ? colors.error : colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="label">Lost / Stolen mode</Txt>
            <Txt variant="caption">Broadcast alerts on every scan</Txt>
          </View>
          <Switch testID="vehicle-lost-toggle" value={vehicle.lost_mode} onValueChange={toggleLost} trackColor={{ true: colors.error, false: colors.borderStrong }} thumbColor="#fff" />
        </View>

        {/* Track */}
        <Txt variant="caption" style={styles.section}>LAST KNOWN LOCATION</Txt>
        <View style={styles.mapCard}>
          {last ? (
            <>
              <MapView style={styles.map} provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined} initialRegion={{ latitude: last.latitude, longitude: last.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}>
                <Marker coordinate={{ latitude: last.latitude, longitude: last.longitude }} title={vehicle.number_plate} pinColor={colors.brandSecondary} />
              </MapView>
              <View style={styles.trackMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="speedometer-outline" size={16} color={colors.muted} />
                  <Txt variant="caption" style={{ marginLeft: 4 }}>{Math.round(last.speed_kmh ?? 0)} km/h</Txt>
                </View>
                <Txt variant="caption">{formatDateTime((last as any).recorded_at || (last as any).created_at)}</Txt>
              </View>
            </>
          ) : (
            <View style={styles.noTrack}>
              <Ionicons name="location-outline" size={28} color={colors.muted} />
              <Txt variant="caption" style={{ marginTop: spacing.sm }}>No location data yet</Txt>
            </View>
          )}
        </View>

        {/* Crash detection */}
        <Pressable testID="vehicle-crash-button" onPress={() => router.push(`/crash-detection?vehicleId=${id}`)} style={styles.crashRow}>
          <View style={[styles.icon, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="pulse-outline" size={22} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="label">Crash detection</Txt>
            <Txt variant="caption">Auto-detect impacts with motion sensors</Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        {/* Contacts */}
        <View style={[styles.section, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
          <Txt variant="caption">EMERGENCY CONTACTS ({contacts.length}/4)</Txt>
          {contacts.length < 4 && (
            <Pressable testID="vehicle-add-contact" onPress={() => setModal(true)}>
              <Txt color={colors.brand} weight="600">+ Add</Txt>
            </Pressable>
          )}
        </View>
        {contacts.length === 0 ? (
          <Txt variant="caption" style={{ marginBottom: spacing.md }}>No contacts. Add up to 4 people to notify on scans and overspeed.</Txt>
        ) : (
          contacts.map((c) => (
            <View key={c.id} style={styles.contactRow} testID={`vcontact-${c.id}`}>
              <View style={styles.contactAvatar}>
                <Txt style={{ color: colors.brand, fontFamily: FONT }} weight="600">{c.name.charAt(0).toUpperCase()}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="label">{c.name}</Txt>
                <Txt variant="caption">{c.phone}</Txt>
              </View>
              <Pressable testID={`vcontact-delete-${c.id}`} onPress={() => removeContact(c.id)} hitSlop={8} style={{ padding: spacing.sm }}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          <Txt variant="heading" style={{ marginBottom: spacing.lg }}>Add vehicle contact</Txt>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={colors.muted} />
            <TextInput testID="vcontact-name-input" placeholder="Name" placeholderTextColor={colors.muted} value={cName} onChangeText={setCName} style={styles.input} />
          </View>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={18} color={colors.muted} />
            <TextInput testID="vcontact-phone-input" placeholder="+9779800000000" placeholderTextColor={colors.muted} keyboardType="phone-pad" value={cPhone} onChangeText={setCPhone} style={styles.input} />
          </View>
          <Button testID="vcontact-save-button" title="Save contact" onPress={addContact} loading={saving} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  qrCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", ...shadow.card },
  qrBox: { backgroundColor: "#fff", padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg, ...shadow.card },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  section: { marginTop: spacing.xl, marginBottom: spacing.sm },
  mapCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, overflow: "hidden", ...shadow.card },
  map: { height: 180, width: "100%" },
  trackMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center" },
  noTrack: { height: 140, alignItems: "center", justifyContent: "center" },
  crashRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg, ...shadow.card },
  contactRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.card },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.lg },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, height: 54, marginBottom: spacing.md },
  input: { flex: 1, fontFamily: FONT, fontSize: 16, color: colors.onSurface, marginLeft: spacing.sm, height: "100%", ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}) },
});
