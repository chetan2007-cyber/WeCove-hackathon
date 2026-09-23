import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('Smriti Memory Care Application', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders the application without crashing and shows login screen', async () => {
    render(<App />);
    const patientOptions = await screen.findAllByText(/Patient/i);
    expect(patientOptions.length).toBeGreaterThan(0);
  });
});
