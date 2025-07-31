import React, { useState, useEffect } from 'react';
import './App.css';
import mockFirebase from './mockFirebase';

const App = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: 0,
    paidBy: '',
    splitWith: [],
    splitType: 'equal',
    customAmounts: {}
  });
  const [expenses, setExpenses] = useState([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [paymentConfirmations, setPaymentConfirmations] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setCurrentUser(savedUser);

    mockFirebase.get('members').then(members => setAvailableUsers(members || []));
    mockFirebase.get('expenses').then(setExpenses);
    mockFirebase.get('confirmations').then(setPaymentConfirmations);
    setLoading(false);
  }, []);

  const handleSelectUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', user);
  };

  const handleAddExpense = async () => {
    const { description, amount, paidBy, splitWith, splitType, customAmounts } = newExpense;
    if (!description || !amount || !paidBy || splitWith.length === 0) return alert("Vui lòng nhập đầy đủ thông tin!");

    if (splitType === 'custom') {
      const totalCustom = Object.values(customAmounts || {}).reduce((sum, val) => sum + Number(val || 0), 0);
      if (Math.abs(totalCustom - amount) > 0.01) return alert(`Tổng custom (${totalCustom}) không khớp tổng (${amount}).`);
    }

    const updated = [...expenses, newExpense];
    await mockFirebase.set('expenses', updated);
    setExpenses(updated);
    setNewExpense({ description: '', amount: 0, paidBy: '', splitWith: [], splitType: 'equal', customAmounts: {} });
    alert("Đã lưu bữa ăn!");
  };

  const handleTransfer = async (from, to, txProof) => {
    const updated = [...paymentConfirmations, { from, to, proof: txProof || '', confirmed: false }];
    await mockFirebase.set('confirmations', updated);
    setPaymentConfirmations(updated);
  };

  const handleConfirm = async (from, to) => {
    const updated = paymentConfirmations.map(c =>
      c.from === from && c.to === to ? { ...c, confirmed: true } : c
    );
    await mockFirebase.set('confirmations', updated);
    setPaymentConfirmations(updated);
  };

  const debts = {};
  expenses.forEach(exp => {
    const share = exp.splitType === 'equal' ? exp.amount / exp.splitWith.length : 0;
    exp.splitWith.forEach(user => {
      const amount = exp.splitType === 'equal' ? share : exp.customAmounts?.[user] || 0;
      if (user !== exp.paidBy) {
        debts[user] = debts[user] || {};
        debts[user][exp.paidBy] = (debts[user][exp.paidBy] || 0) + amount;
      }
    });
  });

  const isConfirmed = (from, to) => paymentConfirmations.find(c => c.from === from && c.to === to && c.confirmed);
  const isPending = (from, to) => paymentConfirmations.find(c => c.from === from && c.to === to && !c.confirmed);

  const summary = {};
  Object.entries(debts).forEach(([from, creditors]) => {
    Object.entries(creditors).forEach(([to, amount]) => {
      summary[from] = summary[from] || { needToPay: 0, paid: 0 };
      summary[from].needToPay += amount;
      const confirmedTx = paymentConfirmations.find(c => c.from === from && c.to === to && c.confirmed);
      if (confirmedTx) summary[from].paid += amount;

      summary[to] = summary[to] || { toReceive: 0, received: 0 };
      summary[to].toReceive += amount;
      if (confirmedTx) summary[to].received += amount;
    });
  });

  if (loading) return <div className="p-4">Đang tải...</div>;

  if (!currentUser) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-2">Chọn người dùng:</h2>
        {availableUsers.map((user, idx) => (
          <button key={idx} className="bg-blue-500 text-white px-4 py-2 rounded mr-2" onClick={() => handleSelectUser(user)}>
            {user}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Chào {currentUser}</h1>

      {/* Thêm bữa ăn */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Thêm bữa ăn</h2>
        <input placeholder="Mô tả" className="border w-full px-2 py-1 mb-2" value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} />
        <input type="number" placeholder="Tổng tiền" className="border w-full px-2 py-1 mb-2" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: Number(e.target.value) })} />
        <select className="w-full border px-2 py-1 mb-2" value={newExpense.paidBy} onChange={e => setNewExpense({ ...newExpense, paidBy: e.target.value })}>
          <option value="">-- Ai trả? --</option>
          {availableUsers.map((user, idx) => <option key={idx} value={user}>{user}</option>)}
        </select>
        <div className="mb-2">
          <label className="font-semibold">Những ai tham gia?</label>
          <div className="flex flex-wrap gap-2">
            {availableUsers.map((user, idx) => (
              <label key={idx} className="flex items-center gap-1">
                <input type="checkbox" checked={newExpense.splitWith.includes(user)} onChange={() => {
                  const updated = newExpense.splitWith.includes(user)
                    ? newExpense.splitWith.filter(u => u !== user)
                    : [...newExpense.splitWith, user];
                  setNewExpense({ ...newExpense, splitWith: updated });
                }} /> {user}
              </label>
            ))}
          </div>
        </div>
        <div className="mb-2">
          <label><input type="radio" name="splitType" value="equal" checked={newExpense.splitType === 'equal'} onChange={() => setNewExpense({ ...newExpense, splitType: 'equal', customAmounts: {} })} /> Chia đều</label>
          <label className="ml-4"><input type="radio" name="splitType" value="custom" checked={newExpense.splitType === 'custom'} onChange={() => setNewExpense({ ...newExpense, splitType: 'custom' })} /> Nhập tay</label>
        </div>
        {newExpense.splitType === 'custom' && newExpense.splitWith.map((user, idx) => (
          <div key={idx} className="flex gap-2 items-center mb-1">
            <span className="w-24">{user}</span>
            <input type="number" className="border px-2 py-1 w-32" value={newExpense.customAmounts?.[user] || ''} onChange={(e) => setNewExpense({
              ...newExpense,
              customAmounts: { ...newExpense.customAmounts, [user]: Number(e.target.value) }
            })} />
          </div>
        ))}
        <button className="bg-green-500 text-white px-4 py-2 rounded mt-2" onClick={handleAddExpense}>Lưu bữa ăn</button>
      </div>

      {/* Lịch sử bữa ăn */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Lịch sử bữa ăn</h2>
        {expenses.length === 0 ? <p>Chưa có dữ liệu</p> : (
          <ul className="space-y-1">
            {expenses.map((e, idx) => (
              <li key={idx} className="border p-2 rounded">
                <strong>{e.description}</strong> - {e.amount}đ, trả bởi {e.paidBy}, chia cho {e.splitWith.join(', ')}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dashboard nợ */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Dashboard nợ</h2>
        {Object.entries(debts).map(([debtor, creditors], i) => (
          Object.entries(creditors).map(([creditor, amount], j) => {
            if (isConfirmed(debtor, creditor)) return null;
            const pending = isPending(debtor, creditor);
            return (
              <div key={`${i}-${j}`} className="flex justify-between items-center border px-3 py-2 mb-1 rounded">
                <span>{debtor} nợ {creditor}: {amount.toLocaleString()}đ</span>
                {currentUser === debtor && !pending && (
                  <button className="text-blue-600" onClick={() => {
                    const proof = prompt("Nhập mô tả hoặc mã giao dịch (không bắt buộc):");
                    handleTransfer(debtor, creditor, proof);
                  }}>Đã chuyển khoản</button>
                )}
                {currentUser === creditor && pending && (
                  <button className="text-green-600" onClick={() => handleConfirm(debtor, creditor)}>Đã nhận</button>
                )}
              </div>
            );
          })
        ))}
      </div>

      {/* Quản lý thành viên */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Quản lý thành viên</h2>
        <div className="flex gap-2 mb-4">
          <input className="border px-2 py-1 w-full" placeholder="Tên thành viên mới" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} />
          <button className="bg-blue-500 text-white px-4 py-1 rounded" onClick={async () => {
            if (!newMemberName.trim()) return alert("Nhập tên");
            if (availableUsers.includes(newMemberName.trim())) return alert("Đã tồn tại");
            const updated = [...availableUsers, newMemberName.trim()];
            await mockFirebase.set('members', updated);
            setAvailableUsers(updated);
            setNewMemberName('');
          }}>Thêm</button>
        </div>
        <ul className="space-y-1">
          {availableUsers.map((user, idx) => (
            <li key={idx} className="flex justify-between items-center border px-2 py-1 rounded">
              <span>{user}</span>
              <button className="text-red-600 text-sm" onClick={async () => {
                if (!window.confirm(`Xóa ${user}?`)) return;
                const updated = availableUsers.filter(u => u !== user);
                await mockFirebase.set('members', updated);
                setAvailableUsers(updated);
                if (user === currentUser) {
                  localStorage.removeItem('currentUser');
                  setCurrentUser(null);
                }
              }}>Xóa</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Tổng kết công nợ */}
      <div className="border p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Tổng kết công nợ</h2>
        {Object.entries(summary).map(([user, s], idx) => (
          <div key={idx} className="mb-2">
            <p className="font-semibold">{user}:</p>
            {s.needToPay !== undefined && (
              <p>- Cần trả: {s.needToPay.toLocaleString()}đ, đã trả: {s.paid.toLocaleString()}đ, còn nợ: {(s.needToPay - s.paid).toLocaleString()}đ</p>
            )}
            {s.toReceive !== undefined && (
              <p>- Sẽ nhận: {s.toReceive.toLocaleString()}đ, đã nhận: {s.received.toLocaleString()}đ, còn lại: {(s.toReceive - s.received).toLocaleString()}đ</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
