import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'requiredFeature';

export type FeatureRequirement = {
  feature: string;
  minLimit?: number;
};

export const RequireFeature = (feature: string, minLimit?: number) =>
  SetMetadata(FEATURE_KEY, { feature, minLimit } satisfies FeatureRequirement);
