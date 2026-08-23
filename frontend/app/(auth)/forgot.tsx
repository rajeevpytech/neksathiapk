import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { api } from "@/src/lib/api";
import { useToast } from "@/src/context/ToastContext";
import { spacing, colors } from "@/src/theme/theme";

export default function Forgot() {
  const router = useRouter();
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      show("Enter your email", "error");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/forgot-password", { method: "POST", auth: false, body: { email: email.trim().toLowerCase() } });
      show("Reset link sent. Check your email.", "success");
      router.push("/(auth)/reset");
    } catch (e: any) {
      show(e?.message || "Could not send reset link", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title="Reset password" subtitle="We'll email you a reset token">
      <Input
        testID="forgot-email-input"
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Button testID="forgot-submit-button" title="Send reset link" onPress={submit} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl }}>
        <Txt>Have a token? </Txt>
        <Pressable testID="forgot-goto-reset" onPress={() => router.push("/(auth)/reset")}>
          <Txt color={colors.brand} weight="600">
            Enter it here
          </Txt>
        </Pressable>
      </View>
      <Pressable testID="forgot-back-login" onPress={() => router.replace("/(auth)/login")} style={{ alignSelf: "center", marginTop: spacing.lg }}>
        <Txt color={colors.brand} weight="600">
          Back to sign in
        </Txt>
      </Pressable>
    </AuthScaffold>
  );
}
