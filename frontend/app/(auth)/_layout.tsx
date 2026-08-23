import { Redirect, Stack } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { Loader } from "@/src/components/ui";
import { colors } from "@/src/theme/theme";

export default function AuthLayout() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <Loader />
      </View>
    );
  }
  if (user) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }} />;
}
