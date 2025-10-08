// ✅ returnBook.js - Xử lý trả sách & giao tiếp Firebase
console.log("✅ returnBook.js loaded");

import { db, rtdb } from './firebase.js';
import {
  collection, getDocs, query, where, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  ref, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ======================================================
// 🔹 Lắng nghe RFID: tách node student/book để tránh xung đột với "Mượn"
//    ESP32 nên đẩy:
//      temp/student => { iduser: 'SV001', mssv: '...', username: '...' }
//      temp/book    => { id: 'BOOK001', title: '...' }
// ======================================================
onValue(ref(rtdb, "temp/student"), async (snapshot) => {
  const s = snapshot.val();
  if (!s) return;

  const studentId = s.iduser || s.id || s.ID || null;
  if (!studentId) return;
  console.log("📡 [Return] Quét RFID sinh viên:", studentId);

  // Mở modal nếu chưa mở
  const modal = document.getElementById("returnBookModal");
  if (modal && modal.style.display !== "flex") {
    window.openReturnBookForm();
  }

  // Điền form
  const idInput = document.getElementById("returnStudentId");
  if (idInput) idInput.value = studentId;

  await loadStudentInfo(studentId);
  await loadReturnBookList(studentId);

  // Dọn dẹp node temp/student sau khi xử lý
  // Không xóa ngay; sẽ xóa sau khi người dùng nhấn Submit trả sách
  // await remove(ref(rtdb, "temp/student")).catch(() => {});
});

// Khi quét RFID sách, tự động tick/untick trong danh sách bên trái
onValue(ref(rtdb, "temp/book"), async (snapshot) => {
  const b = snapshot.val();
  if (!b) return;

  const scannedBookId = b.id || b.bookId || b.ID || null;
  if (!scannedBookId) return;
  console.log("📡 [Return] Quét RFID sách:", scannedBookId);

  const checkbox = document.querySelector(
    `.bookCheckbox[data-bookid='${scannedBookId}']`
  );

  if (checkbox) {
    // Toggle chọn sách
    checkbox.checked = !checkbox.checked;
    window.toggleSelectedBook(checkbox);
  }

  // Dọn dẹp node temp/book
  // Không xóa ngay; sẽ xóa sau khi người dùng nhấn Submit trả sách
  // await remove(ref(rtdb, "temp/book")).catch(() => {});
});

// ======================================================
// 🔹 Mở / đóng modal
// ======================================================
window.openReturnBookForm = function() {
  document.getElementById("returnBookModal").style.display = "flex";
};

window.closeReturnBookForm = function() {
  document.getElementById("returnBookModal").style.display = "none";
};

// ======================================================
// 🔹 Lấy thông tin sinh viên từ Firestore
// ======================================================
async function loadStudentInfo(studentId) {
  try {
    const q = query(collection(db, "users"), where("iduser", "==", studentId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert("⚠️ Không tìm thấy sinh viên có ID: " + studentId);
      return;
    }

    const data = snapshot.docs[0].data();
    document.getElementById("returnStudentName").value = data.username || "";
    document.getElementById("returnMssv").value = data.mssv || "";

    console.log("✅ Đã tải thông tin sinh viên:", data.username);
  } catch (err) {
    console.error("❌ Lỗi khi tải thông tin sinh viên:", err);
  }
}

// ======================================================
// 🔹 Load danh sách sách đang mượn (lọc theo sinh viên)
// ======================================================
async function loadReturnBookList(studentId = null) {
  try {
    console.log("📚 Đang tải danh sách sách đang mượn...");

    let q;
    if (studentId)
      q = query(collection(db, "history"),
        where("status", "==", "Đang mượn"),
        where("studentId", "==", studentId));
    else
      q = query(collection(db, "history"), where("status", "==", "Đang mượn"));

    const snapshot = await getDocs(q);
    const list = [];
    snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));

    displayBorrowedBooks(list);
  } catch (error) {
    console.error("❌ Firestore lỗi khi load danh sách:", error);
  }
}

