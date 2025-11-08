import { Segment, CalculationResults, SegmentResult, CalculationParams } from '../types';
import {
  GRAVITY, PI, LAMINAR_FLOW_LIMIT, TURBULENT_FLOW_START, SECONDS_PER_DAY, ENTRY_LOSS_COEFFICIENT, DEFAULT_OPEN_HOLE_ROUGHNESS
} from '../constants/physics';

/**
 * Well Hydraulics Calculation Engine
 *
 * Implements fluid dynamics calculations for disposal well injection systems
 * based on industry-standard equations and API RP 14E guidelines.
 *
 * References:
 * - Darcy-Weisbach equation for friction losses
 * - Swamee-Jain equation for turbulent friction factor
 * - API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems
 * - Moody diagram for friction factor determination
 */
export class WellHydraulics {
  /**
   * Calculates Reynolds number for pipe flow
   *
   * Re = (ρ × V × D) / μ
   *
   * @param velocity - Flow velocity in m/s
   * @param diameter - Pipe inner diameter in m
   * @param density - Fluid density in kg/m³
   * @param viscosity - Dynamic viscosity in Pa·s
   * @returns Reynolds number (dimensionless)
   *
   * Flow regimes:
   * - Re < 2300: Laminar flow
   * - 2300 ≤ Re < 4000: Transitional flow
   * - Re ≥ 4000: Turbulent flow
   */
  static calculateReynolds(velocity: number, diameter: number, density: number, viscosity: number): number {
    if (viscosity === 0 || diameter === 0) return 0;
    return (density * velocity * diameter) / viscosity;
  }

  /**
   * Calculates friction factor for turbulent flow using Swamee-Jain equation
   *
   * Swamee-Jain equation (explicit approximation of Colebrook-White):
   * f = 0.25 / [log₁₀(ε/(3.7×D) + 5.74/Re^0.9)]²
   *
   * Valid for: 4000 < Re < 10⁸ and 10⁻⁶ < ε/D < 10⁻²
   * Accuracy: ±1% compared to implicit Colebrook-White equation
   *
   * @param Re - Reynolds number (dimensionless)
   * @param relativeRoughness - Pipe roughness ε/D (dimensionless)
   * @returns Darcy friction factor (dimensionless)
   *
   * Reference: Swamee, P.K. and Jain, A.K. (1976)
   * "Explicit Equations for Pipe-Flow Problems"
   */
  private static calculateTurbulentFriction(Re: number, relativeRoughness: number): number {
    const effectiveRoughness = Math.max(relativeRoughness, 1e-10);
    // Swamee-Jain constants: 3.7, 5.74, 0.9, 0.25
    const logTerm = Math.log10((effectiveRoughness / 3.7) + (5.74 / Math.pow(Re, 0.9)));
    const f = 0.25 / Math.pow(logTerm, 2);
    return f;
  }

  /**
   * Calculates Darcy friction factor based on flow regime
   *
   * Implements three flow regimes:
   * 1. Laminar (Re < 2300): f = 64/Re (Hagen-Poiseuille)
   * 2. Transitional (2300 ≤ Re < 4000): Linear interpolation
   * 3. Turbulent (Re ≥ 4000): Swamee-Jain equation
   *
   * @param Re - Reynolds number (dimensionless)
   * @param relativeRoughness - Pipe roughness ε/D (dimensionless)
   * @returns Darcy friction factor (dimensionless)
   *
   * The transitional regime uses linear interpolation as a practical
   * approximation, as exact behavior in this range is complex and
   * depends on many factors.
   */
  static calculateFrictionFactor(Re: number, relativeRoughness: number): number {
    if (Re <= 0) return 0;

    // Laminar flow: f = 64/Re
    if (Re < LAMINAR_FLOW_LIMIT) return 64 / Re;

    // Transitional flow: linear interpolation
    if (Re >= LAMINAR_FLOW_LIMIT && Re < TURBULENT_FLOW_START) {
      const laminarF = 64 / LAMINAR_FLOW_LIMIT;
      const turbulentF = this.calculateTurbulentFriction(TURBULENT_FLOW_START, relativeRoughness);
      const fraction = (Re - LAMINAR_FLOW_LIMIT) / (TURBULENT_FLOW_START - LAMINAR_FLOW_LIMIT);
      return laminarF + fraction * (turbulentF - laminarF);
    }

    // Turbulent flow: Swamee-Jain equation
    return this.calculateTurbulentFriction(Re, relativeRoughness);
  }

