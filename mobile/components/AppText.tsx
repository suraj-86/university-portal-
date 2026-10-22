import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet, TextInputProps, TextProps } from 'react-native';

// One typeface for the whole app (Inter). Every Text and TextInput in the app comes from here so a font weight
// written as fontWeight: '700' resolves to the matching Inter file on every platform.
export const FONT = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// A Text nested inside another Text keeps the parent's font unless it sets its own weight.
const Nested = React.createContext(false);

function familyFor(style: unknown, nested: boolean): string | undefined {
  const flat = (StyleSheet.flatten(style as never) || {}) as { fontWeight?: string | number; fontFamily?: string };
  if (flat.fontFamily) return flat.fontFamily;
  if (nested && flat.fontWeight === undefined) return undefined;
  const w = String(flat.fontWeight ?? '400');
  if (w === '500') return FONT.medium;
  if (w === '600' || w === '700' || w === 'bold') return FONT.semibold; // everyday emphasis stays soft
  if (w === '800' || w === '900') return FONT.bold;
  return FONT.regular;
}

const reset = { fontWeight: 'normal' as const };

export const Text = React.forwardRef<RNText, TextProps>(function Text({ style, children, ...rest }, ref) {
  const nested = React.useContext(Nested);
  const family = familyFor(style, nested);
  return (
    <RNText ref={ref} {...rest} style={family ? [style, { fontFamily: family }, reset] : style}>
      <Nested.Provider value>{children}</Nested.Provider>
    </RNText>
  );
});

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={[style, { fontFamily: familyFor(style, false) }, reset]} />;
});
