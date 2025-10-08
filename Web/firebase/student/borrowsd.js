// borrowsd.js
console.log("✅ borrowsd.js loaded");
// Chọn nguồn dữ liệu duy nhất cho bảng mượn (tránh trùng với Interface/Student/borrowed.js)
window.__studentBorrowSource = "userBooks";

let __studentBorrowCache = [];

import { db } from "../firebase.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Hàm load danh sách sách đã mượn
async function loadBorrowedBooks() {
  try {
    // Lấy iduser từ localStorage + thêm DEV_MODE
    const DEV_MODE = true; //MỞ KHÓA TRUY CẬP
    let iduser = localStorage.getItem("iduser");

    if (!iduser) {
      if (DEV_MODE) {
        console.warn("⚠️ Dev mode: set iduser tạm");
        iduser = "test-user-001";
        localStorage.setItem("iduser", iduser);
      } else {
        alert("❌ Không tìm thấy thông tin sinh viên. Vui lòng đăng nhập lại!");
        window.location.href = "../../index.html";
        return;
      }
    }
    // Truy vấn Firestore: users/{iduser}/books
  const booksRef = collection(db, "users", iduser, "books");

    const tableBody = document.querySelector("#borrowedBooksTableBody");
    if (!tableBody) return;
    __studentBorrowCache = [];
    tableBody.innerHTML = ""; // Xóa dữ liệu cũ

  // Subscribe realtime to user books
  onSnapshot(query(booksRef, orderBy("borrowDate", "desc")), (snapshot) => {
    __studentBorrowCache = [];
    tableBody.innerHTML = "";
    if (snapshot.empty) {
      tableBody.innerHTML = `
        <tr><td colspan="4" style="padding:16px 20px;text-align:center;color:#888;">
          Không có sách nào được mượn
        </td></tr>
      `;
      return;
    }

    let rowIndex = 1;
    snapshot.forEach((doc) => {
      const book = doc.data();

        // Xác định màu trạng thái
        let statusColor = "";
        let textColor = "";
        if (book.status === "Đang mượn") {
          statusColor = "#fef3c7";
          textColor = "#92400e";
        } else {
          statusColor = "#d1fae5";
          textColor = "#065f46";
        }

        // Thêm dòng vào bảng
      const tr = document.createElement("tr");
        tr.style.transition = "background 0.2s";
        tr.onmouseover = () => (tr.style.background = "rgba(77,91,249,0.05)");
        tr.onmouseout = () => (tr.style.background = "transparent");
      // cache for filter
      __studentBorrowCache.push({
        index: rowIndex,
        bookId: doc.id,
        bookName: book.bookName || "",
        borrowDate: book.borrowDate || "",
        returnDate: book.returnDate || "",
        status: book.status || "",
      });

      tr.innerHTML = `
        <td style="padding:16px 20px;color:#666;text-align:center;font-weight:600;">${rowIndex}</td>
        <td style="padding:16px 20px;color:#1a1a1a;font-family:monospace;">${doc.id}</td>
        <td style="padding:16px 20px;color:#1a1a1a;font-weight:500;">${book.bookName || ""}</td>
        <td style="padding:16px 20px;color:#666;">${book.borrowDate || ""}</td>
        <td style="padding:16px 20px;color:#666;">${book.returnDate || ""}</td>
        <td style="padding:16px 20px;">
          <span style="background:${statusColor};color:${textColor};padding:6px 12px;border-radius:20px;font-size:0.9rem;font-weight:500;">
            ${book.status || ""}
          </span>
        </td>
      `;
      tableBody.appendChild(tr);
      rowIndex++;
    });
  });
  } catch (error) {
    console.error("❌ Lỗi khi load sách đã mượn:", error);
    alert("Không thể tải danh sách sách đã mượn!");
  }
}

// Lọc theo tên sách hoặc ID
function filterStudentBorrowedBooks(keyword) {
  const tbody = document.querySelector("#borrowedBooksTableBody");
  if (!tbody) return;
  const kw = (keyword || "").toLowerCase().trim();
  const data = kw
    ? __studentBorrowCache.filter(
        (b) =>
          (b.bookName || "").toLowerCase().includes(kw) ||
          (b.bookId || "").toLowerCase().includes(kw)
      )
    : __studentBorrowCache;
  tbody.innerHTML = "";
  data.forEach((book) => {
    let statusColor = book.status === "Đang mượn" ? "#fef3c7" : "#d1fae5";
    let textColor = book.status === "Đang mượn" ? "#92400e" : "#065f46";
    const tr = document.createElement("tr");
    tr.style.transition = "background 0.2s";
    tr.onmouseover = () => (tr.style.background = "rgba(77,91,249,0.05)");
    tr.onmouseout = () => (tr.style.background = "transparent");
    tr.innerHTML = `
      <td style="padding:16px 20px;color:#1a1a1a;font-weight:500;">${
        book.bookName || ""
      }</td>
      <td style="padding:16px 20px;color:#666;">${book.borrowDate || ""}</td>
      <td style="padding:16px 20px;color:#666;">${book.returnDate || ""}</td>
      <td style="padding:16px 20px;">
        <span style="background:${statusColor};color:${textColor};
                     padding:6px 12px;border-radius:20px;font-size:0.9rem;font-weight:500;">
          ${book.status || ""}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Gọi khi load trang
window.addEventListener("DOMContentLoaded", loadBorrowedBooks);
window.filterStudentBorrowedBooks = filterStudentBorrowedBooks;
