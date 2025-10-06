// info.js - Load thông tin hệ thống từ Firebase
console.log("✅ info.js loaded");

import { db, rtdb } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  ref,
  onValue,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Load thông tin hệ thống (sử dụng cùng dữ liệu như History)
window.loadInfoData = async function () {
  try {
    console.log("📊 Đang tải thông tin hệ thống...");

    // Load từ Firestore - sử dụng cùng collection "history"
    const historyRef = collection(db, "history");
    const q = query(historyRef, orderBy("createdAt", "desc"), limit(100));
    const querySnapshot = await getDocs(q);

    const infoData = [];
    querySnapshot.forEach((doc) => {
      infoData.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Đã tải ${infoData.length} bản ghi thông tin từ Firestore`);

    // Hiển thị thông tin
    displayInfoData(infoData);
  } catch (error) {
    console.error("❌ Lỗi khi tải thông tin:", error);

    // Fallback: Load từ Realtime Database
    try {
      console.log("🔄 Thử tải từ Realtime Database...");
      const historyRef = ref(rtdb, "history");
      onValue(historyRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const infoData = Object.keys(data)
            .map((key) => ({ id: key, ...data[key] }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 100); // Giới hạn 100 bản ghi gần nhất

          console.log(
            `✅ Đã tải ${infoData.length} bản ghi thông tin từ Realtime DB`
          );
          displayInfoData(infoData);
        } else {
          console.log("📭 Không có dữ liệu thông tin");
          displayInfoData([]);
        }
      });
    } catch (rtdbError) {
      console.error("❌ Lỗi Realtime Database:", rtdbError);
      displayInfoData([]);
    }
  }
};

// Hiển thị thông tin trong bảng
function displayInfoData(infoData) {
  const tableBody = document.getElementById("infoBody");
  if (!tableBody) {
    console.warn("⚠️ Không tìm thấy infoBody element");
    return;
  }

  // Xóa nội dung cũ
  tableBody.innerHTML = "";

  if (infoData.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="2" style="text-align: center; padding: 40px; color: #666; font-style: italic;">
                    📊 Không có thông tin hệ thống nào
                </td>
            </tr>
        `;
    return;
  }

  // Lọc và loại bỏ các bản ghi trùng lặp dựa trên studentId
  const uniqueStudents = new Map();
  infoData.forEach((record) => {
    if (record.studentId && record.studentName) {
      if (!uniqueStudents.has(record.studentId)) {
        uniqueStudents.set(record.studentId, {
          studentName: record.studentName,
          studentId: record.studentId,
        });
      }
    }
  });

  const uniqueData = Array.from(uniqueStudents.values());

  // Hiển thị từng bản ghi thông tin (chỉ Tên và ID Sinh Viên)
  uniqueData.forEach((record, index) => {
    const row = document.createElement("tr");
    row.style.cssText = `
            transition: all 0.3s ease;
        `;

    row.innerHTML = `
            <td style="padding: 12px 8px; color: #333; font-weight: 500; cursor: pointer; transition: color 0.3s;" onclick="showStudentInfo('${
              record.studentId
            }', '${
      record.studentName
    }')" onmouseover="this.style.color='#B20000'" onmouseout="this.style.color='#333'">${
      record.studentName || "N/A"
    }</td>
            <td style="padding: 12px 8px; color: #666;">${
              record.studentId || "N/A"
            }</td>
        `;

    // Thêm hover effect
    row.addEventListener("mouseenter", function () {
      this.style.background = "#f8fafc";
    });

    row.addEventListener("mouseleave", function () {
      this.style.background = "";
    });

    tableBody.appendChild(row);
  });

  console.log(`✅ Đã hiển thị ${uniqueData.length} sinh viên duy nhất`);
}

// Format date từ string sang định dạng Việt Nam
function formatDate(dateString) {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return dateString; // Trả về string gốc nếu không parse được
  }
}

// Load thông tin khi trang load
document.addEventListener("DOMContentLoaded", function () {
  // Chỉ load nếu đang ở trang Admin
  if (window.location.pathname.includes("Admin")) {
    console.log("🔍 Đang ở trang Admin, sẵn sàng load thông tin...");
    // Không tự động load, chỉ load khi user click vào tab Thông tin
  }
});

// Hiển thị modal thông tin sinh viên
window.showStudentInfo = async function (studentId, studentName) {
  console.log(
    `📚 Đang tải thông tin mượn sách của sinh viên: ${studentName} (${studentId})`
  );

  // Hiển thị modal
  const modal = document.getElementById("studentInfoModal");
  modal.style.display = "flex";

  // Cập nhật thông tin sinh viên
  document.getElementById("studentNameInfo").textContent = studentName;
  document.getElementById("studentIdInfo").textContent = studentId;
  document.getElementById(
    "studentModalTitle"
  ).textContent = `Thông Tin Mượn Sách - ${studentName}`;

  // Load dữ liệu mượn sách của sinh viên
  await loadStudentBooks(studentId, studentName);
};

// Load dữ liệu mượn sách của sinh viên cụ thể
async function loadStudentBooks(studentId, studentName) {
  try {
    console.log(`🔍 Đang tìm kiếm sách của sinh viên ${studentId}...`);

    // Load từ Firestore
    const historyRef = collection(db, "history");
    const q = query(historyRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const studentBooks = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.studentId === studentId) {
        studentBooks.push({ id: doc.id, ...data });
      }
    });

    console.log(
      `✅ Tìm thấy ${studentBooks.length} bản ghi mượn sách của sinh viên ${studentName}`
    );

    // Hiển thị dữ liệu
    displayStudentBooks(studentBooks);
  } catch (error) {
    console.error("❌ Lỗi khi tải dữ liệu sinh viên:", error);

    // Fallback: Load từ Realtime Database
    try {
      console.log("🔄 Thử tải từ Realtime Database...");
      const historyRef = ref(rtdb, "history");
      onValue(historyRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const studentBooks = Object.keys(data)
            .map((key) => ({ id: key, ...data[key] }))
            .filter((record) => record.studentId === studentId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          console.log(
            `✅ Tìm thấy ${studentBooks.length} bản ghi từ Realtime DB`
          );
          displayStudentBooks(studentBooks);
        } else {
          console.log("📭 Không có dữ liệu");
          displayStudentBooks([]);
        }
      });
    } catch (rtdbError) {
      console.error("❌ Lỗi Realtime Database:", rtdbError);
      displayStudentBooks([]);
    }
  }
}

