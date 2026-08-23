import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Txt } from "@/src/components/Txt";
import { colors, spacing } from "@/src/theme/theme";

// Web fallback — react-native-maps is native-only.
export function MapView({ children, style }: any) {
  return (
    <View style={[styles.fallback, style]}>
      <Ionicons name="map-outline" size={40} color={colors.muted} />
      <Txt variant="caption" style={{ marginTop: spacing.sm }} center>
        Map preview is available on the mobile app
      </Txt>
      {children}
    </View>
  );
}
export const Marker = (_: any) => null;
export const Circle = (_: any) => null;
export const PROVIDER_GOOGLE = undefined;
export const isMapSupported = false;

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", padding: spacing.xl },
});
