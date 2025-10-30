// types/index.ts

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

export type MediaSuggestion = {
  title: string;
  url: string;
  thumbnailUrl: string; // Dùng cho ảnh/video
};

// --- Kiểu dữ liệu AI trả về cho Frontend ---
export type AiResponse = {
  summary: string;
  quiz: QuizQuestion[];
  relatedVideos: MediaSuggestion[];
  relatedImages: MediaSuggestion[];
  mindMapMermaid: string; // Chuỗi cú pháp Mermaid
};

// --- (NỘI BỘ): Kiểu dữ liệu Gemini trả về ---
export type GeminiInternalResponse = {
  summary: string;
  quiz: QuizQuestion[];
  searchKeywords: string[];
  mindMapMermaid: string;
}