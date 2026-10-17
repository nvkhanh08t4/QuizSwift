'use client';

import { Trophy } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';

type QuizHeaderProps = {
  showStopButton?: boolean;
  onStopClick?: () => void;
};

export function QuizHeader({ showStopButton = false, onStopClick }: QuizHeaderProps) {
  return (
    <header className="w-full bg-card shadow-sm border-b">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <Link href="/" className="flex items-center gap-2">
          <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          <span className="font-headline text-lg sm:text-2xl font-bold">Quiz App</span>
        </Link>
        <div className="flex items-center gap-2">
          {showStopButton && (
            <Button variant="destructive" size="sm" onClick={onStopClick}>
              Dừng bài thi
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Trang chủ</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
