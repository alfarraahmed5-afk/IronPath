import { LucideIcon } from 'lucide-react-native';
import { colors } from '../theme/tokens';

type Props = {
  icon: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ icon: Lucide, size = 20, color = colors.textPrimary, strokeWidth = 2 }: Props) {
  return <Lucide size={size} color={color} strokeWidth={strokeWidth} />;
}
