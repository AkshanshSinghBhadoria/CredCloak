/// <reference types="@testing-library/jest-dom" />
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { DTIGauge } from '@/components/DTIGauge';

describe('DTIGauge Component', () => {
  beforeAll(() => {
    // Mock requestAnimationFrame and cancelAnimationFrame to run synchronously
    global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
    global.cancelAnimationFrame = (id) => clearTimeout(id);
  });

  it('renders the gauge label and threshold legends correctly', () => {
    render(<DTIGauge dtiRatio={35} />);
    
    expect(screen.getByText('Debt-to-Income Ratio')).toBeInTheDocument();
    expect(screen.getByText('Green: 0-35% | Amber: 35-50% | Red: 50%+')).toBeInTheDocument();
    
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();
  });
});
