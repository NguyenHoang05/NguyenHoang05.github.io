console.log("✅ borrow.js loaded");

import { db, rtdb } from './firebase.js';
import { doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ref, set, update, onValue, remove } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// 🔹 Đóng modal
window.closeBorrowForm = function () {
  document.getElementById("borrowModal").style.display = "none";
};

// 🔹 Mở modal và tự động load dữ liệu từ temp
window.openBorrowForm = function () {
  document.getElementById("borrowModal").style.display = "flex";

  const tempRef = ref(rtdb, "temp");
  onValue(tempRef, (snapshot) => {
    if (!snapshot.exists()) return;
    const temp = snapshot.val();

    // 🧑‍🎓 Hiển thị thông tin sinh viên
    if (temp.student) {
      const s = temp.student;
      document.getElementById("studentName").value = s.username || "";
      document.getElementById("studentId").value = s.iduser || "";
      document.getElementById("studentCode").value = s.mssv || "";
      document.getElementById("studentClass").value = s.class || "";
    }

    // 📚 Hiển thị danh sách nhiều sách (book1, book2,…)
    const booksContainer = document.getElementById("booksContainer");
    booksContainer.innerHTML = ""; // Xóa các dòng cũ

    if (temp.books) {
      Object.keys(temp.books).forEach((key) => {
        const book = temp.books[key];
        const div = document.createElement("div");
        div.classList.add("book-row");
        div.style = "display:flex;gap:8px;margin-bottom:10px;align-items:end;padding:10px;background:white;border-radius:6px;border:1px solid #e1e5e9;";

        // ⚠️ PHẢI dùng backtick để render HTML template
        div.innerHTML = `
          <div style="flex:2;">
            <label style="display:block;margin-bottom:3px;color:#333;font-weight:500;font-size:0.8rem;">ID Sách:</label>
            <input type="text" name="bookId" value="${book.id || ""}" required style="width:100%;padding:6px 8px;border:1px solid #e1e5e9;border-radius:4px;">
          </div>
          <div style="flex:3;">
            <label style="display:block;margin-bottom:3px;color:#333;font-weight:500;font-size:0.8rem;">Tên Sách:</label>
            <input type="text" name="bookName" value="${book.title || ""}" required style="width:100%;padding:6px 8px;border:1px solid #e1e5e9;border-radius:4px;">
          </div>
          <div style="flex:1;display:flex;align-items:center;justify-content:center;">
            <button type="button" onclick="removeBookRow(this)" style="background:#f44336;color:white;border:none;padding:6px 8px;border-radius:4px;">X</button>
          </div>
        `;

        booksContainer.appendChild(div);
      });

      document.getElementById("bookCount").textContent =
        Object.keys(temp.books).length;
    }
  });
};

// 🔹 Xóa dòng sách
window.removeBookRow = function (btn) {
  btn.closest(".book-row").remove();
  const count = document.querySelectorAll(".book-row").length;
  document.getElementById("bookCount").textContent = count;
};

// 🔹 Submit form mượn sách
window.submitBorrowForm = async function (event) {
  event.preventDefault();

  // Lấy thông tin sinh viên
  const studentName = document.getElementById("studentName").value.trim();
  const studentId = document.getElementById("studentId").value.trim();
  const studentCode = document.getElementById("studentCode").value.trim();
  const studentClass = document.getElementById("studentClass").value.trim();
  const borrowDate = document.getElementById("borrowDate").value;
  const returnDate = document.getElementById("returnDate").value;

  // Lấy danh sách sách
  const bookRows = document.querySelectorAll(".book-row");
  const books = [];
  bookRows.forEach((row) => {
    const bookId = row.querySelector('input[name="bookId"]').value.trim();
    const bookName = row.querySelector('input[name="bookName"]').value.trim();
    if (bookId && bookName) books.push({ bookId, bookName });
  });

  if (!studentName || !studentId || !borrowDate || !returnDate) {
    alert("⚠️ Vui lòng nhập đầy đủ thông tin sinh viên!");
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
        borrowOrder: i + 1,
        totalBooks: books.length,
      };

      // Firestore
      await setDoc(doc(db, "history", historyId), data);

      // Realtime
      await set(ref(rtdb, "history/" + historyId), data);

      // Update trạng thái sách
      await updateDoc(doc(db, "books", b.bookId), { status: "Đã mượn" }).catch(() => {});
      await update(ref(rtdb, "books/" + b.bookId), { status: "Đã mượn" });

      // Thêm vào profile user (trong Firestore)
      await setDoc(doc(db, "users", studentId, "books", b.bookId), {
        bookName: b.bookName,
        borrowDate,
        returnDate,
        status: "Đang mượn",
      });

      results.push(b.bookName);
    }

    // Xóa temp
    await remove(ref(rtdb, "temp"));

    // ⚠️ Dùng backtick để in danh sách
    alert(`📚 Đã mượn thành công ${results.length} cuốn:\n${results.join("\n")}`);
    document.getElementById("borrowForm").reset();
    closeBorrowForm();
  } catch (error) {
    console.error("❌ Lỗi khi mượn sách:", error);
    alert("Không thể mượn sách: " + error.message);
  }
};
