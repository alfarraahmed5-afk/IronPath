import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { type as typeTokens, colors } from '../theme/tokens';

type TextVariant = keyof typeof typeTokens;
type TextColor = keyof typeof colors;

type Props = RNTextProps & {
  variant?: TextVariant;
  color?: TextColor;
  children: React.ReactNode;
};

export function Text({ variant = 'body', color = 'textPrimary', style, children, ...rest }: Props) {
  return (
    <RNText
      style={[typeTokens[variant], { color: colors[color] }, style]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
