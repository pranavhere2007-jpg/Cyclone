import { useState, useEffect } from 'react';

export default function SatelliteImage({ cyclone }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [frameName, setFrameName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLatestFrame() {
      try {
        const response = await fetch('http://localhost:3000/api/latest-satellite-frame');
        if (!response.ok) throw new Error('Failed to fetch frame');
        
        const data = await response.json();
        if (data.image_url) {
          setImageUrl(data.image_url);
          setFrameName(data.filename || 'frame_0000.png');
        }
      } catch (err) {
        console.warn('Backend frame fetch failed, defaulting to frame_0000.png:', err);
        // Fallback directly to frame_0000.png if backend fails
        setImageUrl('http://localhost:3000/uploads/frame_0000.png');
        setFrameName('frame_0000.png');
      } finally {
        setLoading(false);
      }
    }

    loadLatestFrame();
  }, [cyclone?.id]);

  return (
    <div className="card" style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="card-title">IR Satellite Imagery</h3>
          <p className="card-subtitle">INSAT infrared observation scan</p>
        </div>
        {frameName && (
          <span style={{ 
            fontSize: '0.8rem', 
            background: '#e2e8f0', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '4px', 
            fontFamily: 'monospace' 
          }}>
            {frameName}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading satellite frame...
        </div>
      ) : imageUrl ? (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <img
            src={imageUrl}
            alt="Satellite Observation Frame"
            onError={() => setImageUrl('http://localhost:3000/uploads/frame_0000.png')}
            style={{
              width: '100%',
              maxHeight: '450px',
              objectFit: 'cover',
              borderRadius: '12px',
              border: '1px solid #cbd5e1'
            }}
          />
        </div>
      ) : (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          No frame files found in Backend/uploads/
        </div>
      )}
    </div>
  );
}