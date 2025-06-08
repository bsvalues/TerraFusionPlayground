'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  useEffect(() => {
    if (window.electron) {
      window.electron.send('app-ready');
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-gray-900 to-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to TerraFusion
        </h1>
        <p className="text-gray-400 text-lg">
          The next generation of civil infrastructure management
        </p>
      </motion.div>
    </main>
  );
} 