import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, shadow } from "@/src/theme/theme";
import { Txt } from "@/src/components/Txt";

type ToastType = "success" | "error" | "info";
type ToastState = { message: string; type: ToastType } | null;

const ToastCtx = createContext<{ show: (message: string, type?: ToastType) => void }>({
  show: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setToast({ message, type });
      Haptics.notificationAsync(
        type === "error"
          ? Haptics.NotificationFeedbackType.Error
          : type === "success"
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      ).catch(() => {});
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      hideTimer.current = setTimeout(hide, 3200);
    },
    [anim, hide]
  );

  const config = {
    success: { bg: colors.success, icon: "checkmark-circle" as const },
    error: { bg: colors.error, icon: "alert-circle" as const },
    info: { bg: colors.brand, icon: "information-circle" as const },
  };

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrap,
            {
              top: insets.top + spacing.sm,
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
            },
          ]}
        >
          <Pressable onPress={hide} style={[styles.toast, { backgroundColor: config[toast.type].bg }]} testID="app-toast">
            <Ionicons name={config[toast.type].icon} size={20} color="#fff" />
            <Txt style={{ color: "#fff", flex: 1, marginLeft: spacing.sm }} weight="500">
              {toast.message}
            </Txt>
          </Pressable>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, zIndex: 9999 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadow.raised,
  },
});
