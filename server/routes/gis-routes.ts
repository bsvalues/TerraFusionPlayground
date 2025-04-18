/**
 * GIS Routes
 * 
 * This file contains the API routes for GIS-related operations.
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';
import { insertGISLayerSchema, insertGISFeatureCollectionSchema, insertGISMapProjectSchema } from '@shared/gis-schema';

const router = Router();

// Get all GIS layers
router.get('/layers', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    
    const layers = await storage.getGISLayers({ type, userId });
    res.json(layers);
  } catch (error) {
    console.error('Error fetching GIS layers:', error);
    res.status(500).json({ error: 'Failed to fetch GIS layers' });
  }
});

// Get a GIS layer by ID
router.get('/layers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const layer = await storage.getGISLayer(id);
    
    if (!layer) {
      return res.status(404).json({ error: 'GIS layer not found' });
    }
    
    res.json(layer);
  } catch (error) {
    console.error('Error fetching GIS layer:', error);
    res.status(500).json({ error: 'Failed to fetch GIS layer' });
  }
});

// Create a new GIS layer
router.post('/layers', async (req: Request, res: Response) => {
  try {
    const validatedData = insertGISLayerSchema.parse(req.body);
    const layer = await storage.createGISLayer(validatedData);
    res.status(201).json(layer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating GIS layer:', error);
    res.status(500).json({ error: 'Failed to create GIS layer' });
  }
});

// Update a GIS layer
router.put('/layers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertGISLayerSchema.partial().parse(req.body);
    
    const layer = await storage.updateGISLayer(id, validatedData);
    
    if (!layer) {
      return res.status(404).json({ error: 'GIS layer not found' });
    }
    
    res.json(layer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating GIS layer:', error);
    res.status(500).json({ error: 'Failed to update GIS layer' });
  }
});

// Delete a GIS layer
router.delete('/layers/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteGISLayer(id);
    
    if (!success) {
      return res.status(404).json({ error: 'GIS layer not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting GIS layer:', error);
    res.status(500).json({ error: 'Failed to delete GIS layer' });
  }
});

// Get all feature collections for a layer
router.get('/layers/:layerId/features', async (req: Request, res: Response) => {
  try {
    const layerId = parseInt(req.params.layerId);
    const collections = await storage.getGISFeatureCollectionsByLayer(layerId);
    res.json(collections);
  } catch (error) {
    console.error('Error fetching GIS feature collections:', error);
    res.status(500).json({ error: 'Failed to fetch GIS feature collections' });
  }
});

// Get a feature collection by ID
router.get('/features/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const collection = await storage.getGISFeatureCollection(id);
    
    if (!collection) {
      return res.status(404).json({ error: 'GIS feature collection not found' });
    }
    
    res.json(collection);
  } catch (error) {
    console.error('Error fetching GIS feature collection:', error);
    res.status(500).json({ error: 'Failed to fetch GIS feature collection' });
  }
});

// Create a new feature collection
router.post('/features', async (req: Request, res: Response) => {
  try {
    const validatedData = insertGISFeatureCollectionSchema.parse(req.body);
    const collection = await storage.createGISFeatureCollection(validatedData);
    res.status(201).json(collection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating GIS feature collection:', error);
    res.status(500).json({ error: 'Failed to create GIS feature collection' });
  }
});

// Update a feature collection
router.put('/features/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertGISFeatureCollectionSchema.partial().parse(req.body);
    
    const collection = await storage.updateGISFeatureCollection(id, validatedData);
    
    if (!collection) {
      return res.status(404).json({ error: 'GIS feature collection not found' });
    }
    
    res.json(collection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating GIS feature collection:', error);
    res.status(500).json({ error: 'Failed to update GIS feature collection' });
  }
});

// Delete a feature collection
router.delete('/features/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteGISFeatureCollection(id);
    
    if (!success) {
      return res.status(404).json({ error: 'GIS feature collection not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting GIS feature collection:', error);
    res.status(500).json({ error: 'Failed to delete GIS feature collection' });
  }
});

// Get all map projects
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const projects = await storage.getGISMapProjects(userId);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching GIS map projects:', error);
    res.status(500).json({ error: 'Failed to fetch GIS map projects' });
  }
});

// Get public map projects
router.get('/projects/public', async (req: Request, res: Response) => {
  try {
    const projects = await storage.getPublicGISMapProjects();
    res.json(projects);
  } catch (error) {
    console.error('Error fetching public GIS map projects:', error);
    res.status(500).json({ error: 'Failed to fetch public GIS map projects' });
  }
});

// Get a map project by ID
router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const project = await storage.getGISMapProject(id);
    
    if (!project) {
      return res.status(404).json({ error: 'GIS map project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching GIS map project:', error);
    res.status(500).json({ error: 'Failed to fetch GIS map project' });
  }
});

// Create a new map project
router.post('/projects', async (req: Request, res: Response) => {
  try {
    const validatedData = insertGISMapProjectSchema.parse(req.body);
    const project = await storage.createGISMapProject(validatedData);
    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating GIS map project:', error);
    res.status(500).json({ error: 'Failed to create GIS map project' });
  }
});

// Update a map project
router.put('/projects/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertGISMapProjectSchema.partial().parse(req.body);
    
    const project = await storage.updateGISMapProject(id, validatedData);
    
    if (!project) {
      return res.status(404).json({ error: 'GIS map project not found' });
    }
    
    res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error updating GIS map project:', error);
    res.status(500).json({ error: 'Failed to update GIS map project' });
  }
});

// Delete a map project
router.delete('/projects/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteGISMapProject(id);
    
    if (!success) {
      return res.status(404).json({ error: 'GIS map project not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting GIS map project:', error);
    res.status(500).json({ error: 'Failed to delete GIS map project' });
  }
});

export const createGisRoutes = () => router;