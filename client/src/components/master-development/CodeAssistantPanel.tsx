import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMutation } from '@tanstack/react-query';
import { LoaderCircle, Code, Copy, FileCode, Brain, Cpu, Braces, Sparkles, PlusCircle, Plus, TerminalSquare, 
  SquarePen, User, Book, Server, Workflow, Layers, GitBranch, Lightbulb, Archive, Download, Upload, 
  ChevronsRight, ChevronsLeft, Search, Layout, Map, Calculator, Check, FileText, BarChart, ListFilter,
  Github, Database } from 'lucide-react';

// Development template types
interface DevelopmentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  language: string;
  complexity: 'simple' | 'medium' | 'complex';
  tags: string[];
  templateCode: string;
}

// Code snippet types
interface CodeSnippet {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  category: string;
  tags: string[];
  usageCount: number;
  lastUsed: string;
}

// Property-specific data model types
interface PropertyModel {
  id: string;
  name: string;
  description: string;
  fields: {
    name: string;
    type: string;
    description: string;
    example: string;
  }[];
  relationships: {
    relatedModel: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    description: string;
  }[];
}

// CAMA model types
interface CAMAModel {
  id: string;
  name: string;
  description: string;
  type: 'market' | 'cost' | 'income' | 'hybrid';
  complexity: 'basic' | 'intermediate' | 'advanced';
  applicablePropertyTypes: string[];
  parameters: {
    name: string;
    type: string;
    description: string;
    defaultValue: string;
  }[];
  algorithm: string;
}

// Regulation rule types
interface RegulationRule {
  id: string;
  name: string;
  description: string;
  jurisdiction: string;
  category: string;
  severity: 'info' | 'warning' | 'error';
  codePattern: string;
  message: string;
  suggestion: string;
  reference: string;
}

// GIS template types
interface GISTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  mapType: 'parcel' | 'zoning' | 'district' | 'neighborhood' | 'analytic';
  previewImage: string;
  templateCode: string;
  dataRequirements: string[];
}

