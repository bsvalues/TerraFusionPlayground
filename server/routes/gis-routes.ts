import express from 'express';
import QGISService from '../services/qgis-service';
import fs from 'fs';
import path from 'path';
import { IStorage } from '../storage';

export function createGisRoutes(storage: IStorage) {
  const router = express.Router();
  const qgisService = new QGISService(storage);

  // Get all QGIS projects
  router.get('/projects', async (req, res) => {
    try {
      const projects = await qgisService.getProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error fetching QGIS projects:', error);
      res.status(500).json({ error: 'Failed to fetch QGIS projects' });
    }
  });

  // Get a specific QGIS project
  router.get('/projects/:id', async (req, res) => {
    try {
      const project = await qgisService.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: 'QGIS project not found' });
      }
      res.json(project);
    } catch (error) {
      console.error('Error fetching QGIS project:', error);
      res.status(500).json({ error: 'Failed to fetch QGIS project' });
    }
  });

  // Get layers for a specific QGIS project
  router.get('/projects/:id/layers', async (req, res) => {
    try {
      const layers = await qgisService.getLayers(req.params.id);
      res.json(layers);
    } catch (error) {
      console.error('Error fetching layers for QGIS project:', error);
      res.status(500).json({ error: 'Failed to fetch layers for QGIS project' });
    }
  });

  // Get property boundaries GeoJSON
  router.get('/property-boundaries', async (req, res) => {
    try {
      const boundaries = await qgisService.getPropertyBoundaries(
        req.query.bbox as string, 
        req.query.filter as string
      );
      res.json(boundaries);
    } catch (error) {
      console.error('Error fetching property boundaries:', error);
      res.status(500).json({ error: 'Failed to fetch property boundaries' });
    }
  });

  // Get property details
  router.get('/properties/:id', async (req, res) => {
    try {
      const property = await qgisService.getPropertyDetails(req.params.id);
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      res.json(property);
    } catch (error) {
      console.error('Error fetching property details:', error);
      res.status(500).json({ error: 'Failed to fetch property details' });
    }
  });

  // Search properties by address or ID
  router.get('/properties/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      const results = await qgisService.searchProperties(query);
      res.json(results);
    } catch (error) {
      console.error('Error searching properties:', error);
      res.status(500).json({ error: 'Failed to search properties' });
    }
  });

  // Export map as image
  router.post('/export/image', async (req, res) => {
    try {
      const { bbox, width, height, layers, format } = req.body;
      
      const imageBuffer = await qgisService.exportMapImage(
        bbox,
        width,
        height,
        layers,
        format || 'png'
      );
      
      res.set('Content-Type', `image/${format || 'png'}`);
      res.send(imageBuffer);
    } catch (error) {
      console.error('Error exporting map image:', error);
      res.status(500).json({ error: 'Failed to export map image' });
    }
  });

  // Export map as PDF
  router.post('/export/pdf', async (req, res) => {
    try {
      const { bbox, width, height, layers, title, includeAttribution } = req.body;
      
      // For now, use the existing exportMap method as exportMapPDF is not available
      const projectId = 'property-assessment'; // Default project
      const pdfBuffer = await qgisService.exportMap(
        projectId,
        [bbox[0], bbox[1], bbox[2], bbox[3]],
        width,
        height,
        'pdf'
      );
      
      if (pdfBuffer) {
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', 'attachment; filename="map-export.pdf"');
        res.send(pdfBuffer);
      } else {
        res.status(500).json({ error: 'Failed to export map as PDF' });
      }
    } catch (error) {
      console.error('Error exporting map as PDF:', error);
      res.status(500).json({ error: 'Failed to export map as PDF' });
    }
  });

  // Add QGIS info endpoint to highlight open source features
  router.get('/qgis-info', (req, res) => {
    const qgisInfo = qgisService.getQGISInfo();
    res.json(qgisInfo);
  });
  
  // Get available basemaps
  router.get('/basemaps', async (req, res) => {
    try {
      const basemaps = await qgisService.getBasemaps();
      res.json(basemaps);
    } catch (error) {
      console.error('Error fetching basemaps:', error);
      res.status(500).json({ error: 'Failed to fetch basemaps' });
    }
  });

  return router;
}