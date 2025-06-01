import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { Group } from '@/types';
import { getGroupSchedule } from '@/lib/firebaseService/scheduleService';
import ScheduleView from '@/components/admin/schedules/ScheduleView';

interface ScheduleTabProps {
  group: Group;
  semesterId: string;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({ group, semesterId }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        await getGroupSchedule(group.id, semesterId);
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [group.id, semesterId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Расписание группы {group.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <ScheduleView
          semesterId={semesterId}
          groupId={group.id}
        />
      </CardContent>
    </Card>
  );
};

export default ScheduleTab; 