import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const COMPANY_SETTINGS_TAG = "company-settings";

export const getCompanySettings = unstable_cache(
  () => prisma.companySettings.findFirst(),
  [COMPANY_SETTINGS_TAG],
  { revalidate: 300, tags: [COMPANY_SETTINGS_TAG] }
);
