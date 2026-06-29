/// <reference types="@testing-library/jest-dom" />
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { LoanReadinessSnapshot } from '@/components/LoanReadinessSnapshot';
import { LoanReadinessIndicator } from '@/lib/types';

describe('LoanReadinessSnapshot Component', () => {
  const mockIndicators: LoanReadinessIndicator[] = [
    {
      label: 'Average Balance',
      value: '150.00 XLM',
      status: 'pass',
      threshold: '>= 100 XLM',
      description: 'Minimum average balance over the selected period',
    },
  ];

  it('renders indicators list and header description correctly', () => {
    render(<LoanReadinessSnapshot indicators={mockIndicators} />);
    
    expect(screen.getByText('Your Loan Readiness')).toBeInTheDocument();
    expect(screen.getByText('Average Balance')).toBeInTheDocument();
    expect(screen.getByText('150.00 XLM')).toBeInTheDocument();
    expect(screen.getByText('>= 100 XLM')).toBeInTheDocument();
  });
});
