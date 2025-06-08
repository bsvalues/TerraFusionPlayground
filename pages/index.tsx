import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  useEffect(() => {
    // Notify Electron that the app is ready
    if (window.electron) {
      window.electron.send('app-ready');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto px-4 py-8"
      >
        <h1 className="text-4xl font-bold mb-4">Welcome to TerraFusion</h1>
        <p className="text-lg text-gray-300">
          Your AI-powered civil infrastructure management platform
        </p>
      </motion.div>
    </div>
  );
} 