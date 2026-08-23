import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/context/ToastContext";
import { Header, Button, Input } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, radius } from "@/src/theme/theme";

const TYPES = [
  { key: "car", label: "Car" },
  { key: "motorcycle", label: "Motorcycle" },
  { key: "scooter", label: "Scooter" },
  { key: "truck", label: "Truck" },
];

export default function NewVehicle() {
  const router = useRouter();
  const { show } = useToast();
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("car");
  const [makeModel, setMakeModel] = useState("");
  const [color, setColor] = useState("");
  const [limit, setLimit] = useState("80");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!plate.trim()) {
      show("Enter the number plate", "error");
      return;
    }
    setLoading(true);
    try {
      await api("/vehicles", {
        method: "POST",
        body: {
          number_plate: plate.trim().toUpperCase(),
          vehicle_type: type,
          make_model: makeModel.trim() || null,
          color: color.trim() || null,
          speed_limit_kmh: parseInt(limit, 10) || 80,
        },
      });
      show("Vehicle added", "success");
      router.back();
    } catch (e: any) {
      show(e?.message || "Could not add vehicle", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header title="Add Vehicle" back />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg }}>
        <Input testID="vehicle-plate-input" label="Number plate" icon="pricetag-outline" placeholder="BA 12 PA 3456" autoCapitalize="characters" value={plate} onChangeText={setPlate} />

        <Txt variant="caption" style={{ marginBottom: spacing.sm }}>VEHICLE TYPE</Txt>
        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <Pressable key={t.key} testID={`vehicle-type-${t.key}`} onPress={() => setType(t.key)} style={[styles.chip, type === t.key && styles.chipActive]}>
              <Txt weight="600" color={type === t.key ? "#fff" : colors.onSurface}>{t.label}</Txt>
            </Pressable>
          ))}
        </View>

        <View style={{ height: spacing.lg }} />
        <Input testID="vehicle-model-input" label="Make & model (optional)" icon="car-outline" placeholder="Honda Activa" value={makeModel} onChangeText={setMakeModel} />
        <Input testID="vehicle-color-input" label="Color (optional)" icon="color-palette-outline" placeholder="Red" value={color} onChangeText={setColor} />
        <Input testID="vehicle-limit-input" label="Speed limit (km/h)" icon="speedometer-outline" keyboardType="number-pad" value={limit} onChangeText={setLimit} />

        <Button testID="vehicle-save-button" title="Add vehicle" onPress={submit} loading={loading} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.lg, height: 42, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
});
