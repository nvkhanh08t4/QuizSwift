'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuizHeader } from '@/components/shared/QuizHeader';
import type { Question, QuizSettings, UserAnswer } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function ActiveQuizPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('quizSettings');
      const storedQuestions = localStorage.getItem('quizQuestions');

      if (!storedSettings || !storedQuestions) {
        router.replace('/quiz/setup');
        return;
      }
      
      const parsedSettings: QuizSettings = JSON.parse(storedSettings);
      const parsedQuestions: Question[] = JSON.parse(storedQuestions);
      
      setSettings(parsedSettings);
      setQuestions(parsedQuestions);
      setTimeLeft(parsedSettings.timeLimit * 60);
      setStartTime(Date.now());
      setIsLoading(false);
    } catch (error) {
      router.replace('/quiz/setup');
    }
  }, [router]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      handleQuizEnd(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(t => (t !== null ? t - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...userAnswers.filter(a => a.questionId !== questions[currentQuestionIndex].id)];
    newAnswers.push({ questionId: questions[currentQuestionIndex].id, answer });
    setUserAnswers(newAnswers);
  };
  
  const handleQuizEnd = (timedOut = false) => {
    if (!settings || !startTime) return;

    if (!timedOut) {
      setIsSubmitting(true);
    }

    // Artificial delay to show loading state if manual submit
    const delay = timedOut ? 0 : 800;

    setTimeout(() => {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const score = userAnswers.reduce((acc, userAnswer) => {
        const question = questions.find(q => q.id === userAnswer.questionId);
        if (question) {
          if (question.correctAnswer === 'ABCD') {
             if (['A', 'B', 'C', 'D'].includes(userAnswer.answer)) {
               return acc + 1;
             }
          } else if (question.correctAnswer === userAnswer.answer) {
            return acc + 1;
          }
        }
        return acc;
      }, 0);
      
      localStorage.setItem('quizResults', JSON.stringify({ settings, answers: userAnswers, score, timeTaken }));
      
      if (timedOut) {
        setShowTimeoutAlert(true);
      } else {
        router.push('/quiz/results');
      }
    }, delay);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswer = userAnswers.find(a => a.questionId === currentQuestion?.id)?.answer;

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (isLoading || !currentQuestion || !settings) {
    return (
      <div className="min-h-screen flex flex-col">
        <QuizHeader />
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <Card className="w-full max-w-3xl shadow-lg">
              <CardHeader>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </CardFooter>
            </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <QuizHeader showStopButton={true} onStopClick={() => setShowStopConfirm(true)} />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
        <div className="w-full max-w-3xl space-y-4">
            <div className="flex justify-between items-center mb-4">
                <p className="text-base sm:text-lg font-medium text-muted-foreground">Question {currentQuestionIndex + 1} of {settings.numQuestions}</p>
                <div className="flex items-center gap-2 font-semibold text-primary bg-primary/10 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm sm:text-base">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>{formatTime(timeLeft)}</span>
                </div>
            </div>
          <Progress value={((currentQuestionIndex + 1) / settings.numQuestions) * 100} className="w-full h-2 sm:h-3 mb-6" />
          <Card className={cn("w-full shadow-xl animate-fade-in", isSubmitting && "opacity-70 pointer-events-none")}>
            <CardHeader>
              <CardTitle className="font-headline text-xl sm:text-2xl leading-relaxed">{currentQuestion.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect} className="space-y-3 sm:space-y-4">
                {Object.entries(currentQuestion.options).map(([key, value]) => (
                  <Label 
                    key={key} 
                    htmlFor={`option-${key}`} 
                    className={cn(
                      "flex items-start sm:items-center p-3 sm:p-4 border rounded-lg cursor-pointer hover:bg-primary/10 transition-colors",
                      selectedAnswer === key ? "bg-green-100 border-green-400 text-green-800" : "bg-card"
                    )}
                  >
                    <RadioGroupItem value={key} id={`option-${key}`} className="sr-only" />
                    <span className="font-bold text-base sm:text-lg mr-3 sm:mr-4">{key}</span>
                    <span className="text-sm sm:text-base flex-1">{value}</span>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => setCurrentQuestionIndex(i => i - 1)} 
                  disabled={currentQuestionIndex === 0 || isSubmitting}
                >
                  Previous
                </Button>
              </div>
              <div>
                {currentQuestionIndex < settings.numQuestions - 1 ? (
                  <Button 
                    onClick={() => setCurrentQuestionIndex(i => i + 1)} 
                    disabled={!selectedAnswer || isSubmitting}
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleQuizEnd()} 
                    className="bg-accent text-accent-foreground hover:bg-accent/90" 
                    disabled={!selectedAnswer || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang nộp bài...
                      </>
                    ) : (
                      'Submit Quiz'
                    )}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      {/* Timeout Alert */}
      <AlertDialog open={showTimeoutAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Time's Up!</AlertDialogTitle>
            <AlertDialogDescription>
              You have run out of time. Your quiz has been submitted automatically. Let's see your results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => router.push('/quiz/results')}>View Results</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stop Confirmation Alert */}
      <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Quiz?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to stop the quiz? Your progress will be saved and submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleQuizEnd()} disabled={isSubmitting}>End Quiz</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
