import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FiPieChart } from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts';
import { formatCurrency } from '@/constants';
import CategoryInvoicesModal from './CategoryInvoicesModal';

const TopCategories = ({ categories = [] }) => {
  const { isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  if (categories.length === 0) return null;

  // Generate colors for each category
  const getColorForIndex = (index) => {
    const colors = [
      {
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        progress: 'bg-blue-500 dark:bg-blue-400',
      },
      {
        badge:
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        progress: 'bg-green-500 dark:bg-green-400',
      },
      {
        badge:
          'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        progress: 'bg-purple-500 dark:bg-purple-400',
      },
      {
        badge:
          'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        progress: 'bg-orange-500 dark:bg-orange-400',
      },
      {
        badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
        progress: 'bg-pink-500 dark:bg-pink-400',
      },
      {
        badge:
          'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
        progress: 'bg-indigo-500 dark:bg-indigo-400',
      },
      {
        badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
        progress: 'bg-teal-500 dark:bg-teal-400',
      },
      {
        badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
        progress: 'bg-cyan-500 dark:bg-cyan-400',
      },
      {
        badge:
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        progress: 'bg-yellow-500 dark:bg-yellow-400',
      },
      {
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        progress: 'bg-red-500 dark:bg-red-400',
      },
    ];
    return colors[index % colors.length];
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FiPieChart className="w-5 h-5" />
          Top Invoice Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {categories.map((category, index) => (
            <div
              key={category.category}
              onClick={() => handleCategoryClick(category)}
              className={`group relative p-4 rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-105 cursor-pointer ${
                isDarkMode
                  ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {/* Rank Badge */}
              <div className="absolute -top-2 -right-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getColorForIndex(index).badge}`}
                >
                  {index + 1}
                </div>
              </div>

              {/* Category Content */}
              <div className="text-center space-y-2">
                {/* Percentage */}
                <div className="flex items-center justify-center">
                  <span
                    className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    {category.percentage}
                  </span>
                  <span
                    className={`text-lg font-medium ml-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                  >
                    %
                  </span>
                </div>

                {/* Category Name */}
                <p
                  className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  title={category.category}
                >
                  {category.category}
                </p>

                {/* Amount */}
                <p
                  className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {formatCurrency(category.total_amount, 'MAD')}
                </p>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden ${
                      isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getColorForIndex(index).progress}`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Category Invoices Modal */}
        <CategoryInvoicesModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          category={selectedCategory}
        />
      </CardContent>
    </Card>
  );
};

TopCategories.propTypes = {
  categories: PropTypes.arrayOf(
    PropTypes.shape({
      category: PropTypes.string.isRequired,
      percentage: PropTypes.number.isRequired,
      total_amount: PropTypes.number.isRequired,
    }),
  ),
};

export default TopCategories;
