import { useEffect, useMemo, useRef, useState } from "react";
import { loadMonth, saveMonth } from "@/lib/firebase";

/**
 * Handles loading + saving month data (localStorage + Firestore when signed in)
 * Returns: { state, setState, totals }
 */
export default function useMonthData(user, monthKey) {
  const [state, setState] = useState({
    incomeSources: [],
    expenses: [],
    catBudgets: {},
    categories: [],
  });

  // 1) Load LOCAL immediately when month changes
  useEffect(() => {
    const raw = localStorage.getItem(`expense-tracker:${monthKey}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setState({
          incomeSources: parsed.incomeSources || [],
          expenses: parsed.expenses || [],
          catBudgets: parsed.catBudgets || {},
          categories: parsed.categories || [],
        });
      } catch {
        setState({ incomeSources: [], expenses: [], catBudgets: {}, categories: [] });
      }
    } else {
      setState({ incomeSources: [], expenses: [], catBudgets: {}, categories: [] });
    }
  }, [monthKey]);

  // 2) If signed in, try cloud and replace state if document exists
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      const cloud = await loadMonth(user.uid, monthKey);
      if (alive && cloud) {
        setState({
          incomeSources: cloud.incomeSources || [],
          expenses: cloud.expenses || [],
          catBudgets: cloud.catBudgets || {},
          categories: cloud.categories || state.categories || [],
        });
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, monthKey]);

  // 3) Save to LOCAL anytime state changes
  useEffect(() => {
    const payload = JSON.stringify(state);
    localStorage.setItem(`expense-tracker:${monthKey}`, payload);
  }, [state, monthKey]);

  // 4) Debounced save to CLOUD when signed in
  const timer = useRef(null);
  useEffect(() => {
    if (!user) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      // also store categories in the cloud
      saveMonth(user.uid, monthKey, state).catch(() => {});
    }, 500);
    return () => clearTimeout(timer.current);
  }, [user, monthKey, state]);

  // 5) Derived totals
  const totals = useMemo(() => {
    const income = (state.incomeSources || []).reduce(
      (s, i) => s + (Number(i.amount) || 0),
      0
    );
    const totalExp = (state.expenses || []).reduce(
      (s, e) => s + (Number(e.amount) || 0),
      0
    );
    const remaining = income - totalExp;
    const util = income > 0 ? Math.min(100, Math.round((totalExp / income) * 100)) : 0;

    const byCatMap = (state.expenses || []).reduce((acc, e) => {
      const k = e.category || "Other";
      acc[k] = (acc[k] || 0) + (Number(e.amount) || 0);
      return acc;
    }, {});
    const byCat = Object.entries(byCatMap)
      .map(([name, value]) => ({
        name,
        value,
        budget: Number(state.catBudgets?.[name]) || 0,
      }))
      .sort((a, b) => b.value - a.value);

    return { income, totalExp, remaining, util, byCat };
  }, [state]);

  return { state, setState, totals };
}