const CodeAssistantPanel: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('assistant');
  const [activeDeveloperTab, setActiveDeveloperTab] = useState('ai-pair');
  const [activeDeveloperTool, setActiveDeveloperTool] = useState('pair-programming');
  const [inputValue, setInputValue] = useState('');
  const [outputCode, setOutputCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<PropertyModel | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DevelopmentTemplate | null>(null);
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [selectedCAMAModel, setSelectedCAMAModel] = useState<CAMAModel | null>(null);
  const [selectedRegulation, setSelectedRegulation] = useState<RegulationRule | null>(null);
  const [selectedGISTemplate, setSelectedGISTemplate] = useState<GISTemplate | null>(null);
  const [codeContext, setCodeContext] = useState('');
  const [generatedComponents, setGeneratedComponents] = useState<string[]>([]);
  const [projectContext, setProjectContext] = useState('');
  const [modelPlaygroundData, setModelPlaygroundData] = useState<string>('');
  const [modelResults, setModelResults] = useState<any>(null);
  const [codeToCheck, setCodeToCheck] = useState<string>('');
  const [regulationResults, setRegulationResults] = useState<any>(null);
  const [dataModelDiagram, setDataModelDiagram] = useState<string>('');
  const [gisVisualizationData, setGISVisualizationData] = useState<string>('');
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [applicationParts, setApplicationParts] = useState<string[]>([]);
  const [assistantHistory, setAssistantHistory] = useState<{role: 'user'|'assistant', content: string}[]>([]);
  
  // Sample development context - in a real implementation, this would come from your application state
  const context = {
    domain: 'property-assessment',
    organization: 'Benton County Assessor\'s Office',
    currentProject: 'Property Assessment System',
    availableModels: ['Property', 'Improvement', 'Owner', 'Assessment', 'Land'],
    activeDataSources: ['PACS', 'GIS', 'CountyRecords', 'TaxRolls'],
    workflows: ['PropertyLookup', 'ValueCalculation', 'NoticeGeneration', 'AppealProcessing'],
    userTypes: ['Assessor', 'Administrator', 'PublicUser', 'CountyOfficial']
  };

  // Sample property models - in production, these would be fetched from your API
  const propertyModels: PropertyModel[] = [
    {
      id: 'property-model',
      name: 'Property',
      description: 'Core property record with ownership and valuation data',
      fields: [
        { name: 'propertyId', type: 'string', description: 'Unique identifier', example: 'BC12345' },
        { name: 'address', type: 'string', description: 'Physical location', example: '123 Main St, Corvallis' },
        { name: 'marketValue', type: 'number', description: 'Current market value', example: '350000' },
        { name: 'acres', type: 'number', description: 'Total land area in acres', example: '1.25' },
        { name: 'taxCode', type: 'string', description: 'Tax jurisdiction code', example: 'BC-R2' }
      ],
      relationships: [
        { relatedModel: 'Owner', type: 'one-to-many', description: 'Property owners (current and historical)' },
        { relatedModel: 'Improvement', type: 'one-to-many', description: 'Buildings and structures on property' },
        { relatedModel: 'Assessment', type: 'one-to-many', description: 'Annual assessment records' }
      ]
    },
    {
      id: 'improvement-model',
      name: 'Improvement',
      description: 'Buildings, structures and other property improvements',
      fields: [
        { name: 'improvementId', type: 'string', description: 'Unique identifier', example: 'IMP-5432' },
        { name: 'propertyId', type: 'string', description: 'Associated property', example: 'BC12345' },
        { name: 'type', type: 'string', description: 'Type of improvement', example: 'Single Family Residence' },
        { name: 'squareFeet', type: 'number', description: 'Building size', example: '2400' },
        { name: 'yearBuilt', type: 'number', description: 'Year of construction', example: '1998' }
      ],
      relationships: [
        { relatedModel: 'Property', type: 'one-to-one', description: 'Parent property' }
      ]
    }
  ];

  // Sample templates - in production, these would be fetched from your API
  const developmentTemplates: DevelopmentTemplate[] = [
    {
      id: 'property-lookup',
      name: 'Property Lookup Component',
      category: 'UI Component',
      description: 'Search interface for property records with address autocomplete',
      language: 'typescript',
      complexity: 'medium',
      tags: ['search', 'property', 'react', 'ui'],
      templateCode: `import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';

export const PropertyLookup: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  // Query to fetch property suggestions
  const { data, isLoading } = useQuery({
    queryKey: ['/api/properties/suggestions', searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 3) return [];
      const response = await fetch(\`/api/properties/suggestions?q=\${encodeURIComponent(searchTerm)}\`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      return response.json();
    },
    enabled: searchTerm.length >= 3
  });
  
  useEffect(() => {
    if (data) setSuggestions(data);
  }, [data]);

  const handleSearch = () => {
    // Implement search functionality
    console.log('Searching for:', searchTerm);
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Input
          placeholder="Enter address or property ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>
      
      {isLoading && <p className="text-sm text-gray-500">Loading suggestions...</p>}
      
      {suggestions.length > 0 && (
        <Card>
          <CardContent className="p-2">
            <ul className="space-y-1">
              {suggestions.map((item) => (
                <li
                  key={item.id}
                  className="p-2 hover:bg-gray-100 rounded cursor-pointer"
                  onClick={() => setSearchTerm(item.address)}
                >
                  {item.address}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};`
    },
    {
      id: 'assessment-calculation',
      name: 'Assessment Value Calculator',
      category: 'Business Logic',
      description: 'Utility for calculating property assessment values based on improvements and land',
      language: 'typescript',
      complexity: 'complex',
      tags: ['calculation', 'assessment', 'utility'],
      templateCode: `/**
 * Assessment Value Calculator
 * 
 * Benton County specialized utility for calculating property assessment values
 * based on land characteristics and improvements.
 */
export class AssessmentCalculator {
  // Constants for calculation adjustments
  private readonly LAND_VALUE_MULTIPLIER = 0.95;
  private readonly IMPROVEMENT_DEPRECIATION_RATE = 0.02;
  private readonly MAX_IMPROVEMENT_DEPRECIATION = 0.70;
  
  /**
   * Calculate the total assessed value of a property
   */
  public calculateAssessedValue(property: {
    landMarketValue: number;
    improvements: Array<{
      value: number;
      yearBuilt: number;
      squareFeet: number;
      type: string;
    }>;
    zoneType: string;
    specialAssessments: Record<string, number>;
  }): {
    totalValue: number;
    landValue: number;
    improvementsValue: number;
    specialAssessmentsValue: number;
  } {
    // Calculate land value
    const landValue = this.calculateLandValue(
      property.landMarketValue,
      property.zoneType
    );
    
    // Calculate improvements value
    const improvementsValue = this.calculateImprovementsValue(
      property.improvements
    );
    
    // Calculate special assessments
    const specialAssessmentsValue = Object.values(
      property.specialAssessments
    ).reduce((sum, value) => sum + value, 0);
    
    // Calculate total value
    const totalValue = landValue + improvementsValue + specialAssessmentsValue;
    
    return {
      totalValue,
      landValue,
      improvementsValue,
      specialAssessmentsValue
    };
  }
  
  /**
   * Calculate land value based on market value and zoning
   */
  private calculateLandValue(marketValue: number, zoneType: string): number {
    let adjustmentFactor = 1.0;
    
    // Apply zone-specific adjustments
    switch (zoneType) {
      case 'residential':
        adjustmentFactor = 1.0;
        break;
      case 'commercial':
        adjustmentFactor = 1.1;
        break;
      case 'agricultural':
        adjustmentFactor = 0.8;
        break;
      case 'industrial':
        adjustmentFactor = 1.15;
        break;
      default:
        adjustmentFactor = 1.0;
    }
    
    return marketValue * this.LAND_VALUE_MULTIPLIER * adjustmentFactor;
  }
  
  /**
   * Calculate improvements value with depreciation
   */
  private calculateImprovementsValue(improvements: Array<{
    value: number;
    yearBuilt: number;
    squareFeet: number;
    type: string;
  }>): number {
    const currentYear = new Date().getFullYear();
    
    return improvements.reduce((total, improvement) => {
      // Calculate age and depreciation
      const age = currentYear - improvement.yearBuilt;
      const depreciation = Math.min(
        age * this.IMPROVEMENT_DEPRECIATION_RATE,
        this.MAX_IMPROVEMENT_DEPRECIATION
      );
      
      // Apply type-specific adjustments
      let typeMultiplier = 1.0;
      switch (improvement.type.toLowerCase()) {
        case 'single family residence':
          typeMultiplier = 1.0;
          break;
        case 'commercial building':
          typeMultiplier = 1.15;
          break;
        case 'manufactured home':
          typeMultiplier = 0.85;
          break;
        case 'agricultural building':
          typeMultiplier = 0.75;
          break;
        default:
          typeMultiplier = 1.0;
      }
      
      // Calculate depreciated value
      const depreciatedValue = improvement.value * (1 - depreciation) * typeMultiplier;
      
      return total + depreciatedValue;
    }, 0);
  }
}`
    }
  ];

  // Sample CAMA models - in production, these would be fetched from your API
  const camaModels: CAMAModel[] = [
    {
      id: 'market-comparable-model',
      name: 'Market Comparable Analysis Model',
      description: 'CAMA model for property valuation based on comparable sales analysis',
      type: 'market',
      complexity: 'advanced',
      applicablePropertyTypes: ['residential', 'commercial', 'vacant land'],
      parameters: [
        { name: 'radiusMiles', type: 'number', description: 'Search radius for comparable properties', defaultValue: '1.0' },
        { name: 'maxAgeDays', type: 'number', description: 'Maximum age of sales to consider', defaultValue: '365' },
        { name: 'adjustmentFactors', type: 'object', description: 'Adjustment factors for property characteristics', defaultValue: '{}' },
        { name: 'minComparables', type: 'number', description: 'Minimum number of comparables required', defaultValue: '3' },
        { name: 'qualityThreshold', type: 'number', description: 'Minimum quality score for comparables', defaultValue: '0.7' }
      ],
      algorithm: `/**
 * Market Comparable Analysis Algorithm
 * Benton County implementation
 */
export class MarketComparableAnalysis {
  // Configuration parameters
  private radiusMiles: number;
  private maxAgeDays: number;
  private adjustmentFactors: Record<string, number>;
  private minComparables: number;
  private qualityThreshold: number;
  
  constructor(parameters: {
    radiusMiles: number;
    maxAgeDays: number;
    adjustmentFactors: Record<string, number>;
    minComparables: number;
    qualityThreshold: number;
  }) {
    this.radiusMiles = parameters.radiusMiles;
    this.maxAgeDays = parameters.maxAgeDays;
    this.adjustmentFactors = parameters.adjustmentFactors;
    this.minComparables = parameters.minComparables;
    this.qualityThreshold = parameters.qualityThreshold;
  }
  
  async performValuation(subject: {
    propertyId: string;
    location: { lat: number; lng: number };
    propertyType: string;
    squareFeet: number;
    yearBuilt: number;
    bedrooms: number;
    bathrooms: number;
    lotSize: number;
    features: string[];
  }): Promise<{
    estimatedValue: number;
    comparables: any[];
    adjustmentDetails: any[];
    confidenceScore: number;
    medianValue: number;
    valueRange: [number, number];
  }> {
    // Fetch comparable sales within radius and time period
    const comparables = await this.fetchComparables(
      subject.location,
      subject.propertyType
    );
    
    if (comparables.length < this.minComparables) {
      throw new Error(\`Insufficient comparables found (\${comparables.length})\`);
    }
    
    // Calculate quality scores for each comparable
    const scoredComparables = this.scoreComparables(subject, comparables);
    
    // Filter by quality threshold
    const qualifiedComparables = scoredComparables
      .filter(c => c.qualityScore >= this.qualityThreshold)
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 10); // Use top 10 comparables
    
    if (qualifiedComparables.length < this.minComparables) {
      throw new Error(\`Insufficient qualified comparables (\${qualifiedComparables.length})\`);
    }
    
    // Apply adjustments to each comparable
    const adjustedComparables = this.applyAdjustments(subject, qualifiedComparables);
    
    // Calculate final valuation
    const valuationResult = this.calculateFinalValue(adjustedComparables);
    
    return {
      estimatedValue: valuationResult.estimatedValue,
      comparables: qualifiedComparables,
      adjustmentDetails: adjustedComparables.map(c => c.adjustments),
      confidenceScore: valuationResult.confidenceScore,
      medianValue: valuationResult.medianValue,
      valueRange: valuationResult.valueRange
    };
  }
  
  // Implementation details for helper methods would go here
  private async fetchComparables(location: { lat: number; lng: number }, propertyType: string): Promise<any[]> {
    // In a real implementation, this would call an API or database
    return []; // Placeholder
  }
  
  private scoreComparables(subject: any, comparables: any[]): any[] {
    // Calculate similarity scores
    return []; // Placeholder
  }
  
  private applyAdjustments(subject: any, comparables: any[]): any[] {
    // Apply adjustment factors to account for differences
    return []; // Placeholder
  }
  
  private calculateFinalValue(adjustedComparables: any[]): any {
    // Calculate final value statistics
    return {
      estimatedValue: 0,
      confidenceScore: 0,
      medianValue: 0,
      valueRange: [0, 0]
    }; // Placeholder
  }
}`
    },
    {
      id: 'cost-approach-model',
      name: 'Cost Approach Valuation Model',
      description: 'CAMA model for property valuation using the cost approach method',
      type: 'cost',
      complexity: 'intermediate',
      applicablePropertyTypes: ['residential', 'commercial', 'industrial'],
      parameters: [
        { name: 'costManual', type: 'string', description: 'Cost manual to use for base costs', defaultValue: 'marshall-swift' },
        { name: 'costMultiplier', type: 'number', description: 'Regional cost multiplier', defaultValue: '1.05' },
        { name: 'depreciationMethod', type: 'string', description: 'Method for calculating depreciation', defaultValue: 'age-life' },
        { name: 'economicObsolescence', type: 'number', description: 'Economic obsolescence factor', defaultValue: '0.0' }
      ],
      algorithm: `/**
 * Cost Approach Valuation Model
 * Benton County implementation
 */
export class CostApproachValuation {
  // Configuration parameters
  private costManual: string;
  private costMultiplier: number;
  private depreciationMethod: string;
  private economicObsolescence: number;
  
  constructor(parameters: {
    costManual: string;
    costMultiplier: number;
    depreciationMethod: string;
    economicObsolescence: number;
  }) {
    this.costManual = parameters.costManual;
    this.costMultiplier = parameters.costMultiplier;
    this.depreciationMethod = parameters.depreciationMethod;
    this.economicObsolescence = parameters.economicObsolescence;
  }
  
  performValuation(property: {
    landValue: number;
    improvementDetails: {
      type: string;
      quality: string;
      yearBuilt: number;
      squareFeet: number;
      stories: number;
      features: Record<string, boolean>;
    }[];
  }): {
    totalValue: number;
    landValue: number;
    improvementValue: number;
    replacementCost: number;
    depreciation: number;
    calculationDetails: any;
  } {
    // Calculate land value (typically from a separate model)
    const landValue = property.landValue;
    
    // Calculate replacement cost new for all improvements
    let totalReplacementCost = 0;
    const improvementDetails = [];
    
    for (const improvement of property.improvementDetails) {
      const baseCost = this.getBaseCostPerSqFt(
        improvement.type, 
        improvement.quality
      );
      
      // Apply adjustments for features
      const featureAdjustments = this.calculateFeatureAdjustments(improvement.features);
      
      // Apply regional multiplier
      const adjustedBaseCost = baseCost * this.costMultiplier;
      
      // Calculate total replacement cost
      const replacementCost = adjustedBaseCost * improvement.squareFeet;
      
      // Calculate depreciation
      const age = new Date().getFullYear() - improvement.yearBuilt;
      const depreciation = this.calculateDepreciation(
        age,
        improvement.type,
        replacementCost
      );
      
      // Calculate depreciated value
      const depreciatedValue = replacementCost - depreciation;
      
      totalReplacementCost += replacementCost;
      
      improvementDetails.push({
        type: improvement.type,
        squareFeet: improvement.squareFeet,
        baseCost,
        adjustedBaseCost,
        replacementCost,
        age,
        depreciation,
        depreciatedValue
      });
    }
    
    // Apply economic obsolescence if applicable
    const economicObsolescenceAdjustment = 
      totalReplacementCost * this.economicObsolescence;
    
    // Calculate total depreciation
    const totalDepreciation = improvementDetails.reduce(
      (sum, imp) => sum + imp.depreciation, 
      0
    ) + economicObsolescenceAdjustment;
    
    // Calculate total improvement value
    const improvementValue = totalReplacementCost - totalDepreciation;
    
    // Calculate total property value
    const totalValue = landValue + improvementValue;
    
    return {
      totalValue,
      landValue,
      improvementValue,
      replacementCost: totalReplacementCost,
      depreciation: totalDepreciation,
      calculationDetails: {
        improvements: improvementDetails,
        economicObsolescence: economicObsolescenceAdjustment
      }
    };
  }
  
  // Implementation details for helper methods would go here
  private getBaseCostPerSqFt(type: string, quality: string): number {
    // In a real implementation, this would look up values in a cost manual
    return 100; // Placeholder
  }
  
  private calculateFeatureAdjustments(features: Record<string, boolean>): number {
    // Calculate adjustments for special features
    return 0; // Placeholder
  }
  
  private calculateDepreciation(age: number, type: string, replacementCost: number): number {
    // Calculate depreciation based on the selected method
    return 0; // Placeholder
  }
}`
    }
  ];
  
  // Sample regulation rules - in production, these would be fetched from your API
  const regulationRules: RegulationRule[] = [
    {
      id: 'wa-assessment-ratio',
      name: 'Washington Assessment Ratio Requirement',
      description: 'Ensures property assessments comply with Washington state ratio requirements',
      jurisdiction: 'Washington',
      category: 'Assessment Calculation',
      severity: 'error',
      codePattern: '(?:assessed|assessment)\\s*(?:value|ratio)\\s*=\\s*([^\\n]*)',
      message: 'Washington state requires assessments at 100% of market value',
      suggestion: 'Ensure assessment calculations do not include non-standard ratio adjustments',
      reference: "RCW 84.40.030 - Basis of valuation, assessment, appraisal"
    },
    {
      id: 'benton-exemption-code',
      name: 'Benton County Exemption Code Validation',
      description: 'Validates exemption codes used in assessment calculations',
      jurisdiction: 'Benton County',
      category: 'Exemptions',
      severity: 'warning',
      codePattern: 'exemptionCode\\s*=\\s*[\'"]([^\'"]*)[\'"]',
      message: 'Unrecognized exemption code or format for Benton County',
      suggestion: 'Use standard Benton County exemption codes with format BC-EX-###',
      reference: "Benton County Assessor Office Exemption Code List 2025"
    },
    {
      id: 'wa-appeals-notification',
      name: 'Appeals Notification Requirement',
      description: 'Checks that assessment notices include required appeals information',
      jurisdiction: 'Washington',
      category: 'Notifications',
      severity: 'error',
      codePattern: 'generate(?:Notice|Assessment)\\s*\\([^\\)]*\\)',
      message: 'Assessment notices must include appeals rights and deadline information',
      suggestion: 'Include appeals information in all assessment notice templates',
      reference: "RCW 84.40.045 - Notice of change in valuation of real property"
    }
  ];
  
  // Sample GIS templates - in production, these would be fetched from your API
  const gisTemplates: GISTemplate[] = [
    {
      id: 'parcel-viewer',
      name: 'Benton County Parcel Viewer',
      description: 'Interactive parcel map with property data display',
      category: 'Property View',
      mapType: 'parcel',
      previewImage: 'parcel-viewer-preview.png',
      templateCode: `import React, { useEffect, useRef, useState } from 'react';
import { Map, NavigationControl, Source, Layer } from 'react-map-gl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ParcelViewer = () => {
  const mapRef = useRef(null);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [parcelData, setParcelData] = useState([]);
  const [viewport, setViewport] = useState({
    longitude: -119.2,
    latitude: 46.2,
    zoom: 10
  });

  // Fetch parcel data
  useEffect(() => {
    const fetchParcelData = async () => {
      try {
        const response = await fetch('/api/gis/parcels');
        if (response.ok) {
          const data = await response.json();
          setParcelData(data);
        }
      } catch (error) {
        console.error('Error fetching parcel data:', error);
      }
    };
    
    fetchParcelData();
  }, []);

  // Handle parcel selection
  const handleParcelClick = (event) => {
    const feature = event.features[0];
    if (feature) {
      setSelectedParcel(feature.properties);
    }
  };

  return (
    <div className="h-[600px] w-full flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-3/4 h-full relative">
        <Map
          ref={mapRef}
          mapboxApiAccessToken={process.env.MAPBOX_TOKEN}
          {...viewport}
          width="100%"
          height="100%"
          onViewportChange={setViewport}
          interactiveLayerIds={['parcels-fill']}
          onClick={handleParcelClick}
        >
          <NavigationControl position="top-right" />
          
          {/* Parcels Layer */}
          <Source id="parcels" type="geojson" data={{ type: 'FeatureCollection', features: parcelData }}>
            <Layer
              id="parcels-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'match',
                  ['get', 'zoning'],
                  'residential', '#A8E6CE',
                  'commercial', '#DCEDC2',
                  'industrial', '#FFD3B5',
                  'agricultural', '#FFAAA6',
                  '#CCCCCC'
                ],
                'fill-opacity': 0.6
              }}
            />
            <Layer
              id="parcels-outline"
              type="line"
              paint={{
                'line-color': '#000000',
                'line-width': 1
              }}
            />
          </Source>
        </Map>
      </div>
      
      <div className="w-full md:w-1/4 h-full overflow-auto">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Parcel Information</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedParcel ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Property ID</h3>
                  <p>{selectedParcel.property_id}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Owner</h3>
                  <p>{selectedParcel.owner_name}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Address</h3>
                  <p>{selectedParcel.site_address}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Zoning</h3>
                  <p>{selectedParcel.zoning}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Assessed Value</h3>
                  <p>${selectedParcel.assessed_value.toLocaleString()}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Land Area</h3>
                  <p>{selectedParcel.acres.toFixed(2)} acres</p>
                </div>
                <div>
                  <h3 className="font-semibold">Tax Status</h3>
                  <p>{selectedParcel.tax_status}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Select a parcel to view details</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};`,
      dataRequirements: ['parcel-boundaries', 'ownership-data', 'assessment-values', 'zoning-data']
    },
    {
      id: 'sales-ratio-map',
      name: 'Sales Ratio Analysis Map',
      description: 'Visualization of assessed value to sale price ratios by neighborhood',
      category: 'Analysis',
      mapType: 'neighborhood',
      previewImage: 'sales-ratio-preview.png',
      templateCode: `import React, { useEffect, useState, useRef } from 'react';
import { Map, NavigationControl, Source, Layer } from 'react-map-gl';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Legend, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const SalesRatioMap = () => {
  const mapRef = useRef(null);
  const [neighborhoodData, setNeighborhoodData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  const [viewport, setViewport] = useState({
    longitude: -119.2,
    latitude: 46.2,
    zoom: 10
  });

  // Fetch neighborhood and sales data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch neighborhood boundaries
        const neighborhoodResponse = await fetch('/api/gis/neighborhoods');
        if (neighborhoodResponse.ok) {
          const neighborhoods = await neighborhoodResponse.json();
          setNeighborhoodData(neighborhoods);
        }
        
        // Fetch sales ratio data for selected year
        const salesResponse = await fetch(\`/api/sales-ratios?year=\${selectedYear}\`);
        if (salesResponse.ok) {
          const sales = await salesResponse.json();
          setSalesData(sales);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, [selectedYear]);

  // Calculate stats for each neighborhood
  const calculateNeighborhoodStats = () => {
    if (!neighborhoodData.length || !salesData.length) return [];
    
    const stats = neighborhoodData.map(neighborhood => {
      // Find sales in this neighborhood
      const neighborhoodSales = salesData.filter(
        sale => sale.neighborhood_id === neighborhood.properties.id
      );
      
      // Calculate median ratio
      let medianRatio = 0;
      if (neighborhoodSales.length) {
        const ratios = neighborhoodSales.map(sale => sale.assessment_ratio);
        ratios.sort((a, b) => a - b);
        const mid = Math.floor(ratios.length / 2);
        medianRatio = ratios.length % 2 === 0
          ? (ratios[mid - 1] + ratios[mid]) / 2
          : ratios[mid];
      }
      
      return {
        ...neighborhood,
        properties: {
          ...neighborhood.properties,
          sales_count: neighborhoodSales.length,
          median_ratio: medianRatio
        }
      };
    });
    
    return stats;
  };
  
  const enrichedNeighborhoods = calculateNeighborhoodStats();

  // Handle neighborhood selection
  const handleNeighborhoodClick = (event) => {
    const feature = event.features[0];
    if (feature) {
      setSelectedNeighborhood(feature.properties);
    }
  };

  // Calculate histogram data for selected neighborhood
  const getHistogramData = () => {
    if (!selectedNeighborhood) return [];
    
    const neighborhoodSales = salesData.filter(
      sale => sale.neighborhood_id === selectedNeighborhood.id
    );
    
    // Group by ratio ranges
    const histogramData = [
      { range: '<0.85', count: 0 },
      { range: '0.85-0.90', count: 0 },
      { range: '0.90-0.95', count: 0 },
      { range: '0.95-1.00', count: 0 },
      { range: '1.00-1.05', count: 0 },
      { range: '1.05-1.10', count: 0 },
      { range: '1.10-1.15', count: 0 },
      { range: '>1.15', count: 0 }
    ];
    
    neighborhoodSales.forEach(sale => {
      const ratio = sale.assessment_ratio;
      
      if (ratio < 0.85) histogramData[0].count++;
      else if (ratio < 0.90) histogramData[1].count++;
      else if (ratio < 0.95) histogramData[2].count++;
      else if (ratio < 1.00) histogramData[3].count++;
      else if (ratio < 1.05) histogramData[4].count++;
      else if (ratio < 1.10) histogramData[5].count++;
      else if (ratio < 1.15) histogramData[6].count++;
      else histogramData[7].count++;
    });
    
    return histogramData;
  };

  return (
    <div className="h-[600px] w-full flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-3/5 h-full relative">
        <div className="absolute top-2 left-2 z-10 bg-white p-2 rounded shadow-md">
          <Select value={selectedYear.toString()} onValueChange={value => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2024, 2023, 2022, 2021].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Map
          ref={mapRef}
          mapboxApiAccessToken={process.env.MAPBOX_TOKEN}
          {...viewport}
          width="100%"
          height="100%"
          onViewportChange={setViewport}
          interactiveLayerIds={['neighborhoods-fill']}
          onClick={handleNeighborhoodClick}
        >
          <NavigationControl position="top-right" />
          
          {/* Neighborhoods Layer with sales ratio coloring */}
          <Source id="neighborhoods" type="geojson" data={{ type: 'FeatureCollection', features: enrichedNeighborhoods }}>
            <Layer
              id="neighborhoods-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'median_ratio'],
                  0.85, '#d73027',
                  0.90, '#fc8d59',
                  0.95, '#fee090',
                  1.00, '#ffffbf',
                  1.05, '#e0f3f8',
                  1.10, '#91bfdb',
                  1.15, '#4575b4'
                ],
                'fill-opacity': 0.7
              }}
            />
            <Layer
              id="neighborhoods-outline"
              type="line"
              paint={{
                'line-color': '#000000',
                'line-width': 1
              }}
            />
            <Layer
              id="neighborhoods-label"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Regular'],
                'text-size': 12
              }}
              paint={{
                'text-color': '#000000',
                'text-halo-color': '#FFFFFF',
                'text-halo-width': 1
              }}
            />
          </Source>
        </Map>
        
        <div className="absolute bottom-2 left-2 bg-white p-2 rounded shadow-md">
          <div className="text-xs">Assessment to Sale Price Ratio</div>
          <div className="flex items-center mt-1">
            <div className="w-full h-4 bg-gradient-to-r from-[#d73027] via-[#ffffbf] to-[#4575b4]"></div>
          </div>
          <div className="flex justify-between text-xs">
            <span>0.85</span>
            <span>1.00</span>
            <span>1.15</span>
          </div>
        </div>
      </div>
      
      <div className="w-full md:w-2/5 h-full overflow-auto">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Sales Ratio Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNeighborhood ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedNeighborhood.name}</h3>
                  <p className="text-sm text-gray-500">Neighborhood ID: {selectedNeighborhood.id}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 p-3 rounded">
                    <div className="text-sm text-gray-500">Sales Count</div>
                    <div className="text-xl font-bold">{selectedNeighborhood.sales_count}</div>
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <div className="text-sm text-gray-500">Median Ratio</div>
                    <div className="text-xl font-bold">{selectedNeighborhood.median_ratio.toFixed(2)}</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Ratio Distribution</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={getHistogramData()}>
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <Button variant="outline" className="mt-2">Export Neighborhood Report</Button>
              </div>
            ) : (
              <div className="text-center p-4">
                <p className="text-gray-500">Select a neighborhood on the map to view sales ratio analysis</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};`,
      dataRequirements: ['neighborhood-boundaries', 'sales-records', 'assessment-data', 'property-classifications']
    }
  ];

  // Sample code snippets - in production, these would be fetched from your API
  const codeSnippets: CodeSnippet[] = [
    {
      id: 'pacs-api-connection',
      title: 'PACS API Connection Utility',
      description: 'Connect to the Property Assessment and Collection System API',
      language: 'typescript',
      code: `/**
 * PACS API Connection Utility
 * 
 * Establishes a secure connection to the PACS system and handles 
 * authentication and data retrieval.
 */
import axios from 'axios';

export class PACSConnection {
  private baseUrl: string;
  private apiKey: string;
  private authToken: string | null = null;
  
  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }
  
  /**
   * Authenticate with the PACS API
   */
  public async authenticate(): Promise<boolean> {
    try {
      const response = await axios.post(
        \`\${this.baseUrl}/auth\`, 
        { apiKey: this.apiKey }
      );
      
      if (response.status === 200 && response.data.token) {
        this.authToken = response.data.token;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PACS authentication failed:', error);
      return false;
    }
  }
  
  /**
   * Fetch property data from PACS
   */
  public async getProperty(propertyId: string): Promise<any> {
    if (!this.authToken) {
      await this.authenticate();
    }
    
    try {
      const response = await axios.get(
        \`\${this.baseUrl}/properties/\${propertyId}\`,
        {
          headers: {
            'Authorization': \`Bearer \${this.authToken}\`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(\`Failed to fetch property \${propertyId}:\`, error);
      throw new Error('Property data retrieval failed');
    }
  }
  
  /**
   * Fetch assessment history for a property
   */
  public async getAssessmentHistory(propertyId: string): Promise<any[]> {
    if (!this.authToken) {
      await this.authenticate();
    }
    
    try {
      const response = await axios.get(
        \`\${this.baseUrl}/properties/\${propertyId}/assessments\`,
        {
          headers: {
            'Authorization': \`Bearer \${this.authToken}\`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error(\`Failed to fetch assessment history for \${propertyId}:\`, error);
      throw new Error('Assessment history retrieval failed');
    }
  }
}`,
      category: 'API Integration',
      tags: ['api', 'pacs', 'connection', 'authentication'],
      usageCount: 27,
      lastUsed: '2025-04-12T14:23:00Z'
    },
    {
      id: 'property-data-validation',
      title: 'Property Data Validation Schema',
      description: 'Zod schema for validating property data from forms and APIs',
      language: 'typescript',
      code: `/**
 * Property Data Validation Schema
 * 
 * Zod schema for validating property data coming from forms and APIs.
 * Specific to Benton County property records.
 */
import { z } from 'zod';

// Regex patterns
const PROPERTY_ID_PATTERN = /^BC[0-9]{5,6}$/;
const TAX_LOT_PATTERN = /^[0-9]{1,2}[A-Z][0-9]{1,2}[A-Z][0-9]{4,6}$/;
const ZONE_CODE_PATTERN = /^[A-Z]{1,3}-[A-Z0-9]{1,3}$/;

// Address schema
export const addressSchema = z.object({
  street: z.string().min(3).max(100),
  city: z.string().min(2).max(50),
  state: z.string().length(2),
  zip: z.string().regex(/^[0-9]{5}(-[0-9]{4})?$/),
  county: z.string().default('Benton')
});

// Owner schema
export const ownerSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.enum(['individual', 'business', 'government', 'nonprofit']),
  mailingAddress: addressSchema,
  ownershipPercentage: z.number().min(0).max(100),
  primaryContact: z.string().email().optional()
});

// Improvement schema
export const improvementSchema = z.object({
  improvementId: z.string().min(5).max(20),
  type: z.enum([
    'single family residence',
    'multi-family residence',
    'commercial building',
    'agricultural building',
    'manufactured home',
    'accessory structure',
    'other'
  ]),
  yearBuilt: z.number().min(1800).max(new Date().getFullYear()),
  squareFeet: z.number().positive(),
  value: z.number().nonnegative(),
  condition: z.enum(['excellent', 'good', 'average', 'fair', 'poor']),
  features: z.array(z.string()).optional()
});

// Main property schema
export const propertySchema = z.object({
  propertyId: z.string().regex(PROPERTY_ID_PATTERN, 'Invalid property ID format'),
  taxLot: z.string().regex(TAX_LOT_PATTERN, 'Invalid tax lot number'),
  address: addressSchema,
  acres: z.number().positive(),
  zoneCode: z.string().regex(ZONE_CODE_PATTERN, 'Invalid zone code'),
  owners: z.array(ownerSchema).min(1),
  improvements: z.array(improvementSchema).optional(),
  landMarketValue: z.number().nonnegative(),
  lastAssessmentDate: z.string().datetime(),
  inSpecialZone: z.boolean().default(false),
  specialZoneNotes: z.string().optional(),
  exemptions: z.array(z.object({
    type: z.string(),
    amount: z.number(),
    expirationDate: z.string().datetime().optional()
  })).optional()
});

// Validation function for property data
export function validatePropertyData(data: unknown) {
  return propertySchema.safeParse(data);
}

// Partial schema for updates
export const propertyUpdateSchema = propertySchema.partial();

// Export types
export type PropertyAddress = z.infer<typeof addressSchema>;
export type PropertyOwner = z.infer<typeof ownerSchema>;
export type PropertyImprovement = z.infer<typeof improvementSchema>;
export type Property = z.infer<typeof propertySchema>;`,
      category: 'Data Validation',
      tags: ['validation', 'schema', 'zod', 'property'],
      usageCount: 18,
      lastUsed: '2025-04-14T09:45:00Z'
    }
  ];

  // Mutation for generating code from AI assistant
  const generateCodeMutation = useMutation({
    mutationFn: async (prompt: string) => {
      setIsGenerating(true);
      try {
        // In a real implementation, this would call your AI service
        // Simulating AI response with a delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let generatedCode = '';
        let generatedMessage = '';
        
        // Generate different responses based on the prompt
        if (prompt.toLowerCase().includes('property search')) {
          generatedCode = `import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';

/**
 * PropertySearchComponent
 * 
 * A comprehensive property search interface for Benton County Assessor's Office.
 * This component provides address, owner, and tax lot number search capabilities
 * with auto-complete suggestions.
 */
export const PropertySearchComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'address' | 'owner' | 'taxlot'>('address');
  
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['/api/properties/search', searchType, searchTerm],
    queryFn: async () => {
      if (searchTerm.length < 3) return [];
      
      const response = await fetch(
        \`/api/properties/search?\${searchType}=\${encodeURIComponent(searchTerm)}\`
      );
      
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: searchTerm.length >= 3
  });
  
  const handleSearch = () => {
    // Implement detailed search functionality
    console.log(\`Searching for \${searchTerm} by \${searchType}\`);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Benton County Property Search</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder={searchType === 'address' ? "Enter address..." : 
                            searchType === 'owner' ? "Enter owner name..." :
                            "Enter tax lot number..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={searchType === 'address' ? "default" : "outline"}
                onClick={() => setSearchType('address')}
              >
                Address
              </Button>
              <Button 
                variant={searchType === 'owner' ? "default" : "outline"}
                onClick={() => setSearchType('owner')}
              >
                Owner
              </Button>
              <Button 
                variant={searchType === 'taxlot' ? "default" : "outline"}
                onClick={() => setSearchType('taxlot')}
              >
                Tax Lot
              </Button>
              <Button onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
          
          {isLoading && <p className="text-sm text-gray-500">Searching...</p>}
          
          {error && (
            <div className="p-2 bg-red-50 text-red-800 rounded">
              Error: Failed to complete search
            </div>
          )}
          
          {results && results.length > 0 && (
            <div className="border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assessed Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((property: any) => (
                    <tr key={property.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {property.propertyId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.address}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {property.ownerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${property.assessedValue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};`;
          generatedMessage = "I've created a comprehensive property search component specifically for Benton County. This includes:\n\n1. Multiple search types (address, owner, tax lot)\n2. Real-time query results with React Query\n3. A responsive tabular display of results\n4. Property-specific data fields\n\nThis component follows Benton County's data structure and integrates with your existing UI components.";
        } else if (prompt.toLowerCase().includes('data import')) {
          generatedCode = `import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Upload, FileUp, Database, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

/**
 * PACS Data Import Utility
 * 
 * A specialized tool for Benton County Assessor's Office to import and validate
 * property data from various sources into the system.
 */
export const PACSDataImportUtility = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('file');
  const [file, setFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    total: number;
    processed: number;
    success: number;
    warnings: number;
    errors: number;
    details: Array<{
      type: 'success' | 'warning' | 'error';
      message: string;
      propertyId?: string;
    }>;
  } | null>(null);
  
  // Data validation options
  const [validationOptions, setValidationOptions] = useState({
    validateAddresses: true,
    checkForDuplicates: true,
    verifyTaxLotFormat: true,
    validateOwnership: true,
    normalizeValues: true
  });
  
  // FTP connection details
  const [ftpDetails, setFtpDetails] = useState({
    host: '',
    username: '',
    password: '',
    directory: '/exports',
    filename: ''
  });
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  // Start file import
  const handleFileImport = async () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to import",
        variant: "destructive"
      });
      return;
    }
    
    setIsImporting(true);
    setImportProgress(0);
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(validationOptions));
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          const newProgress = prev + Math.random() * 10;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 300);
      
      // In a real implementation, this would be an actual API call
      // Simulating server processing time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Simulate import results
      setImportResults({
        total: 235,
        processed: 235,
        success: 218,
        warnings: 12,
        errors: 5,
        details: [
          { type: 'error', message: 'Invalid tax lot number format', propertyId: 'BC10045' },
          { type: 'error', message: 'Missing required owner information', propertyId: 'BC10087' },
          { type: 'warning', message: 'Address could not be verified', propertyId: 'BC10032' },
          { type: 'warning', message: 'Property value outside expected range', propertyId: 'BC10099' },
          { type: 'success', message: 'Successfully imported 218 properties' }
        ]
      });
      
      toast({
        title: "Import Completed",
        description: \`Processed 235 records with 5 errors\`,
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "There was an error importing the file",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  // Start FTP import
  const handleFtpImport = async () => {
    // Similar implementation as file import but with FTP details
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          const newProgress = prev + Math.random() * 8;
          return newProgress >= 100 ? 100 : newProgress;
        });
      }, 400);
      
      // In a real implementation, this would connect to the FTP server
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Similar result handling as file import
      setImportResults({
        total: 422,
        processed: 422,
        success: 408,
        warnings: 9,
        errors: 5,
        details: [
          { type: 'error', message: 'Invalid assessment date', propertyId: 'BC20145' },
          { type: 'error', message: 'Duplicate property record', propertyId: 'BC20187' },
          { type: 'warning', message: 'Improvement year may be incorrect', propertyId: 'BC20232' },
          { type: 'success', message: 'Successfully imported 408 properties' }
        ]
      });
      
      toast({
        title: "FTP Import Completed",
        description: \`Processed 422 records with 5 errors\`,
      });
    } catch (error) {
      toast({
        title: "FTP Import Failed",
        description: "Failed to connect to FTP server or process files",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>PACS Data Import Utility</CardTitle>
        <CardDescription>
          Import property assessment data from files or FTP server
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="file" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">File Upload</TabsTrigger>
            <TabsTrigger value="ftp">FTP Connection</TabsTrigger>
          </TabsList>
          
          <TabsContent value="file" className="space-y-4 pt-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500 mb-2">
                Drag and drop your file here or click to browse
              </p>
              <Input
                type="file"
                accept=".csv,.xlsx,.json"
                onChange={handleFileChange}
                className="mt-2"
              />
              {file && (
                <p className="mt-2 text-sm text-green-600">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="ftp" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>FTP Host</Label>
                <Input 
                  placeholder="ftp.bentoncounty.gov" 
                  value={ftpDetails.host}
                  onChange={(e) => setFtpDetails(prev => ({ ...prev, host: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input 
                  placeholder="username" 
                  value={ftpDetails.username}
                  onChange={(e) => setFtpDetails(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  value={ftpDetails.password}
                  onChange={(e) => setFtpDetails(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Directory</Label>
                <Input 
                  placeholder="/exports" 
                  value={ftpDetails.directory}
                  onChange={(e) => setFtpDetails(prev => ({ ...prev, directory: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Filename Pattern</Label>
                <Input 
                  placeholder="property_export_*.csv" 
                  value={ftpDetails.filename}
                  onChange={(e) => setFtpDetails(prev => ({ ...prev, filename: e.target.value }))}
                />
              </div>
            </div>
          </TabsContent>
          
          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-3">Validation Options</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="validateAddresses" 
                    checked={validationOptions.validateAddresses}
                    onCheckedChange={(checked) => 
                      setValidationOptions(prev => ({ 
                        ...prev, 
                        validateAddresses: checked as boolean 
                      }))
                    }
                  />
                  <Label htmlFor="validateAddresses">Validate Addresses</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="checkForDuplicates" 
                    checked={validationOptions.checkForDuplicates}
                    onCheckedChange={(checked) => 
                      setValidationOptions(prev => ({ 
                        ...prev, 
                        checkForDuplicates: checked as boolean 
                      }))
                    }
                  />
                  <Label htmlFor="checkForDuplicates">Check for Duplicates</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="verifyTaxLotFormat" 
                    checked={validationOptions.verifyTaxLotFormat}
                    onCheckedChange={(checked) => 
                      setValidationOptions(prev => ({ 
                        ...prev, 
                        verifyTaxLotFormat: checked as boolean 
                      }))
                    }
                  />
                  <Label htmlFor="verifyTaxLotFormat">Verify Tax Lot Format</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="validateOwnership" 
                    checked={validationOptions.validateOwnership}
                    onCheckedChange={(checked) => 
                      setValidationOptions(prev => ({ 
                        ...prev, 
                        validateOwnership: checked as boolean 
                      }))
                    }
                  />
                  <Label htmlFor="validateOwnership">Validate Ownership</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="normalizeValues" 
                    checked={validationOptions.normalizeValues}
                    onCheckedChange={(checked) => 
                      setValidationOptions(prev => ({ 
                        ...prev, 
                        normalizeValues: checked as boolean 
                      }))
                    }
                  />
                  <Label htmlFor="normalizeValues">Normalize Values</Label>
                </div>
              </div>
            </div>
            
            {isImporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing data...</span>
                  <span>{Math.round(importProgress)}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}
            
            {importResults && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-3 border-b">
                  <h3 className="font-medium">Import Results</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-5 gap-4 text-center mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-xl font-medium">{importResults.total}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Processed</p>
                      <p className="text-xl font-medium">{importResults.processed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Success</p>
                      <p className="text-xl font-medium text-green-600">{importResults.success}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Warnings</p>
                      <p className="text-xl font-medium text-amber-500">{importResults.warnings}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Errors</p>
                      <p className="text-xl font-medium text-red-600">{importResults.errors}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <h4 className="text-sm font-medium mb-2">Details</h4>
                    {importResults.details.map((detail, index) => (
                      <div 
                        key={index} 
                        className={\`flex items-start p-2 rounded-md \${
                          detail.type === 'error' 
                            ? 'bg-red-50 text-red-800' 
                            : detail.type === 'warning' 
                            ? 'bg-amber-50 text-amber-800' 
                            : 'bg-green-50 text-green-800'
                        }\`}
                      >
                        {detail.type === 'error' && <XCircle className="h-5 w-5 mr-2 flex-shrink-0" />}
                        {detail.type === 'warning' && <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />}
                        {detail.type === 'success' && <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />}
                        <div>
                          <p className="text-sm">{detail.message}</p>
                          {detail.propertyId && (
                            <p className="text-xs mt-1">Property ID: {detail.propertyId}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
      <CardFooter className="justify-end space-x-2">
        <Button variant="outline" disabled={isImporting}>
          Cancel
        </Button>
        <Button 
          onClick={activeTab === 'file' ? handleFileImport : handleFtpImport}
          disabled={isImporting || (activeTab === 'file' && !file) || (activeTab === 'ftp' && (!ftpDetails.host || !ftpDetails.username))}
        >
          {isImporting ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              {activeTab === 'file' ? (
                <FileUp className="h-4 w-4 mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              {activeTab === 'file' ? 'Import File' : 'Connect & Import'}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};`;
          generatedMessage = "I've created a specialized data import utility for the Benton County Assessor's Office. This component includes:\n\n1. File upload and FTP connection options for flexible data sources\n2. Benton County-specific validation options (tax lot format, ownership validation)\n3. Detailed import progress tracking and error reporting\n4. Property-specific fields and validation logic\n\nThis utility is built to handle the county's property assessment data formats and validation requirements.";
        }
        
        setOutputCode(generatedCode);
        setAssistantHistory(prev => [
          ...prev, 
          { role: 'user', content: prompt },
          { role: 'assistant', content: generatedMessage }
        ]);
        
        return { code: generatedCode, message: generatedMessage };
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Code Generated',
        description: 'Your code has been generated successfully'
      });
      
      // Add to generated components
      const componentName = getComponentNameFromCode(data.code);
      if (componentName && !generatedComponents.includes(componentName)) {
        setGeneratedComponents(prev => [...prev, componentName]);
      }
    },
    onError: (error) => {
      toast({
        title: 'Generation Failed',
        description: error.message || 'Failed to generate code',
        variant: 'destructive'
      });
    }
  });

  // Extract component name from code
  const getComponentNameFromCode = (code: string): string => {
    const exportMatch = code.match(/export const (\w+)|export class (\w+)/);
    if (exportMatch) {
      return exportMatch[1] || exportMatch[2];
    }
    return '';
  };

  // Handle form submission for AI assistant
  const handleAssistantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    generateCodeMutation.mutate(inputValue);
  };

  // Handle copying code to clipboard
  const handleCopyCode = () => {
    if (outputCode) {
      navigator.clipboard.writeText(outputCode);
      toast({
        title: 'Copied to Clipboard',
        description: 'Code has been copied to clipboard'
      });
    }
  };

  // Handle adding a template to the project
  const handleAddTemplate = (template: DevelopmentTemplate) => {
    setOutputCode(template.templateCode);
    toast({
      title: 'Template Added',
      description: `${template.name} has been loaded into the editor`
    });
  };

  // Handle adding a snippet to the project
  const handleAddSnippet = (snippet: CodeSnippet) => {
    setOutputCode(snippet.code);
    toast({
      title: 'Snippet Added',
      description: `${snippet.title} has been loaded into the editor`
    });
  };
  
  // Select model
  const handleSelectModel = (model: PropertyModel) => {
    setSelectedModel(model);
    const modelContextCode = `/**
 * ${model.name} Model Interface
 *
 * Benton County Assessor's Office
 * This model defines the structure for ${model.description.toLowerCase()}
 */
export interface ${model.name} {
${model.fields.map(field => `  ${field.name}: ${field.type}; // ${field.description}`).join('\n')}
  
  // Relationships
${model.relationships.map(rel => `  // ${rel.description} (${rel.type})`).join('\n')}
}`;
    
    setCodeContext(modelContextCode);
    toast({
      title: 'Model Selected',
      description: `${model.name} model details have been loaded`
    });
  };
  
  // Generate a full application
  const generateFullApplication = () => {
    setApplicationParts([
      'PropertySearchComponent', 
      'PropertyDetailView', 
      'AssessmentHistoryChart',
      'TaxLotMapViewer',
      'ComparablePropertiesPanel',
      'PropertyDataExport'
    ]);
    setProjectContext(`Project: Benton County Property Assessment Tool
