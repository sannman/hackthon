"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type Difficulty = "easy" | "medium" | "hard";
type TaskStatus = "pending" | "in-progress" | "done";

type Subject = {
  id: string;
  name: string;
  difficulty: Difficulty;
  progress: number;
  plannedHours: number;
  spentHours: number;
  weakTopics: string[];
  exam: string;
};

type Task = {
  id: string;
  title: string;
  subjectId: string;
  plannedMinutes: number;
  dayOffset: number;
  status: TaskStatus;
  type: "concept" | "practice" | "review";
  importance: number;
};

type Exam = { subjectId: string; date: string; location: string };

type TimelineBlock = {
  id: string;
  task: Task;
  start: string;
  end: string;
};

const SUBJECTS: Subject[] = [
  {
    id: "math",
    name: "Calculus II",
    difficulty: "hard",
    progress: 62,
    plannedHours: 12,
    spentHours: 8.5,
    weakTopics: ["Series tests", "Polar integrals"],
    exam: "2026-02-18T14:00:00",
  },
  {
    id: "physics",
    name: "Physics: Circuits",
    difficulty: "medium",
    progress: 54,
    plannedHours: 8,
    spentHours: 5.3,
    weakTopics: ["RC timing", "Wave superposition"],
    exam: "2026-02-12T09:00:00",
  },
  {
    id: "history",
    name: "World History",
    difficulty: "medium",
    progress: 71,
    plannedHours: 6,
    spentHours: 4.8,
    weakTopics: ["Cold War motivations"],
    exam: "2026-03-01T10:00:00",
  },
  {
    id: "chemistry",
    name: "Organic Chemistry",
    difficulty: "hard",
    progress: 48,
    plannedHours: 10,
    spentHours: 6.1,
    weakTopics: ["Mechanisms", "Spectra reading"],
    exam: "2026-02-25T16:00:00",
  },
];

const EXAMS: Exam[] = SUBJECTS.map((subject) => ({
  subjectId: subject.id,
  date: subject.exam,
  location: "Main Hall",
}));

const DEFAULT_TASKS: Task[] = [];

const DEFAULT_DIFFICULTY = SUBJECTS.reduce<Record<string, number>>(
  (acc, subject) => {
    acc[subject.id] =
      subject.difficulty === "hard"
        ? 3
        : subject.difficulty === "medium"
          ? 2
          : 1;
    return acc;
  },
  {},
);

function loadTasksFromStorage(): Task[] {
  if (typeof window === "undefined") return DEFAULT_TASKS;
  const savedTasks = window.localStorage.getItem("smart-study-tasks");
  if (savedTasks) {
    try {
      return JSON.parse(savedTasks) as Task[];
    } catch {
      return DEFAULT_TASKS;
    }
  }
  return DEFAULT_TASKS;
}

function loadDifficultyFromStorage() {
  if (typeof window === "undefined") return DEFAULT_DIFFICULTY;
  const saved = window.localStorage.getItem("smart-study-difficulty");
  if (saved) {
    try {
      return JSON.parse(saved) as Record<string, number>;
    } catch {
      return DEFAULT_DIFFICULTY;
    }
  }
  return DEFAULT_DIFFICULTY;
}

function formatDayLabel(dayOffset: number) {
  if (dayOffset === 0) return "Today";
  if (dayOffset === 1) return "Tomorrow";
  return `+${dayOffset}d`;
}

function toCountdown(dateString: string) {
  const now = new Date();
  const target = new Date(dateString);
  const diff = target.getTime() - now.getTime();
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = Math.max(
    0,
    Math.floor((diff - days * 24 * 60 * 60 * 1000) / (1000 * 60 * 60)),
  );
  return { days, hours };
}

function minutesToLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const formattedHours = (hours % 12 || 12).toString().padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${formattedHours}:${mins.toString().padStart(2, "0")} ${suffix}`;
}

function ringStyle(value: number) {
  const percent = Math.min(100, Math.max(0, value));
  return {
    backgroundImage: `conic-gradient(hsl(var(--primary)) ${percent}%, transparent ${percent}%)`,
  };
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromStorage());
  const [difficulty, setDifficulty] = useState<Record<string, number>>(
    () => loadDifficultyFromStorage(),
  );
  const [selectedSubject, setSelectedSubject] = useState<string>("math");
  const [timelineOrder, setTimelineOrder] = useState<string[]>(() =>
    loadTasksFromStorage()
      .filter((task) => task.dayOffset === 0)
      .map((task) => task.id),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusActive, setFocusActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(3);
  const [loggedMinutes, setLoggedMinutes] = useState(140);
  const [statusNote, setStatusNote] = useState(
    "Plan is adapting in real-time to your updates.",
  );
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    subjectId: "math",
    plannedMinutes: 30,
    dayOffset: 0,
    type: "concept" as "concept" | "practice" | "review",
    importance: 0.5,
  });

  const subjectMap = useMemo(
    () => Object.fromEntries(SUBJECTS.map((subject) => [subject.id, subject])),
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("smart-study-tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "smart-study-difficulty",
      JSON.stringify(difficulty),
    );
  }, [difficulty]);

  useEffect(() => {
    if (!focusActive) return;
    const timer = window.setInterval(() => {
      setFocusSeconds((seconds) => {
        if (seconds <= 1) {
          setFocusActive(false);
          setSessionsCompleted((count) => count + 1);
          setLoggedMinutes((minutes) => minutes + 25);
          setStatusNote("Session logged. Tasks re-balanced for recovery time.");
          return 25 * 60;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusActive]);

  const prioritizedTasks = useMemo(() => {
    return tasks
      .map((task) => {
        const subject = subjectMap[task.subjectId];
        const exam = EXAMS.find((item) => item.subjectId === task.subjectId);
        const { days } = exam ? toCountdown(exam.date) : { days: 30 };
        const examWeight = Math.max(0, 30 - days) / 30;
        const difficultyWeight = difficulty[task.subjectId] ?? 1;
        const urgencyWeight = Math.max(0, 5 - task.dayOffset) / 5;
        const score =
          difficultyWeight * 0.35 +
          examWeight * 0.35 +
          urgencyWeight * 0.2 +
          task.importance * 0.25;
        return { task, score, subject, examWeight, urgencyWeight };
      })
      .sort((a, b) => b.score - a.score);
  }, [difficulty, subjectMap, tasks]);

  const todayBlocks: TimelineBlock[] = useMemo(() => {
    const order = timelineOrder
      .map((id) => tasks.find((task) => task.id === id && task.dayOffset === 0))
      .filter(Boolean) as Task[];

    const result = order.reduce(
      (acc, task) => {
        const start = minutesToLabel(acc.cursor);
        const endMinutes = acc.cursor + task.plannedMinutes;
        const end = minutesToLabel(endMinutes);
        return {
          cursor: endMinutes + 10,
          blocks: [...acc.blocks, { id: task.id, task, start, end }],
        };
      },
      { cursor: 8 * 60 + 10, blocks: [] as TimelineBlock[] },
    );

    return result.blocks;
  }, [tasks, timelineOrder]);

  const weeklyPlan = useMemo(() => {
    return Array.from({ length: 5 }).map((_, index) => {
      const hours =
        tasks
          .filter((task) => task.dayOffset === index)
          .reduce((total, item) => total + item.plannedMinutes, 0) / 60;
      return { label: formatDayLabel(index), hours: parseFloat(hours.toFixed(1)) };
    });
  }, [tasks]);

  const nextExam = useMemo(() => {
    return EXAMS.reduce((soonest, current) => {
      const soonestDate = new Date(soonest.date);
      const currentDate = new Date(current.date);
      return currentDate < soonestDate ? current : soonest;
    }, EXAMS[0]);
  }, []);

  const nextExamCountdown = toCountdown(nextExam.date);

  const todayPlannedMinutes = tasks
    .filter((task) => task.dayOffset === 0)
    .reduce((total, task) => total + task.plannedMinutes, 0);
  const completedToday = tasks.filter(
    (task) => task.dayOffset === 0 && task.status === "done",
  ).length;

  const topPriorities = prioritizedTasks.slice(0, 4);

  const handleComplete = (taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: "done" } : task,
      ),
    );
    const task = tasks.find((item) => item.id === taskId);
    if (task) {
      setLoggedMinutes((minutes) => minutes + task.plannedMinutes);
    }
    setStatusNote("Marked done. Remaining plan re-ordered to keep pace.");
  };

  const handleSkip = (taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? { ...task, dayOffset: task.dayOffset + 1 }
          : task,
      ),
    );
    setTimelineOrder((current) => current.filter((id) => id !== taskId));
    setStatusNote("Missed? We pushed it forward and lightened tomorrow.");
  };

  const handleReschedule = (taskId: string) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, dayOffset: task.dayOffset + 1 } : task,
      ),
    );
    setTimelineOrder((current) => current.filter((id) => id !== taskId));
    setStatusNote("Rescheduled instantly—timeline reshuffled.");
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    
    const task: Task = {
      id: `t${Date.now()}`,
      title: newTask.title,
      subjectId: newTask.subjectId,
      plannedMinutes: newTask.plannedMinutes,
      dayOffset: newTask.dayOffset,
      status: "pending",
      type: newTask.type,
      importance: newTask.importance,
    };
    
    setTasks((current) => [...current, task]);
    setNewTask({
      title: "",
      subjectId: "math",
      plannedMinutes: 30,
      dayOffset: 0,
      type: "concept",
      importance: 0.5,
    });
    setShowAddTask(false);
    setStatusNote("New task added. Timeline recalculated.");
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setTimelineOrder((current) => current.filter((id) => id !== taskId));
    setStatusNote("Task deleted. Plan adjusted.");
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task,
      ),
    );
    if (newStatus === "done") {
      const task = tasks.find((item) => item.id === taskId);
      if (task) {
        setLoggedMinutes((minutes) => minutes + task.plannedMinutes);
      }
    }
    setStatusNote("Task status updated. Kanban board refreshed.");
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setTimelineOrder((current) => {
      const filtered = current.filter((id) => id !== draggingId);
      const index = filtered.indexOf(targetId);
      filtered.splice(index, 0, draggingId);
      return filtered;
    });
    setStatusNote("Drag-and-drop received. Blocks reordered for today.");
    setDraggingId(null);
  };

  const handleDifficultyChange = (subjectId: string, value: number) => {
    setDifficulty((current) => ({ ...current, [subjectId]: value }));
    setStatusNote("Difficulty updated. Priority weights refreshed.");
  };

  const focusMinutes = Math.floor(focusSeconds / 60)
    .toString()
    .padStart(2, "0");
  const focusMinsRemaining = (focusSeconds % 60).toString().padStart(2, "0");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-10 lg:px-8 font-sans">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge>Adaptive</Badge>
            <Badge variant="secondary">Live prioritization</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            FocusFlow
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground font-serif">
            Auto-builds and updates your study plan based on what&apos;s real:
            availability, missed blocks, exam pressure, and your weak topics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="shadow-sm"
            onClick={() => setFocusActive((active) => !active)}
          >
            {focusActive ? "Pause Focus Mode" : "Start Focus Mode"}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-start justify-between space-y-0">
            <div>
              <CardTitle>Exam countdown</CardTitle>
              <CardDescription>
                Pressure that stays controlled with auto-reschedules.
              </CardDescription>
            </div>
            <Badge variant="secondary">Next up</Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4 md:gap-6">
            <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-secondary">
              <div
                className="h-28 w-28 rounded-full bg-background p-3 text-center border border-border"
                style={ringStyle(
                  Math.max(
                    8,
                    100 - nextExamCountdown.days * 2.5 - nextExamCountdown.hours * 0.3,
                  ),
                )}
              >
                <div className="flex h-full flex-col items-center justify-center rounded-full bg-background text-center">
                  <span className="text-2xl font-semibold">
                    {nextExamCountdown.days}d
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {nextExamCountdown.hours}h left
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">
                  {subjectMap[nextExam.subjectId]?.name}
                </span>
                <Badge variant="outline">Countdown live</Badge>
              </div>
              <p className="text-muted-foreground">
                System boosts weight for near exams, sliding tasks earlier and
                shrinking breaks.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary">
                  {new Date(nextExam.date).toLocaleDateString()}
                </Badge>
                <Badge variant="outline">Auto-redistributing</Badge>
                <Badge variant="outline">{nextExam.location}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Consistency streak</CardTitle>
            <CardDescription>Weekly cadence + logged minutes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">Weekly streak</span>
              <Badge variant="outline">6 days</Badge>
            </div>
            <Progress value={(sessionsCompleted / 7) * 100} />
            <p className="text-xs text-muted-foreground">
              Focus sessions auto-log time to analytics and adjust task sizes.
            </p>
            <div className="flex items-center justify-between text-sm">
              <span>Logged</span>
              <span className="font-semibold">{loggedMinutes} mins</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Plan health</CardTitle>
            <CardDescription>Real-time adjustments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-foreground shadow-[0_0_0_6px_rgba(0,0,0,0.05)] dark:bg-white dark:shadow-none" />
              <span>{statusNote}</span>
            </div>
            <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Miss a session? Tasks reshuffle, short fillers appear, and heavy
              blocks slide earlier automatically.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Kanban Board</CardTitle>
              <CardDescription>
                Drag tasks between columns to update their status
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddTask(true)}>
              + Add Task
            </Button>
          </CardHeader>
          <CardContent>
            {showAddTask && (
              <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 space-y-4">
                <h3 className="text-lg font-semibold">Add New Task</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="task-title">Task Title</Label>
                    <Input
                      id="task-title"
                      placeholder="Enter task title"
                      value={newTask.title}
                      onChange={(e) =>
                        setNewTask({ ...newTask, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-subject">Subject</Label>
                    <Select
                      id="task-subject"
                      value={newTask.subjectId}
                      onChange={(e) =>
                        setNewTask({ ...newTask, subjectId: e.target.value })
                      }
                    >
                      {SUBJECTS.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-minutes">Duration (minutes)</Label>
                    <Input
                      id="task-minutes"
                      type="number"
                      min="5"
                      max="180"
                      value={newTask.plannedMinutes}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          plannedMinutes: parseInt(e.target.value) || 30,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="task-type">Type</Label>
                    <Select
                      id="task-type"
                      value={newTask.type}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          type: e.target.value as "concept" | "practice" | "review",
                        })
                      }
                    >
                      <option value="concept">Concept</option>
                      <option value="practice">Practice</option>
                      <option value="review">Review</option>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddTask}>Add Task</Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddTask(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(["pending", "in-progress", "done"] as TaskStatus[]).map(
                (status) => {
                  const statusTasks = tasks.filter(
                    (task) => task.status === status,
                  );
                  const statusLabel =
                    status === "pending"
                      ? "Pending"
                      : status === "in-progress"
                        ? "In Progress"
                        : "Done";
                  
                  return (
                    <div
                      key={status}
                      className="rounded-xl border border-border bg-muted/20 p-4 min-h-[400px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggingId) {
                          handleStatusChange(draggingId, status);
                          setDraggingId(null);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">{statusLabel}</h3>
                        <Badge variant="secondary">{statusTasks.length}</Badge>
                      </div>
                      <div className="space-y-3">
                        {statusTasks.map((task) => {
                          const subject = subjectMap[task.subjectId];
                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={() => setDraggingId(task.id)}
                              className={cn(
                                "rounded-lg border border-border bg-card p-3 cursor-move transition hover:shadow-md",
                                draggingId === task.id && "opacity-50",
                              )}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="font-semibold text-sm">
                                      {task.title}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {subject?.name}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        {task.plannedMinutes}m
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {task.type}
                                      </Badge>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  >
                                    ×
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {statusTasks.length === 0 && (
                          <div className="text-sm text-muted-foreground text-center py-8">
                            Drop tasks here
                          </div>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Today&apos;s tasks</CardTitle>
              <CardDescription>
                Smart priority considers exam proximity, importance, and momentum.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">
                {Math.round(todayPlannedMinutes / 60)}h planned
              </Badge>
              <Badge variant="secondary">
                {completedToday} / {todayBlocks.length} done
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPriorities
              .filter(({ task }) => task.dayOffset === 0)
              .map(({ task, examWeight, urgencyWeight }, index) => {
                const subject = subjectMap[task.subjectId];
                return (
                  <div
                    key={task.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md md:flex-row md:items-center md:gap-4"
                  >
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <Badge variant="secondary">
                          {subject?.name ?? "Subject"}
                        </Badge>
                        <Badge variant="outline">
                          {examWeight > 0.6 ? "Exam soon" : "Steady"}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round((1 - urgencyWeight) * 50)} mins buffer
                        </Badge>
                      </div>
                      <div className="text-lg font-semibold">{task.title}</div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {task.type === "practice" ? "Hands-on practice" : "Review"} •{" "}
                        {task.plannedMinutes} mins • {formatDayLabel(task.dayOffset)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => handleSkip(task.id)}
                        className="text-muted-foreground hover:bg-muted"
                      >
                        Skip
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReschedule(task.id)}
                      >
                        Reschedule
                      </Button>
                      <Button onClick={() => handleComplete(task.id)}>Done</Button>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority engine</CardTitle>
            <CardDescription>Why these tasks bubble up</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {topPriorities.map(({ task, score }) => {
              const subject = subjectMap[task.subjectId];
              const exam = EXAMS.find((item) => item.subjectId === task.subjectId);
              const countdown = exam ? toCountdown(exam.date) : { days: 30, hours: 0 };
              return (
                <div
                  key={task.id}
                  className="rounded-lg border border-border bg-muted/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{subject?.name}</Badge>
                      <Badge variant="secondary">
                        {Math.round(score * 100) / 10} priority
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {countdown.days}d {countdown.hours}h
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Weighted by exam proximity, difficulty, past performance, and time
                    left this week.
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Interactive study timeline</CardTitle>
              <CardDescription>
                Drag + drop to reschedule. Calendar + timeline hybrid.
              </CardDescription>
            </div>
            <Badge variant="secondary">Today</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-5">
              {weeklyPlan.map((day) => (
                <div
                  key={day.label}
                  className="rounded-lg border border-border bg-muted/40 p-3"
                >
                  <div className="text-sm font-semibold">{day.label}</div>
                  <div>{day.hours}h planned</div>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-card p-4">
              {todayBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All clear. Spare time is redistributed to weak topics.
                </p>
              ) : (
                todayBlocks.map((block) => {
                  const subject = subjectMap[block.task.subjectId];
                  return (
                    <div
                      key={block.id}
                      draggable
                      onDragStart={() => setDraggingId(block.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(block.id)}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl border border-border bg-background p-4 text-sm shadow-sm transition",
                        "hover:-translate-y-1 hover:shadow-md",
                      )}
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-foreground/80">
                        <span className="font-mono">
                          {block.start} - {block.end}
                        </span>
                        <Badge variant="outline">{subject?.name}</Badge>
                      </div>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div className="font-semibold">{block.task.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {block.task.plannedMinutes} mins • {block.task.type} •{" "}
                            {block.task.status === "pending"
                              ? "Pending"
                              : block.task.status === "in-progress"
                                ? "In Progress"
                                : "Completed"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSkip(block.id)}
                          >
                            Skip
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReschedule(block.id)}
                          >
                            Move
                          </Button>
                          <Button size="sm" onClick={() => handleComplete(block.id)}>
                            Done
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Difficulty + adaptive weight</CardTitle>
            <CardDescription>
              Mark topics as easy / medium / hard to instantly adapt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((subject) => (
                <Button
                  key={subject.id}
                  size="sm"
                  variant={selectedSubject === subject.id ? "default" : "outline"}
                  onClick={() => setSelectedSubject(subject.id)}
                >
                  {subject.name}
                </Button>
              ))}
            </div>
            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Difficulty slider</span>
                <Badge variant="secondary">
                  {difficulty[selectedSubject] === 3
                    ? "Hard"
                    : difficulty[selectedSubject] === 2
                      ? "Medium"
                      : "Easy"}
                </Badge>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                value={difficulty[selectedSubject]}
                onChange={(event) =>
                  handleDifficultyChange(
                    selectedSubject,
                    Number(event.target.value) as number,
                  )
                }
                className="w-full accent-primary"
                aria-label="Difficulty"
              />
              <p className="text-xs text-muted-foreground">
                Raising difficulty boosts priority scores and pulls sessions earlier in
                the week.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Focus mode</span>
                <Badge variant="outline">{focusActive ? "Running" : "Idle"}</Badge>
              </div>
              <div className="text-4xl font-semibold tabular-nums font-mono">
                {focusMinutes}:{focusMinsRemaining}
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setFocusActive((active) => !active)}
                >
                  {focusActive ? "Pause" : "Start"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFocusSeconds(25 * 60);
                    setFocusActive(false);
                  }}
                >
                  Reset
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Distraction lock and Pomodoro timer auto-log study time to analytics.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SUBJECTS.map((subject) => {
          const ring = ringStyle(subject.progress);
          return (
            <Card key={subject.id} className="overflow-hidden">
              <CardHeader className="flex items-start justify-between space-y-0">
                <div>
                  <CardTitle>{subject.name}</CardTitle>
                  <CardDescription className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {subject.difficulty.charAt(0).toUpperCase() +
                        subject.difficulty.slice(1)}
                    </Badge>
                    <Badge variant="secondary">
                      {subject.plannedHours - subject.spentHours}h left
                    </Badge>
                  </CardDescription>
                </div>
                <div className="relative">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-muted"
                    style={ring}
                  >
                    <span className="text-sm font-semibold bg-background rounded-full h-14 w-14 flex items-center justify-center">
                      {Math.round(subject.progress)}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Progress value={subject.progress} />
                <div className="flex flex-wrap gap-2">
                  {subject.weakTopics.map((topic) => (
                    <Badge key={topic} variant="outline">
                      {topic}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Upcoming exam</span>
                  <span>{new Date(subject.exam).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Time spent vs planned</CardTitle>
            <Badge variant="outline">Live</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {SUBJECTS.map((subject) => {
              const planned = subject.plannedHours;
              const spent = subject.spentHours;
              const plannedWidth = Math.min(100, planned * 8);
              const spentWidth = Math.min(100, spent * 8);
              return (
                <div key={subject.id} className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{subject.name}</span>
                    <span className="text-muted-foreground">
                      {spent}h / {planned}h
                    </span>
                  </div>
                  <div className="relative h-3 rounded-full bg-muted">
                    <div
                      className="absolute left-0 top-0 h-3 rounded-full bg-primary"
                      style={{ width: `${plannedWidth}%`, opacity: 0.2 }}
                    />
                    <div
                      className="absolute left-0 top-0 h-3 rounded-full bg-primary"
                      style={{ width: `${spentWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Analytics & insights</CardTitle>
            <Badge variant="secondary">Updated live</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <span>Consistency streak: 6 days</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <span>Weak topics flagged for micro-sessions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <span>Auto-balancing load after missed tasks</span>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="font-semibold">Focus mode</p>
              <p className="text-xs text-muted-foreground">
                Pomodoro timer logs time and injects cool-down breaks. Sessions:
                {sessionsCompleted}.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
