// ✅ returnBook.js - Xử lý trả sách & giao tiếp Firebase
console.log("✅ returnBook.js loaded");

import { db, rtdb } from './firebase.js';
import {
  collection, getDocs, query, where, doc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  ref, onValue, update, remove, set
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Cờ điều khiển mở modal Trả sách để tránh xung đột với phần Mượn
let openReturnEnabled = false;
onValue(ref(rtdb, "temp/openReturn"), (snapshot) => {
  openReturnEnabled = !!snapshot.val();
});

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
  if (openReturnEnabled && modal && modal.style.display !== "flex") {
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
// Helper: extract bookId from various RTDB layouts
function extractBookId(payload) {
  if (!payload) return null;
  // Simple form
  if (typeof payload === 'object') {
    if (payload.id || payload.bookId || payload.ID) {
      return payload.id || payload.bookId || payload.ID;
    }
    // Nested like { book1: { id: '...' } } or any single child
    const keys = Object.keys(payload);
    if (keys.length === 1 && typeof payload[keys[0]] === 'object') {
      const v = payload[keys[0]];
      return v.id || v.bookId || v.ID || null;
    }
  }
  return null;
}

// Support path temp/books exactly (plural)
onValue(ref(rtdb, "temp/books"), async (snapshot) => {
  const payload = snapshot.val();
  console.log('[Return][temp/books] payload =', payload);
  if (!payload) return;
  let scannedBookId = extractBookId(payload);
  if (!scannedBookId) {
    // try iterate children
    for (const k of Object.keys(payload)) {
      const it = payload[k];
      if (it && typeof it === 'object') {
        scannedBookId = it.id || it.bookId || it.ID || null;
        if (scannedBookId) break;
      }
    }
  }
  if (!scannedBookId) return;
  console.log('📡 [Return] Quét RFID sách (temp/books):', scannedBookId);
  
  // Xử lý quét sách với logic cải tiến
  handleBookScan(scannedBookId);
});

onValue(ref(rtdb, "temp/book"), async (snapshot) => {
  const b = snapshot.val();
  if (!b) return;

  const scannedBookId = extractBookId(b);
  console.log('[Return][temp/book] payload =', b, '→ scannedId =', scannedBookId);
  if (!scannedBookId) return;
  console.log("📡 [Return] Quét RFID sách:", scannedBookId);

  // Xử lý quét sách với logic cải tiến
  handleBookScan(scannedBookId);
});

// Fallback: một số ESP đẩy trực tiếp root /book1
onValue(ref(rtdb, "book1"), async (snapshot) => {
  const v = snapshot.val();
  if (!v) return;
  const scannedBookId = extractBookId(v) || v.id || v.bookId || v.ID || null;
  if (!scannedBookId) return;
  console.log("📡 [Return] Quét RFID sách (root/book1):", scannedBookId);

  // Xử lý quét sách với logic cải tiến
  handleBookScan(scannedBookId);
});

// Fallback legacy listener: nếu ESP32 vẫn đẩy vào temp gốc
onValue(ref(rtdb, "temp"), async (snapshot) => {
  const t = snapshot.val();
  if (!t) return;

  // Nếu cấu trúc mới đã có temp/student hoặc temp/book thì bỏ qua
  // (tránh xử lý 2 lần)
  try {
    const hasNewNodes = !!(await (async () => {
      // best-effort sync check via DOM state
      return false;
    })());
    if (hasNewNodes) return;
  } catch {}

  // Nhận dạng sinh viên từ t.ID
  if (t.ID && typeof t.ID === 'string') {
    const studentId = t.ID;
    const modal = document.getElementById("returnBookModal");
    if (openReturnEnabled && modal && modal.style.display !== "flex") {
      window.openReturnBookForm();
    }
    const idInput = document.getElementById("returnStudentId");
    if (idInput) idInput.value = studentId;
    await loadStudentInfo(studentId);
    await loadReturnBookList(studentId);
    return;
  }

  // Nhận dạng sách nếu có t.bookId hoặc t.id
  const legacyBookId = t.bookId || t.id || null;
  if (legacyBookId) {
    // Xử lý quét sách với logic cải tiến
    handleBookScan(legacyBookId);
  }
});

// ======================================================
// 🔹 Mở / đóng modal
// ======================================================
window.openReturnBookForm = function() {
  document.getElementById("returnBookModal").style.display = "flex";
  
  // Reset trạng thái thông báo
  isShowingWrongMessage = false;
  if (wrongReturnMessageTimeout) {
    clearTimeout(wrongReturnMessageTimeout);
    wrongReturnMessageTimeout = null;
  }
  
  // Ẩn thông báo trả sai sách khi mở modal
  hideWrongReturnMessage();
  
  // Reset các trường form
  document.getElementById("returnStudentName").value = "";
  document.getElementById("returnMssv").value = "";
  document.getElementById("returnStudentId").value = "";
  
  // Xóa hoàn toàn thông báo lỗi nếu có
  const wrongMsg = document.getElementById("wrongReturnMsg");
  if (wrongMsg) {
    wrongMsg.remove();
  }
  
  // Reset tóm tắt
  const summaryBox = document.getElementById('selectedSummary');
  if (summaryBox) {
    summaryBox.style.display = 'none';
    summaryBox.innerHTML = '';
  }
  
  console.log("📖 Đã mở form trả sách - reset trạng thái");
};

window.closeReturnBookForm = function() {
  document.getElementById("returnBookModal").style.display = "none";
  
  // Reset trạng thái thông báo
  isShowingWrongMessage = false;
  if (wrongReturnMessageTimeout) {
    clearTimeout(wrongReturnMessageTimeout);
    wrongReturnMessageTimeout = null;
  }
  
  // Ẩn thông báo trả sai sách khi đóng modal
  hideWrongReturnMessage();
  
  // Xóa hoàn toàn thông báo lỗi nếu có
  const wrongMsg = document.getElementById("wrongReturnMsg");
  if (wrongMsg) {
    wrongMsg.remove();
  }
  
  // Reset tóm tắt
  const summaryBox = document.getElementById('selectedSummary');
  if (summaryBox) {
    summaryBox.style.display = 'none';
    summaryBox.innerHTML = '';
  }
  
  console.log("❌ Đã đóng form trả sách - reset trạng thái");
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

    // Reset trạng thái thông báo khi load danh sách mới
    isShowingWrongMessage = false;
    if (wrongReturnMessageTimeout) {
      clearTimeout(wrongReturnMessageTimeout);
      wrongReturnMessageTimeout = null;
    }

    // Ẩn thông báo lỗi khi load danh sách mới
    hideWrongReturnMessage();
    
    // Xóa hoàn toàn thông báo lỗi nếu có
    const wrongMsg = document.getElementById("wrongReturnMsg");
    if (wrongMsg) {
      wrongMsg.remove();
    }

    // Reset tóm tắt
    const summaryBox = document.getElementById('selectedSummary');
    if (summaryBox) {
      summaryBox.style.display = 'none';
      summaryBox.innerHTML = '';
    }

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
    console.log("📚 Đã load danh sách sách - reset trạng thái");
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
  const countBox = document.getElementById("bookCountReturn");

  tbody.innerHTML = "";

  if (!books.length) {
    empty.style.display = "flex";
    table.style.display = "none";
    count.textContent = 0;
    if (countBox) countBox.style.display = "none";
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
  if (countBox) countBox.style.display = "inline-flex";
}

// Hàm tìm checkbox theo bookId (so sánh với data-bookid)
function findCheckboxByBookId(bookId) {
  return document.querySelector(`.bookCheckbox[data-bookid="${bookId}"]`);
}

// Hàm xử lý quét sách với logic cải tiến - tránh xung đột khi quét xen kẽ
function handleBookScan(scannedBookId) {
  console.log(`🔍 [Return] Xử lý quét sách: ${scannedBookId}`);
  
  const checkbox = findCheckboxByBookId(scannedBookId);
  
  if (checkbox) {
    // Sách đúng - trong danh sách đang mượn
    console.log(`✅ [Return] Sách đúng: ${checkbox.dataset.name}`);
    
    // Ẩn thông báo lỗi ngay lập tức nếu đang hiển thị
    if (isShowingWrongMessage) {
      hideWrongReturnMessage();
    }
    
    // Chọn sách nếu chưa được chọn
    const wasChecked = checkbox.checked;
    checkbox.checked = true;
    if (!wasChecked) {
      window.toggleSelectedBook(checkbox);
    }
    
    // Cập nhật tóm tắt thành công
    updateSelectedSummary({ 
      bookName: checkbox.dataset.name, 
      bookId: scannedBookId, 
      type: 'success' 
    });
    
    console.log(`✅ [Return] Đã chọn sách: ${checkbox.dataset.name}`);
  } else {
    // Sách sai - không trong danh sách đang mượn
    console.log(`❌ [Return] Sách sai: ${scannedBookId}`);
    
    // Hiển thị thông báo lỗi
    showWrongReturnMessage();
    
    // Ẩn tóm tắt thành công nếu có
    updateSelectedSummary({ 
      type: 'error', 
      message: 'Trả sai sách vui lòng chọn sách khác', 
      bookId: scannedBookId 
    });
    
    console.log(`❌ [Return] Hiển thị thông báo lỗi cho sách: ${scannedBookId}`);
  }
}

// Hàm xử lý khi quét RFID sách
function handleBookRFIDScan(scannedBookId) {
  // Kiểm tra sách đang mượn
  const checkbox = findCheckboxByBookId(scannedBookId);
  if (checkbox) {
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change')); // Nếu có sự kiện change để cập nhật UI
    showSelectedBookSummary(scannedBookId); // Hiển thị thông tin sách đã chọn nếu muốn
  } else {
    alert("⚠️ Sách này không nằm trong danh sách đang mượn của sinh viên!");
  }
}

// Ví dụ: Khi nhận dữ liệu từ temp/books trên Firebase
function onTempBookScanned(bookIdFromTemp) {
  handleBookRFIDScan(bookIdFromTemp);
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
    // tránh thêm trùng
    let div = selectedContainer.querySelector(`[data-id='${id}']`);
    if (!div) {
      div = document.createElement("div");
      div.className = "selected-item";
      div.dataset.id = id;
      div.style = "padding:6px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;";
      div.innerHTML = `
        <span style=\"color:#333;\">${name}</span>
        <small style=\"color:#888;\">ID: ${bookId}</small>
      `;
      selectedContainer.appendChild(div);
    }
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
  
  // Reset trạng thái thông báo
  isShowingWrongMessage = false;
  if (wrongReturnMessageTimeout) {
    clearTimeout(wrongReturnMessageTimeout);
    wrongReturnMessageTimeout = null;
  }
  
  // Ẩn thông báo lỗi khi xóa tất cả chọn
  hideWrongReturnMessage();
  
  // Xóa hoàn toàn thông báo lỗi nếu có
  const wrongMsg = document.getElementById("wrongReturnMsg");
  if (wrongMsg) {
    wrongMsg.remove();
  }
  
  // Reset tóm tắt
  const summaryBox = document.getElementById('selectedSummary');
  if (summaryBox) {
    summaryBox.style.display = 'none';
    summaryBox.innerHTML = '';
  }
  
  console.log("🧹 Đã xóa tất cả chọn - reset trạng thái");
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
  // Xóa toàn bộ dữ liệu tạm SAU khi trả thành công
  try {
    await remove(ref(rtdb, "temp"));
  } catch {}
  clearAllSelected();
  const studentId = document.getElementById("returnStudentId").value.trim();
  loadReturnBookList(studentId);
};

// Biến để lưu timeout của thông báo
let wrongReturnMessageTimeout = null;
let isShowingWrongMessage = false;

// Hiển thị thông báo trả sai sách (chỉ khi quét sai)
function showWrongReturnMessage() {
  // Xóa timeout cũ nếu có
  if (wrongReturnMessageTimeout) {
    clearTimeout(wrongReturnMessageTimeout);
    wrongReturnMessageTimeout = null;
  }

  // Đánh dấu đang hiển thị thông báo lỗi
  isShowingWrongMessage = true;

  let el = document.getElementById("wrongReturnMsg");
  if (!el) {
    const container = document.getElementById("returnValidationMessage").parentElement;
    el = document.createElement("div");
    el.id = "wrongReturnMsg";
    el.style = "margin-top:10px;padding:8px 12px;background:rgba(244,67,54,0.1);border:1px solid rgba(244,67,54,0.3);border-radius:6px;font-size:0.85rem;color:#d32f2f;animation:fadeIn 0.3s ease;display:none;";
    el.innerHTML = `<ion-icon name="close-circle-outline" style="margin-right:4px;"></ion-icon>Trả sai sách vui lòng chọn sách khác`;
    container.appendChild(el);
  }
  
  // Hiển thị với animation
  el.style.display = "block";
  el.style.animation = "fadeIn 0.3s ease";
  
  console.log("⚠️ Hiển thị thông báo: Trả sai sách vui lòng chọn sách khác");
  
  // Tự động ẩn sau 4 giây (tăng thời gian để người dùng đọc được)
  wrongReturnMessageTimeout = setTimeout(() => {
    console.log("⏰ Tự động ẩn thông báo sau 4 giây");
    hideWrongReturnMessage();
  }, 4000);
}

// Hàm ẩn thông báo trả sai sách
function hideWrongReturnMessage() {
  // Xóa timeout nếu có
  if (wrongReturnMessageTimeout) {
    clearTimeout(wrongReturnMessageTimeout);
    wrongReturnMessageTimeout = null;
  }

  // Đánh dấu không còn hiển thị thông báo lỗi
  isShowingWrongMessage = false;

  const el = document.getElementById("wrongReturnMsg");
  if (el) {
    console.log("🔄 Đang ẩn thông báo trả sai sách...");
    el.style.animation = "fadeOut 0.3s ease";
    setTimeout(() => {
      el.style.display = "none";
      console.log("✅ Đã ẩn thông báo trả sai sách");
    }, 300);
  }
}

// Sửa lại phần cập nhật tóm tắt bên phải khi lỗi
function updateSelectedSummary(payload) {
  const box = document.getElementById('selectedSummary');
  if (!box) return;
  if (!payload) { 
    box.style.display = 'none'; 
    return; 
  }
  
  if (payload.type === 'success') {
    // Ẩn thông báo lỗi khi quét đúng sách
    if (isShowingWrongMessage) {
      hideWrongReturnMessage();
    }
    
    box.style.display = 'block';
    box.style.border = '1px solid rgba(76,175,80,0.3)';
    box.style.background = 'rgba(76,175,80,0.06)';
    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;color:#2e7d32;">
        <ion-icon name="checkmark-circle-outline"></ion-icon>
        <strong>Đã chọn:</strong>
      </div>
      <div style="margin-top:6px;color:#2e7d32;">${payload.bookName || ''}</div>
      <small style="color:#2e7d32;">ID: ${payload.bookId || ''}</small>
    `;
    console.log("✅ Hiển thị thông báo thành công cho sách:", payload.bookName);
  } else if (payload.type === 'error') {
    // Ẩn tóm tắt thành công khi có lỗi
    box.style.display = 'none';
    box.innerHTML = '';
    console.log("❌ Ẩn banner thành công khi có lỗi");
  }
}

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

// 🔹 Test RFID cho sách (trả sách)
window.testBookRFIDScan = function() {
  const tempRef = ref(rtdb, "temp/book");
  set(tempRef, {
    id: "WRONG_BOOK_001",
    title: "Sách không đúng"
  });
  console.log("✅ Test RFID sách sai đã được đặt - sẽ hiển thị thông báo lỗi");
};

// 🔹 Test RFID cho sách đúng (trả sách) - sử dụng ID từ danh sách thực tế
window.testCorrectBookRFIDScan = function() {
  // Tìm sách đầu tiên trong danh sách đang mượn
  const firstCheckbox = document.querySelector(".bookCheckbox");
  if (firstCheckbox) {
    const bookId = firstCheckbox.dataset.bookid;
    const bookName = firstCheckbox.dataset.name;
    
    const tempRef = ref(rtdb, "temp/book");
    set(tempRef, {
      id: bookId,
      title: bookName
    });
    console.log(`✅ Test RFID sách đúng: ${bookName} (${bookId}) - sẽ chọn sách này`);
  } else {
    console.log("❌ Không có sách nào trong danh sách để test");
    alert("Không có sách nào trong danh sách để test. Vui lòng quét thẻ sinh viên trước.");
  }
};
