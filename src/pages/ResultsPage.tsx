import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

interface Candidate {
  id: number;
  name: string;
  department: string;
  position: string;
  category: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}
interface Evaluator {
  id: number;
  name: string;
  department: string;
  email: string;
}
interface EvaluationCategory {
  id: number;
  category_name: string;
  sort_order: number;
  is_active: boolean;
}
interface EvaluationItem {
  id: number;
  item_name: string;
  category_id: number;
  score_type: string; // ex: '정량', '정성'
  max_score: number;
  sort_order: number;
  is_active: boolean;
  category?: EvaluationCategory;
}
interface Score {
  id: number;
  evaluator_id: number;
  candidate_id: number;
  item_id: number;
  score: number;
  comment: string;
}

const ResultsPage = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [evaluators, setEvaluators] = useState<Evaluator[]>([]);
  const [categories, setCategories] = useState<EvaluationCategory[]>([]);
  const [items, setItems] = useState<EvaluationItem[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{[id:number]: boolean}>({});
  const [showReport, setShowReport] = useState(false);
  const [showIndividualReport, setShowIndividualReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary'|'individual'>('summary');
  const [selectedEvaluator, setSelectedEvaluator] = useState<number|null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [{ data: candidatesData }, { data: evaluatorsData }, { data: categoriesData }, { data: itemsData }, { data: scoresData }] = await Promise.all([
        supabase.from("candidates").select("*"),
        supabase.from("evaluators").select("*"),
        supabase.from("evaluation_categories").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase.from("evaluation_items").select("*, category:evaluation_categories(*)").eq("is_active", true).order("sort_order", { ascending: true }),
        supabase.from("scores").select("*"),
      ]);
      setCandidates(candidatesData || []);
      setEvaluators(evaluatorsData || []);
      setCategories(categoriesData || []);
      setItems(itemsData || []);
      setScores(scoresData || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // 평균점수 계산 및 정렬
  const candidatesWithAvg = candidates.map(candidate => {
    const total = evaluators.reduce((sum, ev) => {
      const totalScore = items.reduce((s, item) => {
        const sc = scores.find(sc => sc.evaluator_id === ev.id && sc.candidate_id === candidate.id && sc.item_id === item.id);
        return s + (sc ? sc.score : 0);
      }, 0);
      return sum + totalScore;
    }, 0);
    const avg = evaluators.length > 0 ? total / evaluators.length : 0;
    return { ...candidate, avgScore: avg };
  }).sort((a, b) => b.avgScore - a.avgScore);

  // 최종 선정 체크박스 핸들러
  const handleSelect = (id: number) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 인쇄 기능
  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // 평가위원별 개별 평가결과용: 평가위원 선택
  const handleSelectEvaluator = (id: number) => {
    setSelectedEvaluator(id);
    setShowIndividualReport(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 카테고리별로 항목 묶기
  const itemsByCategory = categories.map(cat => ({
    ...cat,
    items: items.filter(item => item.category_id === cat.id)
  }));

  return (
    <div className="min-h-screen bg-white font-pt">
      <main className="container mx-auto py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">결과분석 및 보고서 생성</h1>
          <p className="mt-2 text-md text-muted-foreground">평가대상별, 평가위원별 점수표를 확인하고 보고서를 출력할 수 있습니다.</p>
        </div>
        {/* 탭 UI */}
        <div className="flex gap-2 mb-8 justify-center">
          <button
            className={`px-6 py-2 rounded-t-lg font-semibold border-b-2 ${activeTab === 'summary' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 bg-gray-100'}`}
            onClick={() => setActiveTab('summary')}
          >
            종합 결과 보고서
          </button>
          <button
            className={`px-6 py-2 rounded-t-lg font-semibold border-b-2 ${activeTab === 'individual' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 bg-gray-100'}`}
            onClick={() => setActiveTab('individual')}
          >
            평가위원별 개별 평가결과
          </button>
        </div>
        {/* 종합 결과 보고서 탭 */}
        {activeTab === 'summary' && (
          <>
            <div className="overflow-x-auto bg-white rounded-xl shadow p-6 mb-8">
              <table className="min-w-full border text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="border px-2 py-2">평가대상자</th>
                    {evaluators.map(ev => (
                      <th key={ev.id} className="border px-2 py-2">{ev.name}</th>
                    ))}
                    <th className="border px-2 py-2">평균점수</th>
                    <th className="border px-2 py-2">최종 선정</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatesWithAvg.map(candidate => (
                    <tr key={candidate.id}>
                      <td className="border px-2 py-2 font-bold bg-gray-50">{candidate.name}</td>
                      {evaluators.map(ev => {
                        const totalScore = items.reduce((sum, item) => {
                          const s = scores.find(sc => sc.evaluator_id === ev.id && sc.candidate_id === candidate.id && sc.item_id === item.id);
                          return sum + (s ? s.score : 0);
                        }, 0);
                        return (
                          <td key={ev.id} className="border px-2 py-2 text-center">{totalScore}</td>
                        );
                      })}
                      <td className="border px-2 py-2 text-center font-bold text-blue-700">{candidate.avgScore.toFixed(2)}</td>
                      <td className="border px-2 py-2 text-center">
                        <input type="checkbox" checked={!!selected[candidate.id]} onChange={() => handleSelect(candidate.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mb-8">
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow transition" onClick={() => setShowReport(true)}>
                보고서 미리보기/인쇄
              </button>
            </div>
            {/* 보고서 미리보기/인쇄 모달 */}
            {showReport && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 print:bg-transparent">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl p-8 relative" ref={printRef}>
                  <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl print:hidden" onClick={() => setShowReport(false)}>&times;</button>
                  <h2 className="text-2xl font-bold mb-4 text-center">심사결과 보고서</h2>
                  <div className="mb-6 text-right text-gray-500 text-sm">출력일: {new Date().toLocaleDateString()}</div>
                  <table className="min-w-full border text-sm mb-8">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border px-2 py-2">순위</th>
                        <th className="border px-2 py-2">평가대상자</th>
                        <th className="border px-2 py-2">평균점수</th>
                        <th className="border px-2 py-2">최종 선정</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidatesWithAvg.map((candidate, idx) => (
                        <tr key={candidate.id}>
                          <td className="border px-2 py-2 text-center">{idx + 1}</td>
                          <td className="border px-2 py-2">{candidate.name}</td>
                          <td className="border px-2 py-2 text-center">{candidate.avgScore.toFixed(2)}</td>
                          <td className="border px-2 py-2 text-center font-bold">
                            {selected[candidate.id] ? <span className="text-green-600">선정</span> : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mb-8">
                    <h3 className="font-bold mb-2">평가위원 서명란</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {evaluators.map(ev => (
                        <div key={ev.id} className="border-b border-gray-400 py-4 flex items-center gap-2">
                          <span className="font-semibold w-24 inline-block">{ev.name}</span>
                          <span className="text-gray-400">서명: </span>
                          <span className="flex-1 border-b border-dashed border-gray-400"></span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end print:hidden">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded shadow transition" onClick={handlePrint}>
                      인쇄하기
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {/* 평가위원별 개별 평가결과 탭 */}
        {activeTab === 'individual' && (
          <>
            <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6 mt-8 mb-8">
              <div className="mb-2 text-xl font-bold">평가위원별 보고서 출력</div>
              <div className="mb-6 text-gray-500 text-sm">
                평가위원을 선택하여 평가 내역 보고서를 조회하고 출력합니다.
              </div>
              <div className="flex gap-2 items-center">
                <select
                  className="flex-1 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  value={selectedEvaluator || ''}
                  onChange={e => setSelectedEvaluator(Number(e.target.value) || null)}
                >
                  <option value="">평가위원을 선택하세요</option>
                  {evaluators.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
                <button
                  className={`px-5 py-2 rounded font-semibold flex items-center gap-2 transition
                    ${selectedEvaluator ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  disabled={!selectedEvaluator}
                  onClick={() => setShowIndividualReport(true)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                  보고서 보기
                </button>
              </div>
            </div>
            {selectedEvaluator && (
              <div className="overflow-x-auto bg-white rounded-xl shadow p-6 mb-8">
                <table className="min-w-full border text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="border px-2 py-2">평가대상자</th>
                      {itemsByCategory.map(cat => (
                        <th key={cat.id} className="border px-2 py-2" colSpan={cat.items.length}>{cat.category_name}</th>
                      ))}
                    </tr>
                    <tr>
                      <th className="border px-2 py-2"></th>
                      {itemsByCategory.map(cat => (
                        cat.items.map(item => (
                          <th key={item.id} className="border px-2 py-2">{item.item_name}</th>
                        ))
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map(candidate => (
                      <tr key={candidate.id}>
                        <td className="border px-2 py-2 font-bold bg-gray-50">{candidate.name}</td>
                        {itemsByCategory.map(cat => (
                          cat.items.map(item => {
                            const s = scores.find(sc => sc.evaluator_id === selectedEvaluator && sc.candidate_id === candidate.id && sc.item_id === item.id);
                            return (
                              <td key={item.id} className="border px-2 py-2 text-center">{s ? s.score : '-'}</td>
                            );
                          })
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {showIndividualReport && selectedEvaluator && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 print:bg-transparent print-area">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-8 relative" ref={printRef}>
                  {/* 인쇄 버튼 우측 상단 */}
                  <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl print:hidden" onClick={() => setShowIndividualReport(false)}>&times;</button>
                  <button className="absolute top-4 right-16 bg-white border border-gray-300 px-4 py-1.5 rounded text-sm font-semibold text-gray-700 hover:bg-gray-100 print:hidden" onClick={handlePrint}>
                    🖨️ 인쇄
                  </button>
                  {/* 상단 제목/정보 */}
                  <div className="text-left font-bold text-gray-700 mb-2 text-sm">{evaluators.find(ev => ev.id === selectedEvaluator)?.name} 위원 평가 결과 보고서</div>
                  <h2 className="text-2xl font-extrabold text-center mb-2">2025년 상반기 적극행정 우수공무원 선발</h2>
                  <div className="text-center text-lg font-semibold mb-6">평가위원별 평가 결과 보고서</div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="font-bold">{evaluators.find(ev => ev.id === selectedEvaluator)?.name} 위원</div>
                    <div className="text-right text-gray-600 font-semibold">평가일<br/>{new Date().toLocaleDateString()}</div>
                  </div>
                  {/* 표 */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border text-sm mb-8">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border px-2 py-2">평가 대상자</th>
                          {itemsByCategory.map(cat => (
                            cat.items.map(item => (
                              <th key={item.id} className="border px-2 py-2 whitespace-nowrap">
                                {item.item_name}<br/>
                                <span className="text-xs text-gray-500 font-normal">({item.max_score}점)</span>
                              </th>
                            ))
                          ))}
                          <th className="border px-2 py-2">총점(100점)</th>
                          <th className="border px-2 py-2">기타 의견</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map(candidate => {
                          // 총점 계산
                          const total = items.reduce((sum, item) => {
                            const s = scores.find(sc => sc.evaluator_id === selectedEvaluator && sc.candidate_id === candidate.id && sc.item_id === item.id);
                            return sum + (s ? s.score : 0);
                          }, 0);
                          // 코멘트(기타 의견)
                          const comments = items.map(item => {
                            const s = scores.find(sc => sc.evaluator_id === selectedEvaluator && sc.candidate_id === candidate.id && sc.item_id === item.id);
                            return s && s.comment ? s.comment : null;
                          }).filter(Boolean).join('; ');
                          return (
                            <tr key={candidate.id}>
                              <td className="border px-2 py-2 font-bold bg-gray-50">{candidate.name}</td>
                              {itemsByCategory.map(cat => (
                                cat.items.map(item => {
                                  const s = scores.find(sc => sc.evaluator_id === selectedEvaluator && sc.candidate_id === candidate.id && sc.item_id === item.id);
                                  return (
                                    <td key={item.id} className="border px-2 py-2 text-center">{s ? s.score : '-'}</td>
                                  );
                                })
                              ))}
                              <td className="border px-2 py-2 text-center font-bold">{total}</td>
                              <td className="border px-2 py-2 text-center text-xs text-gray-500">{comments || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="my-8 text-center text-base font-semibold text-gray-700">상기 내용은 사실과 틀림없음을 확인합니다.</div>
                  <div className="flex justify-end items-center gap-4 mt-8">
                    <div className="font-bold">성명: {evaluators.find(ev => ev.id === selectedEvaluator)?.name}</div>
                    <div className="border-b border-gray-400 w-32 h-6"></div>
                    <span className="text-gray-500">(서명)</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ResultsPage; 