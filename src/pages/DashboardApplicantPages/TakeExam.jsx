import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { getCurrentUser, getUserId } from '../../utils/auth';
import '../../components/ApplicantLayout/TakeExam.css';

const TakeExam = () => {
  const [examsList, setExamsList] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [examStarted, setExamStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [takenExams, setTakenExams] = useState([]);
  const [applicantInfo, setApplicantInfo] = useState(null);
  const [circleKey, setCircleKey] = useState(0);
  const [isProgressLoaded, setIsProgressLoaded] = useState(false);

  const currentUser = getCurrentUser();
  const userId = getUserId();

  // Helper function to check if exam has essay questions
  const hasEssayQuestions = () => {
    return selectedExam?.questions?.some(question => question.type === 'essay');
  };

  // Helper function to check if user answered any essay questions
  const hasAnsweredEssayQuestions = () => {
    if (!selectedExam?.questions) return false;
    
    return selectedExam.questions.some(question => {
      return question.type === 'essay' && answers[question.id] && answers[question.id].trim() !== '';
    });
  };

  const saveExamProgress = useCallback(async () => {
    if (!selectedExam || !examStarted || !isProgressLoaded) return;
    
    try {
      await axios.post('http://localhost/difsysapi/exam_api.php?endpoint=save-progress', {
        assignment_id: selectedExam.id,
        app_id: userId,
        current_question_index: currentQuestionIndex,
        answers: answers,
        time_elapsed: timeElapsed
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [selectedExam, examStarted, currentQuestionIndex, answers, timeElapsed, userId, isProgressLoaded]);

  useEffect(() => {
    fetchExamsData();
    fetchApplicantInfo();
  }, []);

  useEffect(() => {
    document.title = "DIFSYS | TAKE EXAM";
  }, []);

  useEffect(() => {
    if (examStarted && isProgressLoaded) {
      const interval = setInterval(() => saveExamProgress(), 10000);
      return () => clearInterval(interval);
    }
  }, [examStarted, saveExamProgress, isProgressLoaded]);

  useEffect(() => {
    if (examStarted && isProgressLoaded) {
      const timeoutId = setTimeout(() => saveExamProgress(), 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [answers, saveExamProgress, examStarted, isProgressLoaded]);

  useEffect(() => {
    if (examStarted && isProgressLoaded) {
      saveExamProgress();
    }
  }, [currentQuestionIndex, saveExamProgress, examStarted, isProgressLoaded]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (examStarted && isProgressLoaded) {
        const data = JSON.stringify({
          assignment_id: selectedExam.id,
          app_id: userId,
          current_question_index: currentQuestionIndex,
          answers: answers,
          time_elapsed: timeElapsed
        });
        
        navigator.sendBeacon(
          'http://localhost/difsysapi/exam_api.php?endpoint=save-progress',
          data
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [examStarted, selectedExam, currentQuestionIndex, answers, timeElapsed, userId, isProgressLoaded]);

  useEffect(() => {
    let timer;
    if (examStarted && timeLeft > 0 && !examCompleted) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmitExam(true);
            return 0;
          }
          return prev - 1;
        });
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examStarted, timeLeft, examCompleted]);

  const fetchApplicantInfo = async () => {
    try {
      const response = await axios.get(`http://localhost/difsysapi/exam_api.php?endpoint=applicant-info&app_id=${userId}`);
      setApplicantInfo(response.data);
    } catch (error) {
      console.error('Error fetching applicant info:', error);
    }
  };

  const fetchExamsData = async () => {
    try {
      const examsResponse = await axios.get(`http://localhost/difsysapi/exam_api.php?endpoint=assignments&app_id=${userId}`);
      const attemptsResponse = await axios.get(`http://localhost/difsysapi/exam_api.php?endpoint=attempts&app_id=${userId}`);
      
      setExamsList(examsResponse.data || []);
      setTakenExams(attemptsResponse.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exams data:', error);
      setExamsList([]);
      setLoading(false);
    }
  };

  const handleSelectExam = async (exam) => {
    try {
      setSelectedExam(exam);
      setExamStarted(false);
      setExamCompleted(false);
      setIsProgressLoaded(false);
      
      if (isExamTaken(exam.exam_id)) {
        const completedAttempt = takenExams.find(attempt => 
          attempt.exam_id === exam.exam_id && attempt.status === 'Completed'
        );
        
        if (completedAttempt) {
          const scoreValue = Number(completedAttempt.total_score) || 0;
          setScore(scoreValue);
          setCircleKey(prev => prev + 1);
          setTimeElapsed(completedAttempt.time_taken ? completedAttempt.time_taken * 60 : 0);
          setTimeLeft(0);
          setCurrentQuestionIndex(0);
          
          if (completedAttempt.answers) {
            try {
              const parsedAnswers = typeof completedAttempt.answers === 'string' 
                ? JSON.parse(completedAttempt.answers) 
                : completedAttempt.answers;
              setAnswers(parsedAnswers);
            } catch (e) {
              console.error('Error parsing completed answers:', e);
              setAnswers({});
            }
          }
          setIsProgressLoaded(true);
          return;
        }
      }
      
      setScore(0);
      setCircleKey(prev => prev + 1);
      
      try {
        const progressResponse = await axios.get(`http://localhost/difsysapi/exam_api.php?endpoint=exam-progress&assignment_id=${exam.id}`);
        const progress = progressResponse.data;
        
        if (progress && progress.current_question_index !== undefined) {
          setCurrentQuestionIndex(progress.current_question_index);
          
          let restoredAnswers = {};
          if (progress.answers) {
            try {
              restoredAnswers = typeof progress.answers === 'string' 
                ? JSON.parse(progress.answers) 
                : progress.answers;
            } catch (e) {
              console.error('Error parsing saved answers:', e);
              restoredAnswers = {};
            }
          }
          setAnswers(restoredAnswers);
          
          setTimeElapsed(progress.time_elapsed || 0);
          setTimeLeft(Math.max(0, (exam.duration * 60) - (progress.time_elapsed || 0)));
          setExamStarted(true);
        } else {
          setCurrentQuestionIndex(0);
          setAnswers({});
          setTimeElapsed(0);
          setTimeLeft(exam.duration * 60);
        }
        setIsProgressLoaded(true);
      } catch (error) {
        console.error('Error fetching progress:', error);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setTimeElapsed(0);
        setTimeLeft(exam.duration * 60);
        setIsProgressLoaded(true);
      }
    } catch (error) {
      console.error('Error selecting exam:', error);
      setScore(0);
      setCircleKey(prev => prev + 1);
      setIsProgressLoaded(true);
    }
  };

  const handleStartExam = async () => {
    try {
      await axios.post('http://localhost/difsysapi/exam_api.php?endpoint=start-exam', {
        assignment_id: selectedExam.id,
        app_id: userId,
        exam_id: selectedExam.exam_id
      });
      
      setExamStarted(true);
      setIsProgressLoaded(true);
    } catch (error) {
      console.error('Error starting exam:', error);
      if (error.response) {
        alert(`Error starting exam: ${error.response.data.error || 'Unknown error'}`);
      } else {
        alert('Error starting exam. Please try again.');
      }
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const calculateScore = () => {
    let totalScore = 0;
    let maxScore = 0;
    
    selectedExam.questions.forEach(question => {
      maxScore += question.points;
      const userAnswer = answers[question.id];
      
      if (question.type === 'multiple-choice' && userAnswer === question.correctAnswer) {
        totalScore += question.points;
      }
      // Essay questions should not get automatic points - they need to be graded manually
      // So we don't add any points for essay questions here
    });
    
    return { totalScore, maxScore };
  };

  const handleSubmitExam = async (isAutoSubmit = false) => {
    if (!isAutoSubmit) {
      setShowSubmitModal(true);
      return;
    }
  
    try {
      const { totalScore, maxScore } = calculateScore();
      const timeTakenMinutes = Math.ceil(timeElapsed / 60);
      
      // First submit the exam
      await axios.post('http://localhost/difsysapi/exam_api.php?endpoint=submit-exam', {
        assignment_id: selectedExam.id,
        answers: Object.keys(answers).map(questionId => {
          const question = selectedExam.questions.find(q => q.id === parseInt(questionId));
          let score = 0;
          
          if (question?.type === 'multiple-choice') {
            score = answers[questionId] === question.correctAnswer ? question.points : 0;
          }
          
          return {
            questionId: parseInt(questionId),
            answer: answers[questionId],
            score: score
          };
        }),
        total_score: (totalScore / maxScore) * 100,
        max_score: 100,
        time_taken: timeTakenMinutes
      });
      
      // Update UI immediately after successful exam submission
      setScore((totalScore / maxScore) * 100);
      setExamCompleted(true);
      setShowSubmitModal(false);
      fetchExamsData();
      
      // Send notification to HR (don't let this fail the whole process)
      setTimeout(async () => {
        try {
          await fetch('http://localhost/difsysapi/notifications_api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: 0,
              user_role: 'HR',
              type: 'exam_submitted',
              title: 'Exam Submitted',
              message: `${applicantInfo?.firstName || 'Applicant'} ${applicantInfo?.lastName || ''} has submitted the exam: ${selectedExam.title}`,
              related_id: selectedExam.id,
              related_type: 'exam'
            })
          });
          console.log('Notification sent successfully');
        } catch (notifError) {
          console.error('Error sending notification (non-critical):', notifError);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Error submitting exam. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentQuestion = () => {
    return selectedExam?.questions?.[currentQuestionIndex];
  };

  const getProgressPercentage = () => {
    if (!selectedExam?.questions) return 0;
    return ((currentQuestionIndex + 1) / selectedExam.questions.length) * 100;
  };

  const getAnsweredQuestionsPercentage = () => {
    if (!selectedExam?.questions) return 0;
    const answeredCount = Object.keys(answers).length;
    return (answeredCount / selectedExam.questions.length) * 100;
  };

  const isExamTaken = (examId) => {
    return takenExams.some(attempt => attempt.exam_id === examId && attempt.status === 'Completed');
  };

  const hasExamProgress = (examId) => {
    return takenExams.some(attempt => attempt.exam_id === examId && attempt.status === 'In Progress');
  };

  const getExamButtonText = (exam) => {
    if (isExamTaken(exam.exam_id)) return 'View Results';
    if (hasExamProgress(exam.exam_id)) return 'Resume';
    return 'Take Exam';
  };

  const getExamButtonClass = (exam) => {
    if (isExamTaken(exam.exam_id)) return 'take-exam-start-button completed';
    if (hasExamProgress(exam.exam_id)) return 'take-exam-start-button resume';
    return 'take-exam-start-button';
  };

  const getCirclePercentage = () => {
    if (selectedExam && isExamTaken(selectedExam.exam_id)) {
      // For completed exams, get the score from takenExams data
      const completedAttempt = takenExams.find(attempt => 
        attempt.exam_id === selectedExam.exam_id && attempt.status === 'Completed'
      );
      return Number(completedAttempt?.total_score) || Number(score) || 0;
    } else if (examStarted && selectedExam) {
      return getAnsweredQuestionsPercentage();
    } else if (selectedExam && hasExamProgress(selectedExam.exam_id)) {
      return getAnsweredQuestionsPercentage();
    } else if (!selectedExam && examsList.length > 0) {
      const completedCount = takenExams.filter(a => a.status === 'Completed').length;
      return examsList.length > 0 ? (completedCount / examsList.length) * 100 : 0;
    }
    return 0;
  };

  const getCircleText = () => {
    if (selectedExam && isExamTaken(selectedExam.exam_id)) {
      // For completed exams, get the score from takenExams data
      const completedAttempt = takenExams.find(attempt => 
        attempt.exam_id === selectedExam.exam_id && attempt.status === 'Completed'
      );
      const examScore = Number(completedAttempt?.total_score) || Number(score) || 0;
      return Math.round(examScore) + '%';
    } else if (examStarted && selectedExam) {
      return Math.round(getAnsweredQuestionsPercentage()) + '%';
    } else if (selectedExam && hasExamProgress(selectedExam.exam_id)) {
      return Math.round(getAnsweredQuestionsPercentage()) + '%';
    } else if (!selectedExam && examsList.length > 0) {
      const completedCount = takenExams.filter(a => a.status === 'Completed').length;
      return examsList.length > 0 ? Math.round((completedCount / examsList.length) * 100) + '%' : '0%';
    }
    return '0%';
  };

  const getCircleLabel = () => {
    if (selectedExam && isExamTaken(selectedExam.exam_id)) {
      const completedAttempt = takenExams.find(attempt => 
        attempt.exam_id === selectedExam.exam_id && attempt.status === 'Completed'
      );
      const examScore = Number(completedAttempt?.total_score) || Number(score) || 0;
      return `Final Score: ${Math.round(examScore)}%`;
    } else if (selectedExam && hasExamProgress(selectedExam.exam_id)) {
      const answeredCount = Object.keys(answers).length;
      const totalQuestions = selectedExam.questions?.length || 0;
      return `Answered: ${answeredCount}/${totalQuestions}`;
    } else if (selectedExam) {
      return `Exam Minutes Taken: ${Math.ceil(timeElapsed / 60)}`;
    } else {
      const completedCount = takenExams.filter(a => a.status === 'Completed').length;
      return `Taken Exams: ${completedCount}/${examsList.length}`;
    }
  };

  if (loading) {
    return (
      <div className="take-exam-container">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '18px'
        }}>
          Loading exams...
        </div>
      </div>
    );
  }

  if (examsList.length === 0) {
    return (
      <div className="take-exam-container">
  <div className="take-exam-no-exam">
    <div className="take-exam-emoji">
      <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <g>
          <rect x="32" y="22" width="50" height="65" rx="3" ry="3" fill="#e0e0e0" opacity="0.3"/>
          
          <rect x="30" y="20" width="50" height="65" rx="3" ry="3" fill="#ffffff" stroke="#d0d0d0" strokeWidth="1.5"/>
          
          <line x1="36" y1="30" x2="68" y2="30" stroke="#e8e8e8" strokeWidth="1"/>
          <line x1="36" y1="36" x2="74" y2="36" stroke="#e8e8e8" strokeWidth="1"/>
          <line x1="36" y1="42" x2="70" y2="42" stroke="#e8e8e8" strokeWidth="1"/>
          <line x1="36" y1="48" x2="72" y2="48" stroke="#e8e8e8" strokeWidth="1"/>
          <line x1="36" y1="54" x2="66" y2="54" stroke="#e8e8e8" strokeWidth="1"/>
          
          <polygon points="68,20 74,26 68,26" fill="#f5f5f5" stroke="#d0d0d0" strokeWidth="1"/>
        </g>
        
        <g>
          <circle cx="72" cy="72" r="22" fill="#000000" opacity="0.15"/>
          
          <circle cx="70" cy="70" r="22" fill="#ffffff" stroke="#4a90e2" strokeWidth="2.5"/>
          
          <circle cx="70" cy="52" r="1.5" fill="#666666"/>
          <circle cx="88" cy="70" r="1.5" fill="#666666"/>
          <circle cx="70" cy="88" r="1.5" fill="#666666"/>
          <circle cx="52" cy="70" r="1.5" fill="#666666"/>
          
          <line x1="70" y1="70" x2="78" y2="60" stroke="#333333" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="70" y1="70" x2="70" y2="55" stroke="#333333" strokeWidth="2" strokeLinecap="round"/>
          
          <circle cx="70" cy="70" r="2" fill="#4a90e2"/>
        </g>
      </svg>
    </div>
    <h2>No Exams Available</h2>
    <p>Wait for the exam to be given by the HR. You'll be notified when an exam is assigned to you!</p>
  </div>
</div>
    );
  }

  if (examCompleted) {
    const completedAttempt = takenExams.find(attempt => 
      attempt.exam_id === selectedExam.exam_id && attempt.status === 'Completed'
    );
    
    return (
      <div className="take-exam-container">
        <div className="take-exam-completion">
          <div className="take-exam-completion-header">
            <div className="take-exam-completion-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <div className="take-exam-completion-text">
              <h2>Exam Submitted Successfully!</h2>
              <p>Your answers have been recorded and saved in the system.</p>
              
              {hasAnsweredEssayQuestions() && (
                <div className="take-exam-hr-review-notice">
                  <div className="take-exam-hr-notice-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                  </div>
                  <div className="take-exam-hr-notice-text">
                    <strong>Pending HR Review</strong>
                    <span>Your essay answers are currently being reviewed by HR. Final scores will be updated once the review is complete.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="take-exam-completion-summary">
            <div className="take-exam-summary-grid">
              <div className="take-exam-summary-item">
                <div className="take-exam-summary-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14db8f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-percent-icon lucide-percent"><line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
                </div>
                <div className="take-exam-summary-content">
                  <div className="take-exam-summary-label">Current Score</div>
                  <div className="take-exam-summary-value">{Math.round(score)}%</div>
                  {hasAnsweredEssayQuestions() && (
                    <div className="take-exam-summary-note">Preliminary score (excluding essays)</div>
                  )}
                </div>
              </div>

              <div className="take-exam-summary-item">
                <div className="take-exam-summary-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
                <div className="take-exam-summary-content">
                  <div className="take-exam-summary-label">Time Taken</div>
                  <div className="take-exam-summary-value">
                    {completedAttempt?.time_taken ? `${completedAttempt.time_taken} min` : `${Math.ceil(timeElapsed / 60)} min`}
                  </div>
                </div>
              </div>

              <div className="take-exam-summary-item">
                <div className="take-exam-summary-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#14db8f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scroll-text-icon lucide-scroll-text"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg>
                </div>
                <div className="take-exam-summary-content">
                  <div className="take-exam-summary-label">Questions Answered</div>
                  <div className="take-exam-summary-value">{Object.keys(answers).length}/{selectedExam.questions.length}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="take-exam-review-section">
            <h3>Answer Review</h3>
            <div className="take-exam-answers-review">
              {selectedExam.questions.map((question, index) => (
                <div key={question.id} className="take-exam-review-question">
                  <div className="take-exam-review-question-header">
                    <span className="take-exam-review-question-number">Question {index + 1}</span>
                    <div className="take-exam-review-meta">
                      <span className="take-exam-review-question-type">{question.type === 'multiple-choice' ? 'Multiple Choice' : 'Essay'}</span>
                      <span className={`take-exam-review-question-points ${
                          question.type === 'multiple-choice' 
                            ? (answers[question.id] === question.correctAnswer ? 'correct' : 'incorrect')
                            : 'essay'
                        }`}>
                          {question.type === 'multiple-choice' 
                            ? (answers[question.id] === question.correctAnswer ? `${question.points} pts` : '0 pts')
                            : `${question.points} pts`
                          }
                        </span>
                    </div>
                  </div>
                  
                  <div className="take-exam-review-question-text">{question.question}</div>
                  
                  <div className="take-exam-review-answer-section">
                    <div className="take-exam-review-your-answer">
                      <strong>Your Answer:</strong>
                      <div className="take-exam-answer-content">
                        {answers[question.id] || <span className="take-exam-no-answer">No answer provided</span>}
                      </div>
                    </div>
                    
                    {question.type === 'multiple-choice' && question.correctAnswer && (
                      <div className="take-exam-review-correct-answer">
                        <strong>Correct Answer:</strong>
                        <div className="take-exam-correct-content">{question.correctAnswer}</div>
                      </div>
                    )}
                    
                    {question.type === 'essay' && answers[question.id] && (
                      <div className="take-exam-essay-pending">
                        <div className="take-exam-pending-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                          </svg>
                        </div>
                        <span>Waiting for HR to review your answer</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="take-exam-completion-actions">
            <button 
              className="take-exam-back-to-exams-btn"
              onClick={() => {
                setSelectedExam(null);
                setExamCompleted(false);
                setExamStarted(false);
                setAnswers({});
                setCurrentQuestionIndex(0);
                setScore(0);
                setIsProgressLoaded(false);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
              Back to Exams
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedExam) {
    return (
      <div className="take-exam-container">
        <div className="take-exam-header-section">
          <div className="take-exam-header-card">
            <h1 className="take-exam-title">List of Examinations</h1>
          </div>
          <div className="take-exam-timer-header">
            <h3>Applied Position</h3>
            <div className="take-exam-position-display">
              {applicantInfo?.position || 'Not Available'}
            </div>
          </div>
        </div>

        <div className="take-exam-main-section">
          <div className="take-exam-main-content">
            <div className="take-exam-exams-grid">
              {examsList.map((exam) => (
                <div key={exam.id} className="take-exam-card">
                  <div className="take-exam-card-content">
                    <h3 className="take-exam-card-title">{exam.title}</h3>
                    <p className="take-exam-card-description">
                      Duration: {exam.duration} minutes<br/>
                      Questions: {exam.questions ? exam.questions.length : 0}<br/>
                      Status: {exam.status}
                    </p>
                    <button 
                      className={getExamButtonClass(exam)}
                      onClick={() => handleSelectExam(exam)}
                    >
                      {getExamButtonText(exam)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="take-exam-sidebar">
            <div className="take-exam-sidebar-card take-exam-info-card">
              <h3>Information</h3>
              <div className="take-exam-info-item">
                <div className="take-exam-info-label">HR Officer</div>
                <div className="take-exam-info-value">
                  {examsList[0]?.hr_fname && examsList[0]?.hr_lname 
                    ? `${examsList[0].hr_fname} ${examsList[0].hr_lname}` 
                    : 'Not available'}
                </div>
              </div>
              <div className="take-exam-info-item">
                <div className="take-exam-info-label">Total Exams</div>
                <div className="take-exam-info-value">{examsList.length}</div>
              </div>
            </div>

            <div className="take-exam-sidebar-card take-exam-progress-card">
              <h3>Progress</h3>
              
              <div className="take-exam-score-circle" key={circleKey}>
                <svg className="take-exam-score-svg" viewBox="0 0 80 80">
                  <circle
                    className="take-exam-score-background"
                    cx="40"
                    cy="40"
                    r="36"
                  />
                  <circle
                    className="take-exam-score-progress"
                    cx="40"
                    cy="40"
                    r="36"
                    style={{
                      strokeDashoffset: 231 - (231 * getCirclePercentage() / 100),
                      transition: 'stroke-dashoffset 0.5s ease-in-out'
                    }}
                  />
                </svg>
                <div className="take-exam-score-text">{getCircleText()}</div>
              </div>
              <div className="take-exam-minutes-taken">{getCircleLabel()}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="take-exam-container">
      <div className="take-exam-header-section">
        <div className="take-exam-header-card">
          <h1 className="take-exam-title">{selectedExam.title}</h1>
        </div>
        <div className="take-exam-timer-header">
          <h3>Timer</h3>
          <div className="take-exam-timer-display">
            {isExamTaken(selectedExam?.exam_id) ? '00:00' : 
             (timeLeft > 0 ? formatTime(timeLeft) : selectedExam?.duration ? `${selectedExam.duration}:00` : '--:--')}
          </div>
          <div className="take-exam-timer-label">
            {isExamTaken(selectedExam?.exam_id) ? 'Completed' :
             (examStarted ? 'Time Remaining' : 'Total Time')}
          </div>
        </div>
      </div>

      {!examStarted ? (
        <div className="take-exam-main-section">
          <div className="take-exam-main-content">
            {isExamTaken(selectedExam?.exam_id) ? (
              <div className="take-exam-taken">
                <h2>Exam Already Taken</h2>
                <div className="take-exam-taken-message">
                  <p>You have successfully completed this exam.</p>
                </div>
                
                <button 
                  className="take-exam-back-buttons1"
                  onClick={() => setSelectedExam(null)}
                >
                  Back to Exams
                </button>
              </div>
            ) : (
              <div className="take-exam-instructions">
                <h2>Exam Instructions</h2>
                <ul className="take-exam-instructions-list">
                  <li>Read each question carefully before answering</li>
                  <li>You have {selectedExam.duration} minutes to complete this exam</li>
                  <li>Make sure to save your answers by clicking Next or Submit</li>
                  <li>You can navigate between questions using the Previous/Next buttons</li>
                  <li>Submit your exam before the time runs out</li>
                  <li>Once submitted, you cannot modify your answers</li>
                  {hasExamProgress(selectedExam.exam_id) && (
                    <li><strong>You have a saved progress. Click Resume to continue from where you left off.</strong></li>
                  )}
                </ul>
                <div className="take-exam-buttons-group">
                  <button 
                    className="take-exam-start-button"
                    onClick={handleStartExam}
                  >
                    {hasExamProgress(selectedExam.exam_id) ? 'Resume Exam' : 'Start Exam'}
                  </button>
                  <button 
                    className="take-exam-back-buttons1"
                    onClick={() => setSelectedExam(null)}
                  >
                    Back to Exams
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="take-exam-sidebar">
            <div className="take-exam-sidebar-card take-exam-info-card">
              <h3>Information</h3>
              <div className="take-exam-info-item">
                <div className="take-exam-info-label">Date Given</div>
                <div className="take-exam-info-value">
                  {selectedExam.assigned_at ? new Date(selectedExam.assigned_at).toLocaleDateString() : 'Not available'}
                </div>
              </div>
              <div className="take-exam-info-item">
                <div className="take-exam-info-label">Due Date</div>
                <div className="take-exam-info-value">
                  {selectedExam.due_date ? new Date(selectedExam.due_date).toLocaleDateString() : 'No due date'}
                </div>
              </div>
              <div className="take-exam-info-item">
                <div className="take-exam-info-label">HR Officer</div>
                <div className="take-exam-info-value">
                  {selectedExam.hr_fname && selectedExam.hr_lname ? `${selectedExam.hr_fname} ${selectedExam.hr_lname}` : 'Not available'}
                </div>
              </div>
            </div>

            <div className="take-exam-sidebar-card take-exam-progress-card">
              <h3>
                {selectedExam && isExamTaken(selectedExam.exam_id) ? 'Exam Score' : 'Progress'}
              </h3>
              
              <div className="take-exam-score-circle" key={circleKey}>
                <svg className="take-exam-score-svg" viewBox="0 0 80 80">
                  <circle
                    className="take-exam-score-background"
                    cx="40"
                    cy="40"
                    r="36"
                  />
                  <circle
                    className="take-exam-score-progress"
                    cx="40"
                    cy="40"
                    r="36"
                    style={{
                      strokeDashoffset: 231 - (231 * getCirclePercentage() / 100),
                      transition: 'stroke-dashoffset 0.5s ease-in-out'
                    }}
                  />
                </svg>
                <div className="take-exam-score-text">{getCircleText()}</div>
              </div>
              <div className="take-exam-minutes-taken">{getCircleLabel()}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="take-exam-single-column">
          <div className="take-exam-question-section">
            <div className="take-exam-progress-bar">
              <div 
                className="take-exam-progress-fill"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>

            <div className="take-exam-question-header">
              <div className="take-exam-question-number">
                Question {currentQuestionIndex + 1} of {selectedExam.questions.length}
              </div>
              <div className="take-exam-question-points">
                {getCurrentQuestion()?.points} points
              </div>
            </div>

            <div className="take-exam-question-text">
              {getCurrentQuestion()?.question}
            </div>

            {getCurrentQuestion()?.type === 'multiple-choice' ? (
              <div className="take-exam-options">
                {getCurrentQuestion()?.options.map((option, index) => (
                  <div key={index} className="take-exam-option">
                    <label 
                        className={`take-exam-option-label ${
                          answers[getCurrentQuestion().id] === option ? 'selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${getCurrentQuestion().id}`}
                          value={option}
                          checked={answers[getCurrentQuestion().id] === option}
                          onChange={(e) => handleAnswerChange(getCurrentQuestion().id, e.target.value)}
                          style={{ display: 'none' }}
                        />
                        {option}
                      </label>
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                className="take-exam-textarea"
                placeholder="Type your answer here..."
                value={answers[getCurrentQuestion()?.id] || ''}
                onChange={(e) => handleAnswerChange(getCurrentQuestion().id, e.target.value)}
              />
            )}

            <div className="take-exam-navigation">
              <button
                className="take-exam-nav-button previous"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </button>

              {currentQuestionIndex === selectedExam.questions.length - 1 ? (
                <button
                  className="take-exam-nav-button submit"
                  onClick={() => handleSubmitExam()}
                >
                  Submit Exam
                </button>
              ) : (
                <button
                  className="take-exam-nav-button next"
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(selectedExam.questions.length - 1, prev + 1))}
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="take-exam-modal-overlay">
          <div className="take-exam-modal">
            <h3>Submit Exam</h3>
            <p>
              Are you sure you want to submit your exam? You won't be able to make any changes after submission.
            </p>
            <div className="take-exam-modal-buttons">
              <button
                className="take-exam-modal-button cancel"
                onClick={() => setShowSubmitModal(false)}
              >
                Cancel
              </button>
              <button
                className="take-exam-modal-button confirm"
                onClick={() => handleSubmitExam(true)}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeExam;