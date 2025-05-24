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
import type { Group, Teacher } from '@/types';

interface ScheduleFiltersProps {
  groups: Group[];
  teachers: Teacher[];
  onFilterChange: (filters: ScheduleFilters) => void;
  className?: string;
}

export interface ScheduleFilters {
  search: string;
  groupId: string;
  teacherId: string;
  semester?: number;
  year?: number;
}

const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
  groups,
  teachers,
  onFilterChange,
  className,
}) => {
  const [filters, setFilters] = React.useState<ScheduleFilters>({
    search: '',
    groupId: '',
    teacherId: '',
  });

  const handleFilterChange = (key: keyof ScheduleFilters, value: string | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      groupId: '',
      teacherId: '',
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
            placeholder="Search schedules..."
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
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Groups</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.teacherId}
          onValueChange={(value) => handleFilterChange('teacherId', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select teacher" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Teachers</SelectItem>
            {teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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