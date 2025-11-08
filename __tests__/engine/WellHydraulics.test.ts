import { describe, it, expect } from 'vitest';
import { WellHydraulics } from '../../engine/WellHydraulics';
import { CalculationParams } from '../../types';

describe('WellHydraulics', () => {
  describe('calculateReynolds', () => {
    it('should calculate Reynolds number correctly for turbulent flow', () => {
      // Water at 20°C: density = 1000 kg/m³, viscosity = 0.001 Pa·s
      // V = 2 m/s, D = 0.1 m
      const Re = WellHydraulics.calculateReynolds(2, 0.1, 1000, 0.001);
      expect(Re).toBe(200000); // Turbulent flow
    });

    it('should calculate Reynolds number correctly for laminar flow', () => {
      // V = 0.01 m/s, D = 0.1 m
      const Re = WellHydraulics.calculateReynolds(0.01, 0.1, 1000, 0.001);
      expect(Re).toBe(1000); // Laminar flow
    });

    it('should return 0 when viscosity is 0', () => {
      const Re = WellHydraulics.calculateReynolds(2, 0.1, 1000, 0);
      expect(Re).toBe(0);
    });

    it('should return 0 when diameter is 0', () => {
      const Re = WellHydraulics.calculateReynolds(2, 0, 1000, 0.001);
      expect(Re).toBe(0);
    });
  });

  describe('calculateFrictionFactor', () => {
    it('should calculate laminar friction factor (Re < 2300)', () => {
      const Re = 2000;
      const f = WellHydraulics.calculateFrictionFactor(Re, 0.001);
      expect(f).toBeCloseTo(64 / 2000, 5);
    });

    it('should calculate turbulent friction factor (Re > 4000)', () => {
      const Re = 100000;
      const relativeRoughness = 0.001;
      const f = WellHydraulics.calculateFrictionFactor(Re, relativeRoughness);
      // Swamee-Jain should give reasonable friction factor
      expect(f).toBeGreaterThan(0.01);
      expect(f).toBeLessThan(0.1);
    });

    it('should interpolate in transitional regime (2300 <= Re < 4000)', () => {
      const Re = 3000;
      const relativeRoughness = 0.001;
      const f = WellHydraulics.calculateFrictionFactor(Re, relativeRoughness);

      const laminarF = 64 / 2300;
      const turbulentF = WellHydraulics.calculateFrictionFactor(4000, relativeRoughness);

      // Should be between laminar and turbulent values
      expect(f).toBeGreaterThan(Math.min(laminarF, turbulentF));
      expect(f).toBeLessThan(Math.max(laminarF, turbulentF));
    });

    it('should return 0 when Reynolds number is 0', () => {
      const f = WellHydraulics.calculateFrictionFactor(0, 0.001);
      expect(f).toBe(0);
    });

    it('should handle very smooth pipes (low roughness)', () => {
      const Re = 100000;
      const f = WellHydraulics.calculateFrictionFactor(Re, 1e-9);
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThan(0.1);
    });
  });

  describe('calculatePressureDrop', () => {
    const basicParams: CalculationParams = {
      segments: [
        { id: 1, diameter: 100, length: 100, roughness: 0.046 },
      ],
      flowRate: 100, // m³/day
      injectionPressure: 5000, // kPa
      bottomholePressure: 15000, // kPa
      fluidDensity: 1000, // kg/m³
      fluidViscosity: 0.001, // Pa·s
      wellDepth: 100, // m
      openHoleDiameter: 150, // mm
    };

    it('should calculate pressure drop for single segment', () => {
      const results = WellHydraulics.calculatePressureDrop(basicParams);

      expect(results.segments).toHaveLength(1);
      expect(results.totalFrictionLoss).toBeGreaterThan(0);
      expect(results.bottomPressure).toBeDefined();
      expect(results.actualFlowRate).toBe(100);
    });

    it('should calculate hydrostatic gain correctly', () => {
      const results = WellHydraulics.calculatePressureDrop(basicParams);
      const segment = results.segments[0];

      // Hydrostatic gain = ρ × g × h = 1000 × 9.81 × 100 = 981000 Pa = 981 kPa
      expect(segment?.hydrostaticGain).toBeCloseTo(981, 0);
    });

    it('should handle multiple segments', () => {
      const params: CalculationParams = {
        ...basicParams,
        segments: [
          { id: 1, diameter: 100, length: 50, roughness: 0.046 },
          { id: 2, diameter: 80, length: 50, roughness: 0.046 },
        ],
      };

      const results = WellHydraulics.calculatePressureDrop(params);
      expect(results.segments).toHaveLength(2);

      // Velocity should increase in smaller diameter segment
      expect(results.segments[1]?.velocity).toBeGreaterThan(results.segments[0]?.velocity || 0);
    });

    it('should add open hole section when well depth exceeds tubing length', () => {
      const params: CalculationParams = {
        ...basicParams,
        wellDepth: 200, // 100m tubing + 100m open hole
        segments: [
          { id: 1, diameter: 100, length: 100, roughness: 0.046 },
        ],
      };

      const results = WellHydraulics.calculatePressureDrop(params);
      // Note: open hole segment is calculated but not included in results.segments
      // Total depth should still be considered in calculations
      expect(results.bottomPressure).toBeDefined();
    });

    it('should calculate flow regimes correctly', () => {
      const results = WellHydraulics.calculatePressureDrop(basicParams);
      const segment = results.segments[0];

      expect(segment?.flowRegime).toMatch(/Laminar|Transitional|Turbulent/);
      expect(segment?.reynoldsNumber).toBeGreaterThan(0);
    });

    it('should calculate maximum flow rate', () => {
      const results = WellHydraulics.calculatePressureDrop(basicParams);
      expect(results.maxFlowRate).toBeGreaterThan(0);
    });

    it('should detect cavitation risk with negative pressure', () => {
      const params: CalculationParams = {
        ...basicParams,
        injectionPressure: 10, // Very low injection pressure
        flowRate: 1000, // Very high flow rate
      };

      const results = WellHydraulics.calculatePressureDrop(params);
      expect(results.warnings).toBeDefined();
      expect(results.warnings?.some(w => w.includes('Cavitation'))).toBe(true);
    });

    it('should throw error for invalid diameter', () => {
      const params: CalculationParams = {
        ...basicParams,
        segments: [
          { id: 1, diameter: 0, length: 100, roughness: 0.046 },
        ],
      };

      expect(() => WellHydraulics.calculatePressureDrop(params)).toThrow('Invalid diameter');
    });

    it('should throw error for missing open hole diameter when needed', () => {
      const params: CalculationParams = {
        ...basicParams,
        wellDepth: 200, // Creates open hole section
        openHoleDiameter: 0, // Invalid
        segments: [
          { id: 1, diameter: 100, length: 100, roughness: 0.046 },
        ],
      };

      expect(() => WellHydraulics.calculatePressureDrop(params)).toThrow('Open hole diameter');
    });

    it('should calculate minor losses for entry', () => {
      const results = WellHydraulics.calculatePressureDrop(basicParams);
      const firstSegment = results.segments[0];

      // First segment should have entry loss
      expect(firstSegment?.minorLoss).toBeGreaterThan(0);
    });

    it('should calculate minor losses for contractions/expansions', () => {
      const params: CalculationParams = {
        ...basicParams,
        segments: [
          { id: 1, diameter: 100, length: 50, roughness: 0.046 },
          { id: 2, diameter: 80, length: 50, roughness: 0.046 }, // Contraction
        ],
      };

      const results = WellHydraulics.calculatePressureDrop(params);
      const secondSegment = results.segments[1];

      // Second segment should have contraction loss
      expect(secondSegment?.minorLoss).toBeGreaterThan(0);
    });

    it('should handle zero flow rate', () => {
      const params: CalculationParams = {
        ...basicParams,
        flowRate: 0,
      };

      const results = WellHydraulics.calculatePressureDrop(params);
      expect(results.totalFrictionLoss).toBe(0);
      expect(results.segments[0]?.velocity).toBe(0);
    });

    it('should track maximum velocity segment', () => {
      const params: CalculationParams = {
        ...basicParams,
        segments: [
          { id: 1, diameter: 100, length: 50, roughness: 0.046 },
          { id: 2, diameter: 50, length: 50, roughness: 0.046 }, // Smaller = higher velocity
        ],
      };

      const results = WellHydraulics.calculatePressureDrop(params);
      expect(results.maxVelocitySegment).toBe(2); // Second segment should have max velocity
      expect(results.maxSegmentVelocity).toBeGreaterThan(0);
    });

    it('should provide depth information for each segment', () => {
      const params: CalculationParams = {
        ...basicParams,
        segments: [
          { id: 1, diameter: 100, length: 50, roughness: 0.046 },
          { id: 2, diameter: 80, length: 50, roughness: 0.046 },
        ],
      };

      const results = WellHydraulics.calculatePressureDrop(params);

      expect(results.segments[0]?.depthFrom).toBe(0);
      expect(results.segments[0]?.depthTo).toBe(50);
      expect(results.segments[1]?.depthFrom).toBe(50);
      expect(results.segments[1]?.depthTo).toBe(100);
    });
  });
});
