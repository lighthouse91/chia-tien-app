const mockFirebase = {
  data: {
    members: ['Đăng NH', 'Châu Anh', 'Phương Anh', 'Linh Giám Đốc', 'Lý', 'Linhxinh', 'Điểm', 'Thảo'],
    expenses: [],
    confirmations: [],  // ✅ Bổ sung dòng này
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

export default mockFirebase;
