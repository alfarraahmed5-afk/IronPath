/**
 * Me tab -- Option B IA replaces the legacy Profile tab.
 *
 * C-2 lands this thin shim so the route is real from the
 * IA-restructure commit forward. The full Me-screen layout (slimmed
 * profile per lens 5 P0) is owned by C-1. Until C-1's body lands, this
 * shim re-exports the legacy ProfileScreen so existing profile
 * functionality is preserved -- the URL is /(tabs)/me but the body is
 * the old profile body. C-1's commit replaces this file.
 */
export { default } from './profile';
