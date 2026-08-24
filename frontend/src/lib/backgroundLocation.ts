import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { api } from "@/src/lib/api";

// Registered at module import time (imported from app/_layout.tsx).
export const LOCATION_TASK = "neksathi-bg-location";

if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
    if (error) return;
    const loc = data?.locations?.[0];
    if (!loc) return;
    const { latitude, longitude, accuracy, speed } = loc.coords;
    try {
      await api("/me/location", {
        method: "POST",
        body: {
          latitude,
          longitude,
          accuracy: accuracy ?? undefined,
          speed_kmh: speed != null && speed >= 0 ? speed * 3.6 : undefined,
        },
      });
    } catch {
      /* best effort, silent in background */
    }
  });
}

// Returns "background" | "foreground" | "denied"
export async function startBackgroundLocation(): Promise<"background" | "foreground" | "denied"> {
  const fg = await Location.getForegroundPermissionsAsync();
  let granted = fg.granted;
  if (!granted && fg.canAskAgain) granted = (await Location.requestForegroundPermissionsAsync()).granted;
  if (!granted) return "denied";

  try {
    // Background permission (best effort — may be undetermined in Expo Go).
    const bg = await Location.getBackgroundPermissionsAsync();
    if (!bg.granted && bg.canAskAgain) await Location.requestBackgroundPermissionsAsync();

    const already = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (!already) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000,
        distanceInterval: 25,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "Nek Sathi — Live location",
          notificationBody: "Sharing your location with your guardians",
          notificationColor: "#DC2626",
        },
      });
    }
    return "background";
  } catch {
    return "foreground";
  }
}

export async function stopBackgroundLocation(): Promise<void> {
  try {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  } catch {
    /* ignore */
  }
}
