import React, { useCallback, useState } from "react";
import { View, StyleSheet, Modal, Pressable, FlatList } from "react-native";
import { useFocusEffect } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/src/lib/api";
import { EmergencyContact } from "@/src/lib/types";
import { useToast } from "@/src/context/ToastContext";
import { Txt } from "@/src/components/Txt";
import { Header, Button, Input, Loader, EmptyState, Badge } from "@/src/components/ui";
import { colors, spacing, radius, shadow, fontSize, FONT } from "@/src/theme/theme";

export default function EmergencyContacts() {
  const { show } = useToast();
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<EmergencyContact[]>("/me/emergency-contacts");
      setContacts(data);
    } catch (e: any) {
      show(e?.message || "Failed to load contacts", "error");
    } finally {
      setLoading(false);
    }
  }, [show]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const add = async () => {
    if (!name.trim() || !phone.trim()) {
      show("Enter name and phone", "error");
      return;
    }
    setSaving(true);
    try {
      await api("/me/emergency-contacts", {
        method: "POST",
        body: { name: name.trim(), phone: phone.trim(), relation: relation.trim() || null },
      });
      setModal(false);
      setName("");
      setPhone("");
      setRelation("");
      show("Contact added", "success");
      load();
    } catch (e: any) {
      show(e?.message || "Could not add contact", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api(`/me/emergency-contacts/${id}`, { method: "DELETE" });
      setContacts((c) => c.filter((x) => x.id !== id));
      show("Contact removed", "success");
    } catch (e: any) {
      show(e?.message || "Could not remove", "error");
    }
  };

  const makePrimary = async (id: string) => {
    try {
      await api(`/me/emergency-contacts/${id}`, { method: "PUT", body: { is_primary: true } });
      show("Set as primary", "success");
      load();
    } catch (e: any) {
      show(e?.message || "Could not update", "error");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Header title="Emergency Contacts" subtitle="Notified instantly on SOS" back />
      {loading ? (
        <Loader />
      ) : contacts.length === 0 ? (
        <EmptyState
          testID="contacts-empty"
          icon="people-outline"
          title="No contacts yet"
          subtitle="Add trusted people who should be alerted in an emergency."
          action={<Button testID="contacts-empty-add" title="Add contact" icon="add" onPress={() => setModal(true)} full={false} />}
        />
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.card} testID={`contact-${item.id}`}>
              <View style={styles.avatar}>
                <Txt style={{ color: colors.brand, fontSize: fontSize.lg, fontFamily: FONT }} weight="600">
                  {item.name.charAt(0).toUpperCase()}
                </Txt>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <Txt variant="label">{item.name}</Txt>
                  {item.is_primary && <Badge label="Primary" color={colors.success} bg="#D1FAE5" />}
                </View>
                <Txt variant="caption">
                  {item.phone}
                  {item.relation ? ` · ${item.relation}` : ""}
                </Txt>
              </View>
              {!item.is_primary && (
                <Pressable testID={`contact-primary-${item.id}`} onPress={() => makePrimary(item.id)} hitSlop={8} style={styles.iconBtn}>
                  <Ionicons name="star-outline" size={20} color={colors.warning} />
                </Pressable>
              )}
              <Pressable testID={`contact-delete-${item.id}`} onPress={() => remove(item.id)} hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          )}
        />
      )}

      {(contacts.length > 0 || !loading) && (
        <Pressable
          testID="contacts-fab"
          onPress={() => setModal(true)}
          style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}

      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grabber} />
          <Txt variant="heading" style={{ marginBottom: spacing.lg }}>
            Add emergency contact
          </Txt>
          <KeyboardAwareScrollView bottomOffset={20} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Input testID="contact-name-input" label="Name" icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} />
            <Input testID="contact-phone-input" label="Phone" icon="call-outline" placeholder="+9779800000000" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <Input testID="contact-relation-input" label="Relation (optional)" icon="heart-outline" placeholder="e.g. mother, friend" value={relation} onChangeText={setRelation} />
            <Button testID="contact-save-button" title="Save contact" onPress={add} loading={saving} />
          </KeyboardAwareScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, ...shadow.card },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  iconBtn: { padding: spacing.sm },
  fab: { position: "absolute", right: spacing.lg, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", ...shadow.raised },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: "80%" },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: "center", marginBottom: spacing.lg },
});
