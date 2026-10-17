
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import type { QuizSettings, Question } from '@/lib/types';
import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileWarning } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

type QuizSetupFormProps = {
  maxQuestions: number;
  defaultQuestions: Question[];
  skippedRows: (string | number)[];
};

export function QuizSetupForm({ maxQuestions, defaultQuestions, skippedRows }: QuizSetupFormProps) {
  const router = useRouter();

  const FormSchema = useMemo(() => {
    return z.object({
      numQuestions: z.coerce
        .number()
        .min(maxQuestions > 0 ? 1 : 0, 'Số lượng câu hỏi không hợp lệ.')
        .max(maxQuestions > 0 ? maxQuestions : 1, `Số lượng không được vượt quá ${maxQuestions}.`),
      timeLimit: z.coerce.number().min(1, 'Thời gian làm bài tối thiểu 1 phút.').max(120),
    });
  }, [maxQuestions]);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      numQuestions: Math.min(10, maxQuestions),
      timeLimit: 10,
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    if (maxQuestions === 0) {
      toast({
        title: 'Lỗi',
        description: 'Không có câu hỏi nào để bắt đầu.',
        variant: 'destructive',
      });
      return;
    }

    const settings: QuizSettings = {
      numQuestions: data.numQuestions,
      timeLimit: data.timeLimit,
    };

    const shuffledQuestions = [...defaultQuestions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffledQuestions.slice(0, settings.numQuestions);

    try {
      localStorage.setItem('quizSettings', JSON.stringify(settings));
      localStorage.setItem('quizQuestions', JSON.stringify(selectedQuestions));
      localStorage.removeItem('quizResults');
      router.push('/quiz/active');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not save settings.',
        variant: 'destructive',
      });
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl">Thiết lập Quiz</CardTitle>
        <CardDescription>Chọn số lượng câu hỏi và thời gian để bắt đầu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {maxQuestions === 0 ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <FileWarning className="h-4 w-4" />
              <AlertTitle>Không tìm thấy dữ liệu</AlertTitle>
              <AlertDescription>
                Hệ thống không tìm thấy câu hỏi hợp lệ trong tệp <strong>CCNH.xlsx</strong>.
                {skippedRows.length > 0 && (
                  <div className="mt-2 text-xs font-mono">
                    Lỗi: {skippedRows.join(', ')}
                  </div>
                )}
              </AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              Thử tải lại dữ liệu
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="numQuestions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số lượng câu hỏi</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={`Tối đa ${maxQuestions}`} {...field} />
                    </FormControl>
                    <FormDescription>
                      Hiện có: <span className="font-bold text-primary">{maxQuestions}</span> câu hỏi hợp lệ.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thời gian giới hạn (phút)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ví dụ: 10" {...field} />
                    </FormControl>
                    <FormDescription>Thời gian hoàn thành toàn bộ bài thi.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {skippedRows.length > 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 text-sm">Lưu ý: Bỏ qua {skippedRows.length} hàng lỗi</AlertTitle>
                  <ScrollArea className="h-20 mt-1">
                    <AlertDescription className="text-amber-700 text-[10px] leading-tight">
                      IDs bị lỗi: {skippedRows.join(', ')}
                    </AlertDescription>
                  </ScrollArea>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold text-lg py-6"
              >
                Bắt đầu làm bài
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
