// studentBooks.js
import { db, rtdb } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ref, onValue, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

console.log("✅ studentBooks.js loaded");

export async function loadStudentBorrowedBooks(studentId) {
  try {
    if (!studentId) {
      console.warn("loadStudentBorrowedBooks called with empty studentId");
      return;
    }
    console.log("Loading borrowed books for:", studentId);

    const booksRef = collection(db, "users", studentId, "books");
    const querySnapshot = await getDocs(booksRef).catch(err => { throw err; });

    const tbody = document.getElementById("currentBorrowedBooksTableBody");
    if (!tbody) {
      console.error("DOM error: #currentBorrowedBooksTableBody not found");
      return;
    }
    tbody.innerHTML = "";

    if (!querySnapshot || querySnapshot.empty) {
      document.getElementById("noCurrentBooksMessage").style.display = "flex";
      document.getElementById("currentBorrowedBooksTable").style.display = "none";
      document.getElementById("borrowBookCount").style.display = "none";
      console.log("No borrowed books found for", studentId);
      return;
    }

    let count = 0;
    querySnapshot.forEach(doc => {
      const book = doc.data() || {};
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${book.bookName || "Không rõ"}</td>
        <td>${doc.id}</td>
        <td style="text-align:center;">${book.borrowDate || "-"}</td>
        <td style="text-align:center;">${book.returnDate || "-"}</td>
        <td style="text-align:center;">${book.status || "?"}</td>
      `;
      tbody.appendChild(tr);
      count++;
    });

    document.getElementById("noCurrentBooksMessage").style.display = "none";
    document.getElementById("currentBorrowedBooksTable").style.display = "table";
    document.getElementById("borrowBookCount").style.display = "inline-block";
    document.getElementById("currentBorrowCount").textContent = count;
    console.log("Rendered", count, "books for", studentId);

  } catch (error) {
    console.error("Error in loadStudentBorrowedBooks:", error);
    // Hiển thị message lỗi tạm thời
    document.getElementById("noCurrentBooksMessage").style.display = "flex";
    document.getElementById("noCurrentBooksMessage").textContent = "Lỗi khi tải dữ liệu sách. Kiểm tra console.";
  }
}

// Tất cả logic DOM phải chạy sau DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded - studentBooks init");

  // 1) Thiết lập input listener (nhập tay và quét có thể gõ vào input)
  const studentIdInput = document.getElementById("studentId");
  if (studentIdInput) {
    studentIdInput.addEventListener("input", () => {
      const raw = studentIdInput.value || "";
      const studentId = raw.trim().replace(/[\n\r\s]+/g, "");
      console.log("input event studentId:", JSON.stringify(studentId));
      if (studentId.length >= 6) {
        loadStudentBorrowedBooks(studentId);
      } else {
        document.getElementById("currentBorrowedBooksTable").style.display = "none";
        document.getElementById("borrowBookCount").style.display = "none";
        document.getElementById("noCurrentBooksMessage").style.display = "flex";
      }
    });

    // Bắt thêm keydown để bắt Enter từ máy quét nếu nó gửi Enter
    studentIdInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const studentId = (studentIdInput.value || "").trim().replace(/[\n\r\s]+/g, "");
        if (studentId.length >= 1) loadStudentBorrowedBooks(studentId);
      }
    });
  } else {
    console.warn("#studentId element not found in DOM");
  }

  // 2) Lắng nghe temp trong Realtime DB (dữ liệu từ việc quét RFID)
  try {
    const tempRef = ref(rtdb, "temp");
    onValue(tempRef, (snapshot) => {
      if (!snapshot.exists()) {
        //console.log("temp empty");
        return;
      }
      const temp = snapshot.val();
      console.log("temp changed:", temp);

      const student = temp?.student;
      if (student) {
        const studentId = (student.iduser || student.id || studentIdFromAny(student) || "").toString().trim().replace(/[\n\r\s]+/g, "");
        console.log("student from temp:", student, "-> id:", studentId);
        if (studentId && studentId.length >= 1) {
          // cập nhật input field để người dùng thấy id
          const inEl = document.getElementById("studentId");
          if (inEl) inEl.value = studentId;
          // gọi load
          loadStudentBorrowedBooks(studentId);
        }
      }
    });
  } catch (err) {
    console.error("Realtime DB listener setup error:", err);
  }
});

// helper lấy id nếu có tên trường khác
function studentIdFromAny(s) {
  return s?.iduser || s?.id || s?.rfid || s?.mssv || "";
}
