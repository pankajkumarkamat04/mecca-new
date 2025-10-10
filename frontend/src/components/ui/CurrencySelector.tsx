'use client';

import React from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { getActiveCurrencies, getCurrencyByCode } from '@/lib/currencyUtils';
import Select from './Select';

interface CurrencySelectorProps {
  value?: string;
  onChange: (currencyCode: string) => void;
  label?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  label = 'Currency',
  fullWidth = false,
  disabled = false,
  className = '',
}) => {
  const { company } = useSettings();
  const currencySettings = company?.currencySettings;

  const activeCurrencies = getActiveCurrencies(currencySettings);
  const currentCurrency = value || currencySettings?.defaultDisplayCurrency || 'USD';

  const currencyOptions = activeCurrencies.map((currency) => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.code} - ${currency.name}`,
  }));

  // If no active currencies, show default USD option
  if (currencyOptions.length === 0) {
    currencyOptions.push({
      value: 'USD',
      label: '$ USD - US Dollar',
    });
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <Select
      label={label}
      options={currencyOptions}
      value={currentCurrency}
      onChange={handleChange as any}
      fullWidth={fullWidth}
      disabled={disabled}
      className={className}
    />
  );
};

export default CurrencySelector;

