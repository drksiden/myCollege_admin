import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';

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

const TimePicker24 = React.forwardRef<HTMLButtonElement, TimePicker24Props>(
  ({ value, onChange, min = '08:00', max = '21:00', step = 5, disabled, className }, ref) => {
    const options = generateTimeOptions(min, max, step);
    return (
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger ref={ref} className={className}>
          <SelectValue placeholder="Выберите время" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);
TimePicker24.displayName = 'TimePicker24';

export default TimePicker24; 