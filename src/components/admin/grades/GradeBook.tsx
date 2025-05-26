import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getGrades, createGrade, updateGrade } from '@/lib/firebaseService/gradeService';
import { getStudents } from '@/lib/firebaseService/studentService';
import { getSubjects } from '@/lib/firebaseService/subjectService';
import { getGroups } from '@/lib/firebaseService/groupService';
import type { Grade, Student, Subject, Group } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import BulkGradeInput from './BulkGradeInput';
import { exportGradesToExcel } from '@/lib/exportService';
import { exportGradesToPDF } from '@/lib/pdfService';
import GradeStatistics from './GradeStatistics';
import GradeImport from './GradeImport';
import GradeComments from './GradeComments';

interface GradeBookProps {
  teacherId: string;
}

export default function GradeBook({ teacherId }: GradeBookProps) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [editingGrade, setEditingGrade] = useState<{ studentId: string; type: string } | null>(null);
  const [gradeValue, setGradeValue] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gradesData, studentsData, subjectsData, groupsData] = await Promise.all([
        getGrades(),
        getStudents(),
        getSubjects(),
        getGroups(),
      ]);
      setGrades(gradesData);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = async (studentId: string, type: string, value: string) => {
    if (!selectedGroup || !selectedSubject) return;

    try {
      const gradeData = {
        studentId,
        subjectId: selectedSubject,
        groupId: selectedGroup,
        teacherId,
        value: Number(value),
        type,
        semester: selectedSemester,
        date: Timestamp.now(),
      };

      const existingGrade = grades.find(
        g => g.studentId === studentId && 
        g.subjectId === selectedSubject && 
        g.type === type && 
        g.semester === selectedSemester
      );

      if (existingGrade) {
        await updateGrade(existingGrade.id, gradeData as Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>);
      } else {
        await createGrade(gradeData as Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>);
      }

      toast.success('Grade saved successfully');
      loadData();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast.error('Failed to save grade');
    }
  };

  const getStudentGrade = (studentId: string, type: string) => {
    return grades.find(
      g => g.studentId === studentId && 
      g.subjectId === selectedSubject && 
      g.type === type && 
      g.semester === selectedSemester
    )?.value || '';
  };

  const calculateAverage = (studentId: string) => {
    const studentGrades = grades.filter(
      g => g.studentId === studentId && 
      g.subjectId === selectedSubject && 
      g.semester === selectedSemester
    );
    
    if (studentGrades.length === 0) return 0;
    
    const sum = studentGrades.reduce((acc, g) => acc + g.value, 0);
    return (sum / studentGrades.length).toFixed(2);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const filteredStudents = students.filter(student => student.groupId === selectedGroup);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Grade Book</h1>
        <div className="flex space-x-4">
          <BulkGradeInput
            students={students}
            subjects={subjects}
            groups={groups}
            onSuccess={loadData}
          />
          <GradeImport
            teacherId={teacherId}
            onSuccess={loadData}
          />
          <Button
            variant="outline"
            onClick={() => exportGradesToExcel({ grades, students, subjects, groups })}
          >
            Export to Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => exportGradesToPDF({
              grades,
              students,
              subjects,
              groups,
              selectedGroup,
              selectedSubject,
              selectedSemester,
            })}
          >
            Export to PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger>
            <SelectValue placeholder="Select group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedSemester.toString()}
          onValueChange={(value) => setSelectedSemester(Number(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
              <SelectItem key={semester} value={semester.toString()}>
                Semester {semester}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroup && selectedSubject && (
        <Card>
          <CardHeader>
            <CardTitle>Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Homework</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      {student.firstName} {student.lastName}
                    </TableCell>
                    {['exam', 'test', 'homework', 'project'].map((type) => (
                      <TableCell key={type}>
                        {editingGrade?.studentId === student.id && editingGrade?.type === type ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={gradeValue}
                            onChange={(e) => setGradeValue(e.target.value)}
                            onBlur={() => {
                              handleGradeChange(student.id, type, gradeValue);
                              setEditingGrade(null);
                              setGradeValue('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleGradeChange(student.id, type, gradeValue);
                                setEditingGrade(null);
                                setGradeValue('');
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:bg-gray-100 p-2 rounded"
                            onClick={() => {
                              setEditingGrade({ studentId: student.id, type });
                              setGradeValue(getStudentGrade(student.id, type).toString());
                            }}
                          >
                            {getStudentGrade(student.id, type)}
                          </div>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="font-medium">
                      {calculateAverage(student.id)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="statistics" className="mt-6">
        <TabsList>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>Grade Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <GradeStatistics
                grades={grades}
                subjects={subjects}
                groups={groups}
                selectedGroup={selectedGroup}
                selectedSubject={selectedSubject}
                selectedSemester={selectedSemester}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Grade History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades
                    .filter(g => g.subjectId === selectedSubject && g.semester === selectedSemester)
                    .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime())
                    .map((grade) => {
                      const student = students.find(s => s.id === grade.studentId);
                      return (
                        <TableRow key={grade.id}>
                          <TableCell>
                            {format(grade.date.toDate(), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            {student ? `${student.firstName} ${student.lastName}` : grade.studentId}
                          </TableCell>
                          <TableCell>{grade.type}</TableCell>
                          <TableCell>{grade.value}</TableCell>
                          <TableCell>{grade.notes}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Grade Comments</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedGroup && selectedSubject ? (
                <GradeComments gradeId={grades.find(g => g.groupId === selectedGroup && g.subjectId === selectedSubject)?.id || ''} />
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  Select a group and subject to view comments
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 