import { useState } from 'react';
import type { Group } from '@/types';
import type { AppUser } from '@/types';
import type { Subject } from '@/types';
import type { Semester } from '@/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const AttendanceStatus = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused'
} as const;

type AttendanceStatus = typeof AttendanceStatus[keyof typeof AttendanceStatus];

interface AttendanceRecord {
  id: string;
  studentId: string;
  status: AttendanceStatus;
  date: { toDate: () => Date };
  notes?: string;
}

export default function AttendancePage() {
  const [groups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [subjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [students] = useState<AppUser[]>([]);
  const [semesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [attendance] = useState<AttendanceRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AppUser | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleStudentClick = (student: AppUser) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
  };

  const getStudentAttendance = (studentId: string) => {
    return attendance.filter(a => a.studentId === studentId);
  };

  const getAttendanceStats = (studentId: string) => {
    const studentAttendance = getStudentAttendance(studentId);
    const total = studentAttendance.length;
    const present = studentAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const absent = studentAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const late = studentAttendance.filter(a => a.status === AttendanceStatus.LATE).length;
    const excused = studentAttendance.filter(a => a.status === AttendanceStatus.EXCUSED).length;

    return {
      total,
      present,
      absent,
      late,
      excused,
      presentPercentage: total ? Math.round((present / total) * 100) : 0
    };
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Посещаемость</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите группу" />
          </SelectTrigger>
          <SelectContent>
            {groups.map(group => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите предмет" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map(subject => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите семестр" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map(semester => (
              <SelectItem key={semester.id} value={semester.id}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-lg shadow">
        <ScrollArea className="h-[600px]">
          <div className="p-4">
            {students.map(student => {
              const stats = getAttendanceStats(student.uid);
              return (
                <div
                  key={student.uid}
                  className="flex items-center justify-between p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleStudentClick(student)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {student.photoURL ? (
                        <img
                          src={student.photoURL}
                          alt={`${student.firstName} ${student.lastName}`}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <span className="text-gray-500">
                          {student.firstName?.[0]}{student.lastName?.[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {student.lastName} {student.firstName} {student.middleName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {student.role === 'student' ? 'Студент' : 'Преподаватель'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={stats.presentPercentage >= 80 ? 'default' : stats.presentPercentage >= 60 ? 'secondary' : 'destructive'}>
                      {stats.presentPercentage}%
                    </Badge>
                    <div className="text-sm text-gray-500">
                      {stats.present}/{stats.total} занятий
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent && `${selectedStudent.lastName} ${selectedStudent.firstName} ${selectedStudent.middleName}`}
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Общая статистика</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Всего занятий:</span>
                      <span>{getAttendanceStats(selectedStudent.uid).total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Присутствовал:</span>
                      <span>{getAttendanceStats(selectedStudent.uid).present}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Отсутствовал:</span>
                      <span>{getAttendanceStats(selectedStudent.uid).absent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Опоздал:</span>
                      <span>{getAttendanceStats(selectedStudent.uid).late}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>По уважительной причине:</span>
                      <span>{getAttendanceStats(selectedStudent.uid).excused}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Процент посещаемости</h4>
                  <div className="flex items-center justify-center h-32">
                    <div className="text-4xl font-bold">
                      {getAttendanceStats(selectedStudent.uid).presentPercentage}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">История посещаемости</h4>
                <div className="space-y-2">
                  {getStudentAttendance(selectedStudent.uid).map(record => (
                    <div key={record.id} className="flex justify-between items-center p-2 bg-white rounded">
                      <div>
                        <div className="font-medium">
                          {format(record.date.toDate(), 'dd MMMM yyyy', { locale: ru })}
                        </div>
                        {record.notes && (
                          <div className="text-sm text-gray-500">{record.notes}</div>
                        )}
                      </div>
                      <Badge
                        variant={
                          record.status === AttendanceStatus.PRESENT
                            ? 'default'
                            : record.status === AttendanceStatus.LATE
                            ? 'secondary'
                            : record.status === AttendanceStatus.EXCUSED
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {record.status === AttendanceStatus.PRESENT
                          ? 'Присутствовал'
                          : record.status === AttendanceStatus.LATE
                          ? 'Опоздал'
                          : record.status === AttendanceStatus.EXCUSED
                          ? 'По уважительной причине'
                          : 'Отсутствовал'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 