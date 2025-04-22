// Types related to the workflow optimizer feature

export type OptimizationType = 
  | 'CODE_QUALITY' 
  | 'PERFORMANCE' 
  | 'SECURITY' 
  | 'ARCHITECTURE' 
  | 'DEPENDENCY_MANAGEMENT'
  | 'TESTING_COVERAGE'
  | 'ACCESSIBILITY'
  | 'DEVELOPER_EXPERIENCE';

export type OptimizationStatus = 
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type OptimizationPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface WorkflowOptimizationRequest {
  id: number;
  requestId: string;
  userId: number;
  repositoryId?: number | null;
  title: string;
  description: string;
  optimizationType: OptimizationType;
  status: OptimizationStatus;
  priority: OptimizationPriority;
  createdAt: string;
  updatedAt?: string | null;
  metadata?: Record<string, any> | null;
}

export interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  code?: string | null;
  filePath?: string | null;
  lineNumbers?: [number, number] | null;
  impact: 'low' | 'medium' | 'high';
  effortEstimate: 'quick' | 'medium' | 'significant';
  category: string;
  implementationSteps?: string[] | null;
}

export interface WorkflowOptimizationResult {
  id: number;
  resultId: string;
  requestId: string;
  summary: string;
  impactScore: number;
  suggestions: OptimizationSuggestion[];
  analysisDetails?: Record<string, any> | null;
  createdAt: string;
  metadata?: Record<string, any> | null;
}