// ✅ studentInfo.js - Hiển thị thông tin mượn sách của sinh viên
console.log("✅ studentInfo.js loaded");

import { db } from './firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// 🔹 Mở modal và load dữ liệu
window.openStudentInfoModal = async function(studentId, studentName) {
  const modal = document.getElementById("studentInfoModal");
  document.getElementById("studentModalTitle").textContent = `Thông Tin Mượn Sách - ${studentName}`;
  modal.style.display = "flex";

  try {
    const q = query(collection(db, "history"), where("studentId", "==", studentId));
    const snapshot = await getDocs(q);

    let total = 0, borrowed = 0, returned = 0;
    const tbody = document.getElementById("studentBooksBody");
    tbody.innerHTML = "";

    snapshot.forEach((doc) => {
      total++;
      const d = doc.data();
      if (d.status === "Đang mượn") borrowed++;
      if (d.status === "Đã trả") returned++;

      tbody.innerHTML += `
        <tr>
          <td>${d.bookName}</td>
          <td>${d.bookId}</td>
          <td>${d.borrowDate}</td>
          <td>${d.returnDate || '-'}</td>
          <td>${d.status}</td>
        </tr>
      `;
    });

    document.getElementById("studentNameInfo").textContent = studentName;
    document.getElementById("studentIdInfo").textContent = studentId;
    document.getElementById("totalBooks").textContent = total;
    document.getElementById("borrowedBooks").textContent = borrowed;
    document.getElementById("returnedBooks").textContent = returned;

  } catch (error) {
    console.error("❌ Lỗi khi load thông tin sách:", error);
  }
};

// 🔹 Đóng modal
window.closeStudentInfoModal = function() {
  document.getElementById("studentInfoModal").style.display = "none";
};
