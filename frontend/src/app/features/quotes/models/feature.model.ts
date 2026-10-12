export interface Feature {
  id: number;
  analysisId: number;
  sequenceNo: number;
  featureType: string;
  description: string | null;
  diameter: number | null;
  length: number | null;
  depth: number | null;
  needsReview: boolean;
  sourceText: string | null;
  createdAt: string;
}

export interface FeatureListResponse {
  items: Feature[];
}

export interface UpdateFeatureRequest {
  featureType: string;
  description: string | null;
  diameter: number | null;
  length: number | null;
  depth: number | null;
  needsReview: boolean;
}

export interface DrawingAnalysis {
  id: number;
  drawingId: number;
  status: string;
  partType: string | null;
  material: string | null;
  stockDiameter: number | null;
  overallLength: number | null;
  recommendedMachine?: string | null;
  machineFeasibilityReason?: string | null;
  createdAt: string;
}

