/**
 * Engineering limits and validation constraints for disposal well calculations
 *
 * These limits are based on practical engineering considerations and
 * industry standards to prevent unrealistic or dangerous calculations.
 */

// Flow rate limits (m³/day)
export const MIN_FLOW_RATE = 0;
export const MAX_FLOW_RATE = 10000; // Typical maximum for disposal wells

// Well depth limits (meters)
export const MIN_WELL_DEPTH = 1;
export const MAX_WELL_DEPTH = 10000; // Deep disposal wells typically < 10 km

// Pressure limits (kPa)
export const MIN_PRESSURE = 0;
export const MAX_PRESSURE = 100000; // ~1000 bar, typical max for oilfield equipment

// Diameter limits (mm)
export const MIN_DIAMETER = 10; // Minimum practical tubing size
export const MAX_DIAMETER = 500; // Maximum typical well casing size

// Segment length limits (meters)
export const MIN_SEGMENT_LENGTH = 0.1;
export const MAX_SEGMENT_LENGTH = 5000;

// Roughness limits (mm)
export const MIN_ROUGHNESS = 0;
export const MAX_ROUGHNESS = 10; // Very rough pipe

// Fluid density limits (kg/m³)
export const MIN_FLUID_DENSITY = 700; // Light oils
export const MAX_FLUID_DENSITY = 1500; // Heavy brines

// Fluid viscosity limits (Pa·s)
export const MIN_FLUID_VISCOSITY = 0.0001; // Water-like
export const MAX_FLUID_VISCOSITY = 1.0; // Heavy oils

// Maximum number of segments
export const MAX_SEGMENTS = 20;

// Velocity limits are already defined in physics.ts
// VELOCITY_WARNING_LIMIT = 20 m/s
// VELOCITY_ERROR_LIMIT = 25 m/s
