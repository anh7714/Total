import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { UsersIcon, CheckCircleIcon, ClockIcon, ArrowRightOnRectangleIcon } from "@heroicons/react/24/solid";

interface Evaluator {
  id: number;
  name: string;
  email: string;
  department: string;
}

interface Candidate {
  id: number;
  name: string;
  department: string;
  position: string;
  category: string;
}

interface EvaluationProgress {
  id: number;
  candidate_id: number;
  total_items: number;
  completed_items: number;
  progress_percentage: number;
  is_submitted: boolean;
  candidate: Candidate;
}

const EvaluatorDashboard = () => {
  const [evaluator, setEvaluator] = useState<Evaluator | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [progress, setProgress] = useState<EvaluationProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (evaluator) {
      fetchData();
    }
  }, [evaluator]);

  const checkAuth = () => {
    const evaluatorData = localStorage.getItem("evaluator");
    if (!evaluatorData) {
      navigate("/evaluator/login");
      return;
    }
    setEvaluator(JSON.parse(evaluatorData));
  };

  const fetchData = async () => {
    try {
      // 평가 대상자 목록 조회
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (candidatesError) throw candidatesError;
      setCandidates(candidatesData || []);

      // 평가 진행 상황 조회
      if (evaluator) {
        const { data: progressData, error: progressError } = await supabase
          .from("evaluation_progress")
          .select(`
            *,
            candidate:candidates(*)
          `)
          .eq("evaluator_id", evaluator.id);

        if (progressError) throw progressError;
        setProgress(progressData || []);
      }
    } catch (error) {
      console.error("데이터 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("evaluator");
    navigate("/evaluator/login");
  };

  const getProgressForCandidate = (candidateId: number) => {
    return progress.find(p => p.candidate_id === candidateId);
  };

  const startEvaluation = async (candidateId: number) => {
    try {
      // 기존 진행상황이 있는지 확인
      const { data: existing, error: existingError } = await supabase
        .from("evaluation_progress")
        .select("*")
        .eq("evaluator_id", evaluator?.id)
        .eq("candidate_id", candidateId)
        .eq("is_submitted", false)
        .single();
      if (!existingError && existing) {
        // 이미 임시저장된 진행상황이 있으면 바로 폼으로 이동
        navigate(`/evaluator/form/${candidateId}`);
        return;
      }
      // 평가 항목 수 조회
      const { count: totalItems } = await supabase
        .from("evaluation_items")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      // 평가 진행 상황 생성 또는 업데이트
      const { error } = await supabase
        .from("evaluation_progress")
        .upsert({
          evaluator_id: evaluator?.id,
          candidate_id: candidateId,
          total_items: totalItems || 0,
          completed_items: 0,
          progress_percentage: 0,
          is_submitted: false,
        });
      if (error) throw error;
      navigate(`/evaluator/form/${candidateId}`);
    } catch (error) {
      console.error("평가 시작 실패:", error);
      alert("평가를 시작할 수 없습니다.");
    }
  };

  // 평가 결과 불러오기
  const handleShowResult = async (candidate: Candidate) => {
    if (!evaluator) return;
    // 평가 항목/카테고리/점수 불러오기
    const [{ data: itemsData }, { data: categoriesData }, { data: scoresData }] = await Promise.all([
      supabase.from("evaluation_items").select(`*, category:evaluation_categories(*)`).eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("evaluation_categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("scores").select("*").eq("evaluator_id", evaluator.id).eq("candidate_id", candidate.id),
    ]);
    setResultModalData({ candidate, items: itemsData || [], categories: categoriesData || [], scores: scoresData || [] });
    setShowResultModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // 현황 데이터
  const total = candidates.length;
  const completed = progress.filter(p => p.is_submitted).length;
  const inProgress = progress.filter(p => !p.is_submitted && p.completed_items > 0).length;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <main className="w-full max-w-screen-2xl mx-auto px-2 md:px-4 py-8">
        {/* 헤더 */}
        <div className="flex justify-between items-center pb-8 mb-8 border-b">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2 text-left">평가위원 대시보드</h1>
            <p className="text-base text-gray-500">{evaluator?.name ? `${evaluator.name} 위원님! 환영합니다.` : '평가위원님! 환영합니다.'}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition">
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            로그아웃
          </button>
        </div>

        {/* 현황 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* 총 평가 대상 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 평가 대상</p>
                <p className="text-2xl font-semibold text-gray-900">{candidates.length}</p>
              </div>
            </div>
          </div>
          {/* 진행중 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">진행중</p>
                <p className="text-2xl font-semibold text-gray-900">{candidates.filter(c => {
                  const p = getProgressForCandidate(c.id);
                  return p && p.completed_items > 0 && !p.is_submitted;
                }).length}</p>
              </div>
            </div>
          </div>
          {/* 완료된 평가 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">완료된 평가</p>
                <p className="text-2xl font-semibold text-gray-900">{candidates.filter(c => {
                  const p = getProgressForCandidate(c.id);
                  return p && p.is_submitted;
                }).length}</p>
              </div>
            </div>
          </div>
          {/* 미완료 평가 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">미완료 평가</p>
                <p className="text-2xl font-semibold text-gray-900">{candidates.filter(c => {
                  const p = getProgressForCandidate(c.id);
                  return !p || (!p.is_submitted && (!p.completed_items || p.completed_items === 0));
                }).length}</p>
              </div>
            </div>
          </div>
        </div>
        {/* 평가 대상자 목록 테이블 */}
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">순서</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">이름</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">부서</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">직급</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">진행 상황</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">작업</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-blue-700 uppercase tracking-wider">결과 확인</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {candidates.map((candidate, idx) => {
                const candidateProgress = getProgressForCandidate(candidate.id);
                const progressPercentage = candidateProgress?.progress_percentage || 0;
                const isCompleted = candidateProgress?.is_submitted || false;
                const hasStarted = candidateProgress && candidateProgress.completed_items > 0;
                const isTempSaved = !isCompleted && hasStarted && progressPercentage < 100;
                return (
                  <tr key={candidate.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm font-medium text-gray-900">{idx + 1}</td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm font-medium text-gray-900">{candidate.name}</td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm text-gray-500">{candidate.department}</td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm text-gray-500">{candidate.position}</td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap">
                      <div className="w-32 h-3 bg-gray-200 rounded mx-auto">
                        <div className={`h-3 rounded ${isCompleted ? 'bg-green-500' : isTempSaved ? 'bg-blue-500' : hasStarted ? 'bg-yellow-400' : 'bg-gray-300'}`} style={{ width: `${progressPercentage}%` }}></div>
                      </div>
                      <span className="ml-3 text-xs text-gray-600 font-semibold">{Math.round(progressPercentage)}%</span>
                    </td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${isCompleted ? 'bg-green-100 text-green-800' : isTempSaved ? 'bg-blue-100 text-blue-800' : hasStarted ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>{isCompleted ? '완료' : isTempSaved ? '임시저장' : hasStarted ? '진행 중' : '미시작'}</span>
                    </td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap flex gap-2 justify-center">
                      {isCompleted ? (
                        <span className="border border-green-500 text-green-700 bg-green-50 rounded px-4 py-2 text-xs font-semibold flex items-center justify-center" style={{minWidth:'80px'}}>
                          평가 완료
                        </span>
                      ) : (
                        <button onClick={() => startEvaluation(candidate.id)} className={`border border-blue-500 text-blue-700 rounded px-4 py-2 text-xs font-semibold transition hover:bg-blue-50 flex items-center justify-center`} style={{minWidth:'80px'}}>{hasStarted ? '계속하기' : '평가 시작'}</button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap">
                      {isCompleted ? (
                        <button onClick={() => handleShowResult(candidate)} className="border border-blue-500 text-blue-700 rounded px-3 py-1 text-xs font-semibold hover:bg-blue-50 transition">결과 확인</button>
                      ) : (
                        <button disabled className="border border-gray-300 text-gray-400 rounded px-3 py-1 text-xs font-semibold cursor-not-allowed bg-gray-50">결과 확인</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      {/* 결과 확인 모달 */}
      {showResultModal && resultModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-8 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl" onClick={() => setShowResultModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-6">평가 결과 확인 - {resultModalData.candidate.name}</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-center text-base font-bold text-black uppercase tracking-wider border-r">평가 항목</th>
                    <th className="px-6 py-3 text-center text-base font-bold text-black uppercase tracking-wider border-r">배점</th>
                    <th className="px-6 py-3 text-center text-base font-bold text-black uppercase tracking-wider border-r">점수</th>
                    <th className="px-6 py-3 text-center text-base font-bold text-black uppercase tracking-wider">코멘트</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {resultModalData.items.map((item: any) => {
                    const score = resultModalData.scores.find((s: any) => s.item_id === item.id);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-center font-medium text-gray-900 border-r">{item.item_name}</td>
                        <td className="px-6 py-4 text-center text-gray-700 border-r">{item.max_score}</td>
                        <td className="px-6 py-4 text-center text-gray-700 border-r">{score ? score.score : '-'}</td>
                        <td className="px-6 py-4 text-center text-gray-700">{score ? score.comments : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluatorDashboard; 