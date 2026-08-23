import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { spacing, colors } from "@/src/theme/theme";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      show("Enter your email and password", "error");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      show(e?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title="Welcome back" subtitle="Sign in to stay protected">
      <Input
        testID="login-email-input"
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        testID="login-password-input"
        label="Password"
        icon="lock-closed-outline"
        placeholder="••••••••"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable
        testID="login-forgot-link"
        onPress={() => router.push("/(auth)/forgot")}
        style={{ alignSelf: "flex-end", marginBottom: spacing.lg }}
      >
        <Txt variant="caption" color={colors.brand} weight="600">
          Forgot password?
        </Txt>
      </Pressable>

      <Button testID="login-submit-button" title="Sign In" onPress={submit} loading={loading} />

      <View style={{ marginTop: spacing.md }}>
        <Button
          testID="login-otp-button"
          title="Login with OTP"
          variant="outline"
          icon="phone-portrait-outline"
          onPress={() => router.push("/(auth)/otp")}
        />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl }}>
        <Txt>New to Nek Sathi? </Txt>
        <Pressable testID="login-goto-register" onPress={() => router.push("/(auth)/register")}>
          <Txt color={colors.brand} weight="600">
            Create account
          </Txt>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}
