# Mobile font licenses

## Mona Sans

See `mona-sans.LICENSE.txt` (SIL Open Font License 1.1).

Source: https://github.com/github/mona-sans

Mirrored from `marketing/public/fonts/mona-sans-variable.woff2` to keep
mobile + marketing on the same axis-cut WOFF2 file.

## IBM Plex Sans Arabic

See `ibm-plex-sans-arabic.LICENSE.txt` (SIL Open Font License 1.1).

Source: https://github.com/IBM/plex

The four static weights (Regular / Medium / SemiBold / Bold) ship for
the AR locale. React Native 0.83 does not interpolate the variable
axis natively on Android; static cuts give us multi-weight access
without a Skia escape hatch.
