import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { getCurrentUser, getUserId } from '../../utils/auth';
import difsyslogo from '../../assets/difsyslogo.png';
import '../../components/HRLayout/ManageExamination.css';

const ManageExamination = () => {
  const [currentView, setCurrentView] = useState('list');
  const [exams, setExams] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editedScores, setEditedScores] = useState({});
  
  // Modal states
  const [showGiveExamModal, setShowGiveExamModal] = useState(false);
  const [showUngiveExamModal, setShowUngiveExamModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showDetailedResultModal, setShowDetailedResultModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [selectedApplicants, setSelectedApplicants] = useState([]);
  const [assignedApplicants, setAssignedApplicants] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [successType, setSuccessType] = useState('success'); // 'success' or 'info' or 'error'
  
  // Form state
  const [examForm, setExamForm] = useState({
    title: '',
    duration: '',
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    type: 'multiple-choice',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 1
  });

  // Edit question state
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);

  const currentUser = getCurrentUser();
  const userId = getUserId();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchExams(),
        fetchApplicants(),
        fetchResults()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await axios.get('http://localhost/difsysapi/exam_api.php?endpoint=exams');
      setExams(response.data);
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchApplicants = async () => {
    try {
      const response = await axios.get('http://localhost/difsysapi/exam_api.php?endpoint=applicants');
      setApplicants(response.data);
    } catch (error) {
      console.error('Error fetching applicants:', error);
    }
  };

  const fetchAvailableApplicants = async (examId) => {
    try {
      const response = await axios.get(`http://localhost/difsysapi/exam_api.php?endpoint=applicants&exclude_exam_id=${examId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching available applicants:', error);
      return [];
    }
  };

  const fetchResults = async () => {
    try {
      const response = await axios.get('http://localhost/difsysapi/exam_api.php?endpoint=attempts');
      setExamResults(response.data);
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  };

  const fetchAssignedApplicants = async (examId) => {
    try {
      const response = await axios.get(`http://localhost/difsysapi/exam_api.php?endpoint=assignments&exam_id=${examId}`);
      setAssignedApplicants(response.data);
    } catch (error) {
      console.error('Error fetching assigned applicants:', error);
      setAssignedApplicants([]);
    }
  };

  const showSuccess = (message, type = 'success') => {
    setSuccessMessage(message);
    setSuccessType(type);
    setShowSuccessModal(true);
    setTimeout(() => {
      setShowSuccessModal(false);
    }, 3000);
  };

  // PDF Export Function
  const exportToPDF = async () => {
    try {
      const exam = exams.find(e => e.id === selectedResult?.exam_id);
      const answers = Array.isArray(selectedResult.answers) ? selectedResult.answers : [];
      const questions = Array.isArray(exam.questions) ? exam.questions : [];

      // Create new PDF document
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const margin = 20;
      let currentY = margin;

      // Add logo
      try {
        // Convert logo to base64 if needed
        const logoWidth = 30;
        const logoHeight = 20;
        pdf.addImage(difsyslogo, 'PNG', margin, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 10;
      } catch (error) {
        console.warn('Could not add logo to PDF:', error);
        currentY += 10;
      }

      // Add applicant information
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${selectedResult?.firstName} ${selectedResult?.lastName}`, margin, currentY);
      currentY += 8;

      // Get applicant position from applicants data
      const applicantInfo = applicants.find(app => 
        app.name === `${selectedResult?.firstName} ${selectedResult?.lastName}`
      );
      const position = applicantInfo?.position || 'Position Not Available';
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Position Applying: ${position}`, margin, currentY);
      currentY += 15;

      // Add exam title (centered)
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      const examTitle = selectedResult?.exam_title || 'Exam Results';
      const titleWidth = pdf.getTextWidth(examTitle);
      pdf.text(examTitle, (pageWidth - titleWidth) / 2, currentY);
      currentY += 20;

      // Add exam summary
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Score: ${Math.round(selectedResult?.total_score || 0)}%`, margin, currentY);
      currentY += 6;
      pdf.text(`Time Taken: ${selectedResult?.time_taken || 'N/A'} minutes`, margin, currentY);
      currentY += 6;
      pdf.text(`Date: ${selectedResult?.completed_at ? new Date(selectedResult.completed_at).toLocaleDateString() : 'In Progress'}`, margin, currentY);
      currentY += 6;
      pdf.text(`Status: ${selectedResult?.status}`, margin, currentY);
      currentY += 20;

      // Add questions and answers
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Questions and Answers:', margin, currentY);
      currentY += 15;

      if (answers.length === 0) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No answers available - exam may still be in progress.', margin, currentY);
      } else {
        answers.forEach((answer, index) => {
          const question = questions.find(q => q.id === answer.questionId);
          
          if (question) {
            // Check if we need a new page
            if (currentY > pageHeight - 60) {
              pdf.addPage();
              currentY = margin;
            }

            // Question number and text
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            const questionText = `Question ${index + 1}: ${question.question}`;
            
            // Split long text into multiple lines
            const questionLines = pdf.splitTextToSize(questionText, pageWidth - 2 * margin);
            pdf.text(questionLines, margin, currentY);
            currentY += questionLines.length * 6 + 3;

            // Question type
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.text(`(${question.type} - ${question.points} pts)`, margin, currentY);
            currentY += 8;

            // Student answer
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            pdf.text('Answer:', margin, currentY);
            currentY += 6;
            
            const studentAnswer = answer.answer || 'No answer provided';
            const answerLines = pdf.splitTextToSize(studentAnswer, pageWidth - 2 * margin - 10);
            pdf.text(answerLines, margin + 10, currentY);
            currentY += answerLines.length * 5 + 5;

            // Correct answer (for non-essay questions)
            if (question.type !== 'essay' && question.correctAnswer) {
              pdf.setFont('helvetica', 'bold');
              pdf.text('Correct Answer:', margin, currentY);
              currentY += 6;
              pdf.setFont('helvetica', 'normal');
              const correctLines = pdf.splitTextToSize(question.correctAnswer, pageWidth - 2 * margin - 10);
              pdf.text(correctLines, margin + 10, currentY);
              currentY += correctLines.length * 5 + 5;
            }

            // Score
            pdf.setFont('helvetica', 'bold');
            const score = getDisplayScore(answer.questionId, answer.score || 0);
            pdf.text(`Score: ${score} / ${question.points} pts`, margin, currentY);
            currentY += 15;

            // Add separator line
            pdf.setDrawColor(200, 200, 200);
            pdf.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 10;
          }
        });
      }

      // Add footer
      const footerY = pageHeight - 15;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text(`Generated on ${new Date().toLocaleString()}`, margin, footerY);
      pdf.text('DIFSYS - Digital Information Filing System', pageWidth - margin - 80, footerY);

      // Save the PDF
      const fileName = `${selectedResult?.firstName}_${selectedResult?.lastName}_${examTitle.replace(/\s+/g, '_')}_Results.pdf`;
      pdf.save(fileName);
      
      showSuccess('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showSuccess('Error exporting PDF. Please try again.', 'error');
    }
  };

  const handleAddExam = () => {
    setCurrentView('add');
    setExamForm({ title: '', duration: '', questions: [] });
    setEditingQuestionIndex(-1);
  };

  const handleEditExam = (exam) => {
    setSelectedExam(exam);
    setExamForm({
      title: exam.title || '',
      duration: exam.duration || '',
      questions: Array.isArray(exam.questions) ? exam.questions : []
    });
    setCurrentView('edit');
    setEditingQuestionIndex(-1);
  };

  const handleDeleteExam = (exam) => {
    setExamToDelete(exam);
    setShowDeleteModal(true);
  };

  const confirmDeleteExam = async () => {
    try {
      await axios.delete(`http://localhost/difsysapi/exam_api.php?endpoint=exams&id=${examToDelete.id}`);
      await fetchExams();
      setShowDeleteModal(false);
      setExamToDelete(null);
      showSuccess('Exam deleted successfully!');
    } catch (error) {
      console.error('Error deleting exam:', error);
      showSuccess('Error deleting exam. Please try again.', 'error');
    }
  };

  const cancelDeleteExam = () => {
    setShowDeleteModal(false);
    setExamToDelete(null);
  };

  const handleSaveExam = async () => {
    try {
      const examData = {
        title: examForm.title,
        duration: parseInt(examForm.duration),
        questions: examForm.questions,
        status: 'Active'
      };

      if (currentView === 'add') {
        await axios.post('http://localhost/difsysapi/exam_api.php?endpoint=exams', examData);
        showSuccess('Exam created successfully!');
      } else if (selectedExam) {
        await axios.put('http://localhost/difsysapi/exam_api.php?endpoint=exams', {
          ...examData,
          id: selectedExam.id
        });
        showSuccess('Exam updated successfully!');
      }

      await fetchExams();
      setCurrentView('list');
    } catch (error) {
      console.error('Error saving exam:', error);
      showSuccess('Error saving exam. Please try again.', 'error');
    }
  };

  const handleAddQuestion = () => {
    if (currentQuestion.question.trim()) {
      if (editingQuestionIndex >= 0) {
        // Update existing question
        const updatedQuestions = [...examForm.questions];
        updatedQuestions[editingQuestionIndex] = { ...currentQuestion, id: examForm.questions[editingQuestionIndex].id };
        setExamForm({
          ...examForm,
          questions: updatedQuestions
        });
        setEditingQuestionIndex(-1);
      } else {
        // Add new question
        setExamForm({
          ...examForm,
          questions: [...examForm.questions, { ...currentQuestion, id: Date.now() }]
        });
      }
      
      setCurrentQuestion({
        question: '',
        type: 'multiple-choice',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1
      });
    }
  };

  const handleEditQuestion = (index) => {
    const question = examForm.questions[index];
    setCurrentQuestion({ ...question });
    setEditingQuestionIndex(index);
  };

  const handleCancelEditQuestion = () => {
    setCurrentQuestion({
      question: '',
      type: 'multiple-choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1
    });
    setEditingQuestionIndex(-1);
  };

  const handleRemoveQuestion = (questionId) => {
    setExamForm({
      ...examForm,
      questions: examForm.questions.filter(q => q.id !== questionId)
    });
  };

  const handleGiveExam = async (exam) => {
    setSelectedExam(exam);
    // Fetch only applicants who are NOT assigned to this exam
    const availableApplicants = await fetchAvailableApplicants(exam.id);
    setApplicants(availableApplicants);
    setShowGiveExamModal(true);
  };

  const handleUngiveExam = async (exam) => {
    setSelectedExam(exam);
    await fetchAssignedApplicants(exam.id);
    setShowUngiveExamModal(true);
  };

  const handleApplicantSelect = (applicantId) => {
    setSelectedApplicants(prev => 
      prev.includes(applicantId)
        ? prev.filter(id => id !== applicantId)
        : [...prev, applicantId]
    );
  };

  const handleAssignExam = async () => {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 days from now

      await axios.post('http://localhost/difsysapi/exam_api.php?endpoint=assign-exam', {
        exam_id: selectedExam.id,
        app_ids: selectedApplicants,
        assigned_by: userId,
        due_date: dueDate.toISOString().split('T')[0]
      });

      setShowGiveExamModal(false);
      setSelectedApplicants([]);
      showSuccess(`Exam assigned to ${selectedApplicants.length} applicant(s) successfully!`);
      
      // Refresh applicants list to remove assigned ones from future Give modals
      await fetchApplicants();
    } catch (error) {
      console.error('Error assigning exam:', error);
      showSuccess('Error assigning exam. Please try again.', 'error');
    }
  };

  const handleUnassignExam = async () => {
    try {
      await axios.post('http://localhost/difsysapi/exam_api.php?endpoint=unassign-exam', {
        exam_id: selectedExam.id,
        app_ids: selectedApplicants
      });

      setShowUngiveExamModal(false);
      setSelectedApplicants([]);
      showSuccess(`Exam unassigned from ${selectedApplicants.length} applicant(s) successfully!`, 'info');
      
      // Refresh both lists
      await fetchAssignedApplicants(selectedExam.id);
      await fetchApplicants();
    } catch (error) {
      console.error('Error unassigning exam:', error);
      showSuccess('Error unassigning exam. Please try again.', 'error');
    }
  };

  // FIXED: This function now accepts an exam parameter to filter results
  const handleViewResults = async (exam) => {
    setSelectedExam(exam); // Set the selected exam for filtering
    await fetchResults();
    setShowResultsModal(true);
  };

  const handleViewDetailedResult = (result) => {
    // Ensure answers is always an array, even for in-progress exams
    const processedResult = {
      ...result,
      answers: Array.isArray(result.answers) ? result.answers : []
    };
    
    setSelectedResult(processedResult);
    setEditedScores({});
    setHasUnsavedChanges(false);
    setShowDetailedResultModal(true);
  };

  const handleScoreChange = (questionId, newScore, maxPoints) => {
    const score = Math.min(Math.max(0, parseInt(newScore) || 0), maxPoints);
    setEditedScores(prev => ({
      ...prev,
      [questionId]: score
    }));
    setHasUnsavedChanges(true);
  };

  const handleTotalScoreChange = (newScore) => {
    const score = Math.min(Math.max(0, parseInt(newScore) || 0), 100);
    setEditedScores(prev => ({
      ...prev,
      total: score
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      const result = selectedResult;
      let updatedAnswers = result.answers ? [...result.answers] : [];
      let newTotalScore = editedScores.total !== undefined ? editedScores.total : result.total_score;

      // Update individual question scores
      Object.keys(editedScores).forEach(key => {
        if (key !== 'total') {
          const questionId = parseInt(key);
          const answerIndex = updatedAnswers.findIndex(answer => answer.questionId === questionId);
          if (answerIndex >= 0) {
            updatedAnswers[answerIndex] = {
              ...updatedAnswers[answerIndex],
              score: editedScores[key]
            };
          }
        }
      });

      // If total score wasn't manually set, calculate from individual scores
      if (editedScores.total === undefined && Object.keys(editedScores).length > 0) {
        const exam = exams.find(e => e.id === selectedResult?.exam_id);
        if (exam && exam.questions) {
          const totalPossiblePoints = exam.questions.reduce((sum, q) => sum + (q.points || 1), 0);
          const earnedPoints = updatedAnswers.reduce((sum, answer) => {
            const score = editedScores[answer.questionId] !== undefined ? 
                         editedScores[answer.questionId] : answer.score;
            return sum + (score || 0);
          }, 0);
          newTotalScore = totalPossiblePoints > 0 ? Math.round((earnedPoints / totalPossiblePoints) * 100) : 0;
        }
      }

      await axios.put('http://localhost/difsysapi/exam_api.php?endpoint=score', {
        attempt_id: result.id,
        total_score: newTotalScore,
        answers: updatedAnswers
      });

      // Update the local state
      setSelectedResult(prev => ({
        ...prev,
        total_score: newTotalScore,
        answers: updatedAnswers
      }));

      setEditedScores({});
      setHasUnsavedChanges(false);
      await fetchResults();
      showSuccess('Scores updated successfully!');
    } catch (error) {
      console.error('Error updating scores:', error);
      showSuccess('Error updating scores. Please try again.', 'error');
    }
  };

  const getDisplayScore = (questionId, originalScore) => {
    return editedScores[questionId] !== undefined ? editedScores[questionId] : originalScore;
  };

  const getDisplayTotalScore = () => {
    return editedScores.total !== undefined ? editedScores.total : Math.round(selectedResult?.total_score || 0);
  };

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // FIXED: Filter results to show only results for the selected exam
  const filteredResults = selectedExam 
    ? examResults.filter(result => result.exam_id === selectedExam.id)
    : examResults;

  // Success Modal Component
  const renderSuccessModal = () => (
    <div className={`exam-success-modal ${showSuccessModal ? 'show' : ''}`}>
      <div className={`exam-success-content ${successType}`}>
        <div className="exam-success-icon">
          {successType === 'success' ? (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : successType === 'info' ? (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <p>{successMessage}</p>
      </div>
    </div>
  );

  const renderDeleteModal = () => (
    <div className="exam-modal-overlay">
      <div className="exam-modal-content exam-delete-modal">
        <div className="exam-delete-modal-icon">
          <div className="exam-warning-icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        
        <div className="exam-delete-modal-content">
          <h3>Delete Examination</h3>
          <p>
            Are you sure you want to delete "<strong>{examToDelete?.title}</strong>"? 
            This action cannot be undone and will permanently remove the exam and all associated data.
          </p>
          
          <div className="exam-delete-modal-details">
            <div className="exam-detail-item">
              <span className="exam-detail-label">Duration:</span>
              <span className="exam-detail-value">{examToDelete?.duration} minutes</span>
            </div>
            <div className="exam-detail-item">
              <span className="exam-detail-label">Questions:</span>
              <span className="exam-detail-value">
                {Array.isArray(examToDelete?.questions) ? examToDelete.questions.length : 0}
              </span>
            </div>
            <div className="exam-detail-item">
              <span className="exam-detail-label">Status:</span>
              <span className={`exam-status-badge ${examToDelete?.status?.toLowerCase()}`}>
                {examToDelete?.status}
              </span>
            </div>
          </div>
        </div>
        
        <div className="exam-delete-modal-actions">
          <button 
            className="exam-btn-cancel"
            onClick={cancelDeleteExam}
          >
            Cancel
          </button>
          <button 
            className="exam-btn-delete-confirm"
            onClick={confirmDeleteExam}
          >
            <svg className="exam-delete-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19ZM10 11V17M14 11V17" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
            Delete Exam
          </button>
        </div>
      </div>
    </div>
  );

  const renderExamList = () => (
    <div className="exam-list-wrapper">
      <div className="exam-header-section">
        <h2>Manage Examinations</h2>
        <div className="exam-header-actions">
          <div className="exam-search-container">
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="exam-search-input"
            />
          </div>
          <button className="exam-btn-primary" onClick={handleAddExam}>
            Add Exam
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading exams...
        </div>
      ) : (
        <div className="exam-cards-grid">
          {filteredExams.map(exam => (
            <div key={exam.id} className="exam-individual-card">
              <div className="exam-card-header-section">
                <h3>{exam.title}</h3>
                <span className={`exam-status-badge ${exam.status.toLowerCase()}`}>
                  {exam.status}
                </span>
              </div>
              <div className="exam-card-details">
                <p><strong>Duration:</strong> {exam.duration} minutes</p>
                <p><strong>Questions:</strong> {Array.isArray(exam.questions) ? exam.questions.length : 0}</p>
                <p><strong>Created:</strong> {new Date(exam.created_at).toLocaleDateString()}</p>
              </div>
              <div className="exam-card-actions">
                <button 
                  className="exam-btn-edit"
                  onClick={() => handleEditExam(exam)}
                >
                  Edit
                </button>
                <button 
                  className="exam-btn-success"
                  onClick={() => handleGiveExam(exam)}
                >
                  Give
                </button>
                <button 
                  className="exam-btn-warning"
                  onClick={() => handleUngiveExam(exam)}
                >
                  Ungive
                </button>
                <button 
                  className="exam-btn-info"
                  onClick={() => handleViewResults(exam)}
                >
                  Results
                </button>
                <button 
                  className="exam-btn-danger"
                  onClick={() => handleDeleteExam(exam)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderExamForm = () => (
    <div className="exam-form-wrapper">
      <div className="exam-form-header">
        <button 
          className="exam-back-btn"
          onClick={() => setCurrentView('list')}
        >
          ← Back to Exams
        </button>
        <h2>{currentView === 'add' ? 'Add New Exam' : 'Edit Exam'}</h2>
      </div>

      <div className="exam-main-form">
        <div className="exam-form-section">
          <h3>Exam Details</h3>
          <div className="exam-form-group">
            <label>Exam Title</label>
            <input
              type="text"
              value={examForm.title}
              onChange={(e) => setExamForm({...examForm, title: e.target.value})}
              placeholder="Enter exam title"
            />
          </div>
          <div className="exam-form-group">
            <label>Duration (minutes)</label>
            <input
              type="number"
              value={examForm.duration}
              onChange={(e) => setExamForm({...examForm, duration: e.target.value})}
              placeholder="Enter duration in minutes"
            />
          </div>
        </div>

        <div className="exam-form-section">
          <h3>{editingQuestionIndex >= 0 ? 'Edit Question' : 'Add Questions'}</h3>
          <div className="exam-question-form">
            <div className="exam-form-group">
              <label>Question</label>
              <textarea
                value={currentQuestion.question}
                onChange={(e) => setCurrentQuestion({...currentQuestion, question: e.target.value})}
                placeholder="Enter your question"
                rows="3"
              />
            </div>
            
            <div className="exam-form-row">
              <div className="exam-form-group">
                <label>Question Type</label>
                <select
                  value={currentQuestion.type}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, type: e.target.value})}
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="essay">Essay</option>
                  <option value="checkbox">Multiple Select</option>
                </select>
              </div>
              <div className="exam-form-group">
                <label>Points</label>
                <input
                  type="number"
                  value={currentQuestion.points}
                  onChange={(e) => setCurrentQuestion({...currentQuestion, points: parseInt(e.target.value)})}
                  min="1"
                />
              </div>
            </div>

            {currentQuestion.type !== 'essay' && (
              <div className="exam-options-section">
                <label>Options</label>
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="exam-option-input">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...currentQuestion.options];
                        newOptions[index] = e.target.value;
                        setCurrentQuestion({...currentQuestion, options: newOptions});
                      }}
                      placeholder={`Option ${index + 1}`}
                    />
                  </div>
                ))}
                <div className="exam-form-group">
                  <label>Correct Answer</label>
                  <input
                    type="text"
                    value={currentQuestion.correctAnswer}
                    onChange={(e) => setCurrentQuestion({...currentQuestion, correctAnswer: e.target.value})}
                    placeholder="Enter correct answer"
                  />
                </div>
              </div>
            )}

            <div className="exam-question-actions">
              <button className="exam-btn-secondary" onClick={handleAddQuestion}>
                {editingQuestionIndex >= 0 ? 'Update Question' : 'Add Question'}
              </button>
              {editingQuestionIndex >= 0 && (
                <button className="exam-btn-cancel" onClick={handleCancelEditQuestion}>
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className="exam-questions-list">
            <h4>Added Questions ({examForm.questions.length})</h4>
            {examForm.questions.map((q, index) => (
              <div key={q.id} className="exam-question-item">
                <div className="exam-question-preview">
                  <div className="exam-question-content">
                    <strong>Q{index + 1}:</strong> {q.question}
                    <span className="exam-question-type">({q.type}) - {q.points} pts</span>
                  </div>
                  <div className="exam-question-item-actions">
                    <button 
                      className="exam-btn-edit exam-btn-small"
                      onClick={() => handleEditQuestion(index)}
                    >
                      Edit
                    </button>
                    <button 
                      className="exam-btn-danger exam-btn-small"
                      onClick={() => handleRemoveQuestion(q.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="exam-form-actions">
          <button className="exam-btn-primary" onClick={handleSaveExam}>
            Save Exam
          </button>
          <button className="exam-btn-secondary" onClick={() => setCurrentView('list')}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderGiveExamModal = () => (
    <div className="exam-modal-overlay">
      <div className="exam-modal-content">
        <div className="exam-modal-header">
          <h3>Give Exam: {selectedExam?.title}</h3>
          <button 
            className="exam-close-btn"
            onClick={() => setShowGiveExamModal(false)}
          >
            ×
          </button>
        </div>
        
        <div className="exam-modal-body">
          <div className="exam-search-applicants">
            <input
              type="text"
              placeholder="Search applicants..."
              className="exam-search-input"
            />
          </div>
          
          <div className="exam-applicants-list">
            {applicants.length === 0 ? (
              <div className="exam-no-applicants">
                <p>All applicants have already been assigned this exam.</p>
              </div>
            ) : (
              applicants.map(applicant => (
                <div key={applicant.id} className="exam-applicant-item">
                  <input
                    type="checkbox"
                    checked={selectedApplicants.includes(applicant.id)}
                    onChange={() => handleApplicantSelect(applicant.id)}
                  />
                  <div className="exam-applicant-info">
                    <strong>{applicant.name}</strong>
                    <span>{applicant.position}</span>
                    <span>{applicant.email}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="exam-modal-footer">
          <button 
            className="exam-btn-primary"
            onClick={handleAssignExam}
            disabled={selectedApplicants.length === 0 || applicants.length === 0}
          >
            Assign Exam ({selectedApplicants.length})
          </button>
          <button 
            className="exam-btn-secondary"
            onClick={() => {
              setShowGiveExamModal(false);
              // Reset applicants to full list when closing
              fetchApplicants();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderUngiveExamModal = () => (
    <div className="exam-modal-overlay">
      <div className="exam-modal-content">
        <div className="exam-modal-header">
          <h3>Ungive Exam: {selectedExam?.title}</h3>
          <button 
            className="exam-close-btn"
            onClick={() => setShowUngiveExamModal(false)}
          >
            ×
          </button>
        </div>
        
        <div className="exam-modal-body">
          <p className="exam-ungive-description">
            Select applicants to remove this exam assignment from:
          </p>
          
          <div className="exam-applicants-list">
            {assignedApplicants.length === 0 ? (
              <div className="exam-no-applicants">
                <p>No applicants have been assigned this exam yet.</p>
              </div>
            ) : (
              assignedApplicants.map(applicant => (
                <div key={applicant.app_id} className="exam-applicant-item">
                  <input
                    type="checkbox"
                    checked={selectedApplicants.includes(applicant.app_id)}
                    onChange={() => handleApplicantSelect(applicant.app_id)}
                  />
                  <div className="exam-applicant-info">
                    <strong>{applicant.firstName} {applicant.lastName}</strong>
                    <span>{applicant.position || 'N/A'}</span>
                    <span>{applicant.email}</span>
                    <span className="exam-assignment-status">{applicant.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="exam-modal-footer">
          <button 
            className="exam-btn-warning"
            onClick={handleUnassignExam}
            disabled={selectedApplicants.length === 0}
          >
            Unassign Exam ({selectedApplicants.length})
          </button>
          <button 
            className="exam-btn-secondary"
            onClick={() => setShowUngiveExamModal(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const renderResultsModal = () => (
    <div className="exam-modal-overlay">
      <div className="exam-modal-content results-modal">
        <div className="exam-modal-header">
          <h3>Results for: {selectedExam?.title}</h3>
          <button 
            className="exam-close-btn"
            onClick={() => setShowResultsModal(false)}
          >
            ×
          </button>
        </div>
        
        <div className="exam-modal-body">
          <div className="exam-results-table">
            <table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                      No results found for this exam.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map(result => (
                    <tr key={result.id}>
                      <td>{result.firstName} {result.lastName}</td>
                      <td>
                        <input
                          type="number"
                          value={Math.round(result.total_score)}
                          onChange={(e) => {
                            // Update the result directly in the results table
                            const newScore = Math.min(Math.max(0, parseInt(e.target.value) || 0), 100);
                            const updatedResults = examResults.map(r => 
                              r.id === result.id ? { ...r, total_score: newScore } : r
                            );
                            setExamResults(updatedResults);
                          }}
                          onBlur={async (e) => {
                            // Save when user finishes editing
                            try {
                              await axios.put('http://localhost/difsysapi/exam_api.php?endpoint=score', {
                                attempt_id: result.id,
                                total_score: parseInt(e.target.value) || 0
                              });
                              showSuccess('Score updated successfully!');
                            } catch (error) {
                              console.error('Error updating total score:', error);
                              showSuccess('Error updating score. Please try again.', 'error');
                            }
                          }}
                          className="exam-score-input"
                          min="0"
                          max="100"
                        />
                      </td>
                      <td>
                        <span className={`exam-status-badge ${result.status.toLowerCase().replace(' ', '-')}`}>
                          {result.status}
                        </span>
                      </td>
                      <td>{result.completed_at ? new Date(result.completed_at).toLocaleDateString() : 'Not completed'}</td>
                      <td>
                        <button 
                          className="exam-btn-small exam-btn-primary"
                          onClick={() => handleViewDetailedResult(result)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailedResultModal = () => {
    const exam = exams.find(e => e.id === selectedResult?.exam_id);
    
    // Ensure we have valid data before rendering
    if (!selectedResult || !exam) {
      return null;
    }
    
    // Safely get answers, defaulting to empty array
    const answers = Array.isArray(selectedResult.answers) ? selectedResult.answers : [];
    const questions = Array.isArray(exam.questions) ? exam.questions : [];
    
    return (
      <div className="exam-modal-overlay">
        <div className="exam-modal-content detailed-result-modal">
          <div className="exam-modal-header">
            <h3>Detailed Results - {selectedResult?.firstName} {selectedResult?.lastName}</h3>
            <button 
              className="exam-close-btn"
              onClick={() => setShowDetailedResultModal(false)}
            >
              ×
            </button>
          </div>
          
          <div className="exam-modal-body">
            <div className="exam-result-summary">
              <div className="exam-summary-item">
                <label>Exam:</label>
                <span>{selectedResult?.exam_title}</span>
              </div>
              <div className="exam-summary-item">
                <label>Total Score:</label>
                <div className="exam-total-score-edit">
                  <input
                    type="number"
                    value={getDisplayTotalScore()}
                    onChange={(e) => handleTotalScoreChange(e.target.value)}
                    className="exam-total-score-input"
                    min="0"
                    max="100"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="exam-summary-item">
                <label>Time Taken:</label>
                <span>{selectedResult?.time_taken || 'N/A'} minutes</span>
              </div>
              <div className="exam-summary-item">
                <label>Date:</label>
                <span>{selectedResult?.completed_at ? new Date(selectedResult.completed_at).toLocaleDateString() : 'In Progress'}</span>
              </div>
              <div className="exam-summary-item">
                <label>Status:</label>
                <span className={`exam-status-badge ${selectedResult?.status?.toLowerCase().replace(' ', '-')}`}>
                  {selectedResult?.status}
                </span>
              </div>
            </div>
  
            {/* Show message if no answers yet */}
            {answers.length === 0 ? (
              <div className="exam-no-answers">
                <h4>No Answers Available</h4>
                <p>This exam is still in progress or no answers have been submitted yet.</p>
                <p>You can still manually set a total score above if needed.</p>
              </div>
            ) : (
              <div className="exam-question-results">
                <h4>Question-by-Question Results</h4>
                {answers.map((answer, index) => {
                  const question = questions.find(q => q.id === answer.questionId);
                  
                  // Skip if question not found
                  if (!question) {
                    return (
                      <div key={answer.questionId || index} className="exam-question-result-item">
                        <div className="exam-question-header-detailed">
                          <h5>Question {index + 1}: [Question not found]</h5>
                        </div>
                        <div className="exam-answer-content">
                          <div className="exam-student-answer">
                            <label>Student Answer:</label>
                            <div className="exam-answer-text">{answer.answer || 'No answer'}</div>
                          </div>
                        </div>
                      </div>
                    );
                  }
  
                  return (
                    <div key={answer.questionId} className="exam-question-result-item">
                      <div className="exam-question-header-detailed">
                        <h5>Question {index + 1}: {question.question}</h5>
                        <span className="exam-question-type-badge">{question.type}</span>
                      </div>
                      
                      <div className="exam-answer-content">
                        <div className="exam-student-answer">
                          <label>Student Answer:</label>
                          <div className="exam-answer-text">{answer.answer || 'No answer provided'}</div>
                        </div>
                        
                        {question.type === 'essay' && (
                          <div className="exam-score-section">
                            <label>Score:</label>
                            <div className="exam-score-input-group">
                              <input
                                type="number"
                                value={getDisplayScore(answer.questionId, answer.score || 0)}
                                onChange={(e) => handleScoreChange(answer.questionId, e.target.value, question.points)}
                                className="exam-detailed-score-input"
                                min="0"
                                max={question.points}
                              />
                              <span>/ {question.points} pts</span>
                            </div>
                          </div>
                        )}
                        
                        {question.type !== 'essay' && (
                          <div className="exam-score-section">
                            <label>Correct Answer:</label>
                            <span>{question.correctAnswer}</span>
                            <div className="exam-auto-score">
                              Score: {getDisplayScore(answer.questionId, answer.score || 0)} / {question.points} pts
                              {question.type === 'multiple-choice' && (
                                <div className="exam-manual-override">
                                  <label>Manual Override:</label>
                                  <input
                                    type="number"
                                    value={getDisplayScore(answer.questionId, answer.score || 0)}
                                    onChange={(e) => handleScoreChange(answer.questionId, e.target.value, question.points)}
                                    className="exam-override-input"
                                    min="0"
                                    max={question.points}
                                  />
                                  <span>/ {question.points} pts</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="exam-modal-footer">
            <div className="exam-modal-footer-left">
              {hasUnsavedChanges && (
                <span className="exam-unsaved-changes">You have unsaved changes</span>
              )}
              <button 
                className="exam-btn-export"
                onClick={exportToPDF}
                title="Export Result to PDF"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export Result
              </button>
            </div>
            <div className="exam-modal-footer-right">
              {hasUnsavedChanges && (
                <button 
                  className="exam-btn-success"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </button>
              )}
              <button 
                className="exam-btn-primary"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (window.confirm('You have unsaved changes. Are you sure you want to close without saving?')) {
                      setShowDetailedResultModal(false);
                      setEditedScores({});
                      setHasUnsavedChanges(false);
                    }
                  } else {
                    setShowDetailedResultModal(false);
                  }
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="exam-management-container">
      {currentView === 'list' && renderExamList()}
      {(currentView === 'add' || currentView === 'edit') && renderExamForm()}
      {showGiveExamModal && renderGiveExamModal()}
      {showUngiveExamModal && renderUngiveExamModal()}
      {showResultsModal && renderResultsModal()}
      {showDetailedResultModal && renderDetailedResultModal()}
      {showDeleteModal && renderDeleteModal()}
      {renderSuccessModal()}
    </div>
  );
};

export default ManageExamination;