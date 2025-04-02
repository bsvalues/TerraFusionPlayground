import Anthropic from '@anthropic-ai/sdk';
import { storage } from '../storage';
import { z } from 'zod';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY // Make sure to add this to your environment variables
});

// Schema for the structured query
const structuredQuerySchema = z.object({
  query: z.string(),
  entity: z.enum(['property', 'landRecord', 'improvement', 'field']),
  filters: z.object({
    property: z.object({
      address: z.string().nullable().optional(),
      propertyType: z.string().nullable().optional(),
      acres: z.object({
        min: z.number().nullable().optional(),
        max: z.number().nullable().optional()
      }).nullable().optional(),
      value: z.object({
        min: z.number().nullable().optional(),
        max: z.number().nullable().optional()
      }).nullable().optional(),
      status: z.string().nullable().optional(),
      location: z.string().nullable().optional()
    }).optional(),
    landRecord: z.object({
      landUseCode: z.string().nullable().optional(),
      zoning: z.string().nullable().optional(),
      floodZone: z.string().nullable().optional()
    }).optional(),
    improvement: z.object({
      improvementType: z.string().nullable().optional(),
      yearBuilt: z.object({
        min: z.number().nullable().optional(),
        max: z.number().nullable().optional()
      }).nullable().optional(),
      squareFeet: z.object({
        min: z.number().nullable().optional(),
        max: z.number().nullable().optional()
      }).nullable().optional(),
      bedrooms: z.number().nullable().optional(),
      bathrooms: z.number().nullable().optional(),
      quality: z.string().nullable().optional(),
      condition: z.string().nullable().optional()
    }).optional()
  }),
  limit: z.number().nullable().optional(),
  sort: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  }).nullable().optional()
});

type StructuredQuery = z.infer<typeof structuredQuerySchema>;

// Function to execute natural language queries using Anthropic
export async function processNaturalLanguageWithAnthropic(query: string) {
  try {
    // Create the system prompt
    const systemPrompt = `You are an AI assistant for the Benton County, Washington property tax system.
Based on the following schema and the user's question, you will generate a structured JSON object
with the necessary query parameters to search for properties in the database.

SCHEMAS:
- Property: id, propertyId, address, parcelNumber, propertyType, acres, value, status, lastUpdated, createdAt
- LandRecord: id, propertyId, landUseCode, zoning, topography, frontage, depth, shape, utilities, floodZone
- Improvement: id, propertyId, improvementType, yearBuilt, squareFeet, bedrooms, bathrooms, quality, condition
- Field: id, propertyId, fieldType, fieldValue

SUPPORTED LOCATIONS (All in Benton County, Washington):
- Kennewick
- Richland
- West Richland
- Prosser
- Benton City

INSTRUCTIONS:
- Return only the valid JSON object with the query parameters, nothing else.
- Use the following format for the JSON object:
{
  "query": string,
  "entity": "property" | "landRecord" | "improvement" | "field",
  "filters": {
    "property": {
      "address": string | null,
      "propertyType": string | null,
      "acres": { min: number | null, max: number | null } | null,
      "value": { min: number | null, max: number | null } | null,
      "status": string | null,
      "location": string | null
    },
    "landRecord": {
      "landUseCode": string | null,
      "zoning": string | null,
      "floodZone": string | null
    },
    "improvement": {
      "improvementType": string | null,
      "yearBuilt": { min: number | null, max: number | null } | null,
      "squareFeet": { min: number | null, max: number | null } | null,
      "bedrooms": number | null,
      "bathrooms": number | null,
      "quality": string | null,
      "condition": string | null
    }
  },
  "limit": number | null,
  "sort": { field: string, direction: "asc" | "desc" } | null
}`;

    // Send the message to Anthropic's Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0,
      system: systemPrompt,
      messages: [
        { role: 'user', content: query }
      ]
    });

    // Parse the response to extract the JSON
    const responseContent = message.content[0].type === 'text' 
      ? message.content[0].text 
      : JSON.stringify(message.content[0]);
    
    // Find JSON object in the response (it might have Markdown code block formatting)
    const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                     responseContent.match(/```\s*([\s\S]*?)\s*```/) || 
                     [null, responseContent];
    
    const jsonStr = jsonMatch[1].trim();
    const structuredQuery = JSON.parse(jsonStr);
    
    // Validate the structured query against our schema
    const validatedQuery = structuredQuerySchema.parse(structuredQuery);
    
    // Make sure the original query is stored in the structuredQuery
    if (!validatedQuery.query) {
      validatedQuery.query = query;
    }
    
    // Execute the query based on the structured parameters
    return await executeStructuredQuery(validatedQuery);
  } catch (error) {
    console.error("Error processing natural language query with Anthropic:", error);
    throw new Error("Failed to process the natural language query");
  }
}

