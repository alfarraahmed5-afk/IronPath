// /ar -- Arabic-locale homepage. Composes the same cinematic scenes as the
// English homepage; each scene reads from the AR message catalog through
// the NextIntlClientProvider that the AR layout wraps around it.

import ColdOpenScene from '@/components/scenes/cold-open';
import IncitingIncidentScene from '@/components/scenes/inciting-incident';
import RevealScene from '@/components/scenes/reveal';
import CapabilityScene from '@/components/scenes/capability';
import PricingScene from '@/components/scenes/pricing';
import DenouementScene from '@/components/scenes/denouement';

export default function ArabicHomePage() {
  return (
    <>
      <ColdOpenScene />
      <IncitingIncidentScene />
      <RevealScene />
      <CapabilityScene />
      <PricingScene />
      <DenouementScene />
    </>
  );
}
