// src/hooks/useMonthData.js
import { useEffect, useMemo, useRef, useState } from "react";
import { loadMonth, saveMonth } from "@/lib/firebase";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

/**
 * Loads & saves month data (localStorage + Firestore when signed in),
 * and performs a one-time "first-sync" merge:
 *  - If cloud is empty and local has data -> push local up to cloud.
 *  - If local is empty and cloud has data -> pull cloud down to local.
 */
export default function useMonthData(user, monthKey) {
  const [state, setState] = useState({
    incomeSources: [],
    expenses: [],
    catBudgets: {},
    categories: [],
  });

  // --- 1) Load LOCAL immediately when the month changes (only if user is authenticated)
  useEffect(() => {
    if (!user) {
      setState({
        incomeSources: [],
        expenses: [],
        catBudgets: {},
        categories: DEFAULT_CATEGORIES,
      });
      return;
    }

    const raw = localStorage.getItem(`expense-tracker:${monthKey}`);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setState({
          incomeSources: parsed.incomeSources || [],
          expenses: parsed.expenses || [],
          catBudgets: parsed.catBudgets || {},
          categories:
            Array.isArray(parsed.categories) && parsed.categories.length
              ? parsed.categories
              : DEFAULT_CATEGORIES,
        });
      } catch {
        setState({
          incomeSources: [],
          expenses: [],
          catBudgets: {},
          categories: DEFAULT_CATEGORIES,
        });
      }
    } else {
      setState({
        incomeSources: [],
        expenses: [],
        catBudgets: {},
        categories: DEFAULT_CATEGORIES,
      });
    }
  }, [monthKey, user]);

  // --- 2) If signed in, load CLOUD and reconcile with LOCAL (first-sync)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;

      // Snapshot of local when we attempt cloud load
      const localAtLoad = state;

      const cloud = await loadMonth(user.uid, monthKey); // returns a complete shape

      if (!alive) return;

      const localEmpty =
        (localAtLoad.incomeSources?.length || 0) === 0 &&
        (localAtLoad.expenses?.length || 0) === 0 &&
        Object.keys(localAtLoad.catBudgets || {}).length === 0 &&
        (localAtLoad.categories?.length || 0) === 0;

      const cloudEmpty =
        (cloud.incomeSources?.length || 0) === 0 &&
        (cloud.expenses?.length || 0) === 0 &&
        Object.keys(cloud.catBudgets || {}).length === 0 &&
        (cloud.categories?.length || 0) === 0;

      if (cloudEmpty && !localEmpty) {
        // First sign-in on this device/month: seed cloud with LOCAL
        await saveMonth(user.uid, monthKey, localAtLoad);
        setState(localAtLoad);
      } else if (!cloudEmpty && localEmpty) {
        // Local is empty but cloud has data: adopt CLOUD
        setState(cloud);
      } else {
        // Both have something or both empty: choose CLOUD as source of truth
        setState(cloud);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, monthKey]);

  // --- 3) Save to LOCAL whenever state changes (only if user is authenticated)
  useEffect(() => {
    if (user) {
      localStorage.setItem(`expense-tracker:${monthKey}`, JSON.stringify(state));
    }
  }, [state, monthKey, user]);

  // --- 4) Debounced save to CLOUD when signed in
  const timer = useRef(null);
  useEffect(() => {
    if (!user) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveMonth(user.uid, monthKey, state).catch(() => {});
    }, 400);
    return () => clearTimeout(timer.current);
  }, [user, monthKey, state]);

  // --- 5) Derived totals
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
    const util =
      income > 0 ? Math.min(100, Math.round((totalExp / income) * 100)) : 0;

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
