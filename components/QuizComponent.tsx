// components/QuizComponent.tsx
import { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
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
  const [isStarted, setIsStarted] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Xử lý đếm ngược - CHỈ chạy khi đã bắt đầu
  useEffect(() => {
    if (!isTimerRunning || showResult || !isStarted) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === 1) {
          handleNextQuestion();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQuestionIndex, showResult, isTimerRunning, isStarted]);

  // Bắt đầu quiz
  const handleStartQuiz = () => {
    setIsStarted(true);
    setIsTimerRunning(true);
  };

  // Xử lý qua câu hỏi tiếp theo
  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setTimer(15);
    setIsTimerRunning(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setTimeout(() => setIsTimerRunning(true), 500);
    } else {
      setShowResult(true);
    }
  };

  // Xử lý khi chọn đáp án
  const handleAnswerClick = (option: string) => {
    if (selectedAnswer) return;

    setSelectedAnswer(option);
    setIsTimerRunning(false);
    
    if (option === currentQuestion.correctAnswer) {
      setScore(score + 1);
    }

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
        </CardContent>
      </Card>
    );
  }

  // Màu sắc cho đáp án
  const getButtonVariant = (option: string) => {
    if (!selectedAnswer) return "outline";
    if (option === currentQuestion.correctAnswer) return "default";
    if (option === selectedAnswer) return "destructive";
    return "outline";
  };

  const getButtonClassName = (option: string) => {
    if (!selectedAnswer) return "";
    if (option === currentQuestion.correctAnswer) return "bg-green-500 hover:bg-green-600 border-green-600";
    if (option === selectedAnswer) return "bg-red-500 hover:bg-red-600 border-red-600";
    return "opacity-50";
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
              disabled={!!selectedAnswer}
              variant={getButtonVariant(option)}
              className={`w-full justify-start text-left h-auto py-4 px-6 ${getButtonClassName(option)}`}
            >
              <span className="flex items-center gap-3 w-full">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{option}</span>
                {selectedAnswer && option === currentQuestion.correctAnswer && (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                )}
                {selectedAnswer && option === selectedAnswer && option !== currentQuestion.correctAnswer && (
                  <XCircle className="w-5 h-5 text-white" />
                )}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}