// listbook.js - Load danh sách sách từ Firebase
console.log("✅ listbook.js loaded");

import { db, rtdb } from './firebase.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Load danh sách tất cả sách
window.loadBookList = async function() {
  try {
    console.log("📚 Đang tải danh sách sách...");

    // 🔹 Load từ Firestore
    const booksRef = collection(db, "books");
    const q = query(booksRef, orderBy("title"));
    const querySnapshot = await getDocs(q);

    const books = [];
    querySnapshot.forEach((doc) => {
      books.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Đã tải ${books.length} cuốn sách từ Firestore`);
    displayBooks(books);

  } catch (error) {
    console.error("❌ Lỗi khi tải Firestore:", error);

    // 🔹 Fallback: Load từ Realtime Database
    try {
      console.log("🔄 Thử tải từ Realtime Database...");
      const booksRef = ref(rtdb, "books");
      onValue(booksRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();

          const books = Object.keys(data).map((key) => {
            const b = data[key];
            return {
              id: key,
              title: b.title || "Không tên",
              author: b.author || "Không rõ",
              genre: b.genre || "Không rõ",
              status: b.status || "Không xác định",
            };
          });

          console.log(`✅ Đã tải ${books.length} cuốn sách từ Realtime DB`);
          displayBooks(books);
        } else {
          console.log("📭 Không có dữ liệu sách");
          displayBooks([]);
        }
      });
    } catch (rtdbError) {
      console.error("❌ Lỗi Realtime Database:", rtdbError);
      displayBooks([]);
    }
  }
};

// 🧾 Hiển thị danh sách sách trong bảng
function displayBooks(books) {
  const tableBody = document.getElementById('booksBody');
  if (!tableBody) {
    console.warn("⚠️ Không tìm thấy booksBody element");
    return;
  }

  tableBody.innerHTML = '';

  if (books.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:40px;color:#666;font-style:italic;">
          📚 Không có sách nào trong thư viện
        </td>
      </tr>`;
    return;
  }

  // Hiển thị từng sách
  books.forEach((book) => {
    const row = document.createElement('tr');
    row.style.cssText = "transition:all 0.3s ease;cursor:pointer;";

    // 🔹 Xác định màu theo trạng thái
    let statusColor = "#d1fae5"; // xanh lá nhạt (Còn)
    let statusTextColor = "#065f46"; // xanh đậm

    if (book.status === "Đang mượn" || book.status === "Đã mượn") {
      statusColor = "#fee2e2"; // đỏ nhạt
      statusTextColor = "#b91c1c"; // đỏ đậm
    } 
    else if (book.status === "Đã trả") {
      statusColor = "#dbeafe"; // xanh dương nhạt
      statusTextColor = "#1e40af"; // xanh dương đậm
    }

    const quantity = typeof book.quantity === 'number' ? book.quantity : (book.quantity || 1);
    row.innerHTML = `
      <td style="padding:12px 8px;color:#333;font-weight:500;">${book.title || 'N/A'}</td>
      <td style="padding:12px 8px;color:#666;">${book.id || 'N/A'}</td>
      <td style="padding:12px 8px;color:#666;">${book.author || 'N/A'}</td>
      <td style="padding:12px 8px;color:#666;">${book.genre || 'N/A'}</td>
      <td style="padding:12px 8px;color:#666;">${quantity}</td>
      <td style="padding:12px 8px;">
        <span style="
          padding:6px 12px;
          border-radius:20px;
          font-size:0.85rem;
          font-weight:600;
          background:${statusColor};
          color:${statusTextColor};
        ">
          ${book.status || 'Không xác định'}
        </span>
      </td>
    `;

    // Hover effect
    row.addEventListener('mouseenter', function() {
      this.style.background = '#f8fafc';
      this.style.transform = 'translateX(5px)';
    });
    row.addEventListener('mouseleave', function() {
      this.style.background = '';
      this.style.transform = 'translateX(0)';
    });

    // Click → mượn nhanh
    row.addEventListener('click', function() {
      quickBorrowBook(book);
    });

    tableBody.appendChild(row);
  });

  console.log(`✅ Đã hiển thị ${books.length} cuốn sách`);
}

// 📘 Mượn nhanh
function quickBorrowBook(book) {
  if (confirm(`Bạn có muốn mượn sách "${book.title}" không?`)) {
    if (window.openBorrowForm) {
      openBorrowForm();

      setTimeout(() => {
        const bookIdInput = document.getElementById('bookId');
        const bookNameInput = document.getElementById('bookNameBorrow');

        if (bookIdInput) bookIdInput.value = book.id;
        if (bookNameInput) bookNameInput.value = book.title;

        const studentNameInput = document.getElementById('studentName');
        if (studentNameInput) studentNameInput.focus();
      }, 100);
    }
  }
}

// 🔹 Tự động load khi mở trang
document.addEventListener('DOMContentLoaded', function() {
  if (window.location.pathname.includes('Admin')) {
    console.log("🔍 Đang ở trang Admin, load danh sách sách...");
    loadBookList();
  }
});

window.loadBookList = loadBookList;
