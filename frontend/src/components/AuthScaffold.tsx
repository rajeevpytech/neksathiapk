import React from "react";
import { View, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize, FONT } from "@/src/theme/theme";
import { Txt } from "@/src/components/Txt";

export function AuthScaffold({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <LinearGradient
          colors={[colors.brand, "#123a63"]}
          style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}
        >
          <View style={styles.logo}>
            <Ionicons name="shield-checkmark" size={30} color={colors.onBrandPrimary} />
          </View>
          <Txt style={{ color: "#fff", fontSize: fontSize["3xl"], fontFamily: FONT }} weight="600">
            {title}
          </Txt>
          <Txt style={{ color: "rgba(255,255,255,0.8)", marginTop: spacing.xs }}>{subtitle}</Txt>
        </LinearGradient>
        <View style={styles.body}>{children}</View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["2xl"],
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  body: { flex: 1, padding: spacing.xl },
});
