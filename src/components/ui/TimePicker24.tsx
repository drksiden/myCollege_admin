import React from 'react';

interface TimePicker24Props {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  step?: number; // в минутах
  disabled?: boolean;
  className?: string;
}

// Генерация массива времени с шагом step минут
function generateTimeOptions(min = '08:00', max = '21:00', step = 5) {
  const options: string[] = [];
  let [h, m] = min.split(':').map(Number);
  const [maxH, maxM] = max.split(':').map(Number);
  while (h < maxH || (h === maxH && m <= maxM)) {
    options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    m += step;
    if (m >= 60) {
      h += 1;
      m = m % 60;
    }
  }
  return options;
}

const TimePicker24 = React.forwardRef<HTMLSelectElement, TimePicker24Props>(
  ({ value, onChange, min = '08:00', max = '21:00', step = 5, disabled, className }, ref) => {
    const options = generateTimeOptions(min, max, step);
    return (
      <select
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={className + ' rounded border px-2 py-1 bg-background'}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
);
TimePicker24.displayName = 'TimePicker24';

export default TimePicker24; 