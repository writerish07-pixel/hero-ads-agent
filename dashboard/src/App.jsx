import { useState, useEffect, useRef } from "react";

const HERO_RED = "#E3000F";
const HERO_DARK = "#1A1A2E";
const HERO_GOLD = "#FFB800";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #0F0F1A; color: #fff; }
  .app { min-height: 100vh; background: #0F0F1A; }
  .header {
    background: linear-gradient(135deg, #1A0005 0%, #1A1A2E 100%);
    border-bottom: 2px solid #E3000F;
    padding: 0 32px; height: 64px;
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 4px 32px rgba(227,0,15,0.15);
  }
  .logo { display: flex; align-items: center; gap: 12px; }
  .logo-badge {
    background: #E3000F; color: white;
    font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 18px;
    padding: 4px 12px; border-radius: 4px; letter-spacing: 2px;
  }
  .logo-sub { font-size: 13px; color: #aaa; font-weight: 300; letter-spacing: 1px; }
  .status-pill {
    display: flex; align-items: center; gap: 8px;
    background: rgba(0,200,80,0.12); border: 1px solid rgba(0,200,80,0.3);
    padding: 6px 14px; border-radius: 20px; font-size: 13px; color: #00C850;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #00C850; animation: pulse 1.5s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
  .main { display: grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 64px); }
  .sidebar { background: #13131F; border-right: 1px solid rgba(255,255,255,0.06); padding: 24px 0; }
  .sidebar-section { padding: 8px 20px 4px; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #555; margin-top: 8px; }
  .nav-item {
    display: flex; align-items: center; gap: 12px; padding: 11px 20px; cursor: pointer;
    font-size: 14px; color: #888; transition: all 0.2s; border-left: 3px solid transparent;
  }
  .nav-item:hover { color: #ddd; background: rgba(255,255,255,0.04); }
  .nav-item.active { color: #fff; background: rgba(227,0,15,0.1); border-left: 3px solid #E3000F; font-weight: 500; }
  .budget-card {
    margin: 20px 16px;
    background: linear-gradient(135deg, rgba(227,0,15,0.15), rgba(255,184,0,0.08));
    border: 1px solid rgba(227,0,15,0.25); border-radius: 12px; padding: 16px;
  }
  .budget-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .budget-amount { font-family: 'Rajdhani', sans-serif; font-size: 28px; font-weight: 700; color: #FFB800; margin: 4px 0; }
  .budget-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
  .budget-fill { height: 100%; background: linear-gradient(90deg, #E3000F, #FFB800); border-radius: 2px; }
  .budget-sub { font-size: 11px; color: #666; margin-top: 6px; }
  .content { padding: 28px; overflow-y: auto; }
  .page-title { font-family: 'Rajdhani', sans-serif; font-size: 26px; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .page-sub { font-size: 13px; color: #666; margin-bottom: 24px; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .metric-card {
    background: #13131F; border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; padding: 20px; position: relative; overflow: hidden; transition: transform 0.2s;
  }
  .metric-card:hover { transform: translateY(-2px); }
  .metric-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; }
  .metric-card.red::before { background: linear-gradient(90deg, #E3000F, transparent); }
  .metric-card.gold::before { background: linear-gradient(90deg, #FFB800, transparent); }
  .metric-card.green::before { background: linear-gradient(90deg, #00C850, transparent); }
  .metric-card.blue::before { background: linear-gradient(90deg, #4A9EFF, transparent); }
  .metric-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
  .metric-value { font-family: 'Rajdhani', sans-serif; font-size: 36px; font-weight: 700; color: #fff; line-height: 1.1; margin: 6px 0 4px; }
  .metric-change { font-size: 12px; }
  .metric-change.up { color: #00C850; }
  .metric-icon { position: absolute; right: 16px; top: 16px; font-size: 28px; opacity: 0.15; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
  .three-col { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
  .card { background: #13131F; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 22px; }
  .card-title { font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 600; color: #ddd; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .activity-feed { display: flex; flex-direction: column; gap: 10px; max-height: 280px; overflow-y: auto; }
  .activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 10px 12px; border-radius: 8px; background: rgba(255,255,255,0.03); border-left: 3px solid transparent; }
  .activity-item.success { border-left-color: #00C850; }
  .activity-item.warning { border-left-color: #FFB800; }
  .activity-item.info { border-left-color: #4A9EFF; }
  .activity-item.action { border-left-color: #E3000F; }
  .activity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
  .activity-dot.success { background: #00C850; }
  .activity-dot.warning { background: #FFB800; }
  .activity-dot.info { background: #4A9EFF; }
  .activity-dot.action { background: #E3000F; }
  .activity-text { font-size: 13px; color: #bbb; line-height: 1.4; }
  .activity-time { font-size: 11px; color: #555; margin-top: 2px; }
  .table { width: 100%; border-collapse: collapse; }
  .table th { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #555; padding: 8px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .table td { padding: 12px; font-size: 13px; color: #bbb; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .table tr:hover td { background: rgba(255,255,255,0.02); }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
  .badge.active { background: rgba(0,200,80,0.15); color: #00C850; }
  .badge.paused { background: rgba(255,184,0,0.15); color: #FFB800; }
  .badge.learning { background: rgba(74,158,255,0.15); color: #4A9EFF; }
  .score-bar { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden; margin-top: 4px; }
  .score-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, #E3000F, #FFB800); }
  .kw-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .kw-tag { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; transition: all 0.2s; color: #bbb; }
  .kw-tag:hover { background: rgba(227,0,15,0.15); border-color: #E3000F; color: #fff; }
  .kw-tag.selected { background: rgba(227,0,15,0.2); border-color: #E3000F; color: #fff; }
  .ad-preview { background: #fff; border-radius: 8px; padding: 16px; font-family: Arial, sans-serif; color: #000; font-size: 13px; border: 1px solid #e0e0e0; }
  .ad-label { font-size: 10px; color: #006621; border: 1px solid #006621; padding: 0 4px; border-radius: 2px; display: inline-block; margin-bottom: 4px; }
  .ad-title { color: #1a0dab; font-size: 18px; font-weight: normal; line-height: 1.3; }
  .ad-url { color: #006621; font-size: 13px; margin: 2px 0; }
  .ad-desc { color: #545454; font-size: 13px; line-height: 1.4; }
  .ad-ext { color: #1a0dab; font-size: 12px; margin-top: 6px; }
  .btn { padding: 9px 20px; border-radius: 8px; border: none; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-primary { background: #E3000F; color: white; }
  .btn-primary:hover { background: #c0000d; transform: translateY(-1px); }
  .btn-secondary { background: rgba(255,255,255,0.07); color: #bbb; border: 1px solid rgba(255,255,255,0.1); }
  .btn-secondary:hover { background: rgba(255,255,255,0.12); color: #fff; }
  .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .toggle { width: 40px; height: 22px; border-radius: 11px; background: rgba(255,255,255,0.1); position: relative; cursor: pointer; transition: background 0.3s; border: none; flex-shrink: 0; }
  .toggle.on { background: #E3000F; }
  .toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: white; transition: transform 0.3s; }
  .toggle.on::after { transform: translateX(18px); }
  .connect-banner { background: linear-gradient(135deg, rgba(227,0,15,0.12), rgba(255,184,0,0.08)); border: 1px dashed rgba(227,0,15,0.35); border-radius: 12px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .thinking-dots span { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #E3000F; margin: 0 2px; animation: bounce 1.2s ease-in-out infinite; }
  .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
  .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
  .chart-bar-wrap { display: flex; align-items: flex-end; gap: 8px; height: 80px; }
  .chart-bar-col { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; }
  .chart-bar { width: 100%; border-radius: 4px 4px 0 0; background: linear-gradient(180deg, #E3000F, rgba(227,0,15,0.3)); min-height: 4px; }
  .chart-bar.gold { background: linear-gradient(180deg, #FFB800, rgba(255,184,0,0.3)); }
  .chart-label { font-size: 10px; color: #555; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
`;

const initialActivity = [
  { type: "success", text: "Smart Bidding adjusted — Splendor+ CPC reduced to ₹18.4 (position improved)", time: "2 min ago" },
  { type: "action", text: "New ad copy generated for 'Hero Xtreme 160R Jaipur' — CTR predicted 7.2%", time: "11 min ago" },
  { type: "info", text: "Keyword 'Hero bike dealer near me' added — search volume 2,400/mo", time: "28 min ago" },
  { type: "warning", text: "Passion Pro campaign budget 80% used — auto-extending by ₹500", time: "1 hr ago" },
  { type: "success", text: "3 new leads captured — Mavrick 440 enquiries from Malviya Nagar", time: "2 hr ago" },
  { type: "action", text: "Negative keyword 'second hand' added to filter low-quality clicks", time: "3 hr ago" },
];

const campaigns = [
  { name: "Hero Splendor+ — Jaipur", status: "active", budget: 800, spend: 612, leads: 14, cpl: 44, score: 87 },
  { name: "Hero HF Deluxe — Economy", status: "active", budget: 600, spend: 441, leads: 9, cpl: 49, score: 78 },
  { name: "Hero Xtreme 160R — Sports", status: "learning", budget: 700, spend: 290, leads: 6, cpl: 48, score: 64 },
  { name: "Hero Mavrick 440 — Premium", status: "active", budget: 500, spend: 388, leads: 5, cpl: 78, score: 72 },
  { name: "Hero Passion Pro — Budget", status: "paused", budget: 400, spend: 320, leads: 7, cpl: 46, score: 81 },
];

const keywords = [
  { text: "Hero bike dealer Jaipur", vol: "4.4K" },
  { text: "new Hero Splendor+ price", vol: "2.9K" },
  { text: "Hero bike on EMI Jaipur", vol: "1.8K" },
  { text: "Hero showroom near me", vol: "3.2K" },
  { text: "Hero Xtreme 160R test ride", vol: "1.1K" },
  { text: "Hero HF Deluxe offer", vol: "2.1K" },
  { text: "Hero Mavrick 440 Jaipur", vol: "890" },
  { text: "best mileage bike 2025", vol: "5.1K" },
];

const adVariants = [
  { title: "Hero Bikes Jaipur – Best Price | Book Test Ride Today", url: "heromotocomp-jaipur.com/splendor-plus", desc: "Authorised Hero MotoCorp Dealer in Jaipur. Splendor+, HF Deluxe, Xtreme 160R & more. EMI from ₹1,499/month. Visit us today!", ext: "📞 Book Test Ride · 🏷️ Exchange Offer · 📍 Directions", score: 92 },
  { title: "Hero Splendor+ Jaipur | ₹0 Down Payment Offer | Limited", url: "heromotocomp-jaipur.com/offers", desc: "Exclusive offers at our Jaipur showroom. Get Hero Splendor+ with zero down payment. 100+ happy customers monthly. Call now!", ext: "💰 Zero Down EMI · 🎁 Free Accessories · ✅ Same Day Delivery", score: 88 },
  { title: "New Hero Bikes in Jaipur | Authorised Dealer | Free Test Ride", url: "heromotocomp-jaipur.com", desc: "Jaipur's trusted Hero bike dealer. All models in stock — Mavrick 440, Xtreme 160R, Passion Pro. Finance in 30 mins. Walk in or call.", ext: "🏍️ All Models · 🔧 After Sales · 🏆 Authorised", score: 85 },
];

const navItems = [
  { icon: "📊", label: "Dashboard", section: "overview" },
  { icon: "🤖", label: "AI Agent", section: "agent" },
  { icon: "📢", label: "Campaigns", section: "campaigns" },
  { icon: "🔑", label: "Keywords", section: "keywords" },
  { icon: "✍️", label: "Ad Creator", section: "adcreator" },
  { icon: "⚙️", label: "Settings", section: "settings" },
];

export default function HeroAdsAgent() {
  const [activeSection, setActiveSection] = useState("overview");
  const [activity, setActivity] = useState(initialActivity);
  const [toggles, setToggles] = useState({ autoBid: true, autoKeyword: true, adRotation: true, budgetFlex: true, negativeKw: true, scheduledAds: false });
  const [selectedKws, setSelectedKws] = useState([0, 1, 2, 3]);
  const [generating, setGenerating] = useState(false);
  const [generatedAd, setGeneratedAd] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([
    { role: "ai", text: "Namaste! I'm your Hero MotoCorp AI Ads Agent for Jaipur. I'm actively managing your 5 campaigns. Today I generated 14 leads at ₹48 CPL. What would you like to optimise?" }
  ]);
  const chatRef = useRef(null);
  const weekLeads = [8, 11, 9, 14, 17, 13, 14];
  const weekSpend = [1400, 1800, 1600, 2050, 2200, 1900, 2051];
  const maxLeads = Math.max(...weekLeads);
  const maxSpend = Math.max(...weekSpend);

  const flipToggle = (key) => setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleKw = (i) => setSelectedKws(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const generateAd = () => {
    setGenerating(true);
    setGeneratedAd(null);
    setTimeout(() => {
      setGeneratedAd(adVariants[Math.floor(Math.random() * adVariants.length)]);
      setGenerating(false);
      setActivity(prev => [{ type: "action", text: "New ad copy generated by AI — predicted CTR 7.1%", time: "just now" }, ...prev.slice(0, 5)]);
    }, 2200);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput("");
    setChatLog(prev => [...prev, { role: "user", text: msg }]);
    setTimeout(() => {
      const lower = msg.toLowerCase();
      let reply = "I'm analysing your campaign data and will optimise accordingly.";
      if (lower.includes("lead")) reply = "Today's CPL is ₹48. Splendor+ has the best CPL at ₹44. I recommend increasing its budget by ₹200 to capture more search volume.";
      else if (lower.includes("budget")) reply = "Your total daily budget is ₹3,000. Currently ₹2,051 spent (68%). Projecting 7-8 more leads by end of day.";
      else if (lower.includes("keyword")) reply = "I found 3 new high-intent keywords: 'Hero bike EMI zero down Jaipur', 'Hero showroom Vaishali Nagar', 'Hero Xtreme 160R on road price'. Should I add them?";
      else if (lower.includes("competitor")) reply = "2 competitor dealers detected bidding on 'Hero Splendor+ Jaipur'. I've increased your max CPC by ₹3 to maintain top 2 position.";
      setChatLog(prev => [...prev, { role: "ai", text: reply }]);
    }, 1200);
  };

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [chatLog]);

  return (
    <>
      <style>{style}</style>
      <div className="app">
        <div className="header">
          <div className="logo">
            <div className="logo-badge">HERO</div>
            <div>
              <div style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 16, letterSpacing: 1 }}>AI Ads Agent</div>
              <div className="logo-sub">Jaipur Dealership</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "#555" }}>Today's Spend: <span style={{ color: HERO_GOLD, fontWeight: 600 }}>₹2,051</span></div>
            <div style={{ fontSize: 13, color: "#555" }}>Leads: <span style={{ color: "#00C850", fontWeight: 600 }}>14</span></div>
            <div className="status-pill"><span className="dot"></span>Agent Active</div>
          </div>
        </div>

        <div className="main">
          <div className="sidebar">
            <div className="budget-card">
              <div className="budget-label">Daily Budget</div>
              <div className="budget-amount">₹3,000</div>
              <div className="budget-bar"><div className="budget-fill" style={{ width: "68%" }}></div></div>
              <div className="budget-sub">₹2,051 spent · ₹949 remaining</div>
            </div>
            <div className="sidebar-section">Navigation</div>
            {navItems.map(item => (
              <div key={item.section} className={`nav-item ${activeSection === item.section ? "active" : ""}`} onClick={() => setActiveSection(item.section)}>
                <span>{item.icon}</span>{item.label}
              </div>
            ))}
            <div className="sidebar-section" style={{ marginTop: 20 }}>Automation</div>
            {Object.entries(toggles).map(([key, val]) => (
              <div style={{ padding: "6px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }} key={key}>
                <div style={{ fontSize: 12, color: val ? "#bbb" : "#555" }}>
                  {{ autoBid: "Smart Bidding", autoKeyword: "Auto Keywords", adRotation: "Ad Rotation", budgetFlex: "Budget Flex", negativeKw: "Negative KW", scheduledAds: "Ad Scheduling" }[key]}
                </div>
                <button className={`toggle ${val ? "on" : ""}`} onClick={() => flipToggle(key)} />
              </div>
            ))}
          </div>

          <div className="content">
            {!apiConnected && (
              <div className="connect-banner">
                <div>
                  <div style={{ fontFamily: "Rajdhani", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>🔗 Connect Your Google Ads Account</div>
                  <div style={{ fontSize: 13, color: "#777" }}>Link your account to let the AI agent manage campaigns automatically</div>
                </div>
                <button className="btn btn-primary" onClick={() => setApiConnected(true)}>Connect Account →</button>
              </div>
            )}
            {apiConnected && (
              <div style={{ background: "rgba(0,200,80,0.08)", border: "1px solid rgba(0,200,80,0.2)", borderRadius: 10, padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <span>✅</span>
                <span style={{ fontSize: 13, color: "#aaa" }}>Google Ads account <strong style={{ color: "#fff" }}>HeroJaipurDealer-7842</strong> connected</span>
                <button className="btn btn-secondary" style={{ marginLeft: "auto", padding: "4px 12px", fontSize: 12 }} onClick={() => setApiConnected(false)}>Disconnect</button>
              </div>
            )}

            {activeSection === "overview" && (
              <>
                <div className="page-title">Campaign Dashboard</div>
                <div className="page-sub">AI Agent is actively managing your Hero MotoCorp ads in Jaipur</div>
                <div className="metrics">
                  <div className="metric-card red"><span className="metric-icon">🎯</span><div className="metric-label">Leads Today</div><div className="metric-value">14</div><div className="metric-change up">↑ 28% vs yesterday</div></div>
                  <div className="metric-card gold"><span className="metric-icon">💰</span><div className="metric-label">Cost Per Lead</div><div className="metric-value">₹48</div><div className="metric-change up">↓ ₹6 improved</div></div>
                  <div className="metric-card green"><span className="metric-icon">👁</span><div className="metric-label">Impressions</div><div className="metric-value">8.4K</div><div className="metric-change up">↑ 12% this week</div></div>
                  <div className="metric-card blue"><span className="metric-icon">🖱</span><div className="metric-label">Avg CTR</div><div className="metric-value">6.8%</div><div className="metric-change up">↑ Industry: 3.2%</div></div>
                </div>
                <div className="three-col">
                  <div className="card">
                    <div className="card-title"><span>📅</span> Weekly Performance</div>
                    <div style={{ display: "flex", gap: 24, marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#777" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: HERO_RED }}></div>Leads</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#777" }}><div style={{ width: 10, height: 10, borderRadius: 2, background: HERO_GOLD }}></div>Spend (÷100)</div>
                    </div>
                    <div className="chart-bar-wrap">
                      {weekLeads.map((v, i) => (
                        <div className="chart-bar-col" key={i}>
                          <div style={{ display: "flex", gap: 3, alignItems: "flex-end", flex: 1, width: "100%" }}>
                            <div className="chart-bar" style={{ height: `${(v / maxLeads) * 70}px`, flex: 1 }}></div>
                            <div className="chart-bar gold" style={{ height: `${(weekSpend[i] / maxSpend) * 70}px`, flex: 1 }}></div>
                          </div>
                          <div className="chart-label">{["M","T","W","T","F","S","S"][i]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-title"><span>📍</span> Top Locations</div>
                    {[["Malviya Nagar", 22], ["C-Scheme", 18], ["Vaishali Nagar", 15], ["Mansarovar", 12], ["Tonk Road", 9]].map(([loc, pct]) => (
                      <div key={loc} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginBottom: 3 }}><span>{loc}</span><span style={{ color: HERO_GOLD }}>{pct}%</span></div>
                        <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2 }}><div style={{ height: "100%", width: `${pct * 4}%`, background: `linear-gradient(90deg, ${HERO_RED}, ${HERO_GOLD})`, borderRadius: 2 }}></div></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title"><span>🤖</span> AI Agent Activity Log</div>
                  <div className="activity-feed">
                    {activity.map((a, i) => (
                      <div className={`activity-item ${a.type}`} key={i}>
                        <div className={`activity-dot ${a.type}`}></div>
                        <div><div className="activity-text">{a.text}</div><div className="activity-time">{a.time}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeSection === "agent" && (
              <>
                <div className="page-title">🤖 AI Ads Agent</div>
                <div className="page-sub">Talk to your agent — ask it to optimise, create ads, adjust budgets</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <div className="card" style={{ display: "flex", flexDirection: "column", height: 480 }}>
                    <div className="card-title"><span>💬</span> Agent Chat</div>
                    <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                      {chatLog.map((msg, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px", background: msg.role === "user" ? HERO_RED : "rgba(255,255,255,0.06)", fontSize: 13, lineHeight: 1.5, color: "#fff" }}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Ask about leads, budget, keywords..." style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: "DM Sans, sans-serif", outline: "none" }} />
                      <button className="btn btn-primary" onClick={sendChat}>Send</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div className="card">
                      <div className="card-title"><span>⚡</span> Quick Actions</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { label: "🚀 Boost top campaign for 24hrs", msg: "Boosted Splendor+ campaign by ₹300 for today" },
                          { label: "💡 Generate new ad copies", msg: "Generating 3 new ad variants using AI..." },
                          { label: "🔑 Add recommended keywords", msg: "Added 5 high-intent keywords to campaigns" },
                          { label: "🚫 Update negative keywords", msg: "Added 12 negative keywords to reduce waste" },
                          { label: "📊 Run competitor analysis", msg: "Analysing competitor bids in Jaipur area..." },
                        ].map((item, i) => (
                          <button key={i} className="btn btn-secondary" style={{ textAlign: "left", padding: "10px 14px" }} onClick={() => setActivity(prev => [{ type: "action", text: item.msg, time: "just now" }, ...prev.slice(0, 5)])}>{item.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSection === "campaigns" && (
              <>
                <div className="page-title">Campaigns</div>
                <div className="page-sub">AI manages bids, budgets and ad rotation automatically</div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <button className="btn btn-primary" onClick={() => setActivity(prev => [{ type: "action", text: "New campaign created by AI for Hero Glamour — Jaipur", time: "just now" }, ...prev])}>+ Create Campaign</button>
                </div>
                <div className="card">
                  <table className="table">
                    <thead><tr><th>Campaign</th><th>Status</th><th>Budget</th><th>Spend</th><th>Leads</th><th>CPL</th><th>AI Score</th></tr></thead>
                    <tbody>
                      {campaigns.map((c, i) => (
                        <tr key={i}>
                          <td style={{ color: "#ddd", fontWeight: 500 }}>{c.name}</td>
                          <td><span className={`badge ${c.status}`}>{c.status}</span></td>
                          <td>₹{c.budget}/day</td>
                          <td style={{ color: HERO_GOLD }}>₹{c.spend}</td>
                          <td style={{ color: "#00C850" }}>{c.leads}</td>
                          <td>₹{c.cpl}</td>
                          <td><div style={{ fontSize: 12, color: c.score > 80 ? "#00C850" : c.score > 65 ? HERO_GOLD : HERO_RED }}>{c.score}/100</div><div className="score-bar"><div className="score-fill" style={{ width: `${c.score}%` }}></div></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeSection === "keywords" && (
              <>
                <div className="page-title">Keyword Manager</div>
                <div className="page-sub">AI discovers and adds high-intent keywords automatically</div>
                <div className="two-col">
                  <div className="card">
                    <div className="card-title"><span>💡</span> AI Suggested Keywords</div>
                    <div className="kw-list">
                      {keywords.map((kw, i) => (
                        <div key={i} className={`kw-tag ${selectedKws.includes(i) ? "selected" : ""}`} onClick={() => toggleKw(i)}>
                          {selectedKws.includes(i) ? "✓ " : "+ "}{kw.text}<span style={{ fontSize: 10, color: "#666" }}>{kw.vol}/mo</span>
                        </div>
                      ))}
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActivity(prev => [{ type: "success", text: `${selectedKws.length} keywords added to campaigns by AI`, time: "just now" }, ...prev])}>
                      Add Selected ({selectedKws.length}) to Campaigns
                    </button>
                  </div>
                  <div className="card">
                    <div className="card-title"><span>🚫</span> Negative Keywords</div>
                    <div className="kw-list">
                      {["second hand", "used bike", "repair", "spare parts", "bajaj", "yamaha", "honda", "free"].map((kw, i) => (
                        <div key={i} className="kw-tag" style={{ borderColor: "rgba(227,0,15,0.2)", color: "#E3000F88", background: "rgba(227,0,15,0.05)" }}>🚫 {kw}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeSection === "adcreator" && (
              <>
                <div className="page-title">AI Ad Creator</div>
                <div className="page-sub">Generate high-converting Google Search ads instantly</div>
                <div style={{ background: "rgba(227,0,15,0.06)", border: "1px solid rgba(227,0,15,0.2)", borderRadius: 10, padding: 16, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 13, color: "#bbb" }}>AI creates ads optimised for <strong style={{ color: "#fff" }}>Hero MotoCorp Jaipur</strong></div>
                  <button className="btn btn-primary" onClick={generateAd} disabled={generating}>
                    {generating ? <span className="thinking-dots"><span></span><span></span><span></span></span> : "✨ Generate Ad Copy"}
                  </button>
                </div>
                {generatedAd && (
                  <div className="two-col" style={{ alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: 12, color: "#555", marginBottom: 8 }}>PREVIEW — How it looks on Google</div>
                      <div className="ad-preview">
                        <div className="ad-label">Ad</div>
                        <div className="ad-title">{generatedAd.title}</div>
                        <div className="ad-url">🌐 {generatedAd.url}</div>
                        <div className="ad-desc">{generatedAd.desc}</div>
                        <div className="ad-ext">{generatedAd.ext}</div>
                      </div>
                    </div>
                    <div className="card">
                      <div className="card-title">Ad Quality</div>
                      {[["Quality Score", `${generatedAd.score}/100`], ["Predicted CTR", "7.1%"], ["Ad Strength", "Excellent"]].map(([l, v]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
                          <span style={{ color: "#777" }}>{l}</span><span style={{ color: "#00C850" }}>{v}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setActivity(prev => [{ type: "success", text: "Ad published to Google Ads — going live in ~10 mins", time: "just now" }, ...prev])}>Publish Ad</button>
                        <button className="btn btn-secondary" onClick={generateAd}>Regenerate</button>
                      </div>
                    </div>
                  </div>
                )}
                {!generatedAd && !generating && (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "#444" }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
                    <div style={{ fontSize: 15 }}>Click "Generate Ad Copy" to create your first AI-powered ad</div>
                  </div>
                )}
              </>
            )}

            {activeSection === "settings" && (
              <>
                <div className="page-title">Settings</div>
                <div className="page-sub">Configure your AI agent behaviour and budget rules</div>
                <div className="two-col">
                  <div className="card">
                    <div className="card-title"><span>💰</span> Budget Rules</div>
                    {[["Daily Budget Cap", "₹3,000"], ["Monthly Budget Cap", "₹90,000"], ["Max Cost Per Lead", "₹120"], ["Budget Flex Limit", "+20%"]].map(([l, v]) => (
                      <div key={l} className="toggle-row">
                        <div style={{ fontSize: 13, color: "#bbb" }}>{l}</div>
                        <div style={{ fontFamily: "Rajdhani", fontSize: 18, fontWeight: 600, color: HERO_GOLD }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <div className="card-title"><span>🤖</span> AI Behaviour</div>
                    {[
                      { key: "autoBid", label: "Auto Smart Bidding", sub: "AI adjusts bids in real-time" },
                      { key: "autoKeyword", label: "Auto Keyword Discovery", sub: "Add new keywords automatically" },
                      { key: "adRotation", label: "Automatic Ad Rotation", sub: "Best-performing ads shown more" },
                      { key: "budgetFlex", label: "Budget Flexibility", sub: "Use unspent budget on good days" },
                      { key: "negativeKw", label: "Auto Negative Keywords", sub: "Remove irrelevant search terms" },
                      { key: "scheduledAds", label: "Ad Scheduling", sub: "Show ads at peak hours only" },
                    ].map(({ key, label, sub }) => (
                      <div key={key} className="toggle-row">
                        <div><div style={{ fontSize: 13, color: "#bbb" }}>{label}</div><div style={{ fontSize: 11, color: "#555" }}>{sub}</div></div>
                        <button className={`toggle ${toggles[key] ? "on" : ""}`} onClick={() => flipToggle(key)} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}