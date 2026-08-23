import { Text, TextProps, StyleSheet } from "react-native";
import { FONT, colors, fontSize } from "@/src/theme/theme";

type Variant = "display" | "title" | "heading" | "subtitle" | "body" | "caption" | "label";

const variants: Record<Variant, { fontSize: number; weight: "400" | "500" | "600"; color: string }> = {
  display: { fontSize: fontSize["4xl"], weight: "600", color: colors.onSurface },
  title: { fontSize: fontSize["2xl"], weight: "600", color: colors.onSurface },
  heading: { fontSize: fontSize.xl, weight: "600", color: colors.onSurface },
  subtitle: { fontSize: fontSize.lg, weight: "500", color: colors.onSurface },
  body: { fontSize: fontSize.base, weight: "400", color: colors.onSurfaceTertiary },
  label: { fontSize: fontSize.base, weight: "500", color: colors.onSurface },
  caption: { fontSize: fontSize.sm, weight: "500", color: colors.muted },
};

type Props = TextProps & {
  variant?: Variant;
  color?: string;
  weight?: "400" | "500" | "600";
  center?: boolean;
};

export function Txt({ variant = "body", color, weight, center, style, ...rest }: Props) {
  const v = variants[variant];
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: FONT,
          fontSize: v.fontSize,
          fontWeight: weight ?? v.weight,
          color: color ?? v.color,
          textAlign: center ? "center" : undefined,
        },
        style,
      ]}
    />
  );
}

export const txtStyles = StyleSheet.create({});
