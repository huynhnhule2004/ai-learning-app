// components/QuizComponent.tsx
"use client"; // Cần thiết nếu bạn dùng App Router của Next.js
import { useState, useEffect } from 'react';
import { QuizQuestion } from '../types'; // Đảm bảo đường dẫn import đúng
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'; // Đường dẫn có thể khác
import { Button } from './ui/button'; // Đường dẫn có thể khác
import { Progress } from './ui/progress'; // Đường dẫn có thể khác
import { Badge } from './ui/badge'; // Đường dẫn có thể khác
import { Clock, CheckCircle2, XCircle, Trophy, PlayCircle } from 'lucide-react';

interface QuizProps {
  questions: QuizQuestion[];
}

export default function QuizComponent({ questions }: QuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timer, setTimer] = useState(15);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false); // Trạng thái bắt đầu quiz
  const [isTimerRunning, setIsTimerRunning] = useState(false); // Trạng thái chạy timer

  // Kiểm tra nếu questions rỗng hoặc không phải mảng
  if (!Array.isArray(questions) || questions.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardContent className="pt-6 text-center text-red-500">
          Lỗi: Không có câu hỏi nào được cung cấp cho Quiz.
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Xử lý đếm ngược - CHỈ chạy khi đã bắt đầu và đang chạy
  useEffect(() => {
    if (!isTimerRunning || showResult || !isStarted) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) {
          // Tự động chuyển khi hết giờ (tạm dừng timer)
          setIsTimerRunning(false);
          // Đánh dấu là chưa chọn gì (để không tính điểm)
          setSelectedAnswer("TIMEOUT"); // Dùng một giá trị đặc biệt
          setTimeout(() => handleNextQuestion(), 1500); // Chờ 1.5s rồi chuyển
          return 15; // Reset cho lần sau
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex, showResult, isTimerRunning, isStarted]); // Bỏ handleNextQuestion ra khỏi dependencies

  // Bắt đầu quiz
  const handleStartQuiz = () => {
    setIsStarted(true);
    setIsTimerRunning(true); // Bắt đầu chạy timer
    setCurrentQuestionIndex(0); // Reset về câu đầu
    setScore(0);
    setShowResult(false);
    setSelectedAnswer(null);
  };

  // Xử lý qua câu hỏi tiếp theo
  const handleNextQuestion = () => {
    setSelectedAnswer(null); // Reset lựa chọn
    setTimer(15); // Reset thời gian
    setIsTimerRunning(false); // Dừng timer tạm thời

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Bắt đầu lại timer sau 1 chút để user đọc câu hỏi
      setTimeout(() => setIsTimerRunning(true), 500);
    } else {
      setShowResult(true); // Kết thúc quiz
    }
  };

  // Xử lý khi chọn đáp án
  const handleAnswerClick = (option: string) => {
    if (selectedAnswer) return; // Không cho chọn lại

    setSelectedAnswer(option);
    setIsTimerRunning(false); // Dừng timer khi đã chọn

    if (option === currentQuestion.correctAnswer) {
      setScore(score + 1); // Cộng điểm nếu đúng
    }

    // Chờ 1.5 giây để xem kết quả rồi chuyển câu
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  };

  // Màn hình chưa bắt đầu
  if (!isStarted) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Quiz nhanh
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            {questions.length} câu hỏi • 15 giây mỗi câu
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Hãy đọc kỹ câu hỏi trước khi chọn đáp án. Bạn sẵn sàng chưa?
          </p>
          <Button
            onClick={handleStartQuiz}
            size="lg"
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2"
          >
            <PlayCircle className="w-5 h-5" />
            Bắt đầu Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Hiển thị kết quả
  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader className="text-center">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <CardTitle className="text-3xl font-bold">Hoàn thành!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-6xl font-bold text-primary">{score}/{questions.length}</p>
            <p className="text-2xl text-gray-600">{percentage}% chính xác</p>
          </div>
          <Progress value={percentage} className="h-4" />
          <Badge variant={percentage >= 70 ? "default" : "destructive"} className="text-lg px-4 py-2">
            {percentage >= 70 ? "🎉 Xuất sắc!" : "💪 Cố gắng thêm nhé!"}
          </Badge>
           {/* Nút chơi lại */}
           <Button
            onClick={handleStartQuiz} // Gọi lại hàm bắt đầu
            size="lg"
            variant="outline"
            className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 mt-4"
          >
            Chơi lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- LOGIC HIỂN THỊ ĐÚNG/SAI CHO CÁC NÚT ---
  // Xác định variant (kiểu style) của nút dựa trên trạng thái
  const getButtonVariant = (option: string): "default" | "destructive" | "secondary" | "outline" | "ghost" | "link" => {
    if (!selectedAnswer) return "outline"; // Chưa chọn: Mặc định
    if (option === currentQuestion.correctAnswer) return "default"; // Luôn là 'default' (màu chính) nếu là đáp án đúng
    if (option === selectedAnswer) return "destructive"; // Nếu chọn sai: Màu đỏ
    return "outline"; // Các đáp án sai khác (không được chọn)
  };

  // Xác định các lớp CSS bổ sung (màu nền, hiệu ứng)
  const getButtonClassName = (option: string) => {
    if (!selectedAnswer) return "hover:bg-accent hover:text-accent-foreground"; // Hiệu ứng hover khi chưa chọn
    if (option === currentQuestion.correctAnswer) return "bg-green-500 hover:bg-green-600 border-green-600 text-white"; // Màu xanh lá khi đúng
    if (option === selectedAnswer) return "bg-red-500 hover:bg-red-600 border-red-600 text-white"; // Màu đỏ khi chọn sai
    return "opacity-60 cursor-not-allowed"; // Làm mờ các đáp án sai khác
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary">
            Câu {currentQuestionIndex + 1}/{questions.length}
          </Badge>
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`} />
            <span className={`text-xl font-bold ${timer <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
              {timer}s
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2 mb-4" />
        <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {currentQuestion.options.map((option, index) => (
            <Button
              key={index}
              onClick={() => handleAnswerClick(option)}
              disabled={!!selectedAnswer} // Vô hiệu hóa khi đã chọn
              variant={getButtonVariant(option)}
              // Kết hợp lớp CSS mặc định và lớp tùy chỉnh
              className={`w-full justify-start text-left h-auto py-4 px-6 whitespace-normal break-words transition-all duration-300 ${getButtonClassName(option)}`}
            >
              <span className="flex items-start gap-3 w-full">
                {/* Vòng tròn chữ cái A, B, C, D */}
                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold mt-0.5 border
                                  ${selectedAnswer && option === currentQuestion.correctAnswer ? 'bg-white text-green-600 border-green-600' :
                                    selectedAnswer && option === selectedAnswer ? 'bg-white text-red-600 border-red-600' :
                                    'bg-gray-100 text-gray-700 border-gray-300'}`}>
                  {String.fromCharCode(65 + index)}
                </span>
                {/* Nội dung đáp án */}
                <span className="flex-1 break-words">{option}</span>
                {/* Icon Đúng/Sai */}
                {selectedAnswer && option === currentQuestion.correctAnswer && (
                  <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                )}
                {selectedAnswer && option === selectedAnswer && option !== currentQuestion.correctAnswer && (
                  <XCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                )}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}