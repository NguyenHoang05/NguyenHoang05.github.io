// studentBooks.js
import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export async function loadStudentBorrowedBooks(studentId) {
  const booksRef = collection(db, "users", studentId, "books");
  const querySnapshot = await getDocs(booksRef);

  const tbody = document.getElementById("currentBorrowedBooksTableBody");
  tbody.innerHTML = "";

  if (querySnapshot.empty) {
    document.getElementById("noCurrentBooksMessage").style.display = "flex";
    document.getElementById("currentBorrowedBooksTable").style.display = "none";
    document.getElementById("borrowBookCount").style.display = "none";
    return;
  }

  let count = 0;
  querySnapshot.forEach(doc => {
    const book = doc.data();
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
}
// Theo dõi ô nhập ID Sinh Viên
document.addEventListener("DOMContentLoaded", () => {
  const studentIdInput = document.getElementById("studentId");

  if (!studentIdInput) return;

  studentIdInput.addEventListener("input", () => {
    const studentId = studentIdInput.value.trim();
    if (studentId.length >= 6) {
      loadStudentBorrowedBooks(studentId);
    } else {
      // Ẩn bảng nếu ID chưa hợp lệ
      document.getElementById("currentBorrowedBooksTable").style.display = "none";
      document.getElementById("borrowBookCount").style.display = "none";
      document.getElementById("noCurrentBooksMessage").style.display = "flex";
    }
  });
});