// Hiển thị danh sách sách của sinh viên
function displayStudentBooks(books) {
  const tableBody = document.getElementById("studentBooksBody");
  if (!tableBody) {
    console.warn("⚠️ Không tìm thấy studentBooksBody element");
    return;
  }

  // Xóa nội dung cũ
  tableBody.innerHTML = "";

  if (books.length === 0) {
    tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666; font-style: italic;">
                    📚 Sinh viên này chưa mượn sách nào
                </td>
            </tr>
        `;
    updateStudentStats(0, 0, 0);
    return;
  }

  let borrowedCount = 0;
  let returnedCount = 0;

  // Hiển thị từng cuốn sách
  books.forEach((book, index) => {
    const row = document.createElement("tr");
    row.style.cssText = `
            transition: all 0.3s ease;
        `;

    // Xác định màu sắc trạng thái
    let statusColor, statusBg;
    switch (book.status) {
      case "Đang mượn":
        statusColor = "#92400e";
        statusBg = "#fef3c7";
        borrowedCount++;
        break;
      case "Đã trả":
        statusColor = "#065f46";
        statusBg = "#d1fae5";
        returnedCount++;
        break;
      case "Quá hạn":
        statusColor = "#991b1b";
        statusBg = "#fee2e2";
        borrowedCount++;
        break;
      default:
        statusColor = "#374151";
        statusBg = "#f3f4f6";
    }

    row.innerHTML = `
            <td style="padding: 12px 8px; color: #333; font-weight: 500;">${
              book.bookName || "N/A"
            }</td>
            <td style="padding: 12px 8px; color: #666;">${
              book.bookId || "N/A"
            }</td>
            <td style="padding: 12px 8px; color: #666;">${
              formatDate(book.borrowDate) || "N/A"
            }</td>
            <td style="padding: 12px 8px; color: #666;">${
              formatDate(book.returnDate) || "N/A"
            }</td>
            <td style="padding: 12px 8px;">
                <span style="
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    background: ${statusBg};
                    color: ${statusColor};
                ">
                    ${book.status || "N/A"}
                </span>
            </td>
        `;

    // Thêm hover effect
    row.addEventListener("mouseenter", function () {
      this.style.background = "#f8fafc";
    });

    row.addEventListener("mouseleave", function () {
      this.style.background = "";
    });

    tableBody.appendChild(row);
  });

  // Cập nhật thống kê
  updateStudentStats(books.length, borrowedCount, returnedCount);

  console.log(`✅ Đã hiển thị ${books.length} cuốn sách của sinh viên`);
}

// Cập nhật thống kê sinh viên
function updateStudentStats(total, borrowed, returned) {
  document.getElementById("totalBooks").textContent = total;
  document.getElementById("borrowedBooks").textContent = borrowed;
  document.getElementById("returnedBooks").textContent = returned;
}

// Đóng modal thông tin sinh viên
window.closeStudentInfoModal = function () {
  document.getElementById("studentInfoModal").style.display = "none";
};

// Đóng modal khi click bên ngoài
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("studentInfoModal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeStudentInfoModal();
      }
    });
  }
});

// Export function để các file khác có thể gọi
window.loadInfoData = loadInfoData;
window.showStudentInfo = showStudentInfo;
window.closeStudentInfoModal = closeStudentInfoModal;
