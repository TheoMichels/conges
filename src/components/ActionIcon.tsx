import { colors } from "../theme/colors";
import { Icon } from "./ui/Icon";

type Props = { name: "edit" | "delete"; color?: string };

// Icône d'action discrète (sans cadre) ; la zone tactile de 44 px reste portée par le Pressable parent.
export function ActionIcon({ name, color = colors.textSecondary }: Props) {
  return <Icon name={name === "edit" ? "edit" : "trash"} size={16} color={color} />;
}
