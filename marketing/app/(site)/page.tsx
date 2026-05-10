// The cinematic landing page -- composes all 7 acts (6 scene components,
// since the Quiet Beat is folded into Denouement). Each scene is its own
// client/server boundary; this page itself is RSC.

import ColdOpenScene from '@/components/scenes/cold-open';
import IncitingIncidentScene from '@/components/scenes/inciting-incident';
import RevealScene from '@/components/scenes/reveal';
import CapabilityScene from '@/components/scenes/capability';
import PricingScene from '@/components/scenes/pricing';
import DenouementScene from '@/components/scenes/denouement';

export default function HomePage() {
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
