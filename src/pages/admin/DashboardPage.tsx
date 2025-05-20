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
  Library,
  UserPlus,
  BarChart3,
  Activity, // Убрал DollarSign, так как не используется в данных
} from 'lucide-react';

interface StatCardData {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  diff?: string;
}

const StatCard: React.FC<StatCardData> = ({
  title,
  value,
  description,
  icon,
  diff,
}) => {
  return (
    <Card className="transition-shadow duration-300 ease-in-out hover:shadow-lg dark:hover:shadow-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground pt-1">{description}</p>
        )}
        {diff && (
          <p className={`text-xs pt-1 ${diff.startsWith('+') ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
            {diff}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const StatCardSkeleton: React.FC = () => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-3/5" /> {/* Title */}
        <Skeleton className="h-6 w-6 rounded-full" /> {/* Icon */}
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-2/5 mb-2" /> {/* Value */}
        <Skeleton className="h-3 w-4/5" /> {/* Description */}
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const [statsData, setStatsData] = useState<StatCardData[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    setLoadingStats(true);
    setChartsLoading(true);
    const timer = setTimeout(() => {
      setStatsData([
        {
          title: 'Всего студентов',
          value: '1,234',
          icon: <Users className="h-5 w-5 text-muted-foreground" />,
          description: 'Обучающихся в данный момент',
          diff: '+52 с прошлого месяца',
        },
        {
          title: 'Активных преподавателей',
          value: '87',
          icon: <Users className="h-5 w-5 text-muted-foreground" />,
          description: 'Ведущих занятия',
          diff: '+3 новых',
        },
        {
          title: 'Учебных групп',
          value: '45',
          icon: <Library className="h-5 w-5 text-muted-foreground" />,
          description: 'На всех курсах',
        },
        {
          title: 'Посещаемость сегодня',
          value: '92.5%',
          icon: <Activity className="h-5 w-5 text-muted-foreground" />,
          description: 'Средний показатель',
          diff: '-1.2% со вчера',
        },
      ]);
      setLoadingStats(false);
      setTimeout(() => {
        setChartsLoading(false);
      }, 1000);
    }, 1500);

    return () => clearTimeout(timer);
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

      {/* Секция карточек статистики */}
      <div> {/* Обычный div-контейнер для AnimatePresence, он не анимируется сам */}
        <AnimatePresence mode="wait">
          {loadingStats ? (
            <motion.div
              key="skeletons-wrapper" // Ключ для всего блока скелетонов
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              variants={containerVariants} // Варианты для контейнера
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <motion.div
                  key={`skeleton-item-${index}`}
                  variants={itemVariants} // Варианты для каждого элемента
                >
                  <StatCardSkeleton />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="stats-data-wrapper" // Ключ для всего блока реальных карточек
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              variants={containerVariants} // Варианты для контейнера
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {statsData.map((stat) => (
                <motion.div
                  key={stat.title}
                  variants={itemVariants} // Варианты для каждого элемента
                >
                  <StatCard {...stat} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Секция для графиков */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              Динамика набора студентов
            </CardTitle>
            <CardDescription className="text-sm">
              За последние 6 месяцев
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {chartsLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Skeleton className="h-4/5 w-full" />
                <div className="flex justify-between w-full mt-2">
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                  <Skeleton className="h-4 w-1/6" />
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                (Компонент графика Recharts)
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-muted-foreground" />
              Распределение по специальностям
            </CardTitle>
            <CardDescription className="text-sm">
              Текущий учебный год
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {chartsLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="h-4/5 w-4/5 rounded-full" />
              </div>
            ) : (
              <p className="text-muted-foreground">
                (Компонент круговой диаграммы Recharts)
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default DashboardPage;