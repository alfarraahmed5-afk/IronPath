# /ar/eg Content Spec -- Cairo wedge, pure Arabic

Owner: Super Agent 2 (AR content) ships this spec; Super Agent 1 wires the
route shell at `marketing/app/ar/eg/page.tsx` to render it.

## Purpose

The English /eg page (`marketing/app/(site)/eg/page.tsx`) is a bilingual
landing for Cairo gyms -- English body, Arabic flex. The /ar/eg page must be
the **pure Arabic** counterpart for the visitor whose entire session is
Arabic (came from Cairo, picked AR, etc.). No English bleed except the brand
wordmark "IronPath" and the technical proper nouns Paymob / Fawry / InstaPay /
WhatsApp, which must be wrapped in `<span lang="en" dir="ltr">…</span>` so
the bidirectional algorithm doesn't garble them.

## Hard rules

- `dir="rtl"`, `lang="ar-EG"` on the root.
- Egyptian colloquial throughout (إزاي, مش, اللي, دلوقتي, إنت, عايز, …),
  not MSA. Match the tone of `marketing/messages/ar.json` and the existing
  `*.ar.mdx` blog posts.
- No founder full name. Just "أحمد".
- No founder photo (founder direction).
- No em dashes anywhere. Use commas, periods, parens, colons, or `--`.
- No "Mindbody", "Glofox", "GymFlow" mentions.
- Use "السوفتوير القديم" or "السوفتوير الحالي" if you need to reference
  whatever the gym is using today; never an incumbent brand name.

## Currency convention

Egyptian pound, written **`{number} ج.م`** in body copy (number then unit,
which is the natural spoken order). Western Arabic numerals (1, 2, 3) per
the i18n architect's spec -- do NOT switch to Eastern (٠١٢٣). Three founder-
confirmed tiers (matches /eg):

| Slug      | Arabic name | Price        | Cap          |
|-----------|-------------|--------------|--------------|
| starter   | البداية     | 1,350 ج.م/شهر | لحد 50 عضو   |
| growth    | النمو       | 2,750 ج.م/شهر | لحد 200 عضو  |
| unlimited | بلا حدود    | 5,300 ج.م/شهر | بلا حدود     |

(Same numbers as /eg, just relabeled in Arabic. The "Pro" label on /eg is
"بلا حدود" here for parity with the rest of the AR catalog.)

## CTA

WhatsApp deep link to **+20 10 3659 6238** (digits stay Latin, prefixed
inside an LTR span):

```jsx
const WHATSAPP_LINK =
  'https://wa.me/201036596238?text=' +
  encodeURIComponent('أهلًا أحمد، أنا صاحب جيم في القاهرة وعايز أشوف المنصة.');
```

Display the number as `<bdi dir="ltr">+20 10 3659 6238</bdi>` so the digits
read left-to-right inside the RTL flow.

