// /ar/start -- Arabic intake page. Mirrors /(site)/start with native
// Egyptian Arabic copy. Two paths: lead form OR WhatsApp to Ahmed.
//
// Copy is inlined here (the EN /start hardcodes its strings the same
// way; no message catalog dependency). Egyptian colloquial throughout.
// No em dashes (founder rule), and "Ahmed" only -- no full name.

import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { buildMetadata } from '@/lib/seo';
import { LeadForm } from '@/components/lead-form';

export const metadata: Metadata = buildMetadata({
  title: 'ابدأ',
  description:
    'كلّمنا عن الجيم بتاعك. أحمد هيرد عليك في نفس اليوم بالخطوات الجاية. أو ابعتله واتساب على طول.',
  path: '/start',
  locale: 'ar',
});

const WHATSAPP_NUMBER = '+20 10 3659 6238';
const WHATSAPP_LINK =
  'https://wa.me/201036596238?text=' +
  encodeURIComponent('أهلاً يا أحمد، أنا عندي جيم وعايز أشوف IronPath.');

export default function ArabicStartPage() {
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
          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/ar/pricing"
              className="text-ink-300 hover:text-ink-50 transition-colors"
            >
              الأسعار
            </Link>
            <Link
              href="/ar/roadmap"
              className="text-ink-300 hover:text-ink-50 transition-colors"
            >
              خريطة الطريق
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero + form */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-brand-400 mb-3 tracking-wider">
            ابدأ
          </p>
          <h1 className="font-display text-3xl sm:text-5xl text-ink-50 mb-4 tracking-tight leading-tight">
            كلّمنا عن الجيم بتاعك.
          </h1>
          <p className="text-ink-300 text-base sm:text-lg max-w-xl leading-relaxed">
            إحنا شركة بيقودها مؤسسها. أحمد هيرد عليك في نفس اليوم بالخطوات
            الجاية، ولو الجيم بتاعك في القاهرة، ييجيلك يعمل عرض شخصي.
          </p>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* Two paths, side by side */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
          {/* Form path */}
          <div className="flex flex-col">
            <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
              الخيار أ
            </p>
            <h2 className="font-display text-xl sm:text-2xl text-ink-100 mb-3 tracking-tight">
              ابعت البيانات الأساسية.
            </h2>
            <p className="text-ink-300 text-sm leading-relaxed mb-6">
              تلات حقول. هنرد عليك بالإيميل في خلال نفس اليوم. الأنسب لو إنت
              بتفضّل الإيميل وعايز يكون عندك سجل للمحادثة.
            </p>
            <div className="flex-1">
              <LeadForm variant="inline" />
            </div>
          </div>

          {/* WhatsApp path */}
          <div className="flex flex-col">
            <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
              الخيار ب
            </p>
            <h2 className="font-display text-xl sm:text-2xl text-ink-100 mb-3 tracking-tight">
              من غير فورمات. كلّم أحمد على الواتساب.
            </h2>
            <p className="text-ink-300 text-sm leading-relaxed mb-6">
              أسرع لو إنت في الشرق الأوسط. هييجيلك جيمك يعمل عرض شخصي مجاني،
              عادةً في خلال أسبوع.
            </p>
            <div className="flex-1 flex flex-col">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-md bg-brand-500 hover:bg-brand-450 text-white font-medium text-base transition-colors w-full"
              >
                <WhatsAppGlyph />
                <span>كلّم أحمد على الواتساب</span>
              </a>
              <p className="text-xs text-ink-400 mt-3 font-mono text-center" dir="ltr">
                {WHATSAPP_NUMBER}
              </p>
              <div className="mt-auto pt-8 text-xs text-ink-500 leading-relaxed">
                <p>
                  عرض شخصي مجاني. مش هتحتاج فيزا في أي خطوة. الفاتورة بنبعتها
                  يدوي بعد ما تقرّر تشترك.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-ink-900" />

      {/* What happens after */}
      <section className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] text-ink-400 mb-3 tracking-wider">
            بعدها بيحصل إيه
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink-100 mb-8 tracking-tight">
            من أوّل سلام لجيمك شغّال على IronPath، في أسبوع.
          </h2>
          <ol className="space-y-5">
            {[
              {
                step: '1',
                title: 'رد في نفس اليوم',
                detail:
                  'أحمد بيقرا رسالتك ويرد في نفس اليوم. عادةً في خلال ساعة في وقت العمل بالشرق الأوسط.',
              },
              {
                step: '2',
                title: 'جولة في 30 دقيقة',
                detail:
                  'مكالمة فيديو أو زيارة شخصية للجيم. بنحوّل اللي إنت شغّال عليه (إكسل، واتساب، ورق) لـIronPath.',
              },
              {
                step: '3',
                title: 'نقل بيانات الأعضاء',
                detail:
                  'ابعت قائمة أعضائك (بأي تنسيق). بنرفعها على حساب جديد ومجهّز للباقة بتاعتك.',
              },
              {
                step: '4',
                title: 'شغّال في جيمك',
                detail:
                  'اطبع بوستر QR، وافتح التطبيق على تابلت الاستقبال، الأعضاء يبدأوا يفسحوا. تجربة الـ30 يوم المجانية بتبدأ.',
              },
            ].map((s) => (
              <li key={s.step} className="flex gap-5">
                <div className="flex-none w-8 h-8 rounded-full border border-ink-700 grid place-items-center font-mono text-sm text-ink-300" dir="ltr">
                  {s.step}
                </div>
                <div>
                  <p className="text-ink-100 font-medium">{s.title}</p>
                  <p className="text-ink-400 text-sm mt-1 leading-relaxed">
                    {s.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-ink-900 px-4 sm:px-6 py-10 text-xs text-ink-400">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row gap-4 sm:justify-between">
          <span>© {new Date().getFullYear()} IronPath</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/ar" className="hover:text-ink-100 transition-colors">
              الرئيسية
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

function WhatsAppGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