// Function to get a summary of properties from a natural language query
export async function getSummaryWithAnthropic(query: string) {
  const result = await processNaturalLanguageWithAnthropic(query);
  
  try {
    // Create a system prompt for summarization
    const systemPrompt = `You are an AI assistant for Benton County, Washington's property tax system.
Based on the following property data, provide a 2-3 sentence summary of the results.
Be concise, factual, and focus on the number of properties found and any notable
patterns or insights relevant to Benton County's property assessments.
Be objective and only report what is directly supported by the data.`;

    // Data preparation
    const dataString = JSON.stringify(result.results, null, 2);
    
    // Create the user message with query and data
    const userMessage = `QUERY: ${query}\n\nDATA:\n${dataString}`;
    
    // Send the message to Anthropic's Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });

    // Extract the summary from the response
    const summary = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : JSON.stringify(message.content[0]);
    
    return {
      ...result,
      summary
    };
  } catch (error) {
    console.error("Error generating summary with Anthropic:", error);
    return {
      ...result,
      summary: "Failed to generate summary."
    };
  }
}

// Helper function to execute structured queries against our storage
async function executeStructuredQuery(structuredQuery: StructuredQuery) {
  const { entity, filters, limit, sort } = structuredQuery;
  
  // Get all properties as the base for our query
  let properties = await storage.getAllProperties();
  
  // Apply property filters if they exist
  if (filters.property) {
    const { address, propertyType, acres, value, status, location } = filters.property;
    
    if (address) {
      properties = properties.filter(p => p.address.toLowerCase().includes(address.toLowerCase()));
    }
    
    if (propertyType) {
      properties = properties.filter(p => p.propertyType.toLowerCase() === propertyType.toLowerCase());
    }
    
    if (status) {
      properties = properties.filter(p => p.status.toLowerCase() === status.toLowerCase());
    }
    
    if (location) {
      properties = properties.filter(p => p.address.toLowerCase().includes(location.toLowerCase()));
    }
    
    if (acres) {
      if (acres.min !== null && acres.min !== undefined) {
        properties = properties.filter(p => Number(p.acres) >= Number(acres.min!));
      }
      if (acres.max !== null && acres.max !== undefined) {
        properties = properties.filter(p => Number(p.acres) <= Number(acres.max!));
      }
    }
    
    if (value) {
      if (value.min !== null && value.min !== undefined) {
        properties = properties.filter(p => p.value !== null && Number(p.value) >= Number(value.min!));
      }
      if (value.max !== null && value.max !== undefined) {
        properties = properties.filter(p => p.value !== null && Number(p.value) <= Number(value.max!));
      }
    }
  }
  
  // Apply entity-specific filters and fetch related data
  let results: any[] = [];
  
  switch (entity) {
    case 'property':
      results = properties;
      break;
      
    case 'landRecord':
      // For each property, get the land records and filter them
      for (const property of properties) {
        const landRecords = await storage.getLandRecordsByPropertyId(property.propertyId);
        
        let filteredLandRecords = landRecords;
        
        if (filters.landRecord) {
          const { landUseCode, zoning, floodZone } = filters.landRecord;
          
          if (landUseCode) {
            filteredLandRecords = filteredLandRecords.filter(r => 
              r.landUseCode.toLowerCase() === landUseCode.toLowerCase()
            );
          }
          
          if (zoning) {
            filteredLandRecords = filteredLandRecords.filter(r => 
              r.zoning.toLowerCase() === zoning.toLowerCase()
            );
          }
          
          if (floodZone) {
            filteredLandRecords = filteredLandRecords.filter(r => 
              r.floodZone && r.floodZone.toLowerCase() === floodZone.toLowerCase()
            );
          }
        }
        
        // Add property information to each land record
        filteredLandRecords.forEach(record => {
          results.push({
            ...record,
            property
          });
        });
      }
      break;
      
    case 'improvement':
      // For each property, get the improvements and filter them
      for (const property of properties) {
        const improvements = await storage.getImprovementsByPropertyId(property.propertyId);
        
        let filteredImprovements = improvements;
        
        if (filters.improvement) {
          const { improvementType, yearBuilt, squareFeet, bedrooms, bathrooms, quality, condition } = filters.improvement;
          
          if (improvementType) {
            filteredImprovements = filteredImprovements.filter(i => 
              i.improvementType.toLowerCase() === improvementType.toLowerCase()
            );
          }
          
          if (quality) {
            filteredImprovements = filteredImprovements.filter(i => 
              i.quality && i.quality.toLowerCase() === quality.toLowerCase()
            );
          }
          
          if (condition) {
            filteredImprovements = filteredImprovements.filter(i => 
              i.condition && i.condition.toLowerCase() === condition.toLowerCase()
            );
          }
          
          if (bedrooms !== null && bedrooms !== undefined) {
            filteredImprovements = filteredImprovements.filter(i => 
              i.bedrooms === bedrooms
            );
          }
          
          if (bathrooms !== null && bathrooms !== undefined) {
            filteredImprovements = filteredImprovements.filter(i => 
              i.bathrooms !== null && String(i.bathrooms) === String(bathrooms)
            );
          }
          
          if (yearBuilt) {
            if (yearBuilt.min !== null && yearBuilt.min !== undefined) {
              filteredImprovements = filteredImprovements.filter(i => 
                i.yearBuilt !== null && i.yearBuilt >= yearBuilt.min!
              );
            }
            if (yearBuilt.max !== null && yearBuilt.max !== undefined) {
              filteredImprovements = filteredImprovements.filter(i => 
                i.yearBuilt !== null && i.yearBuilt <= yearBuilt.max!
              );
            }
          }
          
          if (squareFeet) {
            if (squareFeet.min !== null && squareFeet.min !== undefined) {
              filteredImprovements = filteredImprovements.filter(i => 
                i.squareFeet !== null && Number(i.squareFeet) >= squareFeet.min!
              );
            }
            if (squareFeet.max !== null && squareFeet.max !== undefined) {
              filteredImprovements = filteredImprovements.filter(i => 
                i.squareFeet !== null && Number(i.squareFeet) <= squareFeet.max!
              );
            }
          }
        }
        
        // Add property information to each improvement
        filteredImprovements.forEach(improvement => {
          results.push({
            ...improvement,
            property
          });
        });
      }
      break;
      
    case 'field':
      // For each property, get the fields and filter them
      for (const property of properties) {
        const fields = await storage.getFieldsByPropertyId(property.propertyId);
        
        // Add property information to each field
        fields.forEach(field => {
          results.push({
            ...field,
            property
          });
        });
      }
      break;
      
    default:
      results = properties;
  }
  
  // Apply sorting if specified
  if (sort) {
    results.sort((a, b) => {
      const aValue = a[sort.field];
      const bValue = b[sort.field];
      
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      
      if (sort.direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }
  
  // Apply limit if specified
  if (limit !== null && limit !== undefined && limit > 0) {
    results = results.slice(0, limit);
  }
  
  return {
    query: structuredQuery.query || "Unknown query",
    results,
    count: results.length
  };
}