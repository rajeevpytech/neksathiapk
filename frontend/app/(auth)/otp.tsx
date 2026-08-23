import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { AuthScaffold } from "@/src/components/AuthScaffold";
import { Button, Input } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { useAuth } from "@/src/context/AuthContext";
import { useToast } from "@/src/context/ToastContext";
import { spacing, colors } from "@/src/theme/theme";

export default function Otp() {
  const router = useRouter();
  const { requestOtp, verifyOtp } = useAuth();
  const { show } = useToast();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!phone.trim()) {
      show("Enter your phone number", "error");
      return;
    }
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      setSent(true);
      show("OTP sent to your phone", "success");
    } catch (e: any) {
      show(e?.message || "Could not send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!code.trim()) {
      show("Enter the OTP code", "error");
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone.trim(), code.trim());
    } catch (e: any) {
      show(e?.message || "Invalid or expired code", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold title="Login with OTP" subtitle="We'll text you a one-time code">
      <Input
        testID="otp-phone-input"
        label="Phone number"
        icon="call-outline"
        placeholder="+9779800000000"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        editable={!sent}
      />

      {!sent ? (
        <Button testID="otp-send-button" title="Send OTP" onPress={sendCode} loading={loading} />
      ) : (
        <>
          <Input
            testID="otp-code-input"
            label="OTP code"
            icon="keypad-outline"
            placeholder="Enter code"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <Button testID="otp-verify-button" title="Verify & Sign in" onPress={verify} loading={loading} />
          <Pressable testID="otp-resend-button" onPress={sendCode} style={{ alignSelf: "center", marginTop: spacing.lg }}>
            <Txt color={colors.brand} weight="600">
              Resend code
            </Txt>
          </Pressable>
        </>
      )}

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: spacing.xl }}>
        <Pressable testID="otp-back-login" onPress={() => router.replace("/(auth)/login")}>
          <Txt color={colors.brand} weight="600">
            Use email instead
          </Txt>
        </Pressable>
      </View>
    </AuthScaffold>
  );
}
