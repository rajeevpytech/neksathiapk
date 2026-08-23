import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { spacing, colors } from "@/src/theme/theme";

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      show("Please fill in all fields", "error");
      return;
    }
    if (password.length < 6) {
      show("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
      });
    } catch (e: any) {
      show(e?.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title="Create account" subtitle="Your safety companion in one tap">
      <Input testID="register-name-input" label="Full name" icon="person-outline" placeholder="Your name" value={name} onChangeText={setName} />
      <Input
        testID="register-email-input"
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input
        testID="register-phone-input"
        label="Phone"
        icon="call-outline"
        placeholder="+9779800000000"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <Input testID="register-password-input" label="Password" icon="lock-closed-outline" placeholder="At least 6 characters" secureTextEntry value={password} onChangeText={setPassword} />

      <Button testID="register-submit-button" title="Create account" onPress={submit} loading={loading} />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl }}>
        <Txt>Already have an account? </Txt>
        <Pressable testID="register-goto-login" onPress={() => router.replace("/(auth)/login")}>
          <Txt color={colors.brand} weight="600">
            Sign in
          </Txt>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}