  /**
   * Calculates pressure drop and flow characteristics for disposal well injection
   *
   * Performs comprehensive hydraulic analysis including:
   * - Friction losses using Darcy-Weisbach equation: ΔP = f × (L/D) × (ρV²/2)
   * - Hydrostatic pressure gain: ΔP = ρ × g × h
   * - Minor losses (entry, contractions, expansions)
   * - Flow regime determination for each segment
   * - Maximum achievable flow rate estimation
   *
   * @param params - Calculation parameters including geometry, pressures, and fluid properties
   * @returns Detailed calculation results with segment-by-segment analysis and warnings
   *
   * Key assumptions:
   * - Incompressible flow (valid for liquids)
   * - Steady-state conditions
   * - Fully developed flow in each segment
   * - Newtonian fluid behavior
   *
   * References:
   * - Darcy-Weisbach equation for friction losses
   * - API RP 14E for erosion velocity limits
   * - Crane TP-410 for minor loss coefficients
   */
  public static calculatePressureDrop(params: CalculationParams): CalculationResults {
    const { 
      segments, flowRate, injectionPressure, bottomholePressure, 
      fluidDensity, fluidViscosity, wellDepth, openHoleDiameter 
    } = params;

    const Q = flowRate / SECONDS_PER_DAY;
    let currentPressure = injectionPressure * 1000; // Pa
    
    let totalFrictionLoss = 0;
    let totalPressureDrop = 0;
    const segmentResults: SegmentResult[] = [];
    const warnings: string[] = [];
    let cumulativeDepth = 0;
    let maxVelocity = 0;
    let maxVelocitySegment = 0;
    const frictionLosses: {loss: number, regime: 'Laminar' | 'Transitional' | 'Turbulent'}[] = [];

    const allSegments = [...segments];
    const totalSegmentLength = segments.reduce((sum, seg) => sum + (seg.length || 0), 0);
    const openHoleLength = Math.max(0, wellDepth - totalSegmentLength);
    
    if (openHoleLength > 0.1) {
      if(openHoleDiameter <= 0) throw new Error("Open hole diameter must be a positive value.");
      allSegments.push({
        id: -1, // special id for open hole
        diameter: openHoleDiameter,
        length: openHoleLength,
        roughness: DEFAULT_OPEN_HOLE_ROUGHNESS,
      });
    }

    for (let index = 0; index < allSegments.length; index++) {
      const segment = allSegments[index];
      const D = segment.diameter / 1000;
      const L = segment.length;
      
      if (D <= 0) throw new Error(`Invalid diameter for segment ${index + 1}. Diameter must be greater than 0.`);
      
      const A = PI * Math.pow(D / 2, 2);
      if (A <= 0) throw new Error(`Invalid segment diameter for segment ${index + 1}; area cannot be zero or negative.`);

      const V = Q / A;

      if (V > maxVelocity) {
        maxVelocity = V;
        maxVelocitySegment = index + 1;
      }

      const Re = this.calculateReynolds(V, D, fluidDensity, fluidViscosity);
      const relativeRoughness = segment.roughness / (D * 1000);
      const f = this.calculateFrictionFactor(Re, relativeRoughness);
      
      const hf = V === 0 ? 0 : f * (L / D) * (Math.pow(V, 2) / (2 * GRAVITY));
      const frictionPressureLoss = fluidDensity * GRAVITY * hf;
      const hydrostaticGain = fluidDensity * GRAVITY * L;

      let minorLoss = 0;
      // Entry loss for the very first segment
      if (index === 0) {
        minorLoss += ENTRY_LOSS_COEFFICIENT * fluidDensity * Math.pow(V, 2) / 2;
      }
      
      if (index > 0) {
        const prevD = allSegments[index - 1].diameter / 1000;
        const prevA = PI * Math.pow(prevD / 2, 2);
        
        if (A > 0 && prevA > 0 && Q > 0) {
          const prevV = Q / prevA;
          
          if (A < prevA) { // Contraction
            const areaRatio = A / prevA;
            const Cc = 0.62 + 0.38 * Math.pow(areaRatio, 3);
            const Kc = Math.pow((1 / Cc) - 1, 2);
            minorLoss += Kc * fluidDensity * Math.pow(V, 2) / 2;
          } else if (A > prevA) { // Expansion
            const Ke = Math.pow(1 - (prevA / A), 2);
            minorLoss += Ke * fluidDensity * Math.pow(prevV, 2) / 2;
          }
        }
      }

      const inletPressure = currentPressure;
      const netPressureChange = hydrostaticGain - frictionPressureLoss - minorLoss;
      currentPressure += netPressureChange;

      const hasCavitationWarning = warnings.some(w => w.startsWith('Cavitation risk:'));
      if (currentPressure < 0 && !hasCavitationWarning) {
        warnings.push(`Cavitation risk: Negative absolute pressure calculated in segment ${index + 1}. The results are physically unrealistic. This indicates the injection pressure is too low for the given flow rate, or the flow rate is too high.`);
      }

      const depthFrom = cumulativeDepth;
      cumulativeDepth += L;

      const flowRegime = Re < LAMINAR_FLOW_LIMIT ? 'Laminar' : Re < TURBULENT_FLOW_START ? 'Transitional' : 'Turbulent';
      frictionLosses.push({ loss: frictionPressureLoss, regime: flowRegime });
      
      if(segment.id !== -1) {
        segmentResults.push({
          segmentNumber: index + 1,
          diameter: segment.diameter,
          length: L,
          depthFrom,
          depthTo: cumulativeDepth,
          velocity: V,
          reynoldsNumber: Re,
          flowRegime,
          frictionFactor: f,
          frictionLoss: frictionPressureLoss / 1000,
          hydrostaticGain: hydrostaticGain / 1000,
          minorLoss: minorLoss / 1000,
          netPressureChange: netPressureChange / 1000,
          inletPressure: inletPressure / 1000,
          outletPressure: currentPressure / 1000
        });
      }
      
      totalFrictionLoss += frictionPressureLoss;
      totalPressureDrop += frictionPressureLoss + minorLoss;
    }
    
    let dominantRegime: 'Laminar' | 'Transitional' | 'Turbulent' = 'Turbulent';
    if (frictionLosses.length > 0) {
      const maxFrictionSegment = frictionLosses.reduce((max, current) => current.loss > max.loss ? current : max);
      if (maxFrictionSegment.regime === 'Laminar') {
        dominantRegime = 'Laminar';
      }
    }
    const flowExponent = dominantRegime === 'Laminar' ? 1.0 : 2.0; 

    const totalHydrostatic = fluidDensity * GRAVITY * wellDepth;
    const availablePressure = (injectionPressure * 1000) + totalHydrostatic - (bottomholePressure * 1000);

    let maxFlowRate: number;
    if (availablePressure <= 0) {
      maxFlowRate = 0;
    } else if (totalPressureDrop <= 0 || Q === 0) {
      maxFlowRate = Infinity;
    } else {
      maxFlowRate = flowRate * Math.pow(availablePressure / totalPressureDrop, 1 / flowExponent);
    }

    return {
      segments: segmentResults,
      totalFrictionLoss: totalFrictionLoss / 1000,
      totalPressureDrop: totalPressureDrop / 1000,
      bottomPressure: currentPressure / 1000,
      maxFlowRate,
      actualFlowRate: flowRate,
      maxSegmentVelocity: maxVelocity,
      maxVelocitySegment: maxVelocitySegment,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}