'use client';

import { useEffect, useState } from 'react';
import { QuizHeader } from '@/components/shared/QuizHeader';
import { QuizSetupForm } from '@/components/quiz/QuizSetupForm';
import { getQuestions } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import type { Question } from '@/lib/types';

export default function HomePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [skippedRows, setSkippedRows] = useState<(string | number)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getQuestions().then(result => {
      setQuestions(result.questions);
      setSkippedRows(result.skippedRows);
      setIsLoading(false);
    });
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 mt-4 text-lg font-medium text-muted-foreground">Đang tải câu hỏi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <QuizHeader />
      <main className="flex-grow flex items-center justify-center p-4">
        <QuizSetupForm 
          defaultQuestions={questions} 
          maxQuestions={questions.length}
          skippedRows={skippedRows}
        />
      </main>
    </div>
  );
}
