import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import type { Group } from '@/types';

interface ScheduleFiltersProps {
  groups: Group[];
  onFilterChange: (filters: ScheduleFilters) => void;
  className?: string;
}

export interface ScheduleFilters {
  search: string;
  groupId: string;
  course?: string;
  semester?: string;
  year?: string;
}

const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
  groups,
  onFilterChange,
  className,
}) => {
  const [filters, setFilters] = React.useState<ScheduleFilters>({
    search: '',
    groupId: 'all',
    course: '',
    semester: '',
    year: '',
  });

  const handleFilterChange = (key: keyof ScheduleFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      groupId: 'all',
      course: '',
      semester: '',
      year: '',
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск расписаний..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={filters.groupId}
          onValueChange={(value) => handleFilterChange('groupId', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Выберите группу" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все группы</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.course}
          onValueChange={(value) => handleFilterChange('course', value)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Курс" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Все курсы</SelectItem>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
            <SelectItem value="5">5</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.semester}
          onValueChange={(value) => handleFilterChange('semester', value)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Семестр" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Все семестры</SelectItem>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Год"
          value={filters.year}
          onChange={e => handleFilterChange('year', e.target.value)}
          className="w-[100px]"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={clearFilters}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ScheduleFilters; 