export interface Segment {
  id: number;
  diameter: number;
  length: number;
  roughness: number;
}

export interface ApiTubingPreset {
  name: string;
  id: number;
}

export interface SegmentResult {
  segmentNumber: number;
  diameter: number;
  length: number;
  depthFrom: number;
  depthTo: number;
  velocity: number;
  reynoldsNumber: number;
  flowRegime: 'Laminar' | 'Transitional' | 'Turbulent';
  frictionFactor: number;
  frictionLoss: number;
  hydrostaticGain: number;
  minorLoss: number;
  netPressureChange: number;
  inletPressure: number;
  outletPressure: number;
}

export interface CalculationResults {
  segments: SegmentResult[];
  totalFrictionLoss: number;
  totalPressureDrop: number;
  bottomPressure: number;
  maxFlowRate: number;
  actualFlowRate: number;
  maxSegmentVelocity: number;
  maxVelocitySegment: number;
  warnings?: string[];
}

export interface CalculationParams {
  segments: Segment[];
  flowRate: number;
  injectionPressure: number;
  bottomholePressure: number;
  fluidDensity: number;
  fluidViscosity: number;
  wellDepth: number;
  openHoleDiameter: number;
}