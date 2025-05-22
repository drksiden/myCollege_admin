import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Grade, Student, Subject, Group } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface GradeStatisticsProps {
  grades: Grade[];
  students: Student[];
  subjects: Subject[];
  groups: Group[];
  selectedGroup?: string;
  selectedSubject?: string;
  selectedSemester?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function GradeStatistics({
  grades,
  students,
  subjects,
  groups,
  selectedGroup,
  selectedSubject,
  selectedSemester,
}: GradeStatisticsProps) {
  const filteredGrades = grades.filter(grade => {
    if (selectedGroup && grade.groupId !== selectedGroup) return false;
    if (selectedSubject && grade.subjectId !== selectedSubject) return false;
    if (selectedSemester && grade.semester !== selectedSemester) return false;
    return true;
  });

  // Calculate average grades by type
  const averageByType = ['exam', 'test', 'homework', 'project'].map(type => {
    const typeGrades = filteredGrades.filter(g => g.type === type);
    const average = typeGrades.reduce((acc, g) => acc + g.value, 0) / typeGrades.length || 0;
    return {
      type: type.charAt(0).toUpperCase() + type.slice(1),
      average: Number(average.toFixed(2)),
    };
  });

  // Calculate grade distribution
  const gradeDistribution = [
    { range: '90-100', count: 0 },
    { range: '80-89', count: 0 },
    { range: '70-79', count: 0 },
    { range: '60-69', count: 0 },
    { range: '0-59', count: 0 },
  ];

  filteredGrades.forEach(grade => {
    if (grade.value >= 90) gradeDistribution[0].count++;
    else if (grade.value >= 80) gradeDistribution[1].count++;
    else if (grade.value >= 70) gradeDistribution[2].count++;
    else if (grade.value >= 60) gradeDistribution[3].count++;
    else gradeDistribution[4].count++;
  });

  // Calculate average grades by subject
  const averageBySubject = subjects.map(subject => {
    const subjectGrades = filteredGrades.filter(g => g.subjectId === subject.id);
    const average = subjectGrades.reduce((acc, g) => acc + g.value, 0) / subjectGrades.length || 0;
    return {
      subject: subject.name,
      average: Number(average.toFixed(2)),
    };
  });

  // Calculate average grades by group
  const averageByGroup = groups.map(group => {
    const groupGrades = filteredGrades.filter(g => g.groupId === group.id);
    const average = groupGrades.reduce((acc, g) => acc + g.value, 0) / groupGrades.length || 0;
    return {
      group: group.name,
      average: Number(average.toFixed(2)),
    };
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
          <TabsTrigger value="groups">By Group</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Average Grades by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={averageByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gradeDistribution}
                      dataKey="count"
                      nameKey="range"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Average Grades by Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={averageBySubject}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Average Grades by Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={averageByGroup}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="group" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 