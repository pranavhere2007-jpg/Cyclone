import React from 'react';

export default function IntensityBadge({ classification }) {
  let typeClass = 'badge-default';
  
  if (!classification) {
    return (
      <span className="badge badge-default">
        Unclassified
      </span>
    );
  }
  
  if (classification.includes('Super')) {
    typeClass = 'badge-super';
  } else if (classification.includes('Severe')) {
    typeClass = 'badge-severe';
  } else {
    typeClass = 'badge-storm';
  }

  return (
    <span className={`badge ${typeClass}`}>
      {classification}
    </span>
  );
}