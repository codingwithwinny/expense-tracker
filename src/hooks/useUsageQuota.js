import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const DAILY_LIMITS = { insights: 3, parse: 10, statement: 3 };

export function useUsageQuota(userId) {
  const [dailyData, setDailyData] = useState({
    insightsCalls: 0,
    parseCalls: 0,
    statementCalls: 0,
    totalCostUSD: 0,
  });
  const [monthlyData, setMonthlyData] = useState({
    insightsCalls: 0,
    parseCalls: 0,
    statementCalls: 0,
    totalCostUSD: 0,
  });

  useEffect(() => {
    if (!userId) return;
    const todayKey = new Date().toISOString().split("T")[0];
    const monthKey = todayKey.substring(0, 7);

    const dailyRef = doc(db, "users", userId, "usage", todayKey);
    const monthlyRef = doc(db, "users", userId, "usageMonthly", monthKey);

    const unsubDaily = onSnapshot(dailyRef, (snap) => {
      const d = snap.exists() ? snap.data() : {};
      setDailyData({
        insightsCalls: d.insightsCalls || 0,
        parseCalls: d.parseCalls || 0,
        statementCalls: d.statementCalls || 0,
        totalCostUSD: d.totalCostUSD || 0,
      });
    });

    const unsubMonthly = onSnapshot(monthlyRef, (snap) => {
      const d = snap.exists() ? snap.data() : {};
      setMonthlyData({
        insightsCalls: d.insightsCalls || 0,
        parseCalls: d.parseCalls || 0,
        statementCalls: d.statementCalls || 0,
        totalCostUSD: d.totalCostUSD || 0,
      });
    });

    return () => {
      unsubDaily();
      unsubMonthly();
    };
  }, [userId]);

  const usage = {
    insights: dailyData.insightsCalls,
    parse: dailyData.parseCalls,
    statement: dailyData.statementCalls,
  };

  const remaining = {
    insights: Math.max(0, DAILY_LIMITS.insights - usage.insights),
    parse: Math.max(0, DAILY_LIMITS.parse - usage.parse),
    statement: Math.max(0, DAILY_LIMITS.statement - usage.statement),
  };

  return {
    usage,
    remaining,
    limits: DAILY_LIMITS,
    costToday: dailyData.totalCostUSD,
    costMonth: monthlyData.totalCostUSD,
    monthlyUsage: {
      insights: monthlyData.insightsCalls,
      parse: monthlyData.parseCalls,
      statement: monthlyData.statementCalls,
    },
  };
}
