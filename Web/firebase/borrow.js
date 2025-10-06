console.log("✅ borrow.js loaded");

import { db, rtdb } from './firebase.js';
import { doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ref, set, update, remove, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// 🔹 Hiển thị sách đang mượn của sinh viên
window.loadStudentBorrowedBooks = async function (studentId) {
  console.log("📌 studentId:", studentId);

  const booksRef = ref(rtdb, `users/${studentId}/books`);
  const snapshot = await get(booksRef);

  const tbody = document.getElementById("currentBorrowedBooksTableBody");
  tbody.innerHTML = "";

  if (!snapshot.exists()) {
    document.getElementById("noCurrentBooksMessage").style.display = "flex";
    document.getElementById("currentBorrowedBooksTable").style.display = "none";
    document.getElementById("borrowBookCount").style.display = "none";
    return;
  }

  const books = snapshot.val();

  Object.entries(books).forEach(([bookId, book]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${book.bookName || "Không rõ"}</td>
      <td>${bookId}</td>
      <td style="text-align:center;">${book.borrowDate || "-"}</td>
      <td style="text-align:center;">${book.status || "?"}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("noCurrentBooksMessage").style.display = "none";
  document.getElementById("currentBorrowedBooksTable").style.display = "table";
  document.getElementById("borrowBookCount").style.display = "inline-block";
  document.getElementById("currentBorrowCount").textContent = Object.keys(books).length;
};

// 🔹 Đóng modal
window.closeBorrowForm = function () {
  document.getElementById("borrowModal").style.display = "none";
};

// 🔹 Mở modal và tự động load dữ liệu từ temp
window.openBorrowForm = function () {
  document.getElementById("borrowModal").style.display = "flex";

  const tempRef = ref(rtdb, "temp");
  import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js").then(({ onValue }) => {
    onValue(tempRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const temp = snapshot.val();

      if (temp.student) {
        const s = temp.student;
        document.getElementById("studentName").value = s.username || "";
        document.getElementById("studentId").value = s.iduser || s.id || "";
        document.getElementById("mssv").value = s.mssv || "";
        document.getElementById("studentClass").value = s.class || "";

        const studentId = s.iduser || s.id || "";
        if (studentId) window.loadStudentBorrowedBooks(studentId);
      }

      const booksContainer = document.getElementById("booksContainer");
      booksContainer.innerHTML = "";

      if (temp.books) {
        Object.keys(temp.books).forEach((key) => {
          const book = temp.books[key];
          addBookRow(book.id || "", book.title || "");
        });

        document.getElementById("bookCount").textContent = Object.keys(temp.books).length;
      }
    });
  });
};

// 🔔 Theo dõi dữ liệu RFID để tự động mở form
const tempRef = ref(rtdb, "temp");
import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js").then(({ onValue }) => {
  onValue(tempRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const modal = document.getElementById("borrowModal");
    if (modal.style.display !== "flex") openBorrowForm();
  });
});

// 🔹 Thêm dòng nhập sách
function addBookRow(bookId = "", bookName = "") {
  const booksContainer = document.getElementById("booksContainer");
  const div = document.createElement("div");
  div.classList.add("book-row");
  div.style = "display:flex;gap:8px;margin-bottom:10px;align-items:end;padding:10px;background:white;border-radius:6px;border:1px solid #e1e5e9;";

  div.innerHTML = `
    <div style="flex:2;">
      <label>ID Sách:</label>
      <input type="text" name="bookId" value="${bookId}" required>
    </div>
    <div style="flex:3;">
      <label>Tên Sách:</label>
      <input type="text" name="bookName" value="${bookName}" required>
    </div>
    <div style="flex:1;">
      <button type="button" onclick="removeBookRow(this)">X</button>
    </div>
  `;
  booksContainer.appendChild(div);
}

// 🔹 Xóa dòng sách
window.removeBookRow = function (btn) {
  btn.closest(".book-row").remove();
  const count = document.querySelectorAll(".book-row").length;
  document.getElementById("bookCount").textContent = count;
};

