import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DataImportService } from '../services/data-import-service';
import { DataStagingService } from '../services/data-staging-service';
import { IStorage } from '../storage';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = `${Date.now()}-${uuidv4()}`;
    cb(null, `${uniquePrefix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

export function createDataImportRoutes(storage: IStorage) {
  const router = Router();
  const dataImportService = new DataImportService(storage);
  const dataStagingService = new DataStagingService(storage);
  
  // Upload and validate a CSV file for property import
  router.post('/upload-validate', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Validate the CSV file
      const validationResult = await dataImportService.validateCSVFile(req.file.path);
      
      res.json({
        fileName: req.file.originalname,
        filePath: req.file.path,
        validation: validationResult
      });
    } catch (error) {
      console.error('Error validating CSV file:', error);
      res.status(500).json({ 
        message: 'Failed to validate CSV file',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Import properties from a validated CSV file
  router.post('/import-properties', async (req, res) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: 'File path is required' });
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: `File not found: ${filePath}` });
      }
      
      // Import properties from CSV
      const importResult = await dataImportService.importPropertiesFromCSV(filePath);
      
      // Create system activity for the import
      await storage.createSystemActivity({
        agentId: 1, // Data Management Agent
        activity: `Imported ${importResult.successfulImports} properties with ${importResult.failedImports} failures`,
        entityType: 'import',
        entityId: 'property_csv'
      });
      
      res.json(importResult);
    } catch (error) {
      console.error('Error importing properties:', error);
      res.status(500).json({
        message: 'Failed to import properties',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Stage properties from a validated CSV file
  router.post('/stage-properties', async (req, res) => {
    try {
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: 'File path is required' });
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: `File not found: ${filePath}` });
      }
      
      // Validate the CSV file first
      const validationResult = await dataImportService.validateCSVFile(filePath);
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          message: 'Invalid CSV data',
          validation: validationResult
        });
      }
      
      // Parse the CSV file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const csvParser = require('csv-parse/sync');
      const records = csvParser.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      // Map records to property objects
      const properties = records.map((record: Record<string, string>) => ({
        propertyId: record.propertyId,
        parcelNumber: record.parcelNumber,
        address: record.address,
        propertyType: record.propertyType || 'Residential',
        acres: record.acres || '0.0',
        value: record.value || '0',
        status: record.status || 'active'
      }));
      
      // Stage properties
      const stagedProperties = await dataStagingService.stageProperties(properties, `CSV:${path.basename(filePath)}`);
      
      // Validate staged properties
      const stagingValidationResult = await dataStagingService.validateStagedProperties(
        Array.from(stagedProperties.keys())
      );
      
      res.json({
        staged: properties.length,
        stagingIds: Array.from(stagedProperties.keys()),
        validation: stagingValidationResult
      });
    } catch (error) {
      console.error('Error staging properties:', error);
      res.status(500).json({
        message: 'Failed to stage properties',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get all staged properties
  router.get('/staged-properties', (req, res) => {
    try {
      const stagedProperties = dataStagingService.getStagedProperties();
      res.json({
        count: stagedProperties.size,
        properties: Array.from(stagedProperties.values())
      });
    } catch (error) {
      console.error('Error getting staged properties:', error);
      res.status(500).json({
        message: 'Failed to get staged properties',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Get a specific staged property
  router.get('/staged-properties/:stagingId', (req, res) => {
    try {
      const { stagingId } = req.params;
      const stagedProperty = dataStagingService.getStagedProperty(stagingId);
      
      if (!stagedProperty) {
        return res.status(404).json({ message: `Staged property with ID ${stagingId} not found` });
      }
      
      res.json(stagedProperty);
    } catch (error) {
      console.error('Error getting staged property:', error);
      res.status(500).json({
        message: 'Failed to get staged property',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Validate staged properties
  router.post('/validate-staged-properties', async (req, res) => {
    try {
      const { stagingIds } = req.body;
      const validationResult = await dataStagingService.validateStagedProperties(stagingIds);
      res.json(validationResult);
    } catch (error) {
      console.error('Error validating staged properties:', error);
      res.status(500).json({
        message: 'Failed to validate staged properties',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Commit staged properties
  router.post('/commit-staged-properties', async (req, res) => {
    try {
      const { stagingIds } = req.body;
      const commitResult = await dataStagingService.commitStagedProperties(stagingIds);
      res.json(commitResult);
    } catch (error) {
      console.error('Error committing staged properties:', error);
      res.status(500).json({
        message: 'Failed to commit staged properties',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Delete a staged property
  router.delete('/staged-properties/:stagingId', async (req, res) => {
    try {
      const { stagingId } = req.params;
      const deleted = await dataStagingService.deleteStagedProperty(stagingId);
      
      if (!deleted) {
        return res.status(404).json({ message: `Staged property with ID ${stagingId} not found` });
      }
      
      res.json({ message: `Staged property with ID ${stagingId} deleted` });
    } catch (error) {
      console.error('Error deleting staged property:', error);
      res.status(500).json({
        message: 'Failed to delete staged property',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Create a snapshot of property data for export/backup
  router.post('/create-property-snapshot', async (req, res) => {
    try {
      const { propertyIds } = req.body;
      const snapshotResult = await dataStagingService.createPropertySnapshot(propertyIds);
      res.json(snapshotResult);
    } catch (error) {
      console.error('Error creating property snapshot:', error);
      res.status(500).json({
        message: 'Failed to create property snapshot',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  return router;
}