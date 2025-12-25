import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SectionCard } from '../../components/Card';
import Button from '../../components/Button';

export default function Salary() {
  const { profile } = useAuth();
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadSalary();
  }, [profile]);

  const loadSalary = async () => {
    setLoading(true);
    try {
      const [earnRes, payRes] = await Promise.all([
        supabase
          .from('salary_earnings')
          .select('id,cycle_id,monthly_salary,total_eligible_working_days,per_day_salary,gross_earned,created_at')
          .eq('employee_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(12),
        supabase
          .from('salary_payments')
          .select('id,cycle_id,amount,paid_at,note')
          .eq('employee_id', profile!.id)
          .order('paid_at', { ascending: false })
          .limit(50),
      ]);
      setEarnings(earnRes.data || []);
      setPayments(payRes.data || []);
    } catch (err) {
      console.error('Error loading salary data', err);
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Salaries</h2>
        <Button onClick={loadSalary}>Refresh</Button>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded shadow-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SectionCard title="Recent Earnings">
            {earnings.length === 0 && <p className="text-sm text-gray-500">No salary records found.</p>}
            {earnings.map((e) => (
              <div key={e.id} className="border-b py-3">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">Cycle: {e.cycle_id}</div>
                    <div className="text-sm text-gray-500">Monthly: {e.monthly_salary}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₹{e.gross_earned}</div>
                    <div className="text-sm text-gray-500">Days: {e.total_eligible_working_days}</div>
                  </div>
                </div>
              </div>
            ))}
          </SectionCard>

          <SectionCard title="Payments / Payouts">
            {payments.length === 0 && <p className="text-sm text-gray-500">No payments recorded.</p>}
            {payments.map((p) => (
              <div key={p.id} className="border-b py-3">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">Paid: ₹{p.amount}</div>
                    <div className="text-sm text-gray-500">Note: {p.note || '-'}</div>
                  </div>
                  <div className="text-sm text-gray-500">{new Date(p.paid_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
