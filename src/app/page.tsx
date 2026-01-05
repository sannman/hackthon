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

type TimelineBlock = {
  id: string;
  task: Task;
  start: string;
  end: string;
};

const DEFAULT_TASKS: Task[] = [];

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

function loadSubjectsFromStorage(): Subject[] {
  if (typeof window === "undefined") return [];
  const savedSubjects = window.localStorage.getItem("smart-study-subjects");
  if (savedSubjects) {
    try {
      return JSON.parse(savedSubjects) as Subject[];
    } catch {
      return [];
    }
  }
  return [];
}

function loadDifficultyFromStorage() {
  if (typeof window === "undefined") return {};
  const saved = window.localStorage.getItem("smart-study-difficulty");
  if (saved) {
    try {
      return JSON.parse(saved) as Record<string, number>;
    } catch {
      return {};
    }
  }
  return {};
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

function ringStyle(value: number) {
  const percent = Math.min(100, Math.max(0, value));
  return {
    backgroundImage: `conic-gradient(hsl(var(--primary)) ${percent}%, transparent ${percent}%)`,
  };
}

export default function Home() {
  const [subjects, setSubjects] = useState<Subject[]>(() => loadSubjectsFromStorage());
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromStorage());
  const [difficulty, setDifficulty] = useState<Record<string, number>>(
    () => loadDifficultyFromStorage(),
  );
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusActive, setFocusActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(3);
  const [loggedMinutes, setLoggedMinutes] = useState(140);
  const [statusNote, setStatusNote] = useState(
    "Plan is adapting in real-time to your updates.",
  );
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  
  const DEFAULT_NEW_TASK = {
    title: "",
    subjectId: subjects.length > 0 ? subjects[0].id : "",
    plannedMinutes: 30,
    dayOffset: 0,
    type: "concept" as "concept" | "practice" | "review",
    importance: 0.5,
  };
  
  const [newTask, setNewTask] = useState(DEFAULT_NEW_TASK);

  const DEFAULT_NEW_SUBJECT = {
    name: "",
    difficulty: "medium" as Difficulty,
    exam: "",
  };

  const [newSubject, setNewSubject] = useState(DEFAULT_NEW_SUBJECT);

  const subjectMap = useMemo(
    () => Object.fromEntries(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
        setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  // Update DEFAULT_NEW_TASK subjectId when subjects change
  useEffect(() => {
      if (subjects.length > 0 && !newTask.subjectId) {
          setNewTask(prev => ({ ...prev, subjectId: subjects[0].id }));
      }
  }, [subjects, newTask.subjectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("smart-study-tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("smart-study-subjects", JSON.stringify(subjects));
  }, [subjects]);

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
        // If subject doesn't exist (deleted?), handle gracefully
        if (!subject) return { task, score: -1, subject, examWeight: 0, urgencyWeight: 0 };

        const { days } = subject.exam ? toCountdown(subject.exam) : { days: 30 };
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

  const nextExam = useMemo(() => {
    if (subjects.length === 0) return null;

    // Filter subjects with valid exam dates
    const subjectsWithExams = subjects.filter(s => s.exam && !isNaN(new Date(s.exam).getTime()));
    if (subjectsWithExams.length === 0) return null;

    return subjectsWithExams.reduce((soonest, current) => {
      const soonestDate = new Date(soonest.exam);
      const currentDate = new Date(current.exam);
      return currentDate < soonestDate ? current : soonest;
    }, subjectsWithExams[0]);
  }, [subjects]);

  const nextExamCountdown = nextExam ? toCountdown(nextExam.exam) : { days: 0, hours: 0 };

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

  const handleDeleteTask = (taskId: string) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setStatusNote("Task deleted. Plan adjusted.");
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((current) => {
      const updatedTasks = current.map((task) =>
        task.id === taskId ? { ...task, status: newStatus } : task,
      );

      if (newStatus === "done") {
        const task = updatedTasks.find((item) => item.id === taskId);
        if (task) {
          setLoggedMinutes((minutes) => minutes + task.plannedMinutes);
        }
      }

      return updatedTasks;
    });
    setStatusNote("Task status updated. Kanban board refreshed.");
  };

  const handleAddTask = () => {
    if (!newTask.title.trim() || !newTask.subjectId) return;
    
    const task: Task = {
      id: `t${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: newTask.title,
      subjectId: newTask.subjectId,
      plannedMinutes: newTask.plannedMinutes,
      dayOffset: newTask.dayOffset,
      status: "pending",
      type: newTask.type,
      importance: newTask.importance,
    };
    
    setTasks((current) => [...current, task]);
    setNewTask({...DEFAULT_NEW_TASK, subjectId: subjects[0]?.id || ""});
    setShowAddTask(false);
    setStatusNote("New task added. Timeline recalculated.");
  };

  const handleAddSubject = () => {
      if (!newSubject.name.trim()) return;

      const id = newSubject.name.toLowerCase().replace(/\s+/g, '-');
      const subject: Subject = {
          id: id,
          name: newSubject.name,
          difficulty: newSubject.difficulty,
          progress: 0,
          plannedHours: 10,
          spentHours: 0,
          weakTopics: [],
          exam: newSubject.exam
      };

      setSubjects(prev => [...prev, subject]);
      
      // Initialize difficulty
      setDifficulty(prev => ({
          ...prev,
          [id]: newSubject.difficulty === 'hard' ? 3 : newSubject.difficulty === 'medium' ? 2 : 1
      }));

      setNewSubject(DEFAULT_NEW_SUBJECT);
      setShowAddSubject(false);
      setStatusNote("New subject added.");
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

      {/* Add Subject Section */}
      <div className="flex justify-end">
          <Button onClick={() => setShowAddSubject(!showAddSubject)}>
              {showAddSubject ? "Cancel Add Subject" : "+ Add Subject"}
          </Button>
      </div>

      {showAddSubject && (
        <Card>
            <CardHeader>
                <CardTitle>Add New Subject</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="subject-name">Subject Name</Label>
                        <Input
                            id="subject-name"
                            placeholder="e.g. Calculus"
                            value={newSubject.name}
                            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subject-difficulty">Difficulty</Label>
                        <Select
                            id="subject-difficulty"
                            value={newSubject.difficulty}
                            onChange={(e) => setNewSubject({ ...newSubject, difficulty: e.target.value as Difficulty })}
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subject-exam">Exam Date</Label>
                        <Input
                            id="subject-exam"
                            type="datetime-local"
                            value={newSubject.exam}
                            onChange={(e) => setNewSubject({ ...newSubject, exam: e.target.value })}
                        />
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <Button onClick={handleAddSubject}>Save Subject</Button>
                </div>
            </CardContent>
        </Card>
      )}

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
            {nextExam ? (
                <>
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
                      {nextExam.name}
                    </span>
                    <Badge variant="outline">Countdown live</Badge>
                  </div>
                  <p className="text-muted-foreground">
                    System boosts weight for near exams, sliding tasks earlier and
                    shrinking breaks.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="secondary">
                      {new Date(nextExam.exam).toLocaleDateString()}
                    </Badge>
                    <Badge variant="outline">Auto-redistributing</Badge>
                  </div>
                </div>
                </>
            ) : (
                <div className="text-muted-foreground p-4">No exams scheduled. Add a subject with an exam date.</div>
            )}
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

        {/* Removed Plan health card */}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Today&apos;s tasks</CardTitle>
              <CardDescription>
                Drag tasks between columns to update their status
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddTask(true)} disabled={subjects.length === 0}>
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
                      {subjects.map((subject) => (
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
                              onDragEnd={() => setDraggingId(null)}
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
                                        {subject?.name || "Unknown"}
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

      {/* Removed original Today's tasks section */}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Removed Interactive study timeline Card */}

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Difficulty + adaptive weight</CardTitle>
            <CardDescription>
              Mark topics as easy / medium / hard to instantly adapt.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {subjects.length === 0 && <div className="text-sm text-muted-foreground">No subjects added yet.</div>}
              {subjects.map((subject) => (
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
            {selectedSubject && difficulty[selectedSubject] !== undefined && (
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
            )}
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
        {subjects.map((subject) => {
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
            {subjects.map((subject) => {
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
