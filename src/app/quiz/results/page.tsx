'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuizHeader } from '@/components/shared/QuizHeader';
import type { Question, QuizResults } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, Bot, Loader2 } from 'lucide-react';
import { getAIFeedback } from '@/app/actions';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts"

const chartConfig = {
  correct: {
    label: "Correct",
    color: "hsl(var(--primary))",
  },
  incorrect: {
    label: "Incorrect",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<QuizResults | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aiFeedback, setAIFeedback] = useState<Record<number, string>>({});
  const [loadingFeedback, setLoadingFeedback] = useState<Record<number, boolean>>({});
  
  useEffect(() => {
    try {
      const storedResults = localStorage.getItem('quizResults');
      if (!storedResults) {
        router.replace('/quiz/setup');
        return;
      }
      const parsedResults: QuizResults = JSON.parse(storedResults);
      setResults(parsedResults);

      // Re-hydrate full question data based on IDs from answers
      // This relies on the questions being stored in localStorage during setup
      const questionSource = JSON.parse(localStorage.getItem('quizQuestions') || 'null');
      if (!questionSource) {
         router.replace('/quiz/setup');
         return;
      }

      const answerQuestionIds = new Set(parsedResults.answers.map(a => a.questionId));
      const relevantQuestions = questionSource.filter((q: Question) => answerQuestionIds.has(q.id));
      setQuestions(relevantQuestions);
    } catch (error) {
      router.replace('/quiz/setup');
    }
  }, [router]);

  const handleGetFeedback = async (question: Question, userAnswerKey: string, isCorrect: boolean) => {
    setLoadingFeedback(prev => ({ ...prev, [question.id]: true }));
    try {
      let feedbackCorrectAnswer = '';
      if (question.correctAnswer === 'ABCD') {
        feedbackCorrectAnswer = 'All options are correct.';
      } else {
        feedbackCorrectAnswer = question.options[question.correctAnswer as keyof typeof question.options];
      }

      const feedback = await getAIFeedback({
        question: question.question,
        userAnswer: question.options[userAnswerKey as keyof typeof question.options] || "No answer",
        correctAnswer: feedbackCorrectAnswer,
      });
      setAIFeedback(prev => ({...prev, [question.id]: feedback.feedback }));
    } catch (error) {
      setAIFeedback(prev => ({...prev, [question.id]: "Sorry, unable to get feedback at this time." }));
    } finally {
      setLoadingFeedback(prev => ({ ...prev, [question.id]: false }));
    }
  };

  if (!results) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const scorePercentage = (results.score / results.settings.numQuestions) * 100;
  const chartData = [
      { name: "correct", value: results.score, fill: "var(--color-correct)" },
      { name: "incorrect", value: results.settings.numQuestions - results.score, fill: "var(--color-incorrect)" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <QuizHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="font-headline text-3xl sm:text-4xl">Quiz Complete!</CardTitle>
              <CardDescription className="text-base sm:text-lg">Here's how you did.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8 items-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                 <div className="text-5xl sm:text-6xl font-bold text-primary">{scorePercentage.toFixed(0)}%</div>
                 <p className="text-lg sm:text-xl text-muted-foreground font-medium text-center">
                   You answered <span className="text-primary font-bold">{results.score}</span> out of <span className="font-bold">{results.settings.numQuestions}</span> questions correctly.
                 </p>
                 <Button asChild size="lg" className="mt-4">
                  <Link href="/quiz/setup">Try Another Quiz</Link>
                </Button>
              </div>
              <div className="h-48 sm:h-64">
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} sm-innerRadius={60} sm-outerRadius={90} />
                    </PieChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl sm:text-2xl">Review Your Answers</CardTitle>
              <CardDescription>Check your answers and get AI feedback for incorrect ones.</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {questions.map((q, index) => {
                  const userAnswer = results.answers.find(a => a.questionId === q.id);
                  const isCorrect = q.correctAnswer === 'ABCD' 
                    ? userAnswer?.answer !== undefined
                    : userAnswer?.answer === q.correctAnswer;
                  
                  return (
                    <AccordionItem value={`item-${index}`} key={q.id}>
                      <AccordionTrigger className={cn("text-base sm:text-lg text-left", isCorrect ? "text-primary" : "text-destructive")}>
                        <div className="flex items-center gap-4">
                           {isCorrect ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                           <span>Question {index + 1}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 bg-white rounded-md mt-2 space-y-4">
                        <p className="font-semibold text-base">{q.question}</p>
                        <div className="space-y-2">
                           {Object.entries(q.options).map(([key, value]) => {
                             const isCorrectAnswer = q.correctAnswer === 'ABCD' || q.correctAnswer === key;
                             return (
                               <div key={key} className={cn(
                                 "flex items-start sm:items-center p-2 rounded-md text-sm sm:text-base",
                                  isCorrectAnswer && "bg-green-100 text-green-800 font-semibold",
                                  userAnswer?.answer === key && !isCorrect && "bg-red-100 text-red-800"
                               )}>
                                 <Badge variant={isCorrectAnswer ? "default" : "outline"} className={cn("mt-1 sm:mt-0", !isCorrectAnswer && "border-muted-foreground text-muted-foreground", isCorrectAnswer && "bg-green-600")}>{key}</Badge>
                                 <span className="ml-3 flex-1">{value}</span>
                                 {userAnswer?.answer === key && <Badge variant="secondary" className="ml-auto mt-1 sm:mt-0">{isCorrect ? 'Your Answer (Correct)' : 'Your Answer'}</Badge>}
                               </div>
                             );
                           })}
                        </div>

                        {!isCorrect && (
                          <div className="mt-4 p-4 border-t">
                            {aiFeedback[q.id] ? (
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2"><Bot className="h-5 w-5 text-primary"/> AI Feedback</h4>
                                    <p className="text-muted-foreground">{aiFeedback[q.id]}</p>
                                </div>
                            ) : (
                              <Button
                                onClick={() => handleGetFeedback(q, userAnswer?.answer || '', isCorrect)}
                                disabled={loadingFeedback[q.id]}
                                size="sm"
                                variant="outline"
                              >
                                {loadingFeedback[q.id] ? (
                                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Getting Feedback...</>
                                ) : (
                                  <><Bot className="mr-2 h-4 w-4" /> Get AI Feedback</>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
