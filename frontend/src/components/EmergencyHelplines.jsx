import { useState } from 'react';

const HELPLINES = [
  { name: 'National Emergency Number', number: '112', icon: '📞', primary: true },
  { name: 'National Disaster Response Force (NDRF)', number: '011-24363260', icon: '🚨' },
  { name: 'State Disaster Management Authority (SDMA)', number: '1070', icon: '🏛️' },
  { name: 'District Disaster Management (DDMA)', number: '1077', icon: '🏢' },
  { name: 'Indian Coast Guard Search & Rescue', number: '1554', icon: '⚓' },
];

export default function EmergencyHelplines() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="card" 
      style={{ 
        marginBottom: '1.5rem', 
        borderLeft: '5px solid #dc2626',
        background: '#fff5f5',
        padding: '1rem 1.25rem'
      }}
    >
      {/* Top Deck Banner Header */}
      <div 
        style={{ 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>⚠️</span>
          <div>
            <span style={{ fontWeight: 700, color: '#991b1b', fontSize: '1rem', display: 'block' }}>
              EMERGENCY RESPONSE DIRECTORY
            </span>
            <span style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
              Quick dial response teams during active storm alerts
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Quick Direct Dial Link for 112 */}
          <a
  href="tel:112"
  onClick={(e) => e.stopPropagation()}
  style={{
    background: '#16a34a', // Emerald Green
    color: '#ffffff',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    fontWeight: 700,
    fontSize: '0.9rem',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem'
  }}
>
  <span>📞</span> Call 112
</a>
          {/* Dropdown Toggle Button */}
          <button 
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#991b1b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            {isOpen ? 'Hide Contacts ▲' : 'All Helplines ▼'}
          </button>
        </div>
      </div>

      {/* Collapsible Dropdown List */}
      {isOpen && (
        <div 
          style={{ 
            marginTop: '1rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid #fecaca',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem'
          }}
        >
          {HELPLINES.map((item, index) => (
            <div 
              key={index} 
              style={{ 
                background: '#ffffff', 
                padding: '0.75rem 1rem', 
                borderRadius: '6px', 
                border: '1px solid #fca5a5',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#450a0a' }}>
                    {item.name}
                  </div>
                </div>
              </div>

              <a 
                href={`tel:${item.number}`}
                style={{ 
                  fontSize: '0.95rem', 
                  fontWeight: 700, 
                  color: '#dc2626', 
                  textDecoration: 'none',
                  background: '#fef2f2',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #fecaca'
                }}
              >
                {item.number}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}