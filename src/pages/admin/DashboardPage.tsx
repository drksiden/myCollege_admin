const MonthlyTrendsChart: React.FC = () => {
  // Генерируем данные за последние 6 месяцев
  const monthlyData = [
    { month: 'Сентябрь', students: 120, grades: 450, attendance: 85 },
    { month: 'Октябрь', students: 125, grades: 520, attendance: 88 },
    { month: 'Ноябрь', students: 123, grades: 480, attendance: 82 },
    { month: 'Декабрь', students: 127, grades: 610, attendance: 79 },
    { month: 'Январь', students: 130, grades: 590, attendance: 86 },
    { month: 'Февраль', students: 132, grades: 640, attendance: 90 },
  ];

  const chartConfig = {
    students: {
      label: "Активные студенты",
      color: "#3b82f6",
    },
    grades: {
      label: "Выставлено оценок",
      color: "#10b981",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Тренды по месяцам</CardTitle>
        <CardDescription>
          Динамика активности студентов и выставленных оценок
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={monthlyData}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="students"
              fill={chartConfig.students.color}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="grades"
              fill={chartConfig.grades.color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};// src/pages/admin/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  BookOpen,
  GraduationCap,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { getDashboardData, type DashboardStats } from '@/lib/firebaseService/dashboardService';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { 
  type ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts';

const StatCard: React.FC<{
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  trend?: number;
  color?: string;
}> = ({ title, value, description, icon, trend, color = "bg-primary" }) => (
  <Card className="relative overflow-hidden">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className={`h-8 w-8 rounded-full ${color} bg-opacity-10 flex items-center justify-center`}>
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {trend !== undefined && (
        <div className="mt-2 flex items-center">
          <Badge 
            variant={trend >= 0 ? "default" : "destructive"} 
            className="mr-2 h-5 text-xs"
          >
            <TrendingUp className={`h-3 w-3 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </Badge>
          <span className="text-xs text-muted-foreground">за месяц</span>
        </div>
      )}
    </CardContent>
    <div className={`absolute bottom-0 left-0 h-1 w-full ${color} opacity-20`} />
  </Card>
);

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
  const chartConfig = {
    attendanceRate: {
      label: "Посещаемость",
      color: "#10b981",
    },
    label: {
      color: "hsl(var(--background))",
    },
  } satisfies ChartConfig;

  // Вычисляем процент посещаемости для каждой группы
  const transformedData = data.map(item => {
    const total = item.present + item.absent + item.late + item.excused;
    const attendanceRate = total > 0 ? Math.round(((item.present + item.late + item.excused) / total) * 100) : 0;
    
    return {
      group: item.groupName,
      attendanceRate,
      present: item.present,
      absent: item.absent,
      late: item.late,
      excused: item.excused,
      total,
    };
  }).sort((a, b) => b.attendanceRate - a.attendanceRate);

  // Вычисляем общий тренд
  const avgAttendance = transformedData.length > 0 
    ? Math.round(transformedData.reduce((sum, item) => sum + item.attendanceRate, 0) / transformedData.length)
    : 0;

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Посещаемость по группам</CardTitle>
        <CardDescription>
          Процент посещаемости студентов за последний месяц
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={transformedData}
            layout="vertical"
            margin={{
              right: 40,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="group"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 8)}
              hide
            />
            <XAxis dataKey="attendanceRate" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                indicator="line"
                formatter={(value, name, props) => [
                  `${value}% (${props.payload?.present} присутствовали, ${props.payload?.absent} отсутствовали)`,
                  "Посещаемость"
                ]}
              />}
            />
            <Bar
              dataKey="attendanceRate"
              layout="vertical"
              fill={chartConfig.attendanceRate.color}
              radius={4}
            >
              <LabelList
                dataKey="group"
                position="insideLeft"
                offset={8}
                className="fill-white"
                fontSize={12}
                fontWeight="medium"
              />
              <LabelList
                dataKey="attendanceRate"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => `${value}%`}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Средняя посещаемость {avgAttendance}% 
          <TrendingUp className="h-4 w-4 text-green-600" />
        </div>
        <div className="text-muted-foreground leading-none">
          Показывает процент посещаемости по всем группам за последний месяц
        </div>
      </CardFooter>
    </Card>
  );
};

const GradeDistributionChart: React.FC<{
  data: { range: string; count: number }[];
}> = ({ data }) => {
  const chartConfig = {
    excellent: {
      label: "Отлично",
      color: "#10b981",
    },
    good: {
      label: "Хорошо", 
      color: "#3b82f6",
    },
    satisfactory: {
      label: "Удовлетворительно",
      color: "#f59e0b",
    },
    unsatisfactory: {
      label: "Неудовлетворительно",
      color: "#ef4444",
    },
  } satisfies ChartConfig;

  // Преобразуем диапазоны в более понятные названия с цветами
  const transformedData = data.map(item => {
    let category = '';
    let fill = '';
    
    if (item.range === '81-100') {
      category = 'Отлично';
      fill = chartConfig.excellent.color;
    } else if (item.range === '61-80') {
      category = 'Хорошо';
      fill = chartConfig.good.color;
    } else if (item.range === '41-60') {
      category = 'Удовлетворительно';
      fill = chartConfig.satisfactory.color;
    } else {
      category = 'Неудовлетворительно';
      fill = chartConfig.unsatisfactory.color;
    }

    return {
      range: category,
      count: item.count,
      fill,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Распределение оценок</CardTitle>
        <CardDescription>
          Показывает распределение оценок студентов по категориям
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[350px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={transformedData}
              dataKey="count"
              nameKey="range"
              innerRadius={60}
              strokeWidth={5}
            >
              {transformedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

const SubjectActivityChart: React.FC<{
  data: { subjectName: string; entriesCount: number }[];
}> = ({ data }) => {
  const chartConfig = {
    entriesCount: {
      label: "Записи в журнале",
      color: "#8b5cf6",
    },
    label: {
      color: "hsl(var(--background))",
    },
  } satisfies ChartConfig;

  // Берем топ 8 самых активных предметов и сортируем по убыванию
  const topSubjects = data
    .sort((a, b) => b.entriesCount - a.entriesCount)
    .slice(0, 8)
    .map(item => ({
      subject: item.subjectName,
      shortName: item.subjectName.length > 20 
        ? item.subjectName.substring(0, 20) + '...' 
        : item.subjectName,
      entriesCount: item.entriesCount,
    }));

  const totalEntries = topSubjects.reduce((sum, item) => sum + item.entriesCount, 0);
  const avgEntries = Math.round(totalEntries / topSubjects.length);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Активность по предметам</CardTitle>
        <CardDescription>
          Количество записей в журналах по каждому предмету за последний месяц
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={topSubjects}
            layout="vertical"
            margin={{
              right: 40,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="subject"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 15)}
              hide
            />
            <XAxis dataKey="entriesCount" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                indicator="line"
                formatter={(value) => [`${value} записей `, "Активность"]}
              />}
            />
            <Bar
              dataKey="entriesCount"
              layout="vertical"
              fill={chartConfig.entriesCount.color}
              radius={4}
            >
              <LabelList
                dataKey="shortName"
                position="insideLeft"
                offset={8}
                className="fill-white"
                fontSize={12}
                fontWeight="medium"
              />
              <LabelList
                dataKey="entriesCount"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          В среднем {avgEntries} записи на предмет
          <TrendingUp className="h-4 w-4 text-purple-600" />
        </div>
        <div className="text-muted-foreground leading-none">
          Показывает топ-8 наиболее активных предметов по количеству записей
        </div>
      </CardFooter>
    </Card>
  );
};

const StatCardSkeleton: React.FC = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-7 w-2/5 mb-2" />
      <Skeleton className="h-3 w-4/5 mb-2" />
      <Skeleton className="h-5 w-1/3" />
    </CardContent>
  </Card>
);

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
        staggerChildren: 0.05,
        duration: 0.3,
        ease: 'easeOut',
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
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Обзор системы
          </h1>
          <p className="text-muted-foreground">
            Статистика и аналитика образовательной системы
          </p>
        </div>

        <motion.div
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <motion.div key={`skeleton-${index}`} variants={itemVariants}>
              <StatCardSkeleton />
            </motion.div>
          ))}
        </motion.div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={`chart-skeleton-${index}`}>
              <CardHeader>
                <Skeleton className="h-6 w-[250px]" />
                <Skeleton className="h-4 w-[350px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Обзор системы
        </h1>
        <p className="text-muted-foreground">
          Статистика и аналитика образовательной системы
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key="stats-grid"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <StatCard
              title="Студенты"
              value={stats.totalStudents}
              description="Активных студентов в системе"
              icon={<Users className="h-4 w-4 text-blue-600" />}
              trend={5}
              color="bg-blue-600"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Преподаватели"
              value={stats.totalTeachers}
              description="Преподавателей в системе"
              icon={<UserPlus className="h-4 w-4 text-green-600" />}
              trend={2}
              color="bg-green-600"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Группы"
              value={stats.totalGroups}
              description="Учебных групп"
              icon={<GraduationCap className="h-4 w-4 text-purple-600" />}
              trend={3}
              color="bg-purple-600"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              title="Предметы"
              value={stats.totalSubjects}
              description="Учебных предметов"
              icon={<BookOpen className="h-4 w-4 text-orange-600" />}
              trend={1}
              color="bg-orange-600"
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <div className="grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GradeDistributionChart data={stats.gradeDistribution} />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <MonthlyTrendsChart />
        </motion.div>
      </div>

      <div className="grid gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AttendanceChart data={stats.attendanceStats} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <SubjectActivityChart data={stats.subjectActivity} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;