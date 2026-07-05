/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CampaignTemplate {
  id: string;
  name: string;
  category: string;
  copy: string;
  tags: string[];
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "template-eco-bottle",
    name: "AURA BOTTLE: REVOLUTIONARY HYDRATION",
    category: "ENVIRONMENTAL / CONSUMER GOODS",
    copy: "Introducing Aura Bottle: the only water bottle that is 100% eco-friendly and literally saves the planet with every sip. Crafted from biodegradable elements, it has a zero carbon footprint, eliminates plastic pollution entirely, and is verified better than any other vacuum container on Earth.",
    tags: ["environmental", "compliance", "ftc", "greenwashing", "water"]
  },
  {
    id: "template-health-syrup",
    name: "NOOTROPIC SYNTHESIS_X: COGNITIVE BOOST",
    category: "HEALTH / WELLNESS",
    copy: "Nootropic Synthesis_X is scientifically engineered to eliminate brain fog, reverse cellular aging, and cures stress-induced anxiety in 15 minutes. Our double-strength focus formula boosts dopamine output naturally, guarantees genius-level analytical performance, and treats ADHD symptoms without prescription side effects.",
    tags: ["health", "compliance", "medical", "fda", "supplement"]
  },
  {
    id: "template-finance-saas",
    name: "LEDGER_AI: CLOUD FORECAST AUTO-INTEGRATION",
    category: "B2B / SAAS",
    copy: "Stop wastefully spending hours manually building spreadsheets. Ledger_AI connects with QuickBooks and secure databases to automate financial forecasting with 99.9% precision. Deploys real-time machine learning schemas that accelerate standard model builds by 10x, providing predictive analytics directly to dashboard controllers.",
    tags: ["saas", "ai", "finance", "productivity"]
  }
];
