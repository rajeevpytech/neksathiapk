import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { User } from "@/src/lib/types";
import { useToast } from "@/src/context/ToastContext";
import { Header, Button, Input } from "@/src/components/ui";
import { Txt } from "@/src/components/Txt";
import { colors, spacing, FONT } from "@/src/theme/theme";

export default function EditProfile() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { show } = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatar, setAvatar] = useState<string | null>(user?.avatar_base64 ?? null);
  const [loading, setLoading] = useState(false);

  const pickAvatar = async () => {
    const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
    let granted = perm.granted;
    if (!granted && perm.canAskAgain) granted = (await ImagePicker.requestMediaLibraryPermissionsAsync()).granted;
    if (!granted) {
      show("Photo access needed to change your picture", "error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setAvatar(result.assets[0].base64);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      show("Name cannot be empty", "error");
      return;
    }
    setLoading(true);
    try {
      const body: any = { name: name.trim(), phone: phone.trim() };
      if (avatar && avatar !== user?.avatar_base64) body.avatar_base64 = avatar;
      const updated = await api<User>("/auth/me", { method: "PUT", body });
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
        <View style={styles.avatarWrap}>
          <Pressable testID="edit-avatar-button" onPress={pickAvatar} style={styles.avatar}>
            {avatar ? (
              <Image source={{ uri: `data:image/jpeg;base64,${avatar}` }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <Txt style={{ color: "#fff", fontSize: 34, fontFamily: FONT }} weight="600">
                {(name || "?").charAt(0).toUpperCase()}
              </Txt>
            )}
            <View style={styles.camBadge}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </Pressable>
          <Pressable testID="edit-avatar-link" onPress={pickAvatar}>
            <Txt color={colors.brand} weight="600" style={{ marginTop: spacing.sm }}>
              Change photo
            </Txt>
          </Pressable>
        </View>

        <Input testID="edit-name-input" label="Full name" icon="person-outline" value={name} onChangeText={setName} />
        <Input testID="edit-phone-input" label="Phone" icon="call-outline" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        <Input label="Email" icon="mail-outline" value={user?.email} editable={false} />
        <Button testID="edit-submit-button" title="Save changes" onPress={submit} loading={loading} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: { alignItems: "center", marginBottom: spacing.xl },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  camBadge: { position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.surface },
});
