"use client";
import { useState, useEffect } from 'react';
import mermaid from 'mermaid';
import { supabase } from '../lib/supabaseClient';
import { AiResponse } from '../types';
import QuizComponent from '../components/QuizComponent';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';

// --- Icon 'Download' đã được thêm ---
import {
  Upload, FileText, Brain, Image as ImageIcon, AlertCircle, Loader2,
  CheckCircle, Video, Map, Download
} from 'lucide-react';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// --- COMPONENT CON ĐỂ RENDER MERMAID (ĐÃ SỬA LỖI) ---
const MermaidDiagram = ({ chartDefinition }: { chartDefinition: string }) => {
  const diagramId = 'mermaid-diagram';
  const containerId = 'mermaid-container';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        securityLevel: 'loose',
        logLevel: 3
      });

      const renderChart = async () => {
        const element = document.getElementById(containerId);
        if (element) {
          try {
            const cleanedChart = chartDefinition
              .replace(/```mermaid/g, '')
              .replace(/```/g, '')
              .trim();

            const { svg } = await mermaid.render(diagramId, cleanedChart);
            element.innerHTML = svg;

          } catch (error) {
            console.error('Mermaid Render Error:', error);
            if (error instanceof Error) {
              element.innerHTML = `<pre style="color: red;">Lỗi vẽ sơ đồ: ${error.message}</pre>`;
            } else {
              element.innerHTML = `<pre style="color: red;">Lỗi vẽ sơ đồ không xác định.</pre>`;
            }
          }
        } else {
          console.warn(`Container with id ${containerId} not found.`);
        }
      };

      const timer = setTimeout(renderChart, 100);

      return () => {
        clearTimeout(timer);
        const element = document.getElementById(containerId);
        if (element) {
          element.innerHTML = '';
        }
      };
    }
  }, [chartDefinition, containerId, diagramId]);

  return <div id={containerId} className="w-full h-full flex justify-center items-center" />;
};
// --- KẾT THÚC COMPONENT CON ---


export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // (handleFileChange giữ nguyên)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      setError(null);
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File quá lớn! Vui lòng chọn file nhỏ hơn ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      setFile(null);
      e.target.value = '';
      return;
    }
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

  // (handleUpload giữ nguyên)
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      setUploadProgress(30);
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      setUploadProgress(50);
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
      // console.log("Dữ liệu AI trả về:", data);
      // console.log("Cú pháp Mermaid AI gửi:", data.mindMapMermaid);
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

  // (formatFileSize giữ nguyên)
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // --- HÀM MỚI: XỬ LÝ TẢI SƠ ĐỒ TƯ DUY ---
  const handleDownloadMindMap = () => {
    const svgElement = document.querySelector('#mermaid-container svg');

    if (!svgElement) {
      setError('Lỗi: Không tìm thấy sơ đồ để tải về. Vui lòng thử lại.');
      return;
    }

    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'so_do_tu_duy.svg';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header (Giữ nguyên) */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 py-3">
            🤖
            <span className='bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
              AI Hỗ Trợ Học Tập
            </span>
          </h1>
          <p className="text-xl text-gray-600">
            Tải tài liệu (PDF/TXT) lên để AI tự động tạo bản tóm tắt chi tiết, bài quiz nhanh, sơ đồ tư duy trực quan, cùng video & hình ảnh liên quan giúp bạn học hiệu quả hơn.
          </p>
        </div>

        {/* Upload Card (Giữ nguyên) */}
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
            {/* ... (Code bên trong CardContent giữ nguyên) ... */}
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

            {/* === KHỐI SƠ ĐỒ TƯ DUY (ĐÃ CẬP NHẬT NÚT TẢI) === */}
            {aiResult.mindMapMermaid && (
              <Card className="shadow-xl">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <Map className="w-6 h-6 text-green-500" />
                      Sơ đồ tư duy
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleDownloadMindMap}>
                      <Download className="w-4 h-4 mr-2" />
                      Tải về (SVG)
                    </Button>
                  </div>
                  <CardDescription>
                    Cấu trúc tổng quan của tài liệu.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6 min-h-[400px] overflow-auto">
                  <MermaidDiagram chartDefinition={aiResult.mindMapMermaid} />
                </CardContent>
              </Card>
            )}

            {/* Video (Giữ nguyên) */}
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

            {/* Hình ảnh (Giữ nguyên) */}
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
                        href={image.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group overflow-hidden rounded-lg shadow-lg block"
                      >
                        <img
                          src={image.thumbnailUrl}
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

            {/* Quiz (Giữ nguyên) */}
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