import { StatusBar } from 'expo-status-bar';

/**
 * The HTML prototype draws a fake in-frame status bar ("9:41" + glyphs).
 * On device we drive the real OS status bar instead: light content on the
 * splash gradient, dark (#0F1222) content everywhere else.
 */
export function PhoneStatusBar({ light }: { light?: boolean }) {
  return <StatusBar style={light ? 'light' : 'dark'} />;
}