Domain: Tax Assessment
Features:
- Property search and lookup
- Assessment history visualization
- Comparable properties analysis
- Tax lot mapping and visualization
- Data export and reporting tools
- Integration with PACS and GIS systems

Tech Stack:
- React + TypeScript frontend
- Node.js + Express backend
- PostgreSQL database
- Mapping via Leaflet/ArcGIS
`);
    toast({
      title: 'Application Structure Generated',
      description: 'Property assessment application structure has been outlined'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Benton County Code Assistant</h2>
          <p className="text-gray-500">
            Specialized development tools for property assessment applications
          </p>
        </div>
      </div>

      <Tabs defaultValue="assistant" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="assistant" className="flex items-center">
            <Brain className="mr-2 h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileCode className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="snippets">
            <Code className="mr-2 h-4 w-4" />
            Snippets
          </TabsTrigger>
          <TabsTrigger value="models">
            <Database className="mr-2 h-4 w-4" />
            Data Models
          </TabsTrigger>
          <TabsTrigger value="generator">
            <Sparkles className="mr-2 h-4 w-4" />
            App Generator
          </TabsTrigger>
        </TabsList>

        {/* AI Assistant Tab */}
        <TabsContent value="assistant">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-primary" />
                  Property Assessment Code Assistant
                </CardTitle>
                <CardDescription>
                  Specialized AI assistant for Benton County property assessment development
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col h-[400px]">
                  <ScrollArea className="flex-1 pr-4 mb-4">
                    <div className="space-y-4">
                      {assistantHistory.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Lightbulb className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p className="text-lg font-medium">How can I help you?</p>
                          <p className="text-sm mt-1">Ask me to create property assessment components or utilities</p>
                          <div className="mt-6 grid grid-cols-2 gap-3">
                            <Button variant="outline" className="text-sm justify-start" onClick={() => setInputValue("Create a property search component with address autocomplete")}>
                              <Search className="h-4 w-4 mr-2" />
                              Property search component
                            </Button>
                            <Button variant="outline" className="text-sm justify-start" onClick={() => setInputValue("Build a PACS data import utility")}>
                              <Upload className="h-4 w-4 mr-2" />
                              PACS data import utility
                            </Button>
                            <Button variant="outline" className="text-sm justify-start" onClick={() => setInputValue("Generate a tax lot mapping component")}>
                              <Map className="h-4 w-4 mr-2" />
                              Tax lot mapping component
                            </Button>
                            <Button variant="outline" className="text-sm justify-start" onClick={() => setInputValue("Create a property valuation calculator")}>
                              <Calculator className="h-4 w-4 mr-2" />
                              Property valuation calculator
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {assistantHistory.map((message, index) => (
                        <div 
                          key={index} 
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.role === 'user' 
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <div className="flex items-start">
                                <div className="mr-2 mt-0.5 h-6 w-6 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-semibold">
                                  Y
                                </div>
                                <div>
                                  <p>{message.content}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start">
                                <div className="mr-2 mt-0.5 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Brain className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div>
                                  <p>{message.content}</p>
                                  {outputCode && index === assistantHistory.length - 1 && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="mt-2"
                                      onClick={() => handleCopyCode()}
                                    >
                                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                                      Copy Code
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <form onSubmit={handleAssistantSubmit} className="mt-auto">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Ask me to create property assessment components or utilities..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={isGenerating}
                      />
                      <Button type="submit" disabled={isGenerating || !inputValue.trim()}>
                        {isGenerating ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          'Generate'
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Code Editor</CardTitle>
                <CardDescription>
                  View and edit generated code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0" 
                      onClick={handleCopyCode}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-md border">
                    <div className="flex items-center justify-between border-b px-3 py-1.5 text-sm">
                      <div className="flex items-center">
                        <FileCode className="h-3.5 w-3.5 mr-2 text-primary" />
                        <span className="font-medium">
                          {getComponentNameFromCode(outputCode) || 'Component.tsx'}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        TypeScript
                      </Badge>
                    </div>
                    <Textarea
                      ref={editorRef}
                      value={outputCode}
                      onChange={(e) => setOutputCode(e.target.value)}
                      className="font-mono text-sm h-[350px] border-0 bg-transparent focus-visible:ring-0 resize-none"
                      placeholder="// Generated code will appear here"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  {outputCode && (
                    <div className="text-xs text-gray-500">
                      {outputCode.split('\n').length} lines • {outputCode.length} characters
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <TerminalSquare className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                  <Button size="sm">
                    <Check className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {developmentTemplates.map((template) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    {template.category === 'UI Component' ? (
                      <Layout className="h-4 w-4 mr-2 text-primary" />
                    ) : template.category === 'Business Logic' ? (
                      <Cpu className="h-4 w-4 mr-2 text-primary" />
                    ) : (
                      <FileCode className="h-4 w-4 mr-2 text-primary" />
                    )}
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="mb-3 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {template.language}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {template.complexity}
                    </Badge>
                    {template.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded border p-2 overflow-auto h-[100px]">
                    <pre className="text-xs font-mono">
                      <code>{template.templateCode.substring(0, 200)}...</code>
                    </pre>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    onClick={() => handleAddTemplate(template)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Snippets Tab */}
        <TabsContent value="snippets">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {codeSnippets.map((snippet) => (
              <Card key={snippet.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{snippet.title}</CardTitle>
                    <Badge variant="outline">{snippet.language}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {snippet.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded border p-2 overflow-auto h-[120px]">
                    <pre className="text-xs font-mono">
                      <code>{snippet.code.substring(0, 300)}...</code>
                    </pre>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {snippet.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="text-xs text-gray-500">
                    Used {snippet.usageCount} times
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleAddSnippet(snippet)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Use Snippet
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Data Models Tab */}
        <TabsContent value="models">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Benton County Data Models</CardTitle>
                <CardDescription>
                  Specialized property assessment data models
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {propertyModels.map((model) => (
                      <div 
                        key={model.id}
                        className={`p-3 border rounded-md cursor-pointer transition-colors ${
                          selectedModel?.id === model.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleSelectModel(model)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Database className="h-4 w-4 mr-2 text-primary" />
                            <span className="font-medium">{model.name}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectModel(model);
                            }}
                          >
                            <Code className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          {model.description}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          {model.fields.length} fields • {model.relationships.length} relationships
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Model Details</CardTitle>
                <CardDescription>
                  {selectedModel 
                    ? `Viewing details for ${selectedModel.name} model` 
                    : 'Select a model to view details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedModel ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Fields</h3>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded border">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Example</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {selectedModel.fields.map((field, index) => (
                              <tr key={index} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                                <td className="px-3 py-2 text-sm font-medium">{field.name}</td>
                                <td className="px-3 py-2 text-sm">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {field.type}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-500">{field.description}</td>
                                <td className="px-3 py-2 text-sm font-mono text-xs text-gray-600">{field.example}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Relationships</h3>
                      <div className="space-y-2">
                        {selectedModel.relationships.map((rel, index) => (
                          <div key={index} className="flex items-start p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                            <div className="mr-3">
                              {rel.type === 'one-to-one' && (
                                <Badge variant="outline" className="text-xs">1:1</Badge>
                              )}
                              {rel.type === 'one-to-many' && (
                                <Badge variant="outline" className="text-xs">1:n</Badge>
                              )}
                              {rel.type === 'many-to-many' && (
                                <Badge variant="outline" className="text-xs">n:n</Badge>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{rel.relatedModel}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{rel.description}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Generated Type</h3>
                      <div className="bg-gray-50 dark:bg-gray-900 rounded border p-3 font-mono text-xs overflow-auto max-h-[200px]">
                        <pre>{codeContext}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-center">
                    <Database className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Model Selected</h3>
                    <p className="text-gray-500 max-w-md mb-6">
                      Select a data model from the list to view its details and structure
                    </p>
                    <p className="text-xs text-gray-400">
                      These models are specifically designed for Benton County property assessment data
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* App Generator Tab */}
        <TabsContent value="generator">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Application Builder</CardTitle>
                  <CardDescription>
                    Generate complete property assessment applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Application Type</Label>
                      <Select defaultValue="property-assessment">
                        <SelectTrigger>
                          <SelectValue placeholder="Select application type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="property-assessment">Property Assessment</SelectItem>
                          <SelectItem value="tax-collection">Tax Collection</SelectItem>
                          <SelectItem value="appeals-management">Appeals Management</SelectItem>
                          <SelectItem value="public-portal">Public Information Portal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Target Users</Label>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          <User className="h-3 w-3 mr-1" />
                          Assessors
                        </Badge>
                        <Badge variant="outline">
                          <User className="h-3 w-3 mr-1" />
                          Administrators
                        </Badge>
                        <Badge variant="secondary">
                          <User className="h-3 w-3 mr-1" />
                          Public
                        </Badge>
                        <Badge variant="outline">
                          <User className="h-3 w-3 mr-1" />
                          Officials
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Required Features</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="searchFeature" defaultChecked />
                          <Label htmlFor="searchFeature">Property Search</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="mapFeature" defaultChecked />
                          <Label htmlFor="mapFeature">GIS Mapping</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="historyFeature" defaultChecked />
                          <Label htmlFor="historyFeature">Assessment History</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="comparablesFeature" defaultChecked />
                          <Label htmlFor="comparablesFeature">Comparable Analysis</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="exportFeature" defaultChecked />
                          <Label htmlFor="exportFeature">Data Export</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Integrations</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox id="pacsIntegration" defaultChecked />
                          <Label htmlFor="pacsIntegration">PACS System</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="gisIntegration" defaultChecked />
                          <Label htmlFor="gisIntegration">GIS Data</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="docsIntegration" />
                          <Label htmlFor="docsIntegration">Document Management</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox id="noticeIntegration" />
                          <Label htmlFor="noticeIntegration">Notice Generation</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={generateFullApplication}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Application
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="lg:col-span-5 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Application Structure</CardTitle>
                  <CardDescription>
                    Generated property assessment application components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {applicationParts.length > 0 ? (
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <pre className="text-sm whitespace-pre-wrap">
                          {projectContext}
                        </pre>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {applicationParts.map((part, index) => (
                          <div key={index} className="flex items-start p-3 border rounded-lg">
                            <div className="mr-3 mt-0.5">
                              {index === 0 ? (
                                <Layout className="h-5 w-5 text-primary" />
                              ) : index === 1 ? (
                                <SquarePen className="h-5 w-5 text-purple-500" />
                              ) : index === 2 ? (
                                <BarChart className="h-5 w-5 text-amber-500" />
                              ) : index === 3 ? (
                                <Map className="h-5 w-5 text-green-500" />
                              ) : index === 4 ? (
                                <ListFilter className="h-5 w-5 text-blue-500" />
                              ) : (
                                <FileText className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{part}</h4>
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500">
                                {index === 0 
                                  ? 'Property search interface with address autocomplete' 
                                  : index === 1 
                                  ? 'Detailed property information display' 
                                  : index === 2 
                                  ? 'Historical assessment data visualization' 
                                  : index === 3 
                                  ? 'Interactive GIS map for tax lot visualization' 
                                  : index === 4 
                                  ? 'Find and analyze similar properties' 
                                  : 'Export property data in various formats'}
                              </p>
                              <div className="flex mt-1">
                                <Badge variant="outline" className="mr-1 text-xs">React</Badge>
                                <Badge variant="outline" className="mr-1 text-xs">TypeScript</Badge>
                                {index === 2 && <Badge variant="outline" className="text-xs">Chart.js</Badge>}
                                {index === 3 && <Badge variant="outline" className="text-xs">Leaflet</Badge>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Archive className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                      <h3 className="text-xl font-medium mb-2">No Application Generated</h3>
                      <p className="text-gray-500 max-w-md mb-6">
                        Configure your application settings and click "Generate Application" to create a custom property assessment system for Benton County
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={generateFullApplication}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Sample Application
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {applicationParts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle>Project Architecture</CardTitle>
                    <CardDescription>
                      Visual representation of application components
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border p-6">
                      <div className="flex flex-col items-center">
                        <div className="w-40 h-20 border-2 border-primary rounded-lg flex items-center justify-center mb-4">
                          <div className="text-center">
                            <div className="font-bold text-sm">App Entry</div>
                            <div className="text-xs text-gray-500">Authentication</div>
                          </div>
                        </div>
                        
                        <Workflow className="h-6 w-6 my-2 text-gray-400" />
                        
                        <div className="grid grid-cols-3 gap-4 w-full mb-4">
                          <div className="col-span-2 border-2 border-blue-500 rounded-lg p-2 text-center">
                            <div className="font-bold text-sm">Main Dashboard</div>
                            <div className="text-xs text-gray-500">User Portal</div>
                          </div>
                          <div className="border-2 border-purple-500 rounded-lg p-2 text-center">
                            <div className="font-bold text-sm">Admin Panel</div>
                            <div className="text-xs text-gray-500">Management</div>
                          </div>
                        </div>
                        
                        <Workflow className="h-6 w-6 my-2 text-gray-400" />
                        
                        <div className="grid grid-cols-3 gap-4 w-full mb-6">
                          <div className="border-2 border-green-500 rounded-lg p-2 text-center h-20 flex flex-col items-center justify-center">
                            <div className="font-bold text-sm">Property Search</div>
                            <div className="text-xs text-gray-500">Lookup Module</div>
                          </div>
                          <div className="border-2 border-amber-500 rounded-lg p-2 text-center h-20 flex flex-col items-center justify-center">
                            <div className="font-bold text-sm">Assessment View</div>
                            <div className="text-xs text-gray-500">Details & History</div>
                          </div>
                          <div className="border-2 border-red-500 rounded-lg p-2 text-center h-20 flex flex-col items-center justify-center">
                            <div className="font-bold text-sm">GIS Mapping</div>
                            <div className="text-xs text-gray-500">Tax Lot Display</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-center w-full">
                          <div className="h-px bg-gray-300 dark:bg-gray-700 w-full" />
                          <Layers className="h-6 w-6 mx-4 text-gray-400" />
                          <div className="h-px bg-gray-300 dark:bg-gray-700 w-full" />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 w-full mt-6">
                          <div className="border-2 border-indigo-500 rounded-lg p-2 text-center h-16 flex flex-col items-center justify-center">
                            <div className="font-bold text-sm">PACS API</div>
                            <div className="text-xs text-gray-500">Data Source</div>
                          </div>
                          <div className="border-2 border-cyan-500 rounded-lg p-2 text-center h-16 flex flex-col items-center justify-center">
                            <div className="font-bold text-sm">Database</div>
                            <div className="text-xs text-gray-500">PostgreSQL</div>
                          </div>
                          <div className="border-2 border-emerald-500 rounded-lg p-2 text-center h-16 flex flex-col items-center justify-center">
                            <div className="font-bold text-sm">GIS Server</div>
                            <div className="text-xs text-gray-500">Map Services</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm">
                      <GitBranch className="h-4 w-4 mr-2" />
                      Export Architecture
                    </Button>
                    <Button size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Deploy App
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Context sidebar for additional tools */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2">
        <div className="bg-white dark:bg-gray-950 rounded-full shadow-lg p-1.5 flex flex-col items-center space-y-2 border">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Context Panel">
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Separator className="w-5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Documentation">
            <Book className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Backend API">
            <Server className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Code Templates">
            <FileCode className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="AI Assistant">
            <Brain className="h-4 w-4" />
          </Button>
          <Separator className="w-5" />
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="GitHub">
            <Github className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CodeAssistantPanel;