// ======================================================
// 🔹 Hiển thị danh sách sách đang mượn
// ======================================================
function displayBorrowedBooks(books) {
  const tbody = document.getElementById("borrowedBooksTableBody");
  const table = document.getElementById("borrowedBooksTable");
  const empty = document.getElementById("noBooksMessage");
  const count = document.getElementById("returnBookCount");

  tbody.innerHTML = "";

  if (!books.length) {
    empty.style.display = "flex";
    table.style.display = "none";
    count.textContent = 0;
    return;
  }

  empty.style.display = "none";
  table.style.display = "table";

  books.forEach((b) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:center;">
        <input type="checkbox" class="bookCheckbox"
          data-id="${b.id}"
          data-bookid="${b.bookId}"
          data-name="${b.bookName}"
          onchange="toggleSelectedBook(this)">
      </td>
      <td>${b.bookName}</td>
      <td>${b.bookId}</td>
      <td style="text-align:center;">${b.borrowDate}</td>
    `;
    tbody.appendChild(tr);
  });

  count.textContent = books.length;
}

// ======================================================
// 🔹 Chọn / bỏ chọn sách
// ======================================================
window.toggleAllBooks = function(checkbox) {
  const all = document.querySelectorAll(".bookCheckbox");
  all.forEach(c => {
    c.checked = checkbox.checked;
    toggleSelectedBook(c);
  });
};

window.toggleSelectedBook = function(checkbox) {
  const selectedContainer = document.getElementById("selectedBooksItems");
  const list = document.getElementById("selectedBooksList");
  const msg = document.getElementById("noSelectedBooksMessage");
  const countEl = document.getElementById("selectedCount");
  const countBtn = document.getElementById("selectedCountBtn");
  const btn = document.getElementById("returnSelectedBtn");

  const id = checkbox.dataset.id;
  const bookId = checkbox.dataset.bookid;
  const name = checkbox.dataset.name;

  if (checkbox.checked) {
    const div = document.createElement("div");
    div.className = "selected-item";
    div.dataset.id = id;
    div.style = "padding:6px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;";
    div.innerHTML = `
      <span style="color:#333;">${name}</span>
      <small style="color:#888;">ID: ${bookId}</small>
    `;
    selectedContainer.appendChild(div);
  } else {
    const div = selectedContainer.querySelector(`[data-id='${id}']`);
    if (div) div.remove();
  }

  const selectedCount = selectedContainer.children.length;
  if (selectedCount > 0) {
    msg.style.display = "none";
    list.style.display = "block";
    btn.disabled = false;
    btn.style.opacity = "1";
  } else {
    msg.style.display = "flex";
    list.style.display = "none";
    btn.disabled = true;
    btn.style.opacity = "0.5";
  }

  countEl.textContent = selectedCount;
  countBtn.textContent = selectedCount;
};

// ======================================================
// 🔹 Xóa tất cả chọn
// ======================================================
window.clearAllSelected = function() {
  document.querySelectorAll(".bookCheckbox").forEach(c => c.checked = false);
  document.getElementById("selectedBooksItems").innerHTML = "";
  document.getElementById("selectedBooksList").style.display = "none";
  document.getElementById("noSelectedBooksMessage").style.display = "flex";
  document.getElementById("selectedCount").textContent = "0";
  document.getElementById("selectedCountBtn").textContent = "0";
  document.getElementById("returnSelectedBtn").disabled = true;
  document.getElementById("returnSelectedBtn").style.opacity = "0.5";
};

// ======================================================
// 🔹 Nút Trả Sách
// ======================================================
window.submitReturnBookForm = async function(e) {
  e.preventDefault();
  const selected = document.querySelectorAll("#selectedBooksItems .selected-item");

  if (selected.length === 0) {
    document.getElementById("returnValidationMessage").style.display = "block";
    setTimeout(() => {
      document.getElementById("returnValidationMessage").style.display = "none";
    }, 2000);
    return;
  }

  for (const div of selected) {
    const historyId = div.dataset.id;
    await processReturnBook(historyId);
  }

  alert("✅ Trả thành công " + selected.length + " cuốn sách!");
  // Xóa dữ liệu tạm SAU khi trả thành công
  try {
    await remove(ref(rtdb, "temp/student"));
  } catch {}
  try {
    await remove(ref(rtdb, "temp/book"));
  } catch {}
  clearAllSelected();
  const studentId = document.getElementById("returnStudentId").value.trim();
  loadReturnBookList(studentId);
};

// ======================================================
// 🔹 Xử lý từng sách khi trả
// ======================================================
async function processReturnBook(historyId) {
  try {
    const returnDate = new Date().toISOString().split("T")[0];
    const historyDoc = await getDoc(doc(db, "history", historyId));
    if (!historyDoc.exists()) return;

    const data = historyDoc.data();
    const { studentId, bookId } = data;

    await Promise.all([
      updateDoc(doc(db, "history", historyId), {
        status: "Đã trả",
        actualReturnDate: returnDate
      }),
      update(ref(rtdb, `history/${historyId}`), {
        status: "Đã trả",
        actualReturnDate: returnDate
      }),
    // Cập nhật user subcollection (Firestore)
    updateDoc(doc(db, "users", studentId, "books", bookId), {
      status: "Đã trả",
      actualReturnDate: returnDate
    }).catch(() => {}),
      updateDoc(doc(db, "books", bookId), { status: "Còn" }),
      update(ref(rtdb, `books/${bookId}`), { status: "Còn" }),
      remove(ref(rtdb, `users/${studentId}/books/${bookId}`))
    ]);

    console.log(`✅ Trả sách ${bookId} thành công`);
  } catch (err) {
    console.error("❌ Lỗi khi trả sách:", err);
  }
}

window.loadReturnBookList = loadReturnBookList;
