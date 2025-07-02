import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

interface Candidate {
  id: number;
  name: string;
  department: string;
  position: string;
  category: string;
}

interface Evaluator {
  id: number;
  name: string;
  department: string;
}

interface EvaluationItem {
  id: number;
  item_code: string;
  item_name: string;
  max_score: number;
  weight: number;
  category: {
    id: number;
    category_code: string;
    category_name: string;
  };
}

interface Score {
  id: number;
  evaluator_id: number;
  candidate_id: number;
  item_id: number;
  score: number;
  max_score: number;
  comments: string;
  is_final: boolean;
  created_at: string;
  evaluator: Evaluator;
  item: EvaluationItem;
}

interface CandidateResult {
  candidate: Candidate;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  evaluatorCount: number;
  completedEvaluations: number;
  averageScore: number;
}

const ResultsManagement = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [showIncompleteModal, setShowIncompleteModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateResults();
  }, [candidates, scores, items, evaluators]);

  const fetchData = async () => {
    try {
      // 평가 대상자 조회
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("candidates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (candidatesError) throw candidatesError;
      setCandidates(candidatesData || []);

      // 평가위원 조회
      const { data: evaluatorsData, error: evaluatorsError } = await supabase
        .from("evaluators")
        .select("*")
        .eq("is_active", true);

      if (evaluatorsError) throw evaluatorsError;
      setEvaluators(evaluatorsData || []);

      // 평가 항목 조회
      const { data: itemsData, error: itemsError } = await supabase
        .from("evaluation_items")
        .select(`
          *,
          category:evaluation_categories(*)
        `)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      // 완료된 평가 점수 조회
      const { data: scoresData, error: scoresError } = await supabase
        .from("scores")
        .select(`
          *,
          evaluator:evaluators(*),
          item:evaluation_items(
            *,
            category:evaluation_categories(*)
          )
        `)
        .eq("is_final", true);

      if (scoresError) throw scoresError;
      setScores(scoresData || []);
    } catch (error) {
      console.error("데이터 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateResults = () => {
    const results: CandidateResult[] = candidates.map(candidate => {
      const candidateScores = scores.filter(score => score.candidate_id === candidate.id);
      const uniqueEvaluators = new Set(candidateScores.map(score => score.evaluator_id));
      
      // 각 평가위원별 총점 계산
      const evaluatorScores = Array.from(uniqueEvaluators).map(evaluatorId => {
        const evaluatorScores = candidateScores.filter(score => score.evaluator_id === evaluatorId);
        const totalScore = evaluatorScores.reduce((sum, score) => {
          const item = items.find(item => item.id === score.item_id);
          const weight = item?.weight || 1;
          return sum + (score.score * weight);
        }, 0);
        return totalScore;
      });

      const totalScore = evaluatorScores.reduce((sum, score) => sum + score, 0);
      const averageScore = evaluatorScores.length > 0 ? totalScore / evaluatorScores.length : 0;
      
      // 최대 가능 점수 계산
      const maxPossibleScore = items.reduce((sum, item) => {
        return sum + (item.max_score * item.weight);
      }, 0);

      const percentage = maxPossibleScore > 0 ? (averageScore / maxPossibleScore) * 100 : 0;

      return {
        candidate,
        totalScore: averageScore,
        maxPossibleScore,
        percentage,
        evaluatorCount: uniqueEvaluators.size,
        completedEvaluations: candidateScores.length,
        averageScore,
      };
    });

    // 점수 순으로 정렬
    results.sort((a, b) => b.percentage - a.percentage);
    setResults(results);
  };

  const getCandidateScores = (candidateId: number) => {
    return scores.filter(score => score.candidate_id === candidateId);
  };

  const getItemScores = (candidateId: number, itemId: number) => {
    return scores.filter(score => score.candidate_id === candidateId && score.item_id === itemId);
  };

  const exportToExcel = () => {
    // 간단한 CSV 내보내기
    const csvContent = [
      "순위,이름,부서,직급,평균점수,최대점수,백분율,평가위원수",
      ...results.map((result, index) => [
        index + 1,
        result.candidate.name,
        result.candidate.department,
        result.candidate.position,
        result.averageScore.toFixed(2),
        result.maxPossibleScore,
        result.percentage.toFixed(2),
        result.evaluatorCount,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "평가결과.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 미완료 평가 대상자와 미평가 평가위원 계산
  const incompleteList = candidates
    .map(candidate => {
      // 이 후보에 대해 평가한 evaluator id 집합
      const completedEvaluatorIds = new Set(
        scores.filter(s => s.candidate_id === candidate.id && s.is_final).map(s => s.evaluator_id)
      );
      // 미평가 evaluator 목록
      const notEvaluated = evaluators.filter(ev => !completedEvaluatorIds.has(ev.id));
      return notEvaluated.length > 0
        ? { candidate, notEvaluated }
        : null;
    })
    .filter(Boolean);
  const incompleteCount = incompleteList.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 w-full">
      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">총 평가대상</p>
              <p className="text-2xl font-semibold text-gray-900">{candidates.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">완료된 평가</p>
              <p className="text-2xl font-semibold text-gray-900">
                {results.filter(r => r.completedEvaluations > 0).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              {/* ... */}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">미완료 평가</p>
              <button onClick={() => setShowIncompleteModal(true)} className="text-2xl font-semibold text-gray-900 focus:outline-none hover:underline">
                {incompleteCount}
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              {/* ... */}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">평가위원</p>
              <p className="text-2xl font-semibold text-gray-900">{evaluators.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 결과 목록 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">평가 결과 순위</h2>
        </div>
        
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">순위</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">이름</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">부서</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">직급</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">평균점수</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">총점</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">평가위원</th>
                <th className="px-6 py-3 text-center align-middle text-base font-bold text-black uppercase tracking-wider">상세보기</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.map((result, index) => (
                <React.Fragment key={result.candidate.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.candidate.name}
                    </td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm text-gray-500">
                      {result.candidate.department}
                    </td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm text-gray-500">
                      {result.candidate.position}
                    </td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm text-gray-500">
                      {result.averageScore.toFixed(2)} / {result.maxPossibleScore}
                    </td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.percentage >= 90
                            ? "bg-green-100 text-green-800"
                            : result.percentage >= 80
                            ? "bg-blue-100 text-blue-800"
                            : result.percentage >= 70
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {result.totalScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center align-middle whitespace-nowrap text-sm text-gray-500">
                      {result.evaluatorCount}명
                    </td>
                    <td className="px-6 py-4 text-center align-middle flex justify-center items-center text-sm font-medium">
                      <button
                        onClick={() => setSelectedCandidate(selectedCandidate === result.candidate.id ? null : result.candidate.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {selectedCandidate === result.candidate.id ? "접기" : "상세보기"}
                      </button>
                    </td>
                  </tr>
                  {/* 상세보기 행 - 클릭한 행 바로 아래에 표시 */}
                  {selectedCandidate === result.candidate.id && (
                    <tr>
                      <td colSpan={8} className="px-0 py-0">
                        <div className="bg-gray-50 border-t border-gray-200">
                          <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">
                              {result.candidate.name} - 상세 평가 결과
                            </h3>
                          </div>
                          
                          <div className="p-6">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      평가 항목
                                    </th>
                                    {evaluators.map(evaluator => (
                                      <th key={evaluator.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {evaluator.name}
                                      </th>
                                    ))}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      평균
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {items.map(item => {
                                    const itemScores = getItemScores(result.candidate.id, item.id);
                                    const evaluatorScores = evaluators.map(evaluator => {
                                      const score = itemScores.find(s => s.evaluator_id === evaluator.id);
                                      return score ? score.score : "-";
                                    });
                                    const averageScore = itemScores.length > 0 
                                      ? itemScores.reduce((sum, score) => sum + score.score, 0) / itemScores.length 
                                      : 0;

                                    return (
                                      <tr key={item.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                          {item.item_code}. {item.item_name}
                                        </td>
                                        {evaluatorScores.map((score, index) => (
                                          <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {score === "-" ? "-" : `${score}/${item.max_score}`}
                                          </td>
                                        ))}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                          {averageScore > 0 ? `${averageScore.toFixed(1)}/${item.max_score}` : "-"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 미완료 평가 모달 */}
      {showIncompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-8 relative">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl" onClick={() => setShowIncompleteModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-6">미완료 평가 대상 및 미평가 평가위원</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-center text-base font-bold text-black uppercase tracking-wider border-r">미완료 평가 대상자</th>
                    <th className="px-6 py-3 text-center text-base font-bold text-black uppercase tracking-wider">미평가 평가위원</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {incompleteList.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-6 py-6 text-center text-gray-400">모든 평가가 완료되었습니다.</td>
                    </tr>
                  )}
                  {incompleteList.map((item: any) => (
                    <tr key={item.candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-center font-medium text-gray-900 border-r">{item.candidate.name}</td>
                      <td className="px-6 py-4 text-center text-gray-700">
                        {item.notEvaluated.length === 0 ? (
                          <span className="text-gray-400">없음</span>
                        ) : (
                          item.notEvaluated.map((ev: any) => ev.name).join(", ")
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsManagement; 