CTA label: **"كلّم أحمد على واتساب"** with a WhatsApp glyph on the leading
side (which on RTL is the right side; the existing `<WhatsAppGlyph />`
component on /eg works as-is -- it's an SVG icon, direction-neutral).

## Page sections

### 1. Top utility bar

- Logo: `<Link href="/ar">IronPath</Link>` -- wordmark stays Latin, wrap in
  `<span lang="en" dir="ltr">`.
- Right side: `<a href={WHATSAPP_LINK}>واتساب</a>` (transliterated; this is
  the natural Arabic spelling for "WhatsApp").

### 2. Hero

```
Eyebrow (font-mono):  لجيمات القاهرة
H1 (display, large):  شغّل الجيم،
                      مش جروبات الواتساب.
Subhead:              لأصحاب الجيمات المستقلة في القاهرة اللي تعبوا
                      من تتبّع الاشتراكات على الإكسل، والجري ورا الفلوس
                      في الـDM، وإنهم فاكرين كل حاجة بنفسهم.
CTA:                  كلّم أحمد على واتساب  [WhatsApp glyph]
Microcopy under CTA:  +20 10 3659 6238 · عرض مجاني في الجيم بتاعك
```

### 3. The problem ("BEFORE")

```
Eyebrow:  قبل
H2:       بتخسر أعضاءك في الـDM.
Body:
  أربعين عضو. شيت إكسل واحد. تلات جروبات واتساب. الفلوس اللي قبضتها
  الأسبوع اللي فات في ملاحظات الموبايل.

  الأعضاء بينسوك بين تمرين والتاني. التجديدات بتفوت. أي اشتراك جديد
  بيروح للي يلحق يرد عليه الأول، وإنت اللي على الريسبشن بنفسك.

  النظام كله شغّال على إنك فاكر كل حاجة. لما تنسى، الجيم بيخسر.
```

(That last sentence is a deliberate echo of the /eg page; the EN version
quotes the same line in Arabic as a flex.)

### 4. What you actually get ("WHAT YOU GET")

Trim to ONLY shipped features (per /roadmap honesty rule). Six bullets,
each `<title>` + `<detail>`:

```
Eyebrow:  اللي بتاخده
H2:       جيمك، في شاشة واحدة.

- title:  تطبيق الأعضاء على iOS و Android
  detail: تمارين، حضور، جدول. الأعضاء بيفتحوه، فبيفتكروك.

- title:  متابعة اشتراكات في نظام واحد
  detail: مش الإكسل. مش موبايلك. مصدر واحد للحقيقة، مين نشط، مين
          خلاص اشتراكه، مين دفع.

- title:  مكتبة تمارين، أكتر من 600 حركة
  detail: ابني روتينات بسرعة. ابعتها لعضو أو حدّدها لكلاس.

- title:  إشعارات Push وإيميل
  detail: رجعت جوه جيب أعضائك. تذكير تجديد، دعوة كلاس، تنبيهات
          احتفاظ، كله أوتوماتيك.

- title:  بوستر QR لحيطة الجيم
  detail: اطبع بوستر واحد. الأعضاء يمسحوا، يبقوا داخل. أهم لحظة
          تأهيل في حياة العضو.

- title:  لوحة تحكم على اللابتوب
  detail: أعضاء نشطين، الدخل الشهري، الاحتفاظ، حضور النهارده.
          بتشوف الجيم بنظرة من اللابتوب.
```

Render each as a `<li>` with a `border-l-2 border-brand-500/30 ps-4`
(use `ps` not `pl` so it flips correctly in RTL).

### 5. Pricing (three EGP cards)

```
Eyebrow:  الأسعار
H2:       أسعار بالجنيه. شهري. ادفع لما تكون جاهز.
Body:     ابدأ بعرض مجاني في الجيم بتاعك. ادفع بس لما تستخدم المنصة
          مع أعضاء حقيقيين.
```

Three cards, EGP pricing. The middle card (النمو) gets the brand-tinted
border per the /eg pattern. Each card:

- Tier name (font-mono uppercase, brand color): `البداية` / `النمو` / `بلا حدود`
- Price: `<bdi>{n}</bdi> ج.م` with mono `/شهر` suffix on a second line or
  the same baseline (whichever reads cleanest in RTL -- recommend same
  baseline with `ms-2`).
- Cap line: `لحد 50 عضو` / `لحد 200 عضو` / `بلا حدود`
- Tagline:
  - starter: للاستوديو اللي لسه بيلاقي إيقاعه.
  - growth: للجيم اللي ماشي على رجله.
  - unlimited: للجيم اللي مش بيقف عند رقم.
- CTA per card: `كلّم أحمد` (smaller variant).

Footer note under cards:

```
الدفع عن طريق <span lang="en" dir="ltr">Paymob</span> أو <span lang="en"
dir="ltr">Fawry</span> أو <span lang="en" dir="ltr">InstaPay</span> لما
ترقّي. مش محتاج كارت علشان تبدأ. تقدر تغيّر الخطة في أي وقت.
```

### 6. Closing CTA

```
H2:       تعالى نتكلّم.
Subhead:  ابعت رسالة لأحمد على واتساب. هييجي يعملك عرض مجاني في الجيم
          بتاعك، عادةً في خلال أسبوع.
CTA:      كلّم أحمد على واتساب  [WhatsApp glyph]
Number:   +20 10 3659 6238  (font-mono, ink-400)
```

### 7. Footer

Same minimal pattern as /eg:

```
© {year} IronPath  ·  الموقع العالمي  ·  الخصوصية  ·  الشروط
```

Where "الموقع العالمي" links to `/` (EN canonical) and the legal links
go to `/ar/privacy` and `/ar/terms` (when those land).

## Brand wordmark wrapping

Every literal `IronPath` mention in this page MUST be wrapped:

```jsx
<span lang="en" dir="ltr">IronPath</span>
```

Same for `Paymob`, `Fawry`, `InstaPay`. WhatsApp transliterates to `واتساب`
in body copy but the deep link tooltip / utility-bar label can use either.

## Phone number rendering

The WhatsApp number `+20 10 3659 6238` is displayed several times. Wrap
each occurrence in `<bdi dir="ltr">` so the `+` and the country/local
groupings read in their natural left-to-right order regardless of
surrounding RTL flow:

```jsx
<bdi dir="ltr">+20 10 3659 6238</bdi>
```

## Verification checklist for SA1

After wiring the route:

- [ ] No literal `$` or USD anywhere; only `ج.م`.
- [ ] No `Mindbody` / `Glofox` / `GymFlow` mentions.
- [ ] No em dashes (search for `--`).
- [ ] No mention of the founder by full name; only `أحمد`.
- [ ] Every `IronPath` / `Paymob` / `Fawry` / `InstaPay` is inside a
  `<span lang="en" dir="ltr">…</span>` wrapper.
- [ ] Phone number is inside `<bdi dir="ltr">` wrappers.
- [ ] `marketing` build passes (`npm run -w marketing build`).
- [ ] The page renders RTL with no garbled bidirectional runs (visual
  check: open `/ar/eg`, every line should flow right-to-left except the
  wrapped Latin spans which flow left-to-right inside that line).
