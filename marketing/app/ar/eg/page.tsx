// /ar/eg -- Cairo wedge in pure Arabic (no inline English flex). The /eg
// EN page is bilingual by founder direction (English-with-Arabic-flex);
// this page is the pure-Arabic mirror for visitors who landed on /ar
// first and clicked through to the EGP pricing.
//
// Coordination: Super Agent 2 owns the EN /eg copy + structure. This
// page mirrors that structure 1:1 in Egyptian Arabic. EGP prices stay
// numeric (Latin digits per Egyptian SaaS convention). No em dashes.
// "Ahmed" only -- no full name.

import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'للجيمات في القاهرة',
  description:
    'لجيمات القاهرة المستقلة اللي تعبت من الإكسل والواتساب. عرض شخصي مجاني مع أحمد.',
  path: '/eg',
  locale: 'ar',
});

const WHATSAPP_NUMBER = '+20 10 3659 6238';
const WHATSAPP_LINK =
  'https://wa.me/201036596238?text=' +
  encodeURIComponent('أهلاً يا أحمد، أنا عندي جيم في القاهرة وعايز أشوف IronPath.');

interface Tier {
  name: string;
  priceEgp: number;
  cap: string;
  tagline: string;
}

// Founder-confirmed EGP pricing -- mirrors /eg exactly.
const TIERS: Tier[] = [
  {
    name: 'مبتدي',
    priceEgp: 1_350,
    cap: 'لحد 50 عضو',
    tagline: 'كل اللي محتاجه عشان تشغّل جيم صغير من غير شيتات إكسل.',
  },
  {
    name: 'نمو',
    priceEgp: 2_750,
    cap: 'لحد 200 عضو',
    tagline: 'للجيمات اللي عدّت أوّل مرحلة وعمالة تكبّر طاقم وحصص.',
  },
  {
    name: 'برو',
    priceEgp: 5_300,
    cap: 'بدون حد للأعضاء',
    tagline: 'لجيمات الفروع المتعددة وأصحاب الستاك التشغيلي الخاص.',
  },
];

function formatEgp(n: number): string {
  return n.toLocaleString('en-US');
}

