// src/pages/admin/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  BookOpen,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { getDashboardData, type DashboardStats } from '@/lib/firebaseService/dashboardService';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, Legend } from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const StatCard: React.FC<{
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  trend?: number;
}> = ({ title, value, description, icon, trend }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend !== undefined && (
        <div className="mt-2 flex items-center">
          <Badge variant={trend >= 0 ? "default" : "destructive"} className="mr-2">
            {trend >= 0 ? '+' : ''}{trend}%
          </Badge>
          <span className="text-xs text-muted-foreground">за последний месяц</span>
        </div>
      )}
    </CardContent>
  </Card>
);

const StatCardSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-6 w-6 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-7 w-2/5 mb-2" />
      <Skeleton className="h-3 w-4/5" />
    </CardContent>
  </Card>
);

const GradeDistributionCard: React.FC<{
  data: { range: string; count: number }[];
}> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Распределение оценок</CardTitle>
        <CardDescription>Распределение оценок по диапазонам</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {data.map((item) => {
              const percentage = (item.count / total) * 100;
              return (
                <div key={item.range} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.range}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const SubjectActivityCard: React.FC<{
  data: { subjectName: string; entriesCount: number }[];
}> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.entriesCount, 0);
  const sortedData = [...data].sort((a, b) => b.entriesCount - a.entriesCount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Активность по предметам</CardTitle>
        <CardDescription>Количество записей в журнале по предметам</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-4">
            {sortedData.map((item) => {
              const percentage = (item.entriesCount / total) * 100;
              return (
                <div key={item.subjectName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.subjectName}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.entriesCount} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

const AttendanceChart: React.FC<{
  data: {
    groupId: string;
    groupName: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
  }[];
}> = ({ data }) => {
  const [timeRange, setTimeRange] = useState('30d');

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Статистика посещаемости</CardTitle>
          <CardDescription>
            Показывает статистику посещаемости по группам
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Выберите период"
          >
            <SelectValue placeholder="Последние 30 дней" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Последние 3 месяца
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Последние 30 дней
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Последние 7 дней
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="aspect-auto h-[400px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillPresent" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--success))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--success))"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillAbsent" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--destructive))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--destructive))"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillLate" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--warning))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--warning))"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillExcused" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(var(--info))"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(var(--info))"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="groupName"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="font-medium">{label}</span>
                      </div>
                      {payload.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium">
                            {item.name}: {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              dataKey="present"
              type="natural"
              fill="url(#fillPresent)"
              stroke="hsl(var(--success))"
              stackId="a"
              name="Присутствовали"
            />
            <Area
              dataKey="absent"
              type="natural"
              fill="url(#fillAbsent)"
              stroke="hsl(var(--destructive))"
              stackId="a"
              name="Отсутствовали"
            />
            <Area
              dataKey="late"
              type="natural"
              fill="url(#fillLate)"
              stroke="hsl(var(--warning))"
              stackId="a"
              name="Опоздали"
            />
            <Area
              dataKey="excused"
              type="natural"
              fill="url(#fillExcused)"
              stroke="hsl(var(--info))"
              stackId="a"
              name="По уважительной причине"
            />
            <Legend
              content={({ payload }) => {
                if (!payload?.length) return null;
                return (
                  <div className="flex items-center justify-center gap-4">
                    {payload.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
          </AreaChart>
        </div>
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getDashboardData();
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Не удалось загрузить данные дашборда');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
        duration: 0.3,
        ease: 'easeOut',
      },
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  };

  if (isLoading) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Обзор системы
          </h1>
        </div>

        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key="skeletons-wrapper"
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <motion.div
                  key={`skeleton-item-${index}`}
                  variants={itemVariants}
                >
                  <StatCardSkeleton />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-[200px]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Skeleton className="h-6 w-[200px]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Не удалось загрузить данные</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Обзор системы
        </h1>
      </div>

      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key="stats-data-wrapper"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              key="total-students"
              variants={itemVariants}
            >
              <StatCard
                title="Всего студентов"
                value={stats.totalStudents}
                description="Активных студентов в системе"
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                trend={5}
              />
            </motion.div>
            <motion.div
              key="total-teachers"
              variants={itemVariants}
            >
              <StatCard
                title="Преподаватели"
                value={stats.totalTeachers}
                description="Преподавателей в системе"
                icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
                trend={2}
              />
            </motion.div>
            <motion.div
              key="total-groups"
              variants={itemVariants}
            >
              <StatCard
                title="Группы"
                value={stats.totalGroups}
                description="Учебных групп"
                icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
                trend={3}
              />
            </motion.div>
            <motion.div
              key="total-subjects"
              variants={itemVariants}
            >
              <StatCard
                title="Предметы"
                value={stats.totalSubjects}
                description="Учебных предметов"
                icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
                trend={1}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <GradeDistributionCard data={stats.gradeDistribution} />
        <SubjectActivityCard data={stats.subjectActivity} />
      </div>

      <AttendanceChart data={stats.attendanceStats} />
    </motion.div>
  );
};

export default DashboardPage;