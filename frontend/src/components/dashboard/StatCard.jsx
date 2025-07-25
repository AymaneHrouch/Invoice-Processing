import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

export function StatCard({ title, value, change, icon, color }) {
  const isPositive = change >= 0;
  return (
    <div className="stat bg-base-100 rounded-lg shadow-lg">
      <div className={`stat-figure ${color}`}>{icon}</div>
      <div className="stat-title">{title}</div>
      <div className={`stat-value ${color}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="stat-desc flex items-center gap-1">
        {isPositive ? (
          <FiTrendingUp className="w-4 h-4 text-success" />
        ) : (
          <FiTrendingDown className="w-4 h-4 text-error" />
        )}
        <span className={isPositive ? 'text-success' : 'text-error'}>
          {isPositive ? '+' : ''}
          {change}%
        </span>
        <span>this month</span>
      </div>
    </div>
  );
}
