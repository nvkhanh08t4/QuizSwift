export interface Question {
  id: number | string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'ABCD';
}

export type UserAnswer = {
  questionId: number | string;
  answer: string;
};

export interface QuizSettings {
  numQuestions: number;
  timeLimit: number; // in minutes
}

export interface QuizResults {
  settings: QuizSettings;
  answers: UserAnswer[];
  score: number;
  timeTaken: number; // in seconds
}
