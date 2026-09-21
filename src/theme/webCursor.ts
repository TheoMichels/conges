import { Platform } from "react-native";

// react-native-web forwards `cursor` to the underlying CSS; RN's style types don't know it.
export const cursorPointer =
  Platform.OS === "web" ? ({ cursor: "pointer" } as { cursor: "pointer" }) : {};
