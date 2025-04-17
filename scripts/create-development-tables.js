/**
 * Development Platform Database Tables Setup Script
 * 
 * This script creates all the required database tables for the TaxI_AI Development Platform.
 * It sets up the dev_projects, dev_project_files, and dev_preview_settings tables.
 * 
 * Usage: node scripts/create-development-tables.js
 */

import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createDevelopmentTables() {
  const client = await pool.connect();

  try {
    console.log('Starting transaction...');
    await client.query('BEGIN');

    console.log('Creating dev_projects table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dev_projects (
        project_id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        language VARCHAR(50) NOT NULL,
        framework VARCHAR(50),
        status VARCHAR(50) DEFAULT 'DRAFT',
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating dev_project_files table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dev_project_files (
        file_id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        path VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES dev_projects(project_id) ON DELETE CASCADE
      )
    `);

    console.log('Creating dev_preview_settings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dev_preview_settings (
        settings_id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        port INTEGER,
        command VARCHAR(255),
        auto_reload BOOLEAN DEFAULT TRUE,
        environment JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES dev_projects(project_id) ON DELETE CASCADE
      )
    `);

    console.log('Creating dev_templates table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dev_templates (
        template_id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        language VARCHAR(50) NOT NULL,
        category VARCHAR(50),
        is_official BOOLEAN DEFAULT TRUE,
        content JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add some initial templates
    console.log('Adding initial templates...');
    await client.query(`
      INSERT INTO dev_templates (
        template_id, name, description, type, language, category, is_official, content
      ) VALUES 
      (
        'template-flask-basic', 
        'Basic Flask App', 
        'A simple Flask application for building assessment tools', 
        'FLASK', 
        'PYTHON', 
        'Assessment', 
        TRUE, 
        '{"files": [{"name": "app.py", "path": "/", "content": "from flask import Flask, render_template\\n\\napp = Flask(__name__)\\n\\n@app.route(\'/\')\\ndef home():\\n    return render_template(\'index.html\', title=\'Assessment Tool\')\\n\\nif __name__ == \'__main__\':\\n    app.run(host=\'0.0.0.0\', port=5000, debug=True)"}, {"name": "index.html", "path": "/templates", "content": "<!DOCTYPE html>\\n<html>\\n<head>\\n    <title>{{ title }}</title>\\n</head>\\n<body>\\n    <h1>Welcome to Assessment Tool</h1>\\n    <p>This is a basic Flask app for property assessment.</p>\\n</body>\\n</html>"}]}'
      ),
      (
        'template-streamlit-basic', 
        'Basic Streamlit App', 
        'A simple Streamlit application for data visualization', 
        'STREAMLIT', 
        'PYTHON', 
        'Visualization', 
        TRUE, 
        '{"files": [{"name": "app.py", "path": "/", "content": "import streamlit as st\\nimport pandas as pd\\nimport numpy as np\\n\\nst.title(\\'Assessment Data Visualization\\')\\n\\nst.write(\\'Welcome to the Assessment Data Visualization tool\\')\\n\\ndata = pd.DataFrame({\\n    \\'Property ID\\': [\\'P1\\', \\'P2\\', \\'P3\\', \\'P4\\', \\'P5\\'],\\n    \\'Value\\': [300000, 425000, 550000, 375000, 600000],\\n    \\'Year\\': [2020, 2020, 2021, 2021, 2022]\\n})\\n\\nst.subheader(\\'Property Data\\')\\nst.dataframe(data)\\n\\nst.subheader(\\'Property Value Chart\\')\\nst.bar_chart(data[\\'Value\\'])"}]}'
      ),
      (
        'template-static-basic', 
        'Basic Static Web App', 
        'A simple static HTML/CSS/JS application', 
        'STATIC', 
        'JAVASCRIPT', 
        'UI', 
        TRUE, 
        '{"files": [{"name": "index.html", "path": "/", "content": "<!DOCTYPE html>\\n<html>\\n<head>\\n    <title>Assessment Tool</title>\\n    <link rel=\\"stylesheet\\" href=\\"style.css\\">\\n</head>\\n<body>\\n    <div class=\\"container\\">\\n        <h1>Property Assessment Tool</h1>\\n        <p>A simple static web application for property assessment.</p>\\n        <button id=\\"calculate-btn\\">Calculate Assessment</button>\\n        <div id=\\"result\\" class=\\"hidden\\">\\n            <h2>Assessment Results</h2>\\n            <p>Property Value: <span id=\\"property-value\\">$0</span></p>\\n        </div>\\n    </div>\\n    <script src=\\"script.js\\"></script>\\n</body>\\n</html>"}, {"name": "style.css", "path": "/", "content": "body {\\n    font-family: Arial, sans-serif;\\n    line-height: 1.6;\\n    margin: 0;\\n    padding: 0;\\n    background-color: #f4f4f4;\\n}\\n\\n.container {\\n    width: 80%;\\n    margin: 30px auto;\\n    padding: 20px;\\n    background: white;\\n    border-radius: 5px;\\n    box-shadow: 0 0 10px rgba(0,0,0,0.1);\\n}\\n\\nh1 {\\n    color: #333;\\n}\\n\\nbutton {\\n    background: #4CAF50;\\n    color: white;\\n    border: none;\\n    padding: 10px 15px;\\n    border-radius: 3px;\\n    cursor: pointer;\\n}\\n\\n.hidden {\\n    display: none;\\n}\\n\\n#result {\\n    margin-top: 20px;\\n    padding: 10px;\\n    background: #f9f9f9;\\n    border-radius: 3px;\\n}"}, {"name": "script.js", "path": "/", "content": "document.getElementById(\\'calculate-btn\\').addEventListener(\\'click\\', function() {\\n    // Simulate a calculation\\n    const value = Math.floor(Math.random() * 500000) + 200000;\\n    document.getElementById(\\'property-value\\').textContent = \\'$\\' + value.toLocaleString();\\n    document.getElementById(\\'result\\').classList.remove(\\'hidden\\');\\n});"}]}'
      )
    `);

    console.log('Committing transaction...');
    await client.query('COMMIT');
    console.log('All development platform tables created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating development tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

createDevelopmentTables()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });