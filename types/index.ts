// types/index.ts

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

export type AiResponse = {
  summary: string;
  quiz: QuizQuestion[];
  generatedImageUrls: string[]; // Mảng chứa URL ảnh
};