import React, { useState } from "react";
import { Lock, ArrowLeft, Users, Table, Info, Clock, Plus, Shield, QrCode ,Tag} from "lucide-react";
import UserRole from "../references/UserRole";
import BilliardTable from "../references/BilliardTable";
import BilliardTableInfo from "../references/BilliardTableInfo";
import Duration from "../references/Duration";
import Extension from "../references/Extension";
import RolePermissionTable from "../references/RolePermissionTable";
import TimeDate from "../references/TimeDate";
import BilliardType from "../references/BilliardType";
import Status from "../references/Status";
import ExtensionTagging from "../references/ExtensionTagging";
import QRCodeManagement from "../references/QRCodeManagement";
import HomeDashboardUpload from "../components/HomeDashboardUpload";
import RejectManager from "../references/Reject";
import RejectFrontdesk from "../references/RejectFrontdesk";
const Reference = () => {
  const [selectedModule, setSelectedModule] = useState(null);
  const [sortBy, setSortBy] = useState("all");

  const modules = [
    { 
      id: "user-role", 
      name: "USER ROLE", 
      locked: false,
      icon: Users,
      color: "#3b82f6"
    },
    { 
      id: "billiard-table", 
      name: "BILLIARD TABLE", 
      locked: false,
      icon: Table,
      color: "#2563eb"
    },
    { 
      id: "billiard-table-info", 
      name: "BILLIARD TABLE INFO", 
      locked: false,
      icon: Info,
      color: "#1d4ed8"
    },
    { 
      id: "duration", 
      name: "DURATION HOURS", 
      locked: false,
      icon: Clock,
      color: "#1e40af"
    },
    { 
      id: "extension", 
      name: "EXTENSION HOURS", 
      locked: false,
      icon: Plus,
      color: "#3b82f6"
    },
    { 
      id: "rolePermissionTable", 
      name: "ROLE PERMISSION", 
      locked: false,
      icon: Shield,
      color: "#2563eb"
    },
    { 
      id: "TimeDate", 
      name: "TIME DATE", 
      locked: false,
      icon: Clock,
      color: "#2563eb"
    },
    { 
      id: "BilliardType", 
      name: "BILLIARD TYPE", 
      locked: false,
      icon: Table,
      color: "#2563eb"
    },
    { 
      id: "Status", 
      name: "STATUS", 
      locked: false,
      icon: Info,
      color: "#2563eb"
    },
    { 
      id: "ExtensionTagging", 
      name: "EXTENSION TAGGING", 
      locked: false,
      icon: Tag,
      color: "#2563eb"
    },
    { 
      id: "QRCodeManagement", 
      name: "QR CODE MANAGEMENT", 
      locked: false,
      icon: QrCode,
      color: "#3b82f6"
    },
     { 
      id: "homeDashboardUpload", 
      name: "HOME IMAGE UPLOADING", 
      locked: false,
      icon: QrCode,
      color: "#3b82f6"
    },
     { 
      id: "RejectManager", 
      name: "REJECT MANAGER", 
      locked: false,
      icon: QrCode,
      color: "#3b82f6"
    },
      { 
      id: "RejectFrontdesk", 
      name: "REJECT FRONTDESK", 
      locked: false,
      icon: QrCode,
      color: "#3b82f6"
    },
  ];

  const filteredModules =
    sortBy === "all"
      ? modules
      : modules.filter((m) => m.name === sortBy.toUpperCase());

  const renderModule = () => {
    switch (selectedModule) {
      case "user-role":
        return <UserRole />;
      case "billiard-table":
        return <BilliardTable />;
      case "billiard-table-info":
        return <BilliardTableInfo />;
      case "duration":
        return <Duration />;
      case "extension":
        return <Extension />;
      case "rolePermissionTable":
        return <RolePermissionTable />;
      case "TimeDate":
        return <TimeDate />;
      case "BilliardType":
        return <BilliardType />;
      case "Status":
        return <Status />;
      case "ExtensionTagging":
        return <ExtensionTagging />;
      case "QRCodeManagement":
        return <QRCodeManagement />;
      case "homeDashboardUpload":
        return <HomeDashboardUpload />;
      case "RejectManager":
        return <RejectManager />;
      case "RejectFrontdesk":
        return <RejectFrontdesk />;

        
      default:
        return null;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        * {
          font-family: 'Inter', sans-serif;
        }
        
        .glass-bg {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%);
          position: relative;
          overflow: hidden;
        }
        
        .glass-bg::before {
          content: '';
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
          top: -150px;
          right: -150px;
          animation: float 20s ease-in-out infinite;
          border-radius: 50%;
        }
        
        .glass-bg::after {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.06) 0%, transparent 70%);
          bottom: -100px;
          left: -100px;
          animation: float 25s ease-in-out infinite reverse;
          border-radius: 50%;
        }
        
        .glass-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.4;
          animation: pulse 8s ease-in-out infinite;
        }
        
        .orb-1 {
          width: 300px;
          height: 300px;
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          top: 20%;
          left: 10%;
          animation-delay: 0s;
        }
        
        .orb-2 {
          width: 250px;
          height: 250px;
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          bottom: 30%;
          right: 15%;
          animation-delay: 2s;
        }
        
        .orb-3 {
          width: 200px;
          height: 200px;
          background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 100%);
          top: 60%;
          left: 50%;
          animation-delay: 4s;
        }
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, 40px) rotate(45deg); }
          50% { transform: translate(0, 80px) rotate(90deg); }
          75% { transform: translate(-30px, 40px) rotate(135deg); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.6; }
        }
        
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15),
                      inset 0 1px 0 0 rgba(255, 255, 255, 0.9);
        }
        
        .glass-card-hover {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .glass-card-hover::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%);
          border-radius: 20px;
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        
        .glass-card-hover:hover::before {
          opacity: 1;
        }
        
        .glass-card-hover:hover {
          transform: translateY(-10px) scale(1.02);
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 20px 60px 0 rgba(59, 130, 246, 0.3),
                      inset 0 1px 0 0 rgba(255, 255, 255, 1);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        
        .glass-card-locked {
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(251, 191, 36, 0.4);
        }
        
        .glass-button {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.2);
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
        }
        
        .glass-button:hover {
          background: rgba(255, 255, 255, 0.95);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        
        .glass-select {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        
        .glass-select:focus {
          outline: none;
          border: 1px solid rgba(59, 130, 246, 0.4);
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .icon-wrapper {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%);
          border: 2px solid rgba(59, 130, 246, 0.2);
          transition: all 0.3s ease;
        }
        
        .glass-card-hover:hover .icon-wrapper {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border: 2px solid #3b82f6;
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
        }
        
        .glass-card-hover:hover .icon-wrapper svg {
          color: white !important;
        }
      `}</style>
      
      <div className="glass-bg" style={{ padding: "40px 20px", position: "relative", zIndex: 1 }}>
        <div className="glass-orb orb-1"></div>
        <div className="glass-orb orb-2"></div>
        <div className="glass-orb orb-3"></div>
        
        {selectedModule ? (
          <div style={{ maxWidth: "1400px", margin: "0 auto", position: "relative", zIndex: 10 }}>
            <button
              onClick={() => setSelectedModule(null)}
              className="glass-button"
              style={{
                marginBottom: "30px",
                padding: "14px 28px",
                border: "none",
                borderRadius: "14px",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "600",
                color: "#1e40af",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <ArrowLeft size={20} />
              Back to Reference Modules
            </button>
            {renderModule()}
          </div>
        ) : (
          <div style={{ maxWidth: "1400px", margin: "0 auto", position: "relative", zIndex: 10 }}>
            {/* Header */}
            <div
              className="glass-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "40px",
                padding: "35px 45px",
                borderRadius: "24px",
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "42px",
                    fontWeight: "900",
                    background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-1px",
                    marginBottom: "8px",
                  }}
                >
                  Reference Modules
                </h1>
                <p style={{ 
                  margin: 0, 
                  color: "#64748b", 
                  fontSize: "15px",
                  fontWeight: "500"
                }}>
                  Manage and configure your system modules
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  Sort by:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="glass-select"
                  style={{
                    padding: "12px 20px",
                    borderRadius: "14px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#1e40af",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Modules</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Module Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: "28px",
              }}
            >
              {filteredModules.map((module) => {
                const Icon = module.icon;
                return (
                  <div
                    key={module.id}
                    onClick={() => !module.locked && setSelectedModule(module.id)}
                    className={`glass-card ${!module.locked ? 'glass-card-hover' : 'glass-card-locked'}`}
                    style={{
                      borderRadius: "20px",
                      padding: "35px 30px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "200px",
                      cursor: module.locked ? "not-allowed" : "pointer",
                      position: "relative",
                    }}
                  >
                    {module.locked ? (
                      <div
                        style={{
                          background: "rgba(251, 191, 36, 0.15)",
                          borderRadius: "50%",
                          padding: "16px",
                          marginBottom: "20px",
                          border: "2px solid rgba(251, 191, 36, 0.3)",
                        }}
                      >
                        <Lock size={32} style={{ color: "#f59e0b" }} />
                      </div>
                    ) : (
                      <div
                        className="icon-wrapper"
                        style={{
                          borderRadius: "20px",
                          padding: "20px",
                          marginBottom: "24px",
                        }}
                      >
                        <Icon size={36} style={{ color: module.color }} />
                      </div>
                    )}
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "17px",
                        fontWeight: "700",
                        color: "#1e293b",
                        textAlign: "center",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {module.name}
                    </h3>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Reference;