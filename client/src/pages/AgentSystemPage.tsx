import React from 'react';
import { AgentSystemPanel } from '@/components/AgentSystemPanel';

export default function AgentSystemPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">MCP Agent System</h1>
        <p className="text-muted-foreground">
          The Model Context Protocol (MCP) Agent System provides AI-powered capabilities for property assessment,
          data ingestion and reporting through a secure, controlled interface.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <AgentSystemPanel />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Property Assessment Agent Card */}
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"></path><path d="m7.5 4.27 9 5.15"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" x2="12" y1="22" y2="12"></line><circle cx="18.5" cy="15.5" r="2.5"></circle><path d="M20.27 17.27 22 19"></path></svg>
              </div>
              <h2 className="text-xl font-semibold">Property Assessment Agent</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Advanced AI capabilities for property analysis, valuation, and comparison using multiple data sources.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Property value analysis
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Comparable property identification
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Property story generation
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Market trend analysis
              </li>
            </ul>
          </div>
          
          {/* Data Ingestion Agent Card */}
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              </div>
              <h2 className="text-xl font-semibold">Data Ingestion Agent</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Securely imports, validates, and processes property data from multiple sources including PACS systems.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                FTP/SFTP data retrieval
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Data validation and cleansing
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                PACS system integration
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Data transformation and loading
              </li>
            </ul>
          </div>
          
          {/* Reporting Agent Card */}
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="m18 17-2-2-4 4-2-2-3 3"></path><path d="m15 8 3 3 3-3"></path><path d="m18 11-6-6-3 3-5-5"></path></svg>
              </div>
              <h2 className="text-xl font-semibold">Reporting Agent</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Generates detailed property assessment reports and analytics with customizable parameters.
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Customizable report templates
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Data aggregation and analysis
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Scheduled report generation
              </li>
              <li className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Export in multiple formats
              </li>
            </ul>
          </div>
        </div>
        
        {/* MCP Architecture Overview */}
        <div className="bg-card rounded-lg shadow-sm border p-6 mt-4">
          <h2 className="text-xl font-semibold mb-4">MCP Architecture Overview</h2>
          <p className="mb-4">
            The Model Context Protocol (MCP) architecture provides a secure framework for AI-powered agents to interact with property data and external systems, maintaining data integrity and access controls.
          </p>
          
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">Key Features</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>
                  Secure AI capability execution with permission controls
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>
                  Comprehensive audit logging and tool execution tracking
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>
                  Multi-AI provider support (OpenAI, Claude, Perplexity)
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>
                  PACS system integration with proprietary data mapping
                </li>
              </ul>
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-medium mb-2">Security Features</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
                  SQL injection and parameter validation
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
                  Rate limiting and request validation
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
                  Authentication and authorization checks
                </li>
                <li className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-primary"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
                  Tool execution permissions model
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}