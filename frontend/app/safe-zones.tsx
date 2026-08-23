import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform, TextInput } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { MapView, Marker, Circle, PROVIDER_GOOGLE, isMapSupported } from "@/src/components/maps";
import { api } from "@/src/lib/api";
import { SafeZone } from "@/src/lib/types";
import { useToast } from "@/src/context/ToastContext";
import { Header, Button, Loader } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, radius, shadow, FONT } from "@/src/theme/theme";

const RADIUS_OPTIONS = [100, 200, 500, 1000];
const DEFAULT = { latitude: 27.7172, longitude: 85.324, latitudeDelta: 0.05, longitudeDelta: 0.05 };

export default function SafeZones() {
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const mapRef = useRef<any>(null);
  const [zones, setZones] = useState<SafeZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(DEFAULT);
  const [addMode, setAddMode] = useState(false);
  const [pending, setPending] = useState<{ latitude: number; longitude: number } | null>(null);
  const [name, setName] = useState("");
  const [radiusM, setRadiusM] = useState(200);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<SafeZone[]>("/me/safe-zones");
      setZones(data);
    } catch (e: any) {
      show(e?.message || "Failed to load safe zones", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        let granted = perm.granted;
        if (!granted && perm.canAskAgain) granted = (await Location.requestForegroundPermissionsAsync()).granted;
        if (granted) {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const r = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
          setRegion(r);
          mapRef.current?.animateToRegion?.(r, 600);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const startAdd = () => {
    setAddMode(true);
    setPending({ latitude: region.latitude, longitude: region.longitude });
  };
  const cancelAdd = () => {
    setAddMode(false);
    setPending(null);
    setName("");
  };

  const save = async () => {
    if (!pending) {
      show("Tap on the map to set the zone center", "error");
      return;
    }
    if (!name.trim()) {
      show("Give this zone a name", "error");
      return;
    }
    setSaving(true);
    try {
      await api("/me/safe-zones", {
        method: "POST",
        body: { name: name.trim(), latitude: pending.latitude, longitude: pending.longitude, radius_m: radiusM },
      });
      show("Safe zone added", "success");
      cancelAdd();
      load();
    } catch (e: any) {
      show(e?.message || "Could not save zone", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/me/safe-zones/${id}`, { method: "DELETE" });
      setZones((z) => z.filter((x) => x.id !== id));
      show("Zone removed", "success");
    } catch (e: any) {
      show(e?.message || "Could not remove", "error");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header title="Safe Zones" subtitle="Geofence alerts for arrivals & exits" back />

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
          initialRegion={DEFAULT}
          region={undefined}
          showsUserLocation
          onPress={(e: any) => {
            if (addMode) setPending(e.nativeEvent.coordinate);
          }}
          onRegionChangeComplete={(r: any) => setRegion(r)}
        >
          {zones.map((z) => (
            <React.Fragment key={z.id}>
              <Marker coordinate={{ latitude: z.latitude, longitude: z.longitude }} title={z.name} pinColor={colors.brand} />
              <Circle center={{ latitude: z.latitude, longitude: z.longitude }} radius={z.radius_m} strokeColor={colors.brand} fillColor="rgba(11,40,77,0.15)" strokeWidth={2} />
            </React.Fragment>
          ))}
          {pending && (
            <>
              <Marker coordinate={pending} pinColor={colors.brandSecondary} draggable onDragEnd={(e: any) => setPending(e.nativeEvent.coordinate)} />
              <Circle center={pending} radius={radiusM} strokeColor={colors.brandSecondary} fillColor="rgba(220,38,38,0.15)" strokeWidth={2} />
            </>
          )}
        </MapView>

        {addMode && isMapSupported && (
          <View style={[styles.hint, { top: spacing.md }]}>
            <Ionicons name="hand-left-outline" size={16} color="#fff" />
            <Txt style={{ color: "#fff", marginLeft: spacing.sm }} weight="500">Tap the map to place the zone</Txt>
          </View>
        )}
      </View>

      {addMode ? (
        <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.grabber} />
          <View style={styles.inputWrap}>
            <Ionicons name="pricetag-outline" size={18} color={colors.muted} />
            <TextInput
              testID="zone-name-input"
              placeholder="Zone name (e.g. Home, School)"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
          </View>
          <Txt variant="caption" style={{ marginBottom: spacing.sm }}>RADIUS</Txt>
          <View style={styles.chipRow}>
            {RADIUS_OPTIONS.map((r) => (
              <Pressable key={r} testID={`zone-radius-${r}`} onPress={() => setRadiusM(r)} style={[styles.chip, radiusM === r && styles.chipActive]}>
                <Txt weight="600" color={radiusM === r ? "#fff" : colors.onSurface}>{r < 1000 ? `${r}m` : "1km"}</Txt>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
            <View style={{ flex: 1 }}><Button testID="zone-cancel-button" title="Cancel" variant="outline" onPress={cancelAdd} /></View>
            <View style={{ flex: 1 }}><Button testID="zone-save-button" title="Save zone" onPress={save} loading={saving} /></View>
          </View>
        </View>
      ) : (
        <View style={[styles.listPanel, { paddingBottom: insets.bottom + spacing.md }]}>
          {loading ? (
            <Loader />
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.listHeader}>
                <Txt variant="subtitle">{zones.length} safe zone{zones.length === 1 ? "" : "s"}</Txt>
                <Pressable testID="zone-add-button" onPress={startAdd} style={styles.addBtn}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Txt style={{ color: "#fff", marginLeft: 4 }} weight="600">Add</Txt>
                </Pressable>
              </View>
              {zones.map((z) => (
                <View key={z.id} style={styles.zoneRow} testID={`zone-${z.id}`}>
                  <View style={styles.zoneIcon}><Ionicons name="shield-checkmark" size={18} color={colors.brand} /></View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="label">{z.name}</Txt>
                    <Txt variant="caption">{z.radius_m}m radius {z.notify ? "· alerts on" : ""}</Txt>
                  </View>
                  <Pressable testID={`zone-delete-${z.id}`} onPress={() => remove(z.id)} hitSlop={8} style={{ padding: spacing.sm }}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: { flex: 1, overflow: "hidden" },
  hint: { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: "rgba(11,40,77,0.9)", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  panel: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, ...shadow.raised },
  listPanel: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: 280, ...shadow.raised },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.md },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: spacing.md, height: 50, marginBottom: spacing.md },
  input: { flex: 1, fontFamily: FONT, fontSize: 16, color: colors.onSurface, marginLeft: spacing.sm, height: "100%", ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}) },
  chipRow: { flexDirection: "row", gap: spacing.sm },
  chip: { flex: 1, height: 42, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.brand, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  zoneRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  zoneIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
});