// ===== Thay thế toàn bộ hàm submitBorrowForm bằng đoạn này =====
window.submitBorrowForm = async function (event) {
  event.preventDefault();
  console.log("▶ submitBorrowForm called");

  // helper: lấy element và báo lỗi nếu không tồn tại
  const getEl = (id) => {
    const e = document.getElementById(id);
    if (!e) console.warn(`Không tìm thấy element id="${id}"`);
    return e;
  };

  const studentNameEl = getEl("studentName");
  const studentIdEl = getEl("studentId");
  const mssvEl = getEl("mssv");
  const studentClassEl = getEl("studentClass");
  const borrowDateEl = getEl("borrowDate");
  const returnDateEl = getEl("returnDate");

  // Bail out nếu những field bắt buộc không tồn tại (tránh lỗi null.value)
  if (!studentNameEl || !studentIdEl || !borrowDateEl || !returnDateEl) {
    alert("Lỗi: Form bị thiếu trường bắt buộc. Kiểm tra id các input (studentName, studentId, borrowDate, returnDate).");
    return;
  }

  // Lấy giá trị (an toàn)
  const studentName = (studentNameEl.value || "").trim();
  const studentId = (studentIdEl.value || "").trim();
  const studentCode = (mssvEl && mssvEl.value) ? mssvEl.value.trim() : "";
  const studentClass = (studentClassEl && studentClassEl.value) ? studentClassEl.value.trim() : "";
  const borrowDate = (borrowDateEl.value || "").trim();
  const returnDate = (returnDateEl.value || "").trim();

  // Lấy danh sách sách từ các .book-row (dù là input động)
  const bookRows = document.querySelectorAll(".book-row");
  const books = [];
  bookRows.forEach((row) => {
    const bookIdInput = row.querySelector('input[name="bookId"]');
    const bookNameInput = row.querySelector('input[name="bookName"]');
    if (!bookIdInput || !bookNameInput) {
      console.warn("Bỏ qua 1 book-row vì thiếu input[name='bookId'] hoặc input[name='bookName']:", row);
      return;
    }
    const bookId = (bookIdInput.value || "").trim();
    const bookName = (bookNameInput.value || "").trim();
    if (bookId && bookName) books.push({ bookId, bookName });
  });

  // Validate dữ liệu bắt buộc
  if (!studentName || !studentId || !borrowDate || !returnDate) {
    alert("⚠️ Vui lòng nhập đầy đủ thông tin sinh viên và ngày mượn/trả!");
    return;
  }
  if (books.length === 0) {
    alert("⚠️ Vui lòng thêm ít nhất một cuốn sách!");
    return;
  }

  try {
    const results = [];

    for (let i = 0; i < books.length; i++) {
      const b = books[i];
      // tạo history id (đảm bảo không có ký tự nguy hiểm)
      const historyId = `${studentId}_${b.bookId}_${borrowDate}_${i}`;

      const data = {
        studentName,
        studentId,
        studentCode,
        studentClass,
        bookId: b.bookId,
        bookName: b.bookName,
        borrowDate,
        returnDate,
        status: "Đang mượn",
        createdAt: new Date().toISOString(),
      };

      // Firestore
      await setDoc(doc(db, "history", historyId), data);
      // Realtime
      await set(ref(rtdb, "history/" + historyId), data);
      // Cập nhật trạng thái sách (Firestore + Realtime)
      await updateDoc(doc(db, "books", b.bookId), { status: "Đã mượn" }).catch(() => {});
      await update(ref(rtdb, "books/" + b.bookId), { status: "Đã mượn" });
      // Thêm vào profile user (Firestore)
      await setDoc(doc(db, "users", studentId, "books", b.bookId), {
        bookName: b.bookName,
        borrowDate,
        returnDate,
        status: "Đang mượn",
      });

      results.push(b.bookName);
    }

    // Xóa temp trên Realtime DB
    await remove(ref(rtdb, "temp"));

    alert(`📚 Đã mượn thành công ${results.length} cuốn:\n${results.join("\n")}`);

    // Reset form và cập nhật UI
    const form = document.getElementById("borrowForm");
    if (form) form.reset();

    closeBorrowForm();
    // Cập nhật lại bảng sách đang mượn
    window.loadStudentBorrowedBooks(studentId);
  } catch (error) {
    console.error("❌ Lỗi khi mượn sách:", error);
    alert("Không thể mượn sách: " + (error && error.message ? error.message : error));
  }
};
// ===== end submitBorrowForm replacement =====
