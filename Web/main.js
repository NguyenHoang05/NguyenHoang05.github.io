// analysis.js merged: compute real numbers for Analysis and Home
import { db } from './firebase/firebase.js';
import { collection, getCountFromServer, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

async function updateCounts() {
  try {
    // Books total
    const totalSnap = await getCountFromServer(collection(db, 'books'));
    const totalBooks = totalSnap.data().count || 0;

    // Borrowing count (history status == Đang mượn)
    const borrowingSnap = await getCountFromServer(query(collection(db, 'history'), where('status', '==', 'Đang mượn')));
    const borrowing = borrowingSnap.data().count || 0;

    // Available books (status Còn)
    const availableSnap = await getCountFromServer(query(collection(db, 'books'), where('status', '==', 'Còn')));
    const available = availableSnap.data().count || Math.max(0, totalBooks - borrowing);

    // Users
    const usersSnap = await getCountFromServer(collection(db, 'users'));
    const users = usersSnap.data().count || 0;

    // Update Home
    const hTotal = document.getElementById('homeTotalBooks');
    const hBorrow = document.getElementById('homeBorrowingBooks');
    const hUsers = document.getElementById('homeUsersCount');
    if (hTotal) hTotal.textContent = String(totalBooks);
    if (hBorrow) hBorrow.textContent = String(borrowing);
    if (hUsers) hUsers.textContent = String(users);

    // Update Analysis
    const aTotal = document.getElementById('analysisTotalBooks');
    const aAvail = document.getElementById('analysisAvailableBooks');
    const aBorrow = document.getElementById('analysisBorrowingBooks');
    if (aTotal) aTotal.textContent = String(totalBooks);
    if (aAvail) aAvail.textContent = String(available);
    if (aBorrow) aBorrow.textContent = String(borrowing);
  } catch (e) {
    console.error('Failed to update analysis counts:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateCounts();
});

window.refreshAnalysisCounts = updateCounts;

const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
})

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
})
       // Lấy form đăng nhập
const loginForm = document.querySelector('.form-box.login form');

if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Ngăn reload trang
        
        // Lấy thông tin đăng nhập
        const username = loginForm.querySelector('input[type="text"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;
        const role = document.getElementById('roleSelectlogin').value;
        
        // Kiểm tra thông tin đăng nhập
        if (!username || !password || !role) {
            alert('Vui lòng nhập đầy đủ thông tin!');
            return;
        }
        
        // Logic xác thực đăng nhập (giả lập)
        if (authenticateUser(username, password, role)) {
            // Lưu thông tin đăng nhập vào localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                username: username,
                role: role,
                loginTime: new Date().toISOString()
            }));
            
            // Chuyển hướng dựa trên vai trò
            redirectBasedOnRole(role);
        } else {
            alert('Thông tin đăng nhập không chính xác!');
        }
    });
}

// Hàm xác thực người dùng (giả lập)
function authenticateUser(username, password, role) {
    // Dữ liệu đăng nhập mẫu
    const validCredentials = {
        student: [
            { username: 'student1', password: '123456' },
            { username: '2021001', password: 'student123' },
            { username: 'nguyenvana', password: '123456' }
        ],
        admin: [
            { username: 'admin', password: 'admin123' },
            { username: 'admin@piit.edu.vn', password: 'admin123' },
            { username: 'librarian', password: 'lib123' }
        ]
    };
    
    // Kiểm tra thông tin đăng nhập
    const credentials = validCredentials[role];
    if (!credentials) return false;
    
    return credentials.some(cred => 
        cred.username.toLowerCase() === username.toLowerCase() && 
        cred.password === password
    );
}

// Hàm chuyển hướng dựa trên vai trò
function redirectBasedOnRole(role) {
    switch(role) {
        case 'student':
            // Chuyển đến trang Student
            window.location.href = '../Interface/Student/index.html';
            break;
        case 'admin':
            // Chuyển đến trang Admin
            window.location.href = '../Interface/Admin/index.html';
            break;
        default:
            alert('Vai trò không hợp lệ!');
    }
}