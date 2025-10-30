"use client";
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AiResponse } from '../types'; // Đảm bảo file types đã được cập nhật
import QuizComponent from '../components/QuizComponent';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
// --- THÊM ICON 'Video' ---
import { Upload, FileText, Brain, Image as ImageIcon, AlertCircle, Loader2, CheckCircle, Video } from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      setError(null);
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File quá lớn! Vui lòng chọn file nhỏ hơn ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      setFile(null);
      e.target.value = '';
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Định dạng file không hợp lệ! Chỉ chấp nhận PDF và TXT');
      setFile(null);
      e.target.value = '';
      return;
    }

    setFile(selectedFile);
    setError(null);
    setAiResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Vui lòng chọn file");
      return;
    }

    setLoading(true);
    setAiResult(null);
    setError(null);
    setUploadProgress(10);

    try {
      // 1. Upload file lên Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // 2. Gọi API route để xử lý file
      const response = await fetch('/api/process-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: filePath }),
      });

      setUploadProgress(80);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server xử lý thất bại');
      }

      const data: AiResponse = await response.json();
      setAiResult(data);
      setUploadProgress(100);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi không xác định");
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 py-3">
            🤖
            <span className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
              AI Hỗ Trợ Học Tập
            </span>
          </h1>
          <p className="text-xl text-gray-600">
            Tải tài liệu lên, AI tóm tắt & tạo quiz ngay
          </p>
        </div>

        {/* Upload Card */}
        <Card className="mb-8 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Tải tài liệu lên
            </CardTitle>
            <CardDescription>
              Hỗ trợ file PDF và TXT (tối đa 50MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label htmlFor="file-upload" className="flex-1">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {file ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        {file.name} ({formatFileSize(file.size)})
                      </span>
                    ) : (
                      'Nhấp để chọn file hoặc kéo thả vào đây'
                    )}
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.txt"
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">Đang xử lý... {uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={loading || !file}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Đang phân tích & tìm kiếm (1-2 phút)...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5 mr-2" />
                  Bắt đầu học
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {aiResult && (
          <div className="space-y-8">
            {/* Summary */}
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-500" />
                  Tóm tắt nội dung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{aiResult.summary}</p>
              </CardContent>
            </Card>

            {/* === KHỐI MỚI: VIDEO LIÊN QUAN === */}
            {aiResult.relatedVideos && aiResult.relatedVideos.length > 0 && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="w-6 h-6 text-red-500" />
                    Video liên quan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiResult.relatedVideos.map((video, i) => (
                      <a
                        key={i}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group overflow-hidden rounded-lg shadow-lg block"
                      >
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Video className="w-12 h-12 text-white" />
                        </div>
                        <p className="p-2 text-sm font-medium text-gray-800 truncate bg-white" title={video.title}>
                          {video.title}
                        </p>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* === KHỐI MỚI: HÌNH ẢNH MINH HỌA === */}
            {aiResult.relatedImages && aiResult.relatedImages.length > 0 && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-6 h-6 text-purple-500" />
                    Hình ảnh minh họa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiResult.relatedImages.map((image, i) => (
                      <a
                        key={i}
                        href={image.url} // Link tới trang Pexels
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group overflow-hidden rounded-lg shadow-lg block"
                      >
                        <img
                          src={image.thumbnailUrl} // Link ảnh trực tiếp
                          alt={image.title}
                          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <Badge className="absolute top-2 right-2">
                          {image.title}
                        </Badge>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quiz */}
            {aiResult.quiz && aiResult.quiz.length > 0 && (
              <div>
                <QuizComponent questions={aiResult.quiz} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}