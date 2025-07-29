import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

import React, { useState, useEffect } from 'react';
import { Users, Plus, History, CreditCard, Check, Clock, ArrowRight, Settings, User, Edit3, Trash2, UserPlus, Wifi, WifiOff } from 'lucide-react';

const mockFirebase = {
  data: {
    members: ['Minh', 'Lan', 'Hùng', 'Linh', 'Nam'],
    expenses: [],
    debts: []
  },
  async get(path) {
    const data = JSON.parse(localStorage.getItem('teamExpenseData') || '{}');
    return data[path] || this.data[path];
  },
  async set(path, value) {
    const data = JSON.parse(localStorage.getItem('teamExpenseData') || '{}');
    data[path] = value;
    localStorage.setItem('teamExpenseData', JSON.stringify(data));
    await new Promise(resolve => setTimeout(resolve, 500));
    if (window.firebaseListeners && window.firebaseListeners[path]) {
      window.firebaseListeners[path].forEach(callback => callback(value));
    }
  },
  onValue(path, callback) {
    if (!window.firebaseListeners) window.firebaseListeners = {};
    if (!window.firebaseListeners[path]) window.firebaseListeners[path] = [];
    window.firebaseListeners[path].push(callback);
    this.get(path).then(callback);
  }
};

const TeamExpenseTracker = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [currentUser, setCurrentUser] = useState('');
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(true);

  const [newMemberName, setNewMemberName] = useState('');
  const [editingMember, setEditingMember] = useState(null);
  const [editMemberName, setEditMemberName] = useState('');

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    paidBy: '',
    splitType: 'equal',
    splitWith: [],
    customAmounts: {}
  });

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      mockFirebase.onValue('members', (data) => setMembers(data || []));
      mockFirebase.onValue('expenses', (data) => setExpenses(data || []));
      setLoading(false);
    };
    initializeData();
    const connectionInterval = setInterval(() => {
      setConnected(Math.random() > 0.1);
    }, 5000);
    return () => clearInterval(connectionInterval);
  }, []);

  useEffect(() => {
    if (expenses.length > 0) {
      calculateDebts();
    }
  }, [expenses]);
    const calculateDebts = async () => {
    const debtMap = {};
    expenses.forEach(expense => {
      expense.splitWith.forEach(person => {
        if (person !== expense.paidBy) {
          const amount = expense.splitType === 'equal'
            ? expense.amount / expense.splitWith.length
            : expense.customAmounts[person] || 0;
          const key = `${person}-${expense.paidBy}`;
          if (!debtMap[key]) {
            debtMap[key] = { debtor: person, creditor: expense.paidBy, amount: 0 };
          }
          debtMap[key].amount += amount;
        }
      });
    });

    const netDebts = {};
    for (const [key, debt] of Object.entries(debtMap)) {
      const reverseKey = `${debt.creditor}-${debt.debtor}`;
      if (netDebts[reverseKey]) continue;
      const reverse = debtMap[reverseKey];
      const netAmount = reverse ? debt.amount - reverse.amount : debt.amount;
      if (netAmount > 0) {
        netDebts[key] = { ...debt, amount: Math.round(netAmount) };
      } else if (netAmount < 0 && reverse) {
        netDebts[reverseKey] = { ...reverse, amount: Math.round(-netAmount) };
      }
    }

    const newDebts = Object.values(netDebts);
    setDebts(newDebts);
    await mockFirebase.set('debts', newDebts);
  };

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Chia tiền nhóm</h1>
      <p>Đây là khung giao diện. Các tính năng chính cần thêm: chọn người dùng, thêm bữa ăn, dashboard nợ, xác nhận.</p>
      <p>Bạn có thể tiếp tục viết UI theo đặc tả hoặc tôi sẽ giúp bạn dựng từng phần.</p>
    </div>
  );
};

export default TeamExpenseTracker;