import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AlertCircleIcon, PlusIcon, Trash2Icon, ArrowUpIcon, ArrowDownIcon, CheckCircleIcon, InfoIcon, SettingsIcon, CalculatorIcon, DropletIcon, LayersIcon, TrendingUpIcon, ActivityIcon, ZapIcon, ChevronRightIcon, ChevronDownIcon, BeakerIcon, GaugeIcon, LightbulbIcon } from './components/icons';
import { API_TUBING_SIZES } from './constants';
import { Segment, CalculationResults, SegmentResult, CalculationParams } from './types';
import { WellHydraulics } from './engine/WellHydraulics';
import { VELOCITY_WARNING_LIMIT, VELOCITY_ERROR_LIMIT } from './constants/physics';

// Animation hook for smooth number transitions
const useAnimatedValue = (value: number, duration: number = 300) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = displayValue;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuad = progress * (2 - progress);
      setDisplayValue(startValue + (value - startValue) * easeOutQuad);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return displayValue;
};

// Tooltip component for help text
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({ content, children }) => {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-flex">
      <span 
        tabIndex={0}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </span>
      {show && (
        <div role="tooltip" className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl whitespace-nowrap animate-fadeIn">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};

// Progress indicator component
const ProgressIndicator: React.FC<{ value: number; max: number; label: string; color?: string }> = ({ 
  value, 
  max, 
  label, 
  color = 'blue' 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const animatedPercentage = useAnimatedValue(percentage);
  
  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-800">{percentage.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r ${
            color === 'green' ? 'from-green-400 to-green-600' :
            color === 'red' ? 'from-red-400 to-red-600' :
            color === 'yellow' ? 'from-yellow-400 to-yellow-600' :
            'from-blue-400 to-blue-600'
          }`}
          style={{ width: `${animatedPercentage}%` }}
        />
      </div>
    </div>
  );
};

// Status card component with animation
const StatusCard: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  value: string | number; 
  unit?: string; 
  status?: 'good' | 'warning' | 'error' | 'neutral';
  trend?: 'up' | 'down' | 'stable';
}> = ({ icon, title, value, unit, status = 'neutral', trend }) => {
  const statusColors = {
    good: 'from-green-50 to-emerald-50 border-green-200',
    warning: 'from-yellow-50 to-amber-50 border-yellow-200',
    error: 'from-red-50 to-rose-50 border-red-200',
    neutral: 'from-gray-50 to-slate-50 border-gray-200'
  };
  
  const statusTextColors = {
    good: 'text-green-700',
    warning: 'text-yellow-700',
    error: 'text-red-700',
    neutral: 'text-gray-700'
  };

  return (
    <div className={`relative bg-gradient-to-br ${statusColors[status]} border rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg bg-white/80 ${statusTextColors[status]} group-hover:scale-110 transition-transform`}>
              {icon}
            </div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold ${statusTextColors[status]}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
        </div>
        {trend && (
          <div className={`text-xs px-2 py-1 rounded-full ${
            trend === 'up' ? 'bg-green-100 text-green-700' :
            trend === 'down' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '−'}
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced input component with floating label
const FloatingLabelInput: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  unit?: string;
  icon?: React.ReactNode;
  helpText?: string;
  type?: string;
  step?: string;
}> = ({ id, label, value, onChange, error, unit, icon, helpText, type = "number", step }) => {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== '';
  
  return (
    <div className="relative group">
      <div className={`relative bg-white rounded-xl border-2 transition-all duration-200 ${
        error ? 'border-red-300 bg-red-50/50' : 
        focused ? 'border-blue-400 shadow-lg shadow-blue-100' : 
        'border-gray-200 hover:border-gray-300'
      }`}>
        {icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
            error ? 'text-red-400' : focused ? 'text-blue-500' : 'text-gray-400'
          }`}>
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          step={step}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full px-3 ${icon ? 'pl-10' : ''} ${unit ? 'pr-12' : ''} py-3 pt-5 bg-transparent outline-none text-gray-900 font-medium placeholder-transparent peer`}
          placeholder={label}
        />
        <label 
          htmlFor={id}
          className={`absolute left-3 ${icon ? 'left-10' : ''} transition-all duration-200 pointer-events-none ${
            focused || hasValue ? 'top-1 text-xs' : 'top-3.5 text-base'
          } ${
            error ? 'text-red-500' : focused ? 'text-blue-500' : 'text-gray-500'
          }`}
        >
          {label}
        </label>
        {unit && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
            {unit}
          </div>
        )}
      </div>
      {helpText && !error && (
        <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
          <InfoIcon className="w-3 h-3" />
          {helpText}
        </p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1 animate-slideIn">
          <AlertCircleIcon className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
};

// Segment card with enhanced design
const SegmentCard: React.FC<{
  segment: Segment;
  index: number;
  total: number;
  depthFrom: number;
  depthTo: number;
  onUpdate: (field: keyof Omit<Segment, 'id'>, value: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  errors: Record<string, string>;
  result?: SegmentResult;
}> = ({ segment, index, total, depthFrom, depthTo, onUpdate, onRemove, onMoveUp, onMoveDown, errors, result }) => {
  const [expanded, setExpanded] = useState(true);
  const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
  const color = colors[index % colors.length];
  
  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${
      expanded ? 'max-h-96' : 'max-h-20'
    }`}>
      <div className={`h-1 ${color}`} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${color} text-white font-bold flex items-center justify-center shadow-md`}>
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Segment {index + 1}</h3>
              <p className="text-xs text-gray-500">Depth: {depthFrom.toFixed(0)} - {depthTo.toFixed(0)}m</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {expanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
            </button>
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowDownIcon className="w-4 h-4" />
            </button>
            {total > 1 && (
              <button
                onClick={onRemove}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2Icon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {expanded && (
          <div className="space-y-3 animate-slideIn">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Inner Diameter</label>
                <div className="relative">
                  <input
                    type="number"
                    value={segment.diameter}
                    onChange={(e) => onUpdate('diameter', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border-2 transition-colors text-gray-900 ${
                      errors[`segment_diameter_${segment.id}`] 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 bg-gray-100 hover:border-gray-300 focus:border-blue-400 focus:outline-none'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">mm</span>
                </div>
                {errors[`segment_diameter_${segment.id}`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`segment_diameter_${segment.id}`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Length</label>
                <div className="relative">
                  <input
                    type="number"
                    value={segment.length}
                    onChange={(e) => onUpdate('length', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border-2 transition-colors text-gray-900 ${
                      errors[`segment_length_${segment.id}`] 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 bg-gray-100 hover:border-gray-300 focus:border-blue-400 focus:outline-none'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">m</span>
                </div>
                {errors[`segment_length_${segment.id}`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`segment_length_${segment.id}`]}</p>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Roughness
                  <Tooltip content="Pipe wall roughness affects friction losses">
                    <InfoIcon className="inline ml-1 w-3 h-3 text-gray-400" />
                  </Tooltip>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    value={segment.roughness}
                    onChange={(e) => onUpdate('roughness', e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border-2 transition-colors text-gray-900 ${
                      errors[`segment_roughness_${segment.id}`] 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 bg-gray-100 hover:border-gray-300 focus:border-blue-400 focus:outline-none'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">mm</span>
                </div>
                {errors[`segment_roughness_${segment.id}`] && (
                  <p className="mt-1 text-xs text-red-600">{errors[`segment_roughness_${segment.id}`]}</p>
                )}
              </div>
            </div>
            
            {result && (
              <div className="mt-3 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Velocity:</span>
                    <span className={`ml-1 font-semibold ${
                      result.velocity > 25 ? 'text-red-600' : 
                      result.velocity > 20 ? 'text-amber-600' : 
                      'text-gray-800'
                    }`}>
                      {result.velocity.toFixed(2)} m/s
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Reynolds:</span>
                    <span className="ml-1 font-semibold text-gray-800">
                      {result.reynoldsNumber.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Regime:</span>
                    <span className={`ml-1 font-semibold ${
                      result.flowRegime === 'Laminar' ? 'text-blue-600' :
                      result.flowRegime === 'Transitional' ? 'text-amber-600' :
                      'text-red-600'
                    }`}>
                      {result.flowRegime}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DisposalWellCalculator: React.FC = () => {
  const [flowRate, setFlowRate] = useState('100');
  const [wellDepth, setWellDepth] = useState('400');
  const [injectionPressure, setInjectionPressure] = useState('5000');
  const [bottomholePressure, setBottomholePressure] = useState('15000');
  const [reservoirPressure, setReservoirPressure] = useState('14000');
  
  const [segments, setSegments] = useState<Segment[]>([
    { id: 1, diameter: 100.5, length: 150, roughness: 0.046 },
    { id: 2, diameter: 76.0, length: 250, roughness: 0.046 }
  ]);
  
  const [fluidDensity, setFluidDensity] = useState('1000');
  const [fluidViscosity, setFluidViscosity] = useState('0.001');
  const [openHoleDiameter, setOpenHoleDiameter] = useState('150');
  
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'parameters' | 'configuration' | 'results'>('parameters');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showErosionDetails, setShowErosionDetails] = useState(false);

  const totalSegmentLength = useMemo(() => segments.reduce((sum, seg) => sum + (seg.length || 0), 0), [segments]);
  const wellDepthNum = parseFloat(wellDepth) || 0;
  const openHoleLength = useMemo(() => Math.max(0, wellDepthNum - totalSegmentLength), [wellDepthNum, totalSegmentLength]);

  useEffect(() => {
    const newErrors: Record<string, string> = {};
    const flowRateNum = parseFloat(flowRate);
    const wellDepthNum = parseFloat(wellDepth) || 0;
    const injectionPressureNum = parseFloat(injectionPressure);
    const bottomholePressureNum = parseFloat(bottomholePressure);
    const reservoirPressureNum = parseFloat(reservoirPressure);
    const fluidDensityNum = parseFloat(fluidDensity);
    const fluidViscosityNum = parseFloat(fluidViscosity);
    const openHoleDiameterNum = parseFloat(openHoleDiameter);

    if (isNaN(flowRateNum) || flowRateNum < 0) newErrors.flowRate = 'Must be non-negative';
    if (isNaN(wellDepthNum) || wellDepthNum <= 0) newErrors.wellDepth = 'Must be positive';
    if (isNaN(injectionPressureNum)) newErrors.injectionPressure = 'Must be valid number';
    if (isNaN(bottomholePressureNum)) newErrors.bottomholePressure = 'Must be valid number';
    if (isNaN(reservoirPressureNum)) newErrors.reservoirPressure = 'Must be valid number';
    if (isNaN(fluidDensityNum) || fluidDensityNum <= 0) newErrors.fluidDensity = 'Must be positive';
    if (isNaN(fluidViscosityNum) || fluidViscosityNum <= 0) newErrors.fluidViscosity = 'Must be positive';
    
    if (openHoleLength > 0.1 && (isNaN(openHoleDiameterNum) || openHoleDiameterNum <= 0)) {
        newErrors.openHoleDiameter = 'Required for open hole section';
    }

    segments.forEach(segment => {
      if (!segment.diameter || segment.diameter <= 0) newErrors[`segment_diameter_${segment.id}`] = 'Required';
      if (!segment.length || segment.length <= 0) newErrors[`segment_length_${segment.id}`] = 'Required';
      if (segment.roughness < 0) newErrors[`segment_roughness_${segment.id}`] = 'Non-negative';
    });

    if (totalSegmentLength > wellDepthNum) {
      newErrors.depthError = `Tubing length (${totalSegmentLength.toFixed(1)}m) cannot exceed well depth (${wellDepthNum}m)`;
    }

    setErrors(newErrors);
  }, [flowRate, wellDepth, injectionPressure, bottomholePressure, reservoirPressure, fluidDensity, fluidViscosity, segments, totalSegmentLength, openHoleDiameter, openHoleLength]);

  const performCalculations = useCallback(async () => {
    if (Object.keys(errors).length > 0) {
      setResults(null);
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);
    setResults(null);

    // Yield to main thread to show spinner
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const params: CalculationParams = {
        flowRate: parseFloat(flowRate) || 0,
        injectionPressure: parseFloat(injectionPressure) || 0,
        bottomholePressure: parseFloat(bottomholePressure) || 0,
        fluidDensity: parseFloat(fluidDensity) || 1000,
        fluidViscosity: parseFloat(fluidViscosity) || 0.001,
        wellDepth: parseFloat(wellDepth) || 0,
        openHoleDiameter: parseFloat(openHoleDiameter) || 0,
        segments: segments
      };

      const resultsData = WellHydraulics.calculatePressureDrop(params);

      setResults(resultsData);
      setActiveTab('results');
    } catch (error) {
      console.error('Calculation error:', error);
      if (error instanceof Error) {
        setCalculationError(error.message);
      } else {
        setCalculationError('An unknown error occurred during calculation.');
      }
      setResults(null);
    } finally {
      setIsCalculating(false);
    }
  }, [flowRate, injectionPressure, bottomholePressure, fluidDensity, fluidViscosity, segments, wellDepth, openHoleDiameter, errors]);

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || value === '-' || !isNaN(parseFloat(value))) {
      setter(value);
      setResults(null);
      setCalculationError(null);
    }
  };

  const updateSegment = (id: number, field: keyof Omit<Segment, 'id'>, value: string) => {
    const numValue = parseFloat(value);
    if (value === '' || !isNaN(numValue)) {
      setSegments(segments.map(s => 
        s.id === id ? { ...s, [field]: numValue || 0 } : s
      ));
      setResults(null);
      setCalculationError(null);
    }
  };

  const addSegment = () => {
    const newId = segments.length > 0 ? Math.max(...segments.map(s => s.id)) + 1 : 1;
    setSegments([...segments, {
      id: newId,
      diameter: 50.7,
      length: 100,
      roughness: 0.046
    }]);
    setResults(null);
    setCalculationError(null);
  };

  const removeSegment = (id: number) => {
    if (segments.length > 1) {
      setSegments(segments.filter(s => s.id !== id));
      setResults(null);
      setCalculationError(null);
    }
  };

  const moveSegment = (id: number, direction: 'up' | 'down') => {
    const index = segments.findIndex(s => s.id === id);
    if ((direction === 'up' && index > 0) || (direction === 'down' && index < segments.length - 1)) {
      const newSegments = [...segments];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newSegments[index], newSegments[targetIndex]] = [newSegments[targetIndex], newSegments[index]];
      setSegments(newSegments);
      setResults(null);
      setCalculationError(null);
    }
  };

  const applyPreset = (preset: { id: number; name?: string }) => {
    const newId = segments.length > 0 ? Math.max(...segments.map(s => s.id)) + 1 : 1;
    setSegments([...segments, {
      id: newId,
      diameter: preset.id,
      length: 100,
      roughness: 0.046
    }]);
    setResults(null);
    setCalculationError(null);
  };

  const isCalculationDisabled = Object.keys(errors).length > 0;

  // Calculate system health score
  const systemHealthScore = useMemo(() => {
    if (!results) return null;
    let score = 100;
    
    // Deduct for high velocity
    if (results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT) score -= 40;
    else if (results.maxSegmentVelocity > VELOCITY_WARNING_LIMIT) score -= 20;
    
    // Deduct for pressure issues
    const pressureMargin = results.bottomPressure - parseFloat(bottomholePressure);
    if (pressureMargin < 0) score -= 20;
    
    // Deduct for flow limitations
    if (results.maxFlowRate !== Infinity && results.actualFlowRate > results.maxFlowRate * 0.9) score -= 15;
    
    return Math.max(0, score);
  }, [results, bottomholePressure]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <DropletIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Disposal Well Flow Calculator
                </h1>
                <p className="text-xs text-gray-500">Advanced hydraulic analysis with real-time visualization</p>
              </div>
            </div>
            {results && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">System Health</p>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">
                      {systemHealthScore !== null && (
                        <span className={`${
                          systemHealthScore >= 80 ? 'text-green-600' :
                          systemHealthScore >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {systemHealthScore.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${
                      systemHealthScore !== null && systemHealthScore >= 80 ? 'bg-green-500' :
                      systemHealthScore !== null && systemHealthScore >= 60 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Alert Messages */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 space-y-3">
        {calculationError && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm animate-slideIn">
                <div className="flex items-start gap-3">
                <AlertCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Calculation Failed</p>
                    <p className="text-xs text-red-700 mt-1">{calculationError}</p>
                </div>
                </div>
            </div>
        )}
        {results?.warnings?.map((warning, index) => (
          <div key={index} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm animate-slideIn">
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Calculation Warning</p>
                <p className="text-xs text-yellow-700 mt-1">{warning}</p>
              </div>
            </div>
          </div>
        ))}
        {errors.depthError && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg shadow-sm animate-slideIn">
            <div className="flex items-start gap-3">
              <AlertCircleIcon className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Configuration Error</p>
                <p className="text-xs text-red-700 mt-1">{errors.depthError}</p>
              </div>
            </div>
          </div>
        )}
        
        {openHoleLength > 0.1 && !errors.depthError && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg shadow-sm animate-slideIn">
            <div className="flex items-start gap-3">
              <InfoIcon className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Open Hole Section</p>
                <p className="text-xs text-blue-700 mt-1">
                  An open hole section of {openHoleLength.toFixed(1)}m is present from the end of the tubing ({totalSegmentLength.toFixed(1)}m) to the total well depth ({wellDepthNum}m).
                </p>
              </div>
            </div>
          </div>
        )}
        
        {results && results.maxSegmentVelocity > VELOCITY_WARNING_LIMIT && (
           <div className={`${results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-400'} border-l-4 p-4 rounded-lg shadow-sm animate-slideIn`}>
            <div className="flex items-start gap-3">
              <AlertCircleIcon className={`w-5 h-5 ${results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'text-red-600' : 'text-amber-600'} mt-0.5`} />
              <div className="flex-1">
                <p className={`text-sm font-medium ${results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'text-red-800' : 'text-amber-800'}`}>
                  Erosion Velocity {results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'Exceeded' : 'Warning'}
                </p>
                <p className={`text-xs ${results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'text-red-700' : 'text-amber-700'} mt-1`}>
                  Maximum velocity of {results.maxSegmentVelocity.toFixed(2)} m/s in Segment #{results.maxVelocitySegment} is in a high-risk zone.
                </p>
                <button onClick={() => setShowErosionDetails(!showErosionDetails)} className="text-xs font-semibold text-blue-600 mt-2 flex items-center gap-1">
                  {showErosionDetails ? 'Hide Details' : 'Show Details'}
                  {showErosionDetails ? <ChevronDownIcon className="w-3 h-3"/> : <ChevronRightIcon className="w-3 h-3"/>}
                </button>
                {showErosionDetails && (
                  <div className="mt-2 text-xs text-gray-700 space-y-2">
                    <p className="italic">Note: For water injection, the risk of erosion typically begins to increase at velocities above 18 m/s. This calculator uses a warning threshold of 20 m/s and a critical limit of 25 m/s, but sustained operation above 18 m/s should be carefully evaluated.</p>
                    <h4 className="font-semibold">Risks of High Velocity:</h4>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Erosion-Corrosion:</strong> High fluid velocity can strip away protective films on the pipe wall, accelerating corrosion and leading to premature failure. This is especially risky if the water contains dissolved gases (like CO2 or H2S) or suspended solids.</li>
                      <li><strong>Vibration:</strong> Excessive flow rates can induce mechanical vibrations (Flow-Induced Vibration), which can fatigue pipe joints, supports, and connected equipment, leading to potential leaks.</li>
                      <li><strong>Equipment Damage:</strong> Valves, bends, and instrumentation can be damaged by the erosive force of high-velocity fluid.</li>
                    </ul>
                    <h4 className="font-semibold mt-2">Mitigation Strategies:</h4>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><strong>Increase Pipe Diameter:</strong> Using larger diameter tubing for the high-velocity sections is the most effective way to reduce fluid speed.</li>
                      <li><strong>Material Selection:</strong> Employing corrosion-resistant alloys (CRAs) or internally coated pipes can significantly increase the tolerance to high velocities.</li>
                      <li><strong>Flow Control:</strong> If possible, reduce the injection rate to stay within acceptable limits.</li>
                      <li><strong>Fluid Filtering:</strong> Ensuring the injected water is free of abrasive solids (sand, scale) will minimize mechanical erosion.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Visual Schematic */}
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-24">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <LayersIcon className="w-5 h-5" />
                  Tubing Configuration
                </h2>
              </div>
              <div className="p-4">
                <div className="relative bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl" style={{ height: '500px' }}>
                  {wellDepthNum > 0 ? (
                    <>
                      <div className="absolute inset-0 p-4">
                        <svg width="100%" height="100%" viewBox="0 0 200 460" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="casingGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#e5e7eb" />
                              <stop offset="100%" stopColor="#9ca3af" />
                            </linearGradient>
                             <pattern id="openHolePattern" patternUnits="userSpaceOnUse" width="6" height="6">
                              <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#9ca3af" strokeWidth="1" />
                            </pattern>
                          </defs>
                          <rect x="60" y="0" width="80" height="460" fill="url(#casingGradient)" opacity="0.3" />
                          
                          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
                            <g key={i}>
                              <line 
                                x1="40" 
                                y1={f * 460} 
                                x2="160" 
                                y2={f * 460} 
                                stroke="#d1d5db" 
                                strokeWidth="1" 
                                strokeDasharray="4"
                              />
                              <text 
                                x="30" 
                                y={f * 460 + 4} 
                                fontSize="10" 
                                fill="#6b7280" 
                                textAnchor="end"
                              >
                                {(wellDepthNum * f).toFixed(0)}m
                              </text>
                            </g>
                          ))}
                          
                          {/* Tubing segments */}
                          {segments.map((segment, index) => {
                            const startDepth = segments.slice(0, index).reduce((sum, s) => sum + (s.length || 0), 0);
                            const yStart = startDepth * (460 / wellDepthNum);
                            const segmentHeight = (segment.length || 0) * (460 / wellDepthNum);
                            const maxDiameter = Math.max(1, ...API_TUBING_SIZES.map(s => s.id));
                            const widthScale = ((segment.diameter || 1) / maxDiameter) * 50 + 30;
                            const xLeft = 100 - widthScale / 2;
                            
                            const colors = [
                              { main: '#3b82f6', shadow: '#2563eb' },
                              { main: '#10b981', shadow: '#059669' },
                              { main: '#f59e0b', shadow: '#d97706' },
                              { main: '#ef4444', shadow: '#dc2626' },
                              { main: '#8b5cf6', shadow: '#7c3aed' },
                              { main: '#ec4899', shadow: '#db2777' }
                            ];
                            const color = colors[index % colors.length];
                            
                            return (
                              <g key={segment.id} className="transition-all duration-300 hover:opacity-90">
                                <defs>
                                  <linearGradient id={`segGrad${segment.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={color.shadow} />
                                    <stop offset="50%" stopColor={color.main} />
                                    <stop offset="100%" stopColor={color.shadow} />
                                  </linearGradient>
                                </defs>
                                <rect 
                                  x={xLeft} 
                                  y={yStart} 
                                  width={widthScale} 
                                  height={segmentHeight} 
                                  fill={`url(#segGrad${segment.id})`}
                                  stroke="#1f2937" 
                                  strokeWidth="1" 
                                  rx="2"
                                  opacity="0.9"
                                />
                                {segmentHeight > 30 && (
                                  <>
                                    <text 
                                      x="100" 
                                      y={yStart + segmentHeight / 2 - 5} 
                                      textAnchor="middle" 
                                      fontSize="11" 
                                      fontWeight="bold" 
                                      fill="white"
                                    >
                                      #{index + 1}
                                    </text>
                                    <text 
                                      x="100" 
                                      y={yStart + segmentHeight / 2 + 7} 
                                      textAnchor="middle" 
                                      fontSize="9" 
                                      fill="white"
                                    >
                                      {segment.diameter.toFixed(1)}mm
                                    </text>
                                  </>
                                )}
                              </g>
                            );
                          })}

                          {/* Open Hole Section */}
                          {openHoleLength > 0.1 && !errors.depthError && (
                            <g>
                              <rect
                                x="60"
                                y={totalSegmentLength * (460 / wellDepthNum)}
                                width="80"
                                height={openHoleLength * (460 / wellDepthNum)}
                                fill="url(#openHolePattern)"
                              />
                               {openHoleLength * (460 / wellDepthNum) > 30 && (
                                <text
                                  x="100"
                                  y={totalSegmentLength * (460 / wellDepthNum) + (openHoleLength * (460 / wellDepthNum)) / 2}
                                  textAnchor="middle"
                                  fontSize="10"
                                  fill="#4b5563"
                                  className="font-semibold"
                                >
                                  Open Hole
                                </text>
                              )}
                            </g>
                          )}
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <LayersIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Enter well depth to visualize</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Info summary card */}
                {wellDepthNum > 0 && (
                  <div className="mt-4 bg-white rounded-lg p-3 shadow-md border border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Total Tubing Length</p>
                        <p className="font-bold text-gray-800">{totalSegmentLength.toFixed(1)}m</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Segments</p>
                        <p className="font-bold text-gray-800">{segments.length}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* API Presets */}
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Quick Add API Tubing</p>
                  <div className="grid grid-cols-2 gap-2">
                    {API_TUBING_SIZES.slice(0, 4).map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="px-3 py-2 text-xs bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 border border-gray-200 hover:border-blue-300 rounded-lg transition-all duration-200 hover:shadow-md"
                      >
                        <div className="font-medium text-gray-700">{preset.name}</div>
                        <div className="text-gray-500">{preset.id}mm</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Center Content - Tabbed Interface */}
          <section className="lg:col-span-9">
            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex">
                  {[
                    { id: 'parameters', label: 'Operating Parameters', icon: <SettingsIcon className="w-4 h-4" /> },
                    { id: 'configuration', label: 'Tubing Configuration', icon: <LayersIcon className="w-4 h-4" /> },
                    { id: 'results', label: 'Analysis Results', icon: <TrendingUpIcon className="w-4 h-4" />, disabled: !results }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                      disabled={tab.disabled}
                      className={`flex-1 px-4 py-4 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                          : tab.disabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.id === 'results' && results && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                          New
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Parameters Tab */}
                {activeTab === 'parameters' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <GaugeIcon className="w-5 h-5 text-blue-600" />
                        System Parameters
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FloatingLabelInput
                          id="flow-rate"
                          label="Flow Rate"
                          value={flowRate}
                          onChange={handleInputChange(setFlowRate)}
                          error={errors.flowRate}
                          unit="m³/day"
                          icon={<DropletIcon className="w-4 h-4" />}
                          helpText="Daily water injection rate"
                        />
                        <FloatingLabelInput
                          id="well-depth"
                          label="Total Well Depth"
                          value={wellDepth}
                          onChange={handleInputChange(setWellDepth)}
                          error={errors.wellDepth}
                          unit="m"
                          icon={<ArrowDownIcon className="w-4 h-4" />}
                          helpText="Measured depth from surface"
                        />
                        <FloatingLabelInput
                          id="injection-pressure"
                          label="Surface Injection Pressure"
                          value={injectionPressure}
                          onChange={handleInputChange(setInjectionPressure)}
                          error={errors.injectionPressure}
                          unit="kPa"
                          icon={<GaugeIcon className="w-4 h-4" />}
                          helpText="Pressure at wellhead"
                        />
                        <FloatingLabelInput
                          id="bottomhole-pressure"
                          label="Target Bottom Pressure"
                          value={bottomholePressure}
                          onChange={handleInputChange(setBottomholePressure)}
                          error={errors.bottomholePressure}
                          unit="kPa"
                          icon={<ActivityIcon className="w-4 h-4" />}
                          helpText="Required pressure at TD"
                        />
                      </div>
                    </div>

                    <div>
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1"
                      >
                        {showAdvanced ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        Advanced Settings
                      </button>
                      
                      {showAdvanced && (
                        <div className="grid md:grid-cols-2 gap-4 animate-slideIn">
                          <FloatingLabelInput
                            id="reservoir-pressure"
                            label="Reservoir Pressure"
                            value={reservoirPressure}
                            onChange={handleInputChange(setReservoirPressure)}
                            error={errors.reservoirPressure}
                            unit="kPa"
                            icon={<LayersIcon className="w-4 h-4" />}
                          />
                          <FloatingLabelInput
                            id="fluid-density"
                            label="Fluid Density"
                            value={fluidDensity}
                            onChange={handleInputChange(setFluidDensity)}
                            error={errors.fluidDensity}
                            unit="kg/m³"
                            icon={<BeakerIcon className="w-4 h-4" />}
                          />
                          <FloatingLabelInput
                            id="fluid-viscosity"
                            label="Dynamic Viscosity"
                            value={fluidViscosity}
                            onChange={handleInputChange(setFluidViscosity)}
                            error={errors.fluidViscosity}
                            unit="Pa·s"
                            step="0.0001"
                            icon={<DropletIcon className="w-4 h-4" />}
                          />
                          <FloatingLabelInput
                            id="open-hole-diameter"
                            label="Open Hole/Casing ID"
                            value={openHoleDiameter}
                            onChange={handleInputChange(setOpenHoleDiameter)}
                            error={errors.openHoleDiameter}
                            unit="mm"
                            icon={<LayersIcon className="w-4 h-4" />}
                            helpText="Inner diameter of the final section below tubing"
                           />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={performCalculations}
                      disabled={isCalculationDisabled || isCalculating}
                      className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-3 ${
                        isCalculationDisabled || isCalculating
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transform hover:scale-[1.02]'
                      }`}
                    >
                      {isCalculating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Calculating...
                        </>
                      ) : (
                        <>
                          <CalculatorIcon className="w-5 h-5" />
                          Run Analysis
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Configuration Tab */}
                {activeTab === 'configuration' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <LayersIcon className="w-5 h-5 text-blue-600" />
                        Tubing String Configuration
                      </h3>
                      <button
                        onClick={addSegment}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center gap-2 hover:shadow-lg"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Add Segment
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {segments.map((segment, index) => {
                        const depthFrom = segments.slice(0, index).reduce((sum, s) => sum + (s.length || 0), 0);
                        const depthTo = depthFrom + (segment.length || 0);
                        const segmentResult = results?.segments.find(s => s.segmentNumber === index + 1);
                        
                        return (
                          <SegmentCard
                            key={segment.id}
                            segment={segment}
                            index={index}
                            total={segments.length}
                            depthFrom={depthFrom}
                            depthTo={depthTo}
                            onUpdate={(field, value) => updateSegment(segment.id, field, value)}
                            onRemove={() => removeSegment(segment.id)}
                            onMoveUp={() => moveSegment(segment.id, 'up')}
                            onMoveDown={() => moveSegment(segment.id, 'down')}
                            errors={errors}
                            result={segmentResult}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Results Tab */}
                {activeTab === 'results' && results && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Key Metrics */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUpIcon className="w-5 h-5 text-blue-600" />
                        Performance Metrics
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <StatusCard
                          icon={<DropletIcon className="w-5 h-5" />}
                          title="Flow Rate"
                          value={results.actualFlowRate.toFixed(1)}
                          unit="m³/day"
                          status={results.actualFlowRate <= results.maxFlowRate ? 'good' : 'error'}
                        />
                        <StatusCard
                          icon={<ZapIcon className="w-5 h-5" />}
                          title="Max Velocity"
                          value={results.maxSegmentVelocity.toFixed(2)}
                          unit="m/s"
                          status={results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'error' : results.maxSegmentVelocity > VELOCITY_WARNING_LIMIT ? 'warning' : 'good'}
                        />
                        <StatusCard
                          icon={<GaugeIcon className="w-5 h-5" />}
                          title="Bottom Pressure"
                          value={results.bottomPressure.toFixed(0)}
                          unit="kPa"
                          status={results.bottomPressure >= parseFloat(bottomholePressure) ? 'good' : 'warning'}
                        />
                      </div>
                    </div>

                    {/* Progress Indicators */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-4">System Capacity</h3>
                      <div className="space-y-4">
                        <ProgressIndicator
                          value={results.actualFlowRate}
                          max={isFinite(results.maxFlowRate) ? results.maxFlowRate : results.actualFlowRate * 2}
                          label="Flow Capacity Utilization"
                          color={results.maxFlowRate !== Infinity && results.actualFlowRate > results.maxFlowRate * 0.9 ? 'red' : 'blue'}
                        />
                        <ProgressIndicator
                          value={results.maxSegmentVelocity}
                          max={VELOCITY_ERROR_LIMIT}
                          label="Erosional Velocity Limit"
                          color={results.maxSegmentVelocity > VELOCITY_ERROR_LIMIT ? 'red' : results.maxSegmentVelocity > VELOCITY_WARNING_LIMIT ? 'yellow' : 'green'}
                        />
                        <ProgressIndicator
                          value={results.bottomPressure - parseFloat(reservoirPressure)}
                          max={parseFloat(bottomholePressure) - parseFloat(reservoirPressure)}
                          label="Pressure Overbalance"
                          color="blue"
                        />
                      </div>
                    </div>
                    
                    {/* Flow Rate Suggestion */}
                    {results.actualFlowRate > results.maxFlowRate && isFinite(results.maxFlowRate) && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 animate-slideIn">
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-white rounded-lg text-amber-600 mt-1">
                            <LightbulbIcon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-amber-900">Flow Rate Suggestion</h3>
                            <p className="text-sm text-amber-800 mt-1">
                              The requested flow rate of <span className="font-bold">{results.actualFlowRate.toFixed(1)} m³/day</span> is too high for the current system pressure and tubing configuration.
                            </p>
                            <p className="text-sm text-amber-800 mt-2">
                              Based on the available pressure, the maximum sustainable flow rate is approximately <span className="font-bold">{results.maxFlowRate.toFixed(1)} m³/day</span>.
                            </p>
                            <button
                              onClick={() => {
                                setFlowRate(results.maxFlowRate.toFixed(1));
                                setResults(null);
                                setActiveTab('parameters');
                              }}
                              className="mt-4 px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors shadow-sm hover:shadow-md"
                            >
                              Apply Suggested Flow Rate
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Detailed Analysis Table */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700">Segment-by-Segment Analysis</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-gray-50 text-xs text-gray-600 uppercase">
                            <tr>
                              <th className="px-4 py-3 text-left">Seg</th>
                              <th className="px-4 py-3 text-left">Depth</th>
                              <th className="px-4 py-3 text-right">Velocity</th>
                              <th className="px-4 py-3 text-right">Reynolds</th>
                              <th className="px-4 py-3 text-left">Regime</th>
                              <th className="px-4 py-3 text-right">P In</th>
                              <th className="px-4 py-3 text-right">P Out</th>
                              <th className="px-4 py-3 text-right">ΔP Net</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {results.segments.map((seg) => (
                              <tr key={seg.segmentNumber} className="hover:bg-blue-50/30 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="font-medium text-gray-800">#{seg.segmentNumber}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {seg.depthFrom.toFixed(0)}-{seg.depthTo.toFixed(0)}m
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`font-medium ${
                                    seg.velocity > VELOCITY_ERROR_LIMIT ? 'text-red-600' : 
                                    seg.velocity > VELOCITY_WARNING_LIMIT ? 'text-amber-600' : 
                                    'text-gray-800'
                                  }`}>
                                    {seg.velocity.toFixed(2)} m/s
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-gray-600">
                                  {seg.reynoldsNumber.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                    seg.flowRegime === 'Laminar' ? 'bg-blue-100 text-blue-700' :
                                    seg.flowRegime === 'Transitional' ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {seg.flowRegime}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-gray-600">
                                  {seg.inletPressure.toFixed(0)} kPa
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-gray-800">
                                  {seg.outletPressure.toFixed(0)} kPa
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`font-medium ${
                                    seg.netPressureChange >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {seg.netPressureChange >= 0 ? '+' : ''}{seg.netPressureChange.toFixed(1)} kPa
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default DisposalWellCalculator;