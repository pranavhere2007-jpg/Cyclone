import { useState, useEffect } from 'react';
import { getSatelliteImageUrl } from '../data/dataCollector';

export default function SatelliteImage({ cyclone }) {
  const [frames, setFrames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(800); // Default: 800ms per frame (slower, cleaner playback)
  const [loading, setLoading] = useState(true);

  // Fetch frame sequence on component mount
  useEffect(() => {
    async function loadAllFrames() {
      try {
        const response = await fetch('http://localhost:3000/api/all-satellite-frames');
        if (!response.ok) throw new Error('Failed to fetch frame sequence');
        
        const data = await response.json();
        if (data.length > 0) {
          setFrames(data);
          setCurrentIndex(data.length - 1); // Start at latest frame
        }
      } catch (err) {
        console.warn('Failed to load satellite loop sequence:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAllFrames();
  }, [cyclone?.id]);

  // Loop playback timer (uses dynamic speed variable)
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % frames.length);
    }, speed);

    return () => clearInterval(timer);
  }, [isPlaying, frames, speed]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        Loading satellite loop sequence...
      </div>
    );
  }

  if (frames.length === 0) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        No frame sequence available in simulator directory
      </div>
    );
  }

  const currentFrame = frames[currentIndex];
  const imageUrl = getSatelliteImageUrl(currentFrame?.image_url);

  return (
    <div className="card" style={{ marginTop: '1rem', maxWidth: '850px', margin: '1rem auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 className="card-title" style={{ margin: 0 }}>IR Satellite Loop Sequence</h3>
          <p className="card-subtitle" style={{ margin: 0 }}>INSAT infrared observation playback</p>
        </div>
        <span style={{ 
          fontSize: '0.8rem', 
          background: '#f1f5f9', 
          color: '#334155',
          padding: '0.25rem 0.6rem', 
          borderRadius: '4px', 
          fontFamily: 'monospace',
          border: '1px solid #cbd5e1'
        }}>
          {currentFrame.filename} ({currentIndex + 1} / {frames.length})
        </span>
      </div>

      {/* Frame Viewer Container */}
      <div style={{
        position: 'relative',
        width: '100%',
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        border: '1px solid #cbd5e1',
        minHeight: '350px',
        maxHeight: '500px'
      }}>
        <img
          src={imageUrl}
          alt={`Satellite observation frame ${currentFrame.filename}`}
          style={{
            maxWidth: '100%',
            maxHeight: '500px',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>

      {/* Playback & Speed Controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        marginTop: '1.25rem',
        padding: '0.75rem 1rem',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        {/* Play / Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '6px',
            border: 'none',
            background: isPlaying ? '#ef4444' : '#16a34a',
            color: '#ffffff',
            fontWeight: '600',
            cursor: 'pointer',
            minWidth: '80px'
          }}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        {/* Speed Selector Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#e2e8f0', padding: '0.2rem', borderRadius: '6px' }}>
          {[
            { label: '0.5x', interval: 1200 },
            { label: '1x', interval: 800 },
            { label: '1.5x', interval: 400 },
            { label: '2x', interval: 200 }
          ].map((option) => (
            <button
              key={option.label}
              onClick={() => setSpeed(option.interval)}
              style={{
                padding: '0.25rem 0.6rem',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                background: speed === option.interval ? '#0284c7' : 'transparent',
                color: speed === option.interval ? '#ffffff' : '#475569'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Timeline Scrubber */}
        <input
          type="range"
          min="0"
          max={frames.length - 1}
          value={currentIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentIndex(Number(e.target.value));
          }}
          style={{ flex: 1, minWidth: '150px', cursor: 'pointer', accentColor: '#0284c7' }}
        />
      </div>
    </div>
  );
}