"use client";
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AiResponse } from '../types';
import QuizComponent from '../components/QuizComponent';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Upload, FileText, Brain, Image as ImageIcon, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

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
                  Đang phân tích (1-2 phút)...
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

            {/* Generated Images */}
            {aiResult.generatedImageUrls && aiResult.generatedImageUrls.length > 0 && (
              <Card className="shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-6 h-6 text-purple-500" />
                    Hình ảnh minh họa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {aiResult.generatedImageUrls.map((url, i) => (
                      <div key={i} className="relative group overflow-hidden rounded-lg shadow-lg">
                        <img
                          src={url}
                          alt={`Ảnh minh họa ${i + 1}`}
                          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <Badge className="absolute top-2 right-2">
                          Ảnh {i + 1}
                        </Badge>
                      </div>
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