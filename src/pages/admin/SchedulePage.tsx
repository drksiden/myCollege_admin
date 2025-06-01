import React, { useEffect, useState } from 'react';
import { getGroups } from '@/lib/firebaseService/groupService';
import { getSemesters } from '@/lib/firebaseService/semesterService';
import type { Group, Semester } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import ScheduleView from '@/components/admin/schedules/ScheduleView';

const SchedulePage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsData, semestersData] = await Promise.all([
          getGroups(),
          getSemesters('active'),
        ]);

        setGroups(groupsData);
        setSemesters(semestersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSemesterChange = (semesterId: string) => {
    setSelectedSemesterId(semesterId);
    setSelectedGroupId(''); // Сбрасываем выбранную группу при смене семестра
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Расписание занятий</CardTitle>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Семестр:</span>
                <Select
                  value={selectedSemesterId}
                  onValueChange={handleSemesterChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Выберите семестр" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Группа:</span>
                <Select
                  value={selectedGroupId}
                  onValueChange={handleGroupChange}
                  disabled={!selectedSemesterId}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {selectedSemesterId && selectedGroupId ? (
            <ScheduleView
              semesterId={selectedSemesterId}
              groupId={selectedGroupId}
            />
          ) : (
            <div className="text-center text-muted-foreground">
              Выберите семестр и группу для просмотра расписания
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchedulePage;
