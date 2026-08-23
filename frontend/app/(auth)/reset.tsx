import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/context/ToastContext";
import { spacing, colors } from "@/src/theme/theme";

export default function Reset() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const { show } = useToast();
  const [token, setToken] = useState(params.token ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token.trim() || !password) {
      show("Enter token and new password", "error");
      return;
    }
    if (password.length < 6) {
      show("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/reset-password", { method: "POST", auth: false, body: { token: token.trim(), new_password: password } });
      show("Password reset. Please sign in.", "success");
      router.replace("/(auth)/login");
    } catch (e: any) {
      show(e?.message || "Reset failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title="New password" subtitle="Enter the token and your new password">
      <Input testID="reset-token-input" label="Reset token" icon="key-outline" placeholder="Paste token" autoCapitalize="none" value={token} onChangeText={setToken} />
      <Input testID="reset-password-input" label="New password" icon="lock-closed-outline" placeholder="At least 6 characters" secureTextEntry value={password} onChangeText={setPassword} />
      <Button testID="reset-submit-button" title="Reset password" onPress={submit} loading={loading} />
      <Pressable testID="reset-back-login" onPress={() => router.replace("/(auth)/login")} style={{ alignSelf: "center", marginTop: spacing.xl }}>
        <Txt color={colors.brand} weight="600">
          Back to sign in
        </Txt>
      </Pressable>
    </AuthScaffold>
  );
}
