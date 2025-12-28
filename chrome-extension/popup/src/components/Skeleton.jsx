import React from 'react';
import './Skeleton.css';

function Skeleton({ width, height, borderRadius, className = '' }) {
  const style = {
    width: width || '100%',
    height: height || '1em',
    borderRadius: borderRadius || 'var(--radius-md)',
  };

  return (
    <div
      className={`skeleton ${className}`}
      style={style}
      aria-label="Loading..."
    />
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="1em"
          className={i === lines - 1 ? 'skeleton-line-short' : ''}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`skeleton-card ${className}`}>
      <Skeleton height="24px" width="60%" className="skeleton-title" />
      <SkeletonText lines={3} className="skeleton-content" />
    </div>
  );
}

export function SkeletonList({ items = 3, className = '' }) {
  return (
    <div className={`skeleton-list ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default Skeleton;


