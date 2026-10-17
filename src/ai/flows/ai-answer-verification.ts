'use server';

/**
 * @fileOverview A flow for verifying answers using AI and providing feedback.
 *
 * - verifyAnswer - A function that verifies the answer and provides feedback.
 * - VerifyAnswerInput - The input type for the verifyAnswer function.
 * - VerifyAnswerOutput - The return type for the verifyAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyAnswerInputSchema = z.object({
  question: z.string().describe('The question being asked.'),
  userAnswer: z.string().describe('The answer provided by the user.'),
  correctAnswer: z.string().describe('The correct answer to the question.'),
});
export type VerifyAnswerInput = z.infer<typeof VerifyAnswerInputSchema>;

const VerifyAnswerOutputSchema = z.object({
  isCorrect: z.boolean().describe('Whether the user answer is correct.'),
  feedback: z.string().describe('Feedback on the user answer, explaining why it is correct or incorrect.'),
});
export type VerifyAnswerOutput = z.infer<typeof VerifyAnswerOutputSchema>;

export async function verifyAnswer(input: VerifyAnswerInput): Promise<VerifyAnswerOutput> {
  return verifyAnswerFlow(input);
}

const verifyAnswerPrompt = ai.definePrompt({
  name: 'verifyAnswerPrompt',
  input: {schema: VerifyAnswerInputSchema},
  output: {schema: VerifyAnswerOutputSchema},
  prompt: `You are an AI assistant that helps students learn by verifying their answers to questions and providing feedback.

  Question: {{{question}}}
  User's Answer: {{{userAnswer}}}
  Correct Answer: {{{correctAnswer}}}

  First, determine if the user's answer is correct. Set the isCorrect field to true if it is, and false if it is not.
  Then, provide feedback to the user explaining why their answer is correct or incorrect. Be specific and helpful.
  `,
});

const verifyAnswerFlow = ai.defineFlow(
  {
    name: 'verifyAnswerFlow',
    inputSchema: VerifyAnswerInputSchema,
    outputSchema: VerifyAnswerOutputSchema,
  },
  async input => {
    const {output} = await verifyAnswerPrompt(input);
    return output!;
  }
);
