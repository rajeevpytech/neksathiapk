import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextInput,
  TextInputProps,
  ScrollView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { colors, radius, spacing, shadow, FONT, fontSize } from "@/src/theme/theme";
import { Txt } from "./Txt";

/* ---------------- Button ---------------- */
type BtnVariant = "primary" | "secondary" | "danger" | "outline" | "ghost";
export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  icon,
  style,
  testID,
  full = true,
}: {
  title: string;
  onPress: () => void;
  variant?: BtnVariant;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  testID?: string;
  full?: boolean;
}) {
  const map: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.brandPrimary, fg: colors.onBrandPrimary },
    secondary: { bg: colors.brandSecondary, fg: colors.onBrandSecondary },
    danger: { bg: colors.error, fg: colors.onError },
    outline: { bg: "transparent", fg: colors.brandPrimary, border: colors.borderStrong },
    ghost: { bg: "transparent", fg: colors.brandPrimary },
  };
  const c = map[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      testID={testID}
      disabled={isDisabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: c.bg,
          borderWidth: c.border ? 1.5 : 0,
          borderColor: c.border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: full ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <View style={styles.btnInner}>
          {icon && <Ionicons name={icon} size={18} color={c.fg} style={{ marginRight: spacing.sm }} />}
          <Txt weight="600" style={{ color: c.fg, fontSize: fontSize.lg }}>
            {title}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

/* ---------------- Card ---------------- */
export function Card({
  children,
  style,
  onPress,
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  testID?: string;
}) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View testID={testID}>{content}</View>;
}

/* ---------------- Input ---------------- */
export const Input = React.forwardRef<TextInput, TextInputProps & { label?: string; icon?: keyof typeof Ionicons.glyphMap; testID?: string }>(
  ({ label, icon, style, testID, ...rest }, ref) => {
    return (
      <View style={{ marginBottom: spacing.lg }}>
        {label && (
          <Txt variant="caption" style={{ marginBottom: spacing.xs }}>
            {label}
          </Txt>
        )}
        <View style={styles.inputWrap}>
          {icon && <Ionicons name={icon} size={18} color={colors.muted} style={{ marginRight: spacing.sm }} />}
          <TextInput
            ref={ref}
            testID={testID}
            placeholderTextColor={colors.muted}
            style={[styles.input, style]}
            {...rest}
          />
        </View>
      </View>
    );
  }
);
Input.displayName = "Input";

/* ---------------- Screen ---------------- */
export function Screen({
  children,
  scroll = false,
  style,
  contentStyle,
  bg = colors.surface,
  refreshControl,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  bg?: string;
  refreshControl?: React.ReactElement<any>;
}) {
  if (scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: bg }, style]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{ padding: spacing.lg, paddingBottom: spacing["3xl"] }, contentStyle]}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      </View>
    );
  }
  return <View style={[{ flex: 1, backgroundColor: bg, padding: spacing.lg }, style]}>{children}</View>;
}

/* ---------------- Header ---------------- */
export function Header({
  title,
  subtitle,
  back,
  right,
  onBack,
  inverse = false,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
  inverse?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const fg = inverse ? colors.onSurfaceInverse : colors.onSurface;
  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: inverse ? colors.brand : colors.surface,
          borderBottomColor: inverse ? "transparent" : colors.divider,
        },
      ]}
    >
      <View style={styles.headerRow}>
        {back ? (
          <Pressable
            testID="header-back-button"
            hitSlop={12}
            onPress={() => (onBack ? onBack() : router.back())}
            style={styles.headerIconBtn}
          >
            <Ionicons name="chevron-back" size={26} color={fg} />
          </Pressable>
        ) : (
          <View style={{ width: 26 }} />
        )}
        <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
          <Txt variant="heading" color={fg} numberOfLines={1}>
            {title}
          </Txt>
          {subtitle && (
            <Txt variant="caption" color={inverse ? "rgba(255,255,255,0.75)" : colors.muted} numberOfLines={1}>
              {subtitle}
            </Txt>
          )}
        </View>
        <View style={styles.headerRight}>{right}</View>
      </View>
    </View>
  );
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({
  icon = "sparkles-outline",
  title,
  subtitle,
  action,
  testID,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.empty} testID={testID}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={34} color={colors.brand} />
      </View>
      <Txt variant="subtitle" center style={{ marginBottom: spacing.xs }}>
        {title}
      </Txt>
      {subtitle && (
        <Txt variant="body" center style={{ marginBottom: spacing.lg, maxWidth: 280 }}>
          {subtitle}
        </Txt>
      )}
      {action}
    </View>
  );
}

/* ---------------- Loader ---------------- */
export function Loader({ testID }: { testID?: string }) {
  return (
    <View style={styles.loader} testID={testID}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

/* ---------------- ListRow ---------------- */
export function ListRow({
  icon,
  iconColor = colors.brand,
  iconBg = colors.brandTertiary,
  title,
  subtitle,
  right,
  onPress,
  testID,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  danger?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      disabled={!onPress}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? "#FEE2E2" : iconBg }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.error : iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt variant="label" color={danger ? colors.error : colors.onSurface}>
          {title}
        </Txt>
        {subtitle && (
          <Txt variant="caption" numberOfLines={1}>
            {subtitle}
          </Txt>
        )}
      </View>
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted} />)}
    </Pressable>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ label, color = colors.brand, bg = colors.brandTertiary }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Txt style={{ color, fontSize: fontSize.sm, fontFamily: FONT }} weight="600">
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  btnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 54,
  },
  input: {
    flex: 1,
    fontFamily: FONT,
    fontSize: fontSize.lg,
    color: colors.onSurface,
    height: "100%",
    ...(Platform.OS === "web" ? { outlineStyle: "none" } as any : {}),
  },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerIconBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center", marginLeft: -6 },
  headerRight: { minWidth: 26, alignItems: "flex-end" },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: spacing["3xl"], paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
});
