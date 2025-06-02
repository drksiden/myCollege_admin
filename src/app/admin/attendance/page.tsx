import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebaseService/authService';
import { getGroupsByTeacher } from '@/lib/firebaseService/groupService';
import { getGroupSubjects } from '@/lib/firebaseService/groupService';
import { getStudentsByGroup } from '@/lib/firebaseService/studentService';
import { getSemesters } from '@/lib/firebaseService/semesterService';
import { getAttendanceByGroupAndSubject } from '@/lib/firebaseService/attendanceService';
import { updateAttendance } from '@/lib/firebaseService/attendanceService';
import { Group } from '@/types';
import { Student } from '@/types';
import { Subject } from '@/types';
import { Semester } from '@/types';
import { Attendance } from '@/types';
import { AttendanceStatus } from '@/types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AttendancePage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // ... existing useEffect hooks ...

  const handleStudentClick = (student: Student) => {
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
      <h1 className="text-2xl font-bold mb-6">Журнал посещаемости</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger>
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

        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите предмет" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
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
            {semesters.map((semester) => (
              <SelectItem key={semester.id} value={semester.id}>
                {semester.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroupId && selectedSubjectId && selectedSemesterId && students.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Студент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Посещаемость
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => {
                  const stats = getAttendanceStats(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.lastName} {student.firstName} {student.middleName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={stats.presentPercentage >= 80 ? "success" : "destructive"}>
                          {stats.presentPercentage}%
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {stats.present} присутствовал, {stats.absent} отсутствовал, {stats.late} опоздал, {stats.excused} уважительная причина
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStudentClick(student)}
                        >
                          Детали
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedStudent && `${selectedStudent.lastName} ${selectedStudent.firstName} ${selectedStudent.middleName}`}
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {getStudentAttendance(selectedStudent.id).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">
                        {format(record.date.toDate(), 'd MMMM yyyy', { locale: ru })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {record.notes}
                      </div>
                    </div>
                    <Badge
                      variant={
                        record.status === AttendanceStatus.PRESENT ? "success" :
                        record.status === AttendanceStatus.ABSENT ? "destructive" :
                        record.status === AttendanceStatus.LATE ? "warning" :
                        "secondary"
                      }
                    >
                      {record.status === AttendanceStatus.PRESENT ? "Присутствовал" :
                       record.status === AttendanceStatus.ABSENT ? "Отсутствовал" :
                       record.status === AttendanceStatus.LATE ? "Опоздал" :
                       "Уважительная причина"}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 