import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button';
import Modal from '../../components/Modal';

export default function SalaryManagement() {
  const { session, profile, refreshProfile } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [cycle, setCycle] = useState<any>(null);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ employee_id: '', amount: '', note: '' });

  const fetchCycle = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/get-cycle?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCycle(data.cycle);
      setEarnings(data.earnings || []);
      setPayments(data.payments || []);
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCycle(); }, []);

  const handleLock = async () => {
    if (!session) return;
    if (!confirm(`Lock salary for ${year}-${String(month).padStart(2,'0')}? This is irreversible.`)) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lock-salary', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ year, month }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lock failed');
      alert('Salary cycle locked');
      fetchCycle();
    } catch (err) {
      console.error(err);
      alert(String(err));
    } finally { setLoading(false); }
  };

  const openPayment = (employee_id = '') => { setPaymentData({ employee_id, amount: '', note: '' }); setShowPaymentModal(true); };

  const submitPayment = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/add-payment', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ cycle_id: cycle?.id, employee_id: paymentData.employee_id, amount: paymentData.amount, note: paymentData.note }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');
      alert('Payment recorded');
      setShowPaymentModal(false);
      fetchCycle();
    } catch (err) { console.error(err); alert(String(err)); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <select value={year} onChange={e=>setYear(Number(e.target.value))} className="px-3 py-2 border rounded">
          {Array.from({length:5}).map((_,i)=>{
            const y = new Date().getFullYear()-2+i; return <option key={y} value={y}>{y}</option>;
          })}
        </select>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="px-3 py-2 border rounded">
          {Array.from({length:12}).map((_,i)=> <option key={i+1} value={i+1}>{i+1}</option>)}
        </select>
        <Button onClick={fetchCycle} variant="secondary">Load</Button>
        {!cycle && <Button onClick={handleLock} variant="primary">Lock Salary Cycle</Button>}
      </div>

      {loading && <div>Loading...</div>}

      {cycle ? (
        <div>
          <h3 className="text-lg font-semibold">Salary Cycle: {cycle.year}-{String(cycle.month).padStart(2,'0')}</h3>
          <p>Locked at: {cycle.locked_at || '—'}</p>
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-semibold">Cycle not locked yet</h3>
        </div>
      )}

      <div>
        <h4 className="font-medium">Earnings</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr><th>Employee</th><th>Monthly Salary</th><th>Per Day</th><th>Eligible Days</th><th>Gross Earned</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {earnings.map(e=> (
                <tr key={e.id} className="border-b"><td>{e.employee_id}</td><td>{e.monthly_salary}</td><td>{e.per_day_salary}</td><td>{e.total_eligible_working_days}</td><td>{e.gross_earned}</td><td><Button onClick={()=>openPayment(e.employee_id)} variant="secondary">Add Payment</Button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="font-medium">Payments</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th>Employee</th><th>Amount</th><th>Paid At</th><th>Note</th></tr></thead>
            <tbody>{payments.map(p=> <tr key={p.id} className="border-b"><td>{p.employee_id}</td><td>{p.amount}</td><td>{p.paid_at}</td><td>{p.note}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showPaymentModal} onClose={()=>setShowPaymentModal(false)} title="Record Payment">
        <div className="space-y-3">
          <div>
            <label className="block text-sm">Employee ID</label>
            <input className="w-full border px-2 py-1" value={paymentData.employee_id} onChange={e=>setPaymentData({...paymentData, employee_id: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm">Amount</label>
            <input className="w-full border px-2 py-1" value={paymentData.amount} onChange={e=>setPaymentData({...paymentData, amount: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm">Note</label>
            <input className="w-full border px-2 py-1" value={paymentData.note} onChange={e=>setPaymentData({...paymentData, note: e.target.value})} />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={()=>setShowPaymentModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitPayment}>Submit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
