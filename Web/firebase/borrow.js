console.log("✅ borrow.js loaded");

import { db, rtdb } from './firebase.js';
import { doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { ref, set, update, remove, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// 🔹 Hiển thị sách đang mượn của sinh viên
window.loadStudentBorrowedBooks = async function (studentId) {
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

// 🔹 Mở modal và tự động load dữ liệu từ temp + cập nhật ngày
window.openBorrowForm = function () {
  const modal = document.getElementById("borrowModal");
  modal.style.display = "flex";

  const today = new Date();
  const borrowDateStr = today.toISOString().split("T")[0];
  const returnDate = new Date(today);
  returnDate.setDate(today.getDate() + 90);
  const returnDateStr = returnDate.toISOString().split("T")[0];

  document.getElementById("borrowDate").value = borrowDateStr;
  document.getElementById("returnDate").value = returnDateStr;

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
        // Lấy email từ temp (các key thường gặp: email, gmail, emailAddress)
        const email = s.email || s.gmail || s.emailAddress || "";
        const emailEl = document.getElementById("studentEmail");
        if (emailEl) {
          emailEl.value = email;
          console.log("📧 Email từ temp:", email);
        }

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

// 🔔 Theo dõi RFID cho phần "Mượn": chỉ mở khi có cờ explicit để tránh xung đột
// ESP32 có thể đặt temp/openBorrow = true để mở form mượn
import("https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js").then(({ onValue }) => {
  onValue(ref(rtdb, "temp/openBorrow"), (snapshot) => {
    if (!snapshot.exists() || !snapshot.val()) return;
    const modal = document.getElementById("borrowModal");
    if (modal && modal.style.display !== "flex") openBorrowForm();
  });
});

// 🔹 Thêm dòng nhập sách
function addBookRow(bookId = "", bookName = "") {
  const booksContainer = document.getElementById("booksContainer");
  const div = document.createElement("div");
  div.classList.add("book-row");
  div.style = `
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
    align-items: end;
    padding: 10px;
    background: white;
    border-radius: 6px;
    border: 1px solid #e1e5e9;
    transition: all 0.3s;
  `;

  div.onmouseover = () => div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  div.onmouseout = () => div.style.boxShadow = 'none';

  div.innerHTML = `
    <div style="flex:2;">
      <label style="display:block;margin-bottom:3px;color:#333;font-weight:500;font-size:0.8rem;">ID Sách:</label>
      <input type="text" name="bookId" value="${bookId}" required
        style="width:100%;padding:6px 8px;border:1px solid #e1e5e9;border-radius:4px;font-size:0.85rem;"
        placeholder="ID sách">
    </div>
    <div style="flex:3;">
      <label style="display:block;margin-bottom:3px;color:#333;font-weight:500;font-size:0.8rem;">Tên Sách:</label>
      <input type="text" name="bookName" value="${bookName}" required
        style="width:100%;padding:6px 8px;border:1px solid #e1e5e9;border-radius:4px;font-size:0.85rem;"
        placeholder="Tên sách">
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;">
      <button type="button" onclick="removeBookRow(this)"
        style="background:linear-gradient(135deg,#f44336,#d32f2f);color:white;border:none;padding:6px 8px;border-radius:4px;font-size:0.8rem;cursor:pointer;">
        <ion-icon name="close-outline" style="font-size:0.9rem;"></ion-icon>
      </button>
    </div>
  `;

  booksContainer.appendChild(div);
  document.getElementById("bookCount").textContent = document.querySelectorAll(".book-row").length;
}

// 🔹 Xóa dòng sách
window.removeBookRow = function (btn) {
  btn.closest(".book-row").remove();
  document.getElementById("bookCount").textContent = document.querySelectorAll(".book-row").length;
};

// 🔹 Submit mượn sách
window.submitBorrowForm = async function (event) {
  event.preventDefault();

  const getEl = (id) => document.getElementById(id);

  const studentName = getEl("studentName")?.value.trim();
  const studentId = getEl("studentId")?.value.trim();
  const studentCode = getEl("mssv")?.value.trim();
  const studentClass = getEl("studentClass")?.value.trim();
  const borrowDate = getEl("borrowDate")?.value.trim();
  const returnDate = getEl("returnDate")?.value.trim();

  // Lấy email từ form, nếu không có thì lấy từ temp
  let studentEmail = getEl("studentEmail")?.value?.trim() || "";
  
  // Nếu email trống, thử lấy từ temp
  if (!studentEmail) {
    try {
      const tempRef = ref(rtdb, "temp/student");
      const tempSnapshot = await get(tempRef);
      if (tempSnapshot.exists()) {
        const tempStudent = tempSnapshot.val();
        studentEmail = tempStudent.email || tempStudent.gmail || tempStudent.emailAddress || "";
        console.log("📧 Lấy email từ temp:", studentEmail);
      }
    } catch (error) {
      console.warn("⚠️ Không thể lấy email từ temp:", error);
    }
  }

  const bookRows = document.querySelectorAll(".book-row");
  const books = Array.from(bookRows).map(row => {
    const bookId = row.querySelector('input[name="bookId"]')?.value.trim();
    const bookName = row.querySelector('input[name="bookName"]')?.value.trim();
    return bookId && bookName ? { bookId, bookName } : null;
  }).filter(Boolean);

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
      const historyId = `${studentId}_${b.bookId}_${borrowDate}_${i}`;

      const data = {
        studentName,
        studentId,
        studentCode,
        studentClass,
        studentEmail,
        bookId: b.bookId,
        bookName: b.bookName,
        borrowDate,
        returnDate,
        status: "Đang mượn",
        createdAt: new Date().toISOString(),
      };

      console.log("📚 Lưu dữ liệu mượn sách:", {
        studentName,
        studentId,
        studentEmail,
        bookName: b.bookName,
        bookId: b.bookId
      });

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

    // Chỉ xóa dữ liệu tạm SAU khi mượn thành công
    await remove(ref(rtdb, "temp/student")).catch(() => {});
    await remove(ref(rtdb, "temp/books")).catch(() => {});
    await remove(ref(rtdb, "temp/openBorrow")).catch(() => {});

    alert(`📚 Đã mượn thành công ${results.length} cuốn:\n${results.join("\n")}`);

    // Reset form
    const form = document.getElementById("borrowForm");
    if (form) form.reset();

    // Reset danh sách sách
    document.getElementById("booksContainer").innerHTML = "";
    document.getElementById("bookCount").textContent = "0";

   // Reset ngày mượn/trả
const today = new Date();
const borrowDateStr = today.toISOString().split("T")[0];
const returnDateObj = new Date(today);
returnDateObj.setDate(today.getDate() + 90);
const returnDateStr = returnDateObj.toISOString().split("T")[0];

document.getElementById("borrowDate").value = borrowDateStr;
document.getElementById("returnDate").value = returnDateStr;

    // Đóng form
    closeBorrowForm();

    // Cập nhật lại bảng sách đang mượn
    window.loadStudentBorrowedBooks(studentId);

  } catch (error) {
    console.error("❌ Lỗi khi mượn sách:", error);
    alert("Không thể mượn sách: " + (error?.message || error));
  }
};

// 🔹 Test RFID cho sinh viên với email
window.testBorrowRFIDScan = function () {
  const tempRef = ref(rtdb, "temp/student");
  set(tempRef, {
    iduser: "4299DF00",
    username: "Nguyễn Văn A",
    mssv: "N22DCVT001",
    class: "D22CQVT01-N",
    email: "nguyenvana@student.ptithcm.edu.vn",
    role: "student"
  });
  console.log("✅ Test RFID sinh viên đã được đặt với email:", "nguyenvana@student.ptithcm.edu.vn");
};

// 🔹 Test RFID cho sách
window.testBookBorrowRFIDScan = function () {
  const tempRef = ref(rtdb, "temp/books");
  set(tempRef, {
    "book1": {
      id: "BOOK001",
      title: "Lập trình JavaScript"
    },
    "book2": {
      id: "BOOK002", 
      title: "Cơ sở dữ liệu"
    }
  });
  console.log("✅ Test RFID sách đã được đặt");
};
