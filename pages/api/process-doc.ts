// pages/api/process-doc.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { AiResponse, GeminiInternalResponse, MediaSuggestion } from '../../types'; 
import { PDFParse } from 'pdf-parse';
import path from 'path';

// --- GÓI CŨ ---
import { GoogleGenerativeAI } from '@google/generative-ai'; 

// --- KHAI BÁO BIẾN MÔI TRƯỜNG MEDIA ---
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

// Cấu hình worker cho pdf-parse (Vercel Fix)
const workerPath = path.join(
  process.cwd(), 
  'node_modules', 
  'pdf-parse', 
  'lib', 
  'pdf.worker.js'
);

// Khởi tạo Clients
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ===================================
//              HELPER FUNCTIONS
// ===================================

// Hàm đọc PDF (ĐÃ SỬA: Thêm cấu hình worker)
async function extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({
    data: fileBuffer,
  });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

// Hàm gọi API YouTube
async function fetchYouTubeVideos(query: string): Promise<MediaSuggestion[]> {
    if (!YOUTUBE_API_KEY) return [];
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${YOUTUBE_API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) { console.error("YouTube API Error:", data.error.message); return []; }
        return data.items
            .filter((item: any) => item.id.videoId)
            .map((item: any) => ({
                title: item.snippet.title,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
                thumbnailUrl: item.snippet.thumbnails.high.url
            }));
    } catch (e) { console.error("Lỗi khi gọi YouTube API:", e); return []; }
}

// Hàm gọi API Pexels
async function fetchPexelsImages(query: string): Promise<MediaSuggestion[]> {
    if (!PEXELS_API_KEY) return [];
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3`;
    try {
        const response = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
        const data = await response.json();
        if (data.error) { console.error("Pexels API Error:", data.error); return []; }
        return data.photos.map((photo: any) => ({
            title: `Ảnh của ${photo.photographer}`,
            url: photo.url,
            thumbnailUrl: photo.src.medium
        }));
    } catch (e) { console.error("Lỗi khi gọi Pexels API:", e); return []; }
}

// ===================================
//          HÀM HANDLER CHÍNH
// ===================================
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AiResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { filePath } = req.body;
    
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'Không tìm thấy filePath hợp lệ' });
    }

    // 1. Tải file và đọc PDF
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('documents')
      .download(filePath);
      
    if (downloadError) throw new Error('Không thể tải file từ storage: ' + downloadError.message);
    if (!fileData) throw new Error('File không tồn tại');

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    let textContent = "";
    
    if (filePath.endsWith('.pdf')) {
      textContent = await extractTextFromPdf(fileBuffer);
    } else if (filePath.endsWith('.txt')) {
      textContent = fileBuffer.toString('utf-8');
    } else {
      throw new Error("Định dạng file chưa được hỗ trợ.");
    }

    if (!textContent || textContent.trim().length === 0) {
      throw new Error('Không thể trích xuất nội dung từ file.');
    }

    const truncatedText = textContent.substring(0, 15000); 
    
    // 2. Gọi GEMINI (PROMPT CỰC KỲ NGHIÊM NGẶT)
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro", 
    });

    // --- PROMPT ĐÃ ĐƯỢC LÀM NGHIÊM NGẶT HƠN VỀ correctAnswer ---
    const prompt = `
      Bạn là một trợ lý học tập thông minh. Dựa vào văn bản được cung cấp, hãy thực hiện 4 yêu cầu sau:
      1. Tóm tắt nội dung chính CHI TIẾT (khoảng 7-10 câu) (key "summary").
      2. Tạo ra 3 câu hỏi trắc nghiệm (quiz) (key "quiz"). Mỗi câu hỏi phải có:
         - "question": string (Nội dung câu hỏi)
         - "options": Mảng gồm EXACTLY 4 string (4 lựa chọn A, B, C, D)
         - "correctAnswer": string (NỘI DUNG của đáp án đúng, PHẢI TRÙNG KHỚP 100% VỚI MỘT TRONG 4 options)
      3. Tạo 2 từ khóa tìm kiếm (searchKeywords) tiếng Việt/Anh chất lượng cao.
      4. Tạo một sơ đồ tư duy (mindMapMermaid) CỰC KỲ ĐƠN GIẢN (tối đa 10 nút) 
         sử dụng cú pháp Mermaid 'graph TD'. 
         
         TUYỆT ĐỐI CHỈ DÙNG CÚ PHÁP CƠ BẢN NHẤT.
         VÍ DỤ CÚ PHÁP ĐÚNG:
         graph TD
         A[Chủ đề] --> B(Ý 1)
         A --> C(Ý 2)
         B --> D(Chi tiết)

         VÍ DỤ CÚ PHÁP SAI (KHÔNG DÙNG):
         graph TD; A("Text") -- "Link text" --> B;

      Bạn PHẢI trả lời bằng đối tượng JSON, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC.
      
      Cấu trúc JSON bắt buộc:
      {
        "summary": "string",
        "quiz": [ 
          { 
            "question": "Câu hỏi ví dụ?", 
            "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"], 
            "correctAnswer": "Lựa chọn B" // Phải khớp 100% với một option ở trên
          } 
        ],
        "searchKeywords": ["từ khóa 1", "từ khóa 2"],
        "mindMapMermaid": "graph TD\\nA --> B"
      }

      ---
      VĂN BẢN ĐẦU VÀO:
      ${truncatedText}
      ---
    `;

    // 4. Xử lý kết quả Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    let responseText = response.text();

    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    let geminiData: GeminiInternalResponse;
    
    try {
      geminiData = JSON.parse(responseText);
       // --- THÊM DEBUG LOG ĐỂ KIỂM TRA DỮ LIỆU THÔ ---
      //  console.log("Dữ liệu JSON thô từ Gemini:", geminiData);
      //  if (geminiData.quiz && geminiData.quiz.length > 0) {
      //      console.log("Câu hỏi 1 - Options:", geminiData.quiz[0].options);
      //      console.log("Câu hỏi 1 - CorrectAnswer:", geminiData.quiz[0].correctAnswer);
      //  }
       // --- KẾT THÚC DEBUG LOG ---
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('AI trả về kết quả không hợp lệ.');
    }

    // 5. GỌI API MEDIA (Song song)
    const keywords = (geminiData.searchKeywords || []).join(' ');

    const [relatedVideos, relatedImages] = await Promise.all([
        fetchYouTubeVideos(keywords),
        fetchPexelsImages(keywords)
    ]);

    // 6. Gửi phản hồi cuối cùng
    const finalResponse: AiResponse = {
        summary: geminiData.summary,
        quiz: geminiData.quiz,
        relatedVideos: relatedVideos,
        relatedImages: relatedImages,
        mindMapMermaid: geminiData.mindMapMermaid,
    };
    
    res.status(200).json(finalResponse);

  } catch (error: any) {
    console.error("Lỗi tại /api/process-doc:", error);
    const errorMessage = error.message || 'Lỗi server không xác định';
    res.status(500).json({ error: errorMessage });
  }
}