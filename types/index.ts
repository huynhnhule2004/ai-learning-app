// types/index.ts

export type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
};

// Kiểu dữ liệu cho media
export type MediaSuggestion = {
  title: string;
  url: string;
  thumbnailUrl: string; // Dùng cho ảnh/video
};

// --- CẬP NHẬT: Kiểu dữ liệu AI trả về cho Frontend ---
export type AiResponse = {
  summary: string;
  quiz: QuizQuestion[];
  relatedVideos: MediaSuggestion[];
  relatedImages: MediaSuggestion[];
};

// --- (NỘI BỘ): Kiểu dữ liệu Gemini trả về ---
export type GeminiInternalResponse = {
  summary: string;
  quiz: QuizQuestion[];
  searchKeywords: string[]; // Thêm trường keywords
}