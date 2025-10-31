import React from 'react';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Đang tải...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mb-4"></div>
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
};

export default LoadingState;


