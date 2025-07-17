import React from 'react';
import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

const GrowthIndicator = ({ value, isPositive = true }) => (
  <div
    className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}
  >
    {isPositive ? (
      <FiTrendingUp className="w-4 h-4" />
    ) : (
      <FiTrendingDown className="w-4 h-4" />
    )}
    <span>
      {isPositive ? '+' : ''}
      {value}%
    </span>
  </div>
);

export default GrowthIndicator;
