import React from 'react';
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import FileExplorer from './features/fileExplorer/FileExplorer';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FileExplorer />} />
      </Routes>
    </Router>
  );
}
