import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/context/ToastContext";
import { Header, Button, Input } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme/theme";

export default function ChangePassword() {
  const router = useRouter();
  const { show } = useToast();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!oldPassword || !newPassword) {
      show("Fill in all fields", "error");
      return;
    }
    if (newPassword.length < 6) {
      show("New password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirm) {
      show("Passwords do not match", "error");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/change-password", { method: "POST", body: { old_password: oldPassword, new_password: newPassword } });
      show("Password updated", "success");
      router.back();
    } catch (e: any) {
      show(e?.message || "Could not change password", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header title="Change Password" back />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg }}>
        <Input testID="cp-old-input" label="Current password" icon="lock-closed-outline" secureTextEntry value={oldPassword} onChangeText={setOld} />
        <Input testID="cp-new-input" label="New password" icon="key-outline" secureTextEntry value={newPassword} onChangeText={setNew} />
        <Input testID="cp-confirm-input" label="Confirm new password" icon="key-outline" secureTextEntry value={confirm} onChangeText={setConfirm} />
        <Button testID="cp-submit-button" title="Update password" onPress={submit} loading={loading} />
      </KeyboardAwareScrollView>
    </View>
  );
}
