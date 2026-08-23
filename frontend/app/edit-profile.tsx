import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { User } from "@/src/lib/types";
import { useToast } from "@/src/context/ToastContext";
import { Header, Button, Input } from "@/src/components/ui";
import { colors, spacing } from "@/src/theme/theme";

export default function EditProfile() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { show } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      show("Name cannot be empty", "error");
      return;
    }
    setLoading(true);
    try {
      const updated = await api<User>("/auth/me", { method: "PUT", body: { name: name.trim(), phone: phone.trim() } });
      setUser(updated);
      show("Profile updated", "success");
      router.back();
    } catch (e: any) {
      show(e?.message || "Could not update profile", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header title="Edit Profile" back />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.lg }}>
        <Input testID="edit-name-input" label="Full name" icon="person-outline" value={name} onChangeText={setName} />
        <Input testID="edit-phone-input" label="Phone" icon="call-outline" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Input label="Email" icon="mail-outline" value={user?.email} editable={false} />
        <Button testID="edit-submit-button" title="Save changes" onPress={submit} loading={loading} />
      </KeyboardAwareScrollView>
    </View>
  );
}
