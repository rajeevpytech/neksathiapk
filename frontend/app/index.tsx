import { Redirect } from "expo-router";
import { View } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { Loader } from "@/src/components/ui";
import { colors } from "@/src/theme/theme";

export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
        <Loader testID="boot-loader" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)" : "/(auth)/login"} />;
}