export default function ArabicEgyptPage() {
  setRequestLocale('ar');

  return (
    <main
      className="bg-ink-950 text-ink-50 min-h-screen"
      dir="rtl"
      lang="ar"
    >
      {/* Top utility bar */}
      <nav className="border-b border-ink-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/ar"
            className="font-display text-base tracking-tight text-ink-100 hover:text-ink-50 transition-colors"
            dir="ltr"
          >
            IronPath
          </Link>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-ink-300 hover:text-ink-50 transition-colors"
          >
            واتساب
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 sm:px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-brand-400 mb-4 tracking-wider">
            للجيمات في القاهرة
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-ink-50 mb-3 tracking-tight leading-tight">
            شغّل الجيم، مش جروبات الواتساب.
          </h1>
          <p className="text-base sm:text-lg text-ink-300 max-w-xl mb-10 leading-relaxed">
            لجيمات القاهرة المستقلة اللي تعبت من متابعة الاشتراكات في الإكسل،
            وملاحقة الفلوس في الـDM، وإنها فاكرة كل حاجة بنفسها.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-3 px-6 py-3.5 rounded-md bg-brand-500 hover:bg-brand-450 text-white font-medium text-base transition-colors"
          >
            <WhatsAppGlyph />
            <span>كلّم أحمد على الواتساب</span>
          </a>
          <p className="text-xs text-ink-400 mt-4 font-mono" dir="ltr">
            {WHATSAPP_NUMBER} · عرض شخصي مجاني في الجيم بتاعك
          </p>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* The problem */}
      <section className="px-4 sm:px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            قبل
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-6 tracking-tight">
            إنت بتخسر أعضاء في الـDMs بتاعتك.
          </h2>
          <div className="space-y-5 text-ink-300 leading-relaxed">
            <p>
              أربعين عضو. شيت إكسل واحد. تلات جروبات واتساب. الفلوس اللي
              قبضتها الأسبوع اللي فات في نوتس التليفون.
            </p>
            <p>
              الأعضاء بينسوا إنك موجود ما بين الحصص. التجديدات بتفوت. أي حد
              بيسأل بيروح للي يرد عليه الأول. وإنت ماسك الاستقبال بنفسك.
            </p>
            <p className="text-ink-200 text-lg font-display">
              النظام كله شغّال على إنك فاكر كل حاجة. لما تنسى، الجيم بيخسر.
            </p>
          </div>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* What you actually get */}
      <section className="px-4 sm:px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            بتاخد إيه
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-8 tracking-tight">
            جيمك، في شاشة واحدة.
          </h2>
          <ul className="space-y-4">
            {[
              {
                title: 'تطبيق الأعضاء على iOS وAndroid',
                detail:
                  'تمارين، حضور، جداول. الأعضاء يفتحوه، يفتكروا إنك موجود.',
              },
              {
                title: 'متابعة الاشتراكات في نظام مش في إكسل',
                detail:
                  'مش إكسل. مش تليفونك. مرجع واحد لمين نشط، مين مدّته خلصت، مين دفع.',
              },
              {
                title: 'مكتبة تمارين، أكتر من 600 حركة',
                detail:
                  'ركّب روتين بسرعة. ابعته لعضو أو خصّصه لحصة كاملة.',
              },
              {
                title: 'إشعارات Push وإيميل',
                detail:
                  'إنت رجعت تاني في جيب الأعضاء. تذكير التجديد، دعوة الحصص، رسائل تثبيت العضو، كله أوتوماتيك.',
              },
              {
                title: 'بوستر QR لحيطة الجيم',
                detail:
                  'اطبع بوستر واحد. الأعضاء يفسحوا، يدخلوا في النظام. أعلى نقطة تفعيل قيمة بنشوفها.',
              },
              {
                title: 'لوحة تحكم ويب لصاحب الجيم',
                detail:
                  'الأعضاء النشطين، الإيراد الشهري، الاحتفاظ، تسجيلات اليوم. شوف الجيم بنظرة واحدة من اللاب توب.',
              },
            ].map((feat) => (
              <li
                key={feat.title}
                className="flex gap-3 border-r-2 border-brand-500/30 pr-4"
              >
                <div className="flex-1">
                  <p className="text-ink-100 font-medium">{feat.title}</p>
                  <p className="text-ink-400 text-sm mt-1 leading-relaxed">
                    {feat.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Pricing -- EGP, monthly only */}
      <section className="px-4 sm:px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            الأسعار
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-3 tracking-tight">
            أسعار بالجنيه. شهرية. ادفع لما تكون جاهز.
          </h2>
          <p className="text-ink-300 mb-12 max-w-xl leading-relaxed">
            ابدأ بعرض شخصي مجاني في الجيم بتاعك. ادفع بس لما تستخدم النظام
            مع أعضائك الفعليين.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {TIERS.map((tier, i) => (
              <article
                key={tier.name}
                className={[
                  'rounded-lg border bg-ink-900 p-6 flex flex-col',
                  i === 1
                    ? 'border-brand-500/40 shadow-[0_0_0_1px_rgba(200,16,46,0.15)]'
                    : 'border-ink-800',
                ].join(' ')}
              >
                <div className="mb-4">
                  <p className="font-display text-sm text-ink-300">
                    {tier.name}
                  </p>
                </div>
                <div className="mb-3" data-numeric dir="ltr">
                  <span className="font-display text-4xl sm:text-5xl text-ink-50 font-semibold">
                    {formatEgp(tier.priceEgp)}
                  </span>
                  <span className="text-ink-400 text-sm ml-2 font-mono">
                    EGP/mo
                  </span>
                </div>
                <p className="text-ink-300 text-sm mb-1">{tier.cap}</p>
                <p className="text-ink-300 text-sm leading-relaxed mb-6 flex-1">
                  {tier.tagline}
                </p>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={[
                    'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors',
                    i === 1
                      ? 'bg-brand-500 hover:bg-brand-450 text-white'
                      : 'border border-ink-700 hover:border-ink-600 text-ink-100',
                  ].join(' ')}
                >
                  <WhatsAppGlyph small />
                  <span>كلّم أحمد</span>
                </a>
              </article>
            ))}
          </div>

          <div className="mt-10 text-sm text-ink-400 leading-relaxed max-w-2xl">
            <p>
              الدفع عن طريق Paymob أو Fawry أو InstaPay لما تترقّى. مش هتحتاج
              فيزا عشان تبدأ. غيّر الباقة في أي وقت.
            </p>
          </div>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Closing CTA */}
      <section className="px-4 sm:px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-ink-50 mb-4 tracking-tight">
            تعالى نتكلّم.
          </h2>
          <p className="text-ink-300 mb-10 leading-relaxed">
            ابعت لأحمد واتساب. هييجيلك جيمك يعمل عرض شخصي مجاني، عادةً في
            خلال أسبوع.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-3 px-7 py-4 rounded-md bg-brand-500 hover:bg-brand-450 text-white font-medium text-base transition-colors"
          >
            <WhatsAppGlyph />
            <span>كلّم أحمد على الواتساب</span>
          </a>
          <p className="text-sm text-ink-400 mt-5 font-mono" dir="ltr">
            {WHATSAPP_NUMBER}
          </p>
        </div>
      </section>

      <footer className="border-t border-ink-900 px-4 sm:px-6 py-10 text-xs text-ink-400">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row gap-4 sm:justify-between">
          <span>© {new Date().getFullYear()} IronPath</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-ink-100 transition-colors" hrefLang="en">
              International site
            </Link>
            <Link
              href="/ar/privacy"
              className="hover:text-ink-100 transition-colors"
            >
              الخصوصية
            </Link>
            <Link
              href="/ar/terms"
              className="hover:text-ink-100 transition-colors"
            >
              الشروط
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

function WhatsAppGlyph({ small = false }: { small?: boolean }) {
  const size = small ? 14 : 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
