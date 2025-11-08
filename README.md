# Disposal Well Injection Calculator

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

Advanced hydraulic analysis calculator for disposal well injection systems. Performs real-time pressure drop, flow rate, and velocity calculations based on industry-standard fluid dynamics equations.

View your app in AI Studio: https://ai.studio/apps/drive/1TRGXzvS3Ap9MFQdIGpirl236ngo6Ivyc

## Features

- **Real-time Hydraulic Calculations**: Instant pressure drop and flow analysis
- **Multi-Segment Well Configuration**: Support for complex tubing strings with diameter changes
- **Flow Regime Detection**: Automatic identification of laminar, transitional, and turbulent flow
- **Erosion Velocity Warnings**: API RP 14E based velocity limit alerts
- **Open Hole Support**: Automatic open hole section calculations
- **Interactive UI**: Modern, responsive design with real-time validation
- **Engineering-Grade**: Based on Darcy-Weisbach, Swamee-Jain, and other proven equations

## Engineering Background

### Calculation Methodology

The calculator implements industry-standard fluid dynamics equations:

#### 1. Reynolds Number
```
Re = (ρ × V × D) / μ
```
- Determines flow regime (laminar < 2300, transitional 2300-4000, turbulent > 4000)

#### 2. Friction Factor
- **Laminar Flow** (Re < 2300): `f = 64/Re` (Hagen-Poiseuille)
- **Turbulent Flow** (Re > 4000): Swamee-Jain equation
  ```
  f = 0.25 / [log₁₀(ε/(3.7×D) + 5.74/Re^0.9)]²
  ```
- **Transitional Flow** (2300 ≤ Re < 4000): Linear interpolation

#### 3. Pressure Drop (Darcy-Weisbach)
```
ΔP_friction = f × (L/D) × (ρV²/2)
```

#### 4. Hydrostatic Pressure
```
ΔP_hydrostatic = ρ × g × h
```

#### 5. Minor Losses
- Entry loss (sharp-edged inlet): K = 0.5
- Sudden contraction/expansion (Crane TP-410 methods)

### Input Parameters

| Parameter | Description | Typical Range | Units |
|-----------|-------------|---------------|-------|
| Flow Rate | Injection rate | 10-10,000 | m³/day |
| Well Depth | Total vertical depth | 100-10,000 | m |
| Injection Pressure | Wellhead injection pressure | 100-50,000 | kPa |
| Bottomhole Pressure | Formation pressure limit | 1,000-100,000 | kPa |
| Fluid Density | Injection fluid density | 700-1,500 | kg/m³ |
| Fluid Viscosity | Dynamic viscosity | 0.0001-1.0 | Pa·s |
| Segment Diameter | Tubing inner diameter | 10-500 | mm |
| Segment Length | Tubing section length | 1-5,000 | m |
| Pipe Roughness | Absolute wall roughness | 0.001-10 | mm |

### Output Results

- **Segment-by-Segment Analysis**:
  - Velocity (m/s)
  - Reynolds number
  - Flow regime
  - Friction factor
  - Pressure changes (friction, hydrostatic, minor losses)
  - Inlet and outlet pressures

- **Overall System**:
  - Total friction loss
  - Total pressure drop
  - Bottomhole pressure
  - Maximum achievable flow rate
  - System health score
  - Warnings and recommendations

### Engineering Standards & References

- API RP 14E: Recommended Practice for Design and Installation of Offshore Production Platform Piping Systems
- Darcy-Weisbach equation for friction losses
- Swamee-Jain equation (1976) for turbulent friction factor
- Crane TP-410: Flow of Fluids Through Valves, Fittings, and Pipe
- Moody diagram for friction factor determination

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/Well-Injection-Calculation.git
   cd Well-Injection-Calculation
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
   Get your API key from: https://ai.google.dev/

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run unit tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

### Project Structure

```
├── components/          # React UI components
│   ├── FloatingLabelInput.tsx
│   ├── ProgressIndicator.tsx
│   ├── SegmentCard.tsx
│   ├── StatusCard.tsx
│   ├── Tooltip.tsx
│   └── icons.tsx
├── constants/          # Physical constants and limits
│   ├── limits.ts       # Validation constraints
│   └── physics.ts      # Physical constants
├── engine/            # Calculation engine
│   └── WellHydraulics.ts
├── hooks/             # Custom React hooks
│   └── useAnimatedValue.ts
├── __tests__/         # Test files
│   └── engine/
│       └── WellHydraulics.test.ts
├── App.tsx            # Main application component
├── types.ts           # TypeScript type definitions
└── index.tsx          # Application entry point
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Code Quality

This project enforces code quality through:

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting with TypeScript support
- **Prettier**: Automatic code formatting
- **Vitest**: Unit testing framework

Run all quality checks:
```bash
npm run type-check
npm run lint
npm run format:check
npm test
```

## Usage Examples

### Basic Single-Segment Well

```
Flow Rate: 100 m³/day
Well Depth: 400 m
Injection Pressure: 5000 kPa
Bottomhole Pressure: 15000 kPa
Fluid Density: 1000 kg/m³ (water)
Fluid Viscosity: 0.001 Pa·s (water at 20°C)

Segment 1:
  - Diameter: 100.5 mm (4.5" tubing)
  - Length: 400 m
  - Roughness: 0.046 mm (steel)
```

### Multi-Segment Configuration

```
Segment 1 (surface to 150m):
  - Diameter: 100.5 mm
  - Length: 150 m

Segment 2 (150m to 400m):
  - Diameter: 76.0 mm
  - Length: 250 m
```

### With Open Hole Section

```
Well Depth: 500 m
Tubing Length: 400 m
→ Automatic 100m open hole section created
Open Hole Diameter: 150 mm
```

## Validation & Limits

The calculator enforces practical engineering limits:

- Flow rate: 0 - 10,000 m³/day
- Well depth: 1 - 10,000 m
- Pressure: 0 - 100,000 kPa
- Diameter: 10 - 500 mm
- Fluid density: 700 - 1,500 kg/m³
- Fluid viscosity: 0.0001 - 1.0 Pa·s

## Warnings & Safety

The calculator provides warnings for:

- **Erosion Velocity**: Exceeding 20 m/s (warning) or 25 m/s (critical)
- **Cavitation Risk**: Negative absolute pressure calculated
- **Flow Limitations**: Operating near maximum flow rate
- **Depth Mismatch**: Tubing length exceeds well depth

## Assumptions & Limitations

1. **Incompressible Flow**: Valid for liquids, not gases
2. **Steady-State**: No transient effects
3. **Fully Developed Flow**: Entrance effects neglected except at inlet
4. **Newtonian Fluid**: Constant viscosity
5. **Vertical Well**: No inclination effects
6. **Single Phase**: No gas/liquid mixtures
7. **Isothermal**: Temperature effects on fluid properties ignored

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run quality checks (`npm run lint`, `npm test`)
5. Submit a pull request

## License

This project is private and not yet licensed for public use.

## Support

For issues or questions:
- Open an issue on GitHub
- Contact: [your-email@example.com]

## Acknowledgments

- Built with React 19, TypeScript, and Vite
- UI powered by Tailwind CSS
- Testing with Vitest and Testing Library
- Engineering calculations based on SPE, API, and ASME standards

---

**Disclaimer**: This calculator is for engineering analysis purposes. Always verify calculations with certified engineering software and follow local regulations for disposal well operations.
