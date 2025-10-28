// pages/api/process-doc.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { AiResponse } from '../../types'; // Vẫn cần types/index.ts
import { PDFParse } from 'pdf-parse';
import path from 'path';
import { fileURLToPath } from 'url';

// --- GÓI CŨ ---
import { GoogleGenerativeAI } from '@google/generative-ai'; 

// Cấu hình worker cho pdf-parse (Giữ nguyên)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Dùng đường dẫn tương đối từ file code ---
const workerPath = path.join(
  __dirname, 
  '..', 
  '..', 
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

// --- Khởi tạo với GÓI CŨ ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Hàm đọc PDF (Như cũ)
async function extractTextFromPdf(fileBuffer: Buffer): Promise<string> {
  const parser = new PDFParse({
    data: fileBuffer,
  });
  const result = await parser.getText();
  await parser.destroy();
  return result.text;
}

// --- HÀM HANDLER CHÍNH ---
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
      
    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error('Không thể tải file từ storage: ' + downloadError.message);
    }

    if (!fileData) {
      throw new Error('File không tồn tại');
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    let textContent = "";
    
    if (filePath.endsWith('.pdf')) {
      textContent = await extractTextFromPdf(fileBuffer);
    } else if (filePath.endsWith('.txt')) {
      textContent = fileBuffer.toString('utf-8');
    } else {
      throw new Error("Định dạng file chưa được hỗ trợ. Chỉ chấp nhận PDF và TXT");
    }

    if (!textContent || textContent.trim().length === 0) {
      throw new Error('Không thể trích xuất nội dung từ file. File có thể bị hỏng hoặc rỗng');
    }

    const truncatedText = textContent.substring(0, 15000); 
    
    // 2. Gọi GEMINI
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro", 
    });

    const prompt = `
      Bạn là một trợ lý học tập thông minh. Dựa vào văn bản được cung cấp, hãy thực hiện các yêu cầu sau:
      1. Tóm tắt nội dung chính trong 3-5 câu (key "summary").
      2. Tạo ra 3 câu hỏi trắc nghiệm (quiz) với 4 đáp án mỗi câu (key "quiz").
      
      Bạn PHẢI trả lời bằng đối tượng JSON, KHÔNG THÊM BẤT KỲ VĂN BẢN NÀO KHÁC.
      
      Cấu trúc JSON bắt buộc:
      {
        "summary": "string",
        "quiz": [
          { "question": "string", "options": ["string", "string", "string", "string"], "correctAnswer": "string" }
        ]
      }

      ---
      VĂN BẢN ĐẦU VÀO:
      ${truncatedText}
      ---
    `;

    // 3. Xử lý kết quả
    const result = await model.generateContent(prompt);
    const response = result.response;
    let responseText = response.text();

    // Dọn dẹp JSON
    responseText = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();

    let finalResponse: AiResponse;
    
    try {
      finalResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response text:', responseText);
      throw new Error('AI trả về kết quả không hợp lệ. Vui lòng thử lại');
    }

    // Validate response structure
    if (!finalResponse.summary || !finalResponse.quiz || !Array.isArray(finalResponse.quiz)) {
      throw new Error('Cấu trúc dữ liệu từ AI không đúng định dạng');
    }
    
    res.status(200).json(finalResponse);

  } catch (error: any) {
    console.error("Lỗi tại /api/process-doc:", error);
    const errorMessage = error.message || 'Lỗi server không xác định';
    res.status(500).json({ error: errorMessage });
  }
}