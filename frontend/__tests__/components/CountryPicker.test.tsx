import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CountryPicker, countries, Country } from '@/components/CountryPicker';

describe('CountryPicker', () => {
  const mockOnSelect = jest.fn();
  const defaultCountry: Country = countries[0]; // United States

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('countries data', () => {
    it('has United States as first country', () => {
      expect(countries[0].name).toBe('United States');
      expect(countries[0].code).toBe('US');
      expect(countries[0].dial).toBe('+1');
    });

    it('has Mexico as second country', () => {
      expect(countries[1].name).toBe('Mexico');
      expect(countries[1].code).toBe('MX');
      expect(countries[1].dial).toBe('+52');
    });

    it('contains common countries', () => {
      const countryNames = countries.map(c => c.name);
      expect(countryNames).toContain('Canada');
      expect(countryNames).toContain('United Kingdom');
      expect(countryNames).toContain('Brazil');
      expect(countryNames).toContain('Japan');
    });

    it('has valid data for each country', () => {
      countries.forEach(country => {
        expect(country.name).toBeDefined();
        expect(country.code).toHaveLength(2);
        expect(country.dial).toMatch(/^\+\d+$/);
        expect(country.flag).toBeDefined();
      });
    });

    it('has over 60 countries', () => {
      expect(countries.length).toBeGreaterThan(60);
    });
  });

  describe('rendering', () => {
    it('renders selected country flag and dial code', () => {
      const { getByText } = render(
        <CountryPicker selectedCountry={defaultCountry} onSelect={mockOnSelect} />
      );

      expect(getByText(defaultCountry.dial)).toBeTruthy();
    });

    it('renders with different selected country', () => {
      const mexico = countries.find(c => c.code === 'MX')!;
      const { getByText } = render(
        <CountryPicker selectedCountry={mexico} onSelect={mockOnSelect} />
      );

      expect(getByText('+52')).toBeTruthy();
    });
  });

  describe('modal interaction', () => {
    it('opens modal when button pressed', () => {
      const { getByText, getByPlaceholderText } = render(
        <CountryPicker selectedCountry={defaultCountry} onSelect={mockOnSelect} />
      );

      // Press the button (find by dial code)
      fireEvent.press(getByText(defaultCountry.dial));

      // Search input should be visible in modal
      expect(getByPlaceholderText('Search country or code...')).toBeTruthy();
    });

    it('shows all countries in modal', async () => {
      const { getByText, findByText } = render(
        <CountryPicker selectedCountry={defaultCountry} onSelect={mockOnSelect} />
      );

      fireEvent.press(getByText(defaultCountry.dial));

      expect(await findByText('United States')).toBeTruthy();
      expect(await findByText('Mexico')).toBeTruthy();
      expect(await findByText('Canada')).toBeTruthy();
    });

    it('calls onSelect when country is selected', async () => {
      const { getByText, findByText } = render(
        <CountryPicker selectedCountry={defaultCountry} onSelect={mockOnSelect} />
      );

      fireEvent.press(getByText(defaultCountry.dial));

      const mexicoRow = await findByText('Mexico');
      fireEvent.press(mexicoRow);

      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'MX', name: 'Mexico' })
      );
    });
  });

  describe('search functionality', () => {
    it('filters countries by name', async () => {
      const { getByText, getByPlaceholderText, findByText, queryByText } = render(
        <CountryPicker selectedCountry={defaultCountry} onSelect={mockOnSelect} />
      );

      fireEvent.press(getByText(defaultCountry.dial));

      const searchInput = getByPlaceholderText('Search country or code...');
      fireEvent.changeText(searchInput, 'Mex');

      // Mexico should be visible
      expect(await findByText('Mexico')).toBeTruthy();

      // Other countries should be filtered out
      await waitFor(() => {
        expect(queryByText('Canada')).toBeNull();
      });
    });

    it('filters countries by dial code', async () => {
      const { getByText, getByPlaceholderText, findByText, queryByText } = render(
        <CountryPicker selectedCountry={defaultCountry} onSelect={mockOnSelect} />
      );

      fireEvent.press(getByText(defaultCountry.dial));

      const searchInput = getByPlaceholderText('Search country or code...');
      fireEvent.changeText(searchInput, '+52');

      expect(await findByText('Mexico')).toBeTruthy();
    });

    it('filters countries by country code', async () => {
      const { getByText, getByPlaceholderText, findByText } = render(
        <CountryPicker selectedCountry={defaultCountry} onSelect={mockOnSelect} />
      );

      fireEvent.press(getByText(defaultCountry.dial));

      const searchInput = getByPlaceholderText('Search country or code...');
      fireEvent.changeText(searchInput, 'MX');

      expect(await findByText('Mexico')).toBeTruthy();
    });

    it('shows empty state when no matches', async () => {
      const { getByText, getByPlaceholderText, findByText } = render(
        <CountryPicker selectedCountry={defaultCountry} onSelect={mockOnSelect} />
      );

      fireEvent.press(getByText(defaultCountry.dial));

      const searchInput = getByPlaceholderText('Search country or code...');
      fireEvent.changeText(searchInput, 'xyz123');

      expect(await findByText('No countries found')).toBeTruthy();
    });

    it('search is case insensitive', async () => {
      const { getByText, getByPlaceholderText, findByText } = render(
        <CountryPicker selectedCountry={defaultCountry} onSelect={mockOnSelect} />
      );

      fireEvent.press(getByText(defaultCountry.dial));

      const searchInput = getByPlaceholderText('Search country or code...');
      fireEvent.changeText(searchInput, 'mexico');

      expect(await findByText('Mexico')).toBeTruthy();
    });
  });

  describe('Country interface', () => {
    it('has correct shape', () => {
      const country: Country = {
        name: 'Test',
        code: 'TS',
        dial: '+99',
        flag: '🏳️',
      };

      expect(country.name).toBe('Test');
      expect(country.code).toBe('TS');
      expect(country.dial).toBe('+99');
      expect(country.flag).toBe('🏳️');
    });
  });
});
