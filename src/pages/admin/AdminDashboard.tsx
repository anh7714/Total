import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import ResultsManagement from "./ResultsManagement";
import EvaluatorManagement from "./EvaluatorManagement";
import CandidateManagement from "./CandidateManagement";
import EvaluationItemManagement from "./EvaluationItemManagement";
import SystemSettings from "./SystemSettings";
import { ChartBarIcon, UsersIcon, ClipboardIcon, CheckCircleIcon, CogIcon } from "@heroicons/react/24/solid";

const tabs = [
  { name: "평가 결과 관리", icon: <ChartBarIcon className="w-5 h-5" /> },
  { name: "평가위원 관리", icon: <CheckCircleIcon className="w-5 h-5" /> },
  { name: "평가 대상자 관리", icon: <UsersIcon className="w-5 h-5" /> },
  { name: "평가 항목 관리", icon: <ClipboardIcon className="w-5 h-5" /> },
  { name: "시스템 설정", icon: <CogIcon className="w-5 h-5" /> },
];

const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tabs[0].name);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <main className="w-full max-w-screen-2xl mx-auto px-2 md:px-4 py-8">
        <h1 className="text-4xl font-bold text-primary mb-8 text-left">관리자 페이지</h1>
        <nav className="grid grid-cols-5 gap-0 mb-8 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center justify-center py-3 px-2 md:px-4 text-base md:text-lg font-semibold border-b-2 transition-colors ${
                activeTab === tab.name
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-gray-500 hover:text-primary/80"
              }`}
              style={{ minWidth: 0 }}
            >
              {tab.icon}
              <span className="ml-2">{tab.name}</span>
            </button>
          ))}
        </nav>
        <section className="w-full">
          {activeTab === "평가 결과 관리" && <ResultsManagement />}
          {activeTab === "평가위원 관리" && <EvaluatorManagement />}
          {activeTab === "평가 대상자 관리" && <CandidateManagement />}
          {activeTab === "평가 항목 관리" && <EvaluationItemManagement />}
          {activeTab === "시스템 설정" && <SystemSettings />}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard; 