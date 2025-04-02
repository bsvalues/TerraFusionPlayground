import fs from 'fs';
import { parse } from 'csv-parse/sync';
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';

async function importPacsModules() {
  try {
    console.log('Importing PACS modules...');
    
    // Read CSV data
    const csvData = fs.readFileSync('./attached_assets/PACS_Agent_Module_Map.csv', 'utf8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Found ${records.length} modules to import`);
    
    // Update integration status for some modules to simulate an active system
    const activeModules = [
      'GIS', 'Land', 'Land Schedules', 'Improvements', 'Valuation Methods', 
      'Protest Processing', 'Inquiry Processing', 'Image and Document Management',
      'User & Roles', 'Reports'
    ];
    
    // Process modules and update with descriptions
    const processedModules = records.map(record => {
      let integration = record.integration;
      let description = record.description || '';
      
      if (activeModules.includes(record.module_name)) {
        integration = 'active';
        
        // Add descriptions for active modules
        switch(record.module_name) {
          case 'GIS':
            description = 'Geographic Information System integration for spatial property data management and visualization';
            break;
          case 'Land':
            description = 'Land record management including parcel information, zoning, and legal descriptions';
            break;
          case 'Land Schedules':
            description = 'Land valuation schedules based on zoning, location, and amenities';
            break;
          case 'Improvements':
            description = 'Building and property improvement tracking and valuation';
            break;
          case 'Valuation Methods':
            description = 'Multiple property valuation methodologies including cost, market, and income approaches';
            break;
          case 'Protest Processing':
            description = 'Management of property value protests from submission to resolution';
            break;
          case 'Inquiry Processing':
            description = 'Handling property information inquiries from citizens and other stakeholders';
            break;
          case 'Image and Document Management':
            description = 'Storage and retrieval of property photos, documents, and other digital assets';
            break;
          case 'User & Roles':
            description = 'User account management with role-based access control';
            break;
          case 'Reports':
            description = 'Comprehensive reporting system for property data analysis and regulatory compliance';
            break;
        }
      }
      
      return {
        moduleName: record.module_name,
        source: record.source,
        integration: integration,
        description: description,
        version: '1.0',
        lastUpdated: new Date().toISOString()
      };
    });
    
    // Import modules through the API
    let successCount = 0;
    for (const module of processedModules) {
      try {
        const response = await fetch(`${API_URL}/pacs-modules`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(module)
        });
        
        if (response.ok) {
          successCount++;
          if (module.integration === 'active') {
            console.log(`✅ Imported active module: ${module.moduleName}`);
          }
        } else {
          console.error(`Failed to import module ${module.moduleName}: ${response.statusText}`);
          console.error(await response.text());
        }
      } catch (error) {
        console.error(`Error importing module ${module.moduleName}:`, error.message);
      }
    }
    
    console.log(`Successfully imported ${successCount} of ${processedModules.length} modules`);
    console.log('Import completed.');
  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Run the import
importPacsModules();