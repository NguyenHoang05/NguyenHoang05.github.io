// ✅ returnBook.js - Xử lý trả sách & giao tiếp Firebase
console.log("✅ returnBook.js loaded");

import { db, rtdb } from './firebase.js'; // Đảm bảo đúng đường dẫn import
import {
  collection, getDocs, query, where, doc, updateDoc, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  ref, onValue, update, remove, set
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Cờ điều khiển mở modal Trả sách để tránh xung đột với phần Mượn
let openReturnEnabled = false;
onValue(ref(rtdb, "temp/openReturn"), (snapshot) => {
  openReturnEnabled = !!snapshot.val();
  console.log("Cờ mở modal Trả sách:", openReturnEnabled);
});

// Biến để lưu timeout của thông báo lỗi
let wrongReturnMessageTimeout = null;
let isShowingWrongMessage = false;

// ======================================================
// 🔹 Các hàm Helper (Giữ nguyên)
// ======================================================

function extractStudentId(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') return payload;
  if (payload.iduser) return payload.iduser;
  if (payload.id) return payload.id;
  if (payload.ID) return payload.ID;
  if (payload.mssv) return payload.mssv;
  return null;
}

function extractBookId(payload) {
  if (!payload) return null;
  if (typeof payload === 'object') {
    if (payload.id || payload.bookId || payload.ID) {
      return payload.id || payload.bookId || payload.ID;
    }
    const keys = Object.keys(payload);
    if (keys.length === 1 && typeof payload[keys[0]] === 'object') {
      const v = payload[keys[0]];
      return v.id || v.bookId || v.ID || null;
    }
    if (payload.rfid && typeof payload.rfid === 'string') return payload.rfid;
  }
  if (typeof payload === 'string') return payload;
  return null;
}

function findCheckboxByBookId(bookId) {
  const safeBookId = bookId ? bookId.replace(/"/g, '\\"') : '';
  return document.querySelector(`.bookCheckbox[data-bookid="${safeBookId}"]`);
}

// ======================================================
// 🔹 Lắng nghe RFID (Giữ nguyên)
// ======================================================
// ... (Tất cả logic lắng nghe onValue giữ nguyên)

onValue(ref(rtdb, "temp/student"), async (snapshot) => {
  const s = snapshot.val();
  if (!s) return;

  const studentId = extractStudentId(s);
  if (!studentId) return;
  console.log("📡 [Return] Quét RFID sinh viên:", studentId);

  const modal = document.getElementById("returnBookModal");
  if (openReturnEnabled && modal && modal.style.display !== "flex") {
    window.openReturnBookForm();
  }

  const idInput = document.getElementById("returnStudentId");
  if (idInput) idInput.value = studentId;

  await loadStudentInfo(studentId);
  await loadReturnBookList(studentId);
});

onValue(ref(rtdb, "temp/books"), async (snapshot) => {
  const payload = snapshot.val();
  console.log('[Return][temp/books] payload =', payload);
  if (!payload) return;

  if (typeof payload === 'object' && !Array.isArray(payload)) {
    const keys = Object.keys(payload);
    for (const k of keys) {
      const it = payload[k];
      let scannedBookId = extractBookId(it) || k;
      
      if (scannedBookId) {
        console.log('📡 [Return] Quét RFID sách (temp/books child):', scannedBookId);
        await handleBookScan(scannedBookId);
        
        try {
            await remove(ref(rtdb, `temp/books/${k}`));
            console.log(`🗑️ Đã xóa temp/books/${k} sau khi xử lý`);
        } catch (e) { console.error("Lỗi xóa node sách con:", e); }
      }
    }
    return;
  }
  
  let scannedBookId = extractBookId(payload);
  if (!scannedBookId) return;
  console.log('📡 [Return] Quét RFID sách (temp/books):', scannedBookId);
  handleBookScan(scannedBookId);
});

onValue(ref(rtdb, "temp/book"), async (snapshot) => {
  const b = snapshot.val();
  if (!b) return;

  const scannedBookId = extractBookId(b);
  console.log('[Return][temp/book] payload =', b, '→ scannedId =', scannedBookId);
  if (!scannedBookId) return;
  console.log("📡 [Return] Quét RFID sách:", scannedBookId);

  handleBookScan(scannedBookId);
});

onValue(ref(rtdb, "book1"), async (snapshot) => {
  const v = snapshot.val();
  if (!v) return;
  const scannedBookId = extractBookId(v);
  if (!scannedBookId) return;
  console.log("📡 [Return] Quét RFID sách (root/book1):", scannedBookId);

  handleBookScan(scannedBookId);
});

onValue(ref(rtdb, "temp"), async (snapshot) => {
  const t = snapshot.val();
  if (!t) return;

  if (t.student || t.book || t.books) return;

  const legacyStudentId = t.ID || t.iduser || t.id;
  if (legacyStudentId && typeof legacyStudentId === 'string') {
    const modal = document.getElementById("returnBookModal");
    if (openReturnEnabled && modal && modal.style.display !== "flex") {
      window.openReturnBookForm();
    }
    const idInput = document.getElementById("returnStudentId");
    if (idInput) idInput.value = legacyStudentId;
    await loadStudentInfo(legacyStudentId);
    await loadReturnBookList(legacyStudentId);
    return;
  }

  const legacyBookId = t.bookId || t.id || null;
  if (legacyBookId) {
    handleBookScan(legacyBookId);
  }
});


// ======================================================
// 🔹 Xử lý quét sách với logic cải tiến (Giữ nguyên)
// ======================================================
function handleBookScan(scannedBookId) {
  console.log(`🔍 [Return] Xử lý quét sách: ${scannedBookId}`);
  
  const checkbox = findCheckboxByBookId(scannedBookId);
  
  if (checkbox) {
    console.log(`✅ [Return] Sách đúng: ${checkbox.dataset.name}`);
    
    if (isShowingWrongMessage) {
      hideWrongReturnMessage();
    }
    
    const wasChecked = checkbox.checked;
    checkbox.checked = true;
    if (!wasChecked) {
      window.toggleSelectedBook(checkbox);
    }
    
    updateSelectedSummary({ 
      bookName: checkbox.dataset.name, 
      bookId: scannedBookId, 
      type: 'success' 
    });
    
    console.log(`✅ [Return] Đã chọn sách: ${checkbox.dataset.name}`);
  } else {
    console.log(`❌ [Return] Sách sai: ${scannedBookId}`);
    
    showWrongReturnMessage();
    
    updateSelectedSummary({ 
      type: 'error', 
      message: 'Trả sai sách vui lòng chọn sách khác', 
      bookId: scannedBookId 
    });
    
    console.log(`❌ [Return] Hiển thị thông báo lỗi cho sách: ${scannedBookId}`);
  }
}

// ======================================================
// 🔹 Mở / đóng modal (Cập nhật logic dọn dẹp RTDB)
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
  
  const wrongMsg = document.getElementById("wrongReturnMsg");
  if (wrongMsg) {
    wrongMsg.style.display = "none";
  }
  
  // Reset tóm tắt
  const summaryBox = document.getElementById('selectedSummary');
  if (summaryBox) {
    summaryBox.style.display = 'none';
    summaryBox.innerHTML = '';
  }

  // 💡 LOGIC CẬP NHẬT: DỌN DẸP NODE SÁCH VÀ CỜ TRẢ SÁCH KHI MỞ FORM
  // Chỉ xóa các node sách và cờ mở form để chuẩn bị cho lần quét mới.
  // GIỮ LẠI temp/student để bên Mượn sách có thể sử dụng (nếu có).
  try {
    remove(ref(rtdb, "temp/openReturn")).catch(() => {});
    remove(ref(rtdb, "temp/book")).catch(() => {});
     remove(ref(rtdb, "temp/bookBorrow")).catch(() => {});
    remove(ref(rtdb, "temp/books")).catch(() => {});
    remove(ref(rtdb, "book1")).catch(() => {});
    console.log("🧹 Dọn dẹp cờ và các node sách (temp/book, temp/books, book1) khi mở form Trả sách.");
  } catch (e) {
    console.error("Lỗi khi dọn dẹp RTDB khi mở form:", e);
  }
  
  console.log("📖 Đã mở form trả sách - reset trạng thái");
};

window.closeReturnBookForm = function() {
  document.getElementById("returnBookModal").style.display = "none";
  
  isShowingWrongMessage = false;
  if (wrongReturnMessageTimeout) {
    clearTimeout(wrongReturnMessageTimeout);
    wrongReturnMessageTimeout = null;
  }
  
  hideWrongReturnMessage();
  
  const wrongMsg = document.getElementById("wrongReturnMsg");
  if (wrongMsg) {
    wrongMsg.style.display = "none";
  }
  
  const summaryBox = document.getElementById('selectedSummary');
  if (summaryBox) {
    summaryBox.style.display = 'none';
    summaryBox.innerHTML = '';
  }
  
  console.log("❌ Đã đóng form trả sách - reset trạng thái");
};

// ======================================================
// 🔹 Lấy thông tin sinh viên từ Firestore (Giữ nguyên)
// ======================================================
async function loadStudentInfo(studentId) {
  try {
    const q = query(collection(db, "users"), where("iduser", "==", studentId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      alert("⚠️ Không tìm thấy sinh viên có ID: " + studentId);
      document.getElementById("returnStudentName").value = "Không tìm thấy";
      document.getElementById("returnMssv").value = "N/A";
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
// 🔹 Load danh sách sách đang mượn (Giữ nguyên)
// ======================================================
async function loadReturnBookList(studentId = null) {
  try {
    console.log("📚 Đang tải danh sách sách đang mượn...");

    isShowingWrongMessage = false;
    if (wrongReturnMessageTimeout) {
      clearTimeout(wrongReturnMessageTimeout);
      wrongReturnMessageTimeout = null;
    }
    hideWrongReturnMessage();
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
// 🔹 Hiển thị danh sách sách đang mượn (Giữ nguyên)
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
    window.clearAllSelected(); 
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

// ======================================================
// 🔹 Chọn / bỏ chọn sách (Giữ nguyên)
// ======================================================
window.toggleAllBooks = function(checkbox) {
  const all = document.querySelectorAll(".bookCheckbox");
  all.forEach(c => {
    c.checked = checkbox.checked;
    window.toggleSelectedBook(c);
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
    let div = selectedContainer.querySelector(`[data-id='${id}']`);
    if (!div) {
      div = document.createElement("div");
      div.className = "selected-item";
      div.dataset.id = id;
      div.style = "padding:6px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;";
      div.innerHTML = `
        <span style="color:#333;">${name}</span>
        <small style="color:#888;">ID: ${bookId}</small>
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
  
  updateSelectedSummary(null);
};


// ======================================================
// 🔹 Xóa tất cả chọn (Giữ nguyên)
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
  
  isShowingWrongMessage = false;
  if (wrongReturnMessageTimeout) {
    clearTimeout(wrongReturnMessageTimeout);
    wrongReturnMessageTimeout = null;
  }
  
  hideWrongReturnMessage();
  
  const wrongMsg = document.getElementById("wrongReturnMsg");
  if (wrongMsg) {
    wrongMsg.style.display = "none";
  }
  
  const summaryBox = document.getElementById('selectedSummary');
  if (summaryBox) {
    summaryBox.style.display = 'none';
    summaryBox.innerHTML = '';
  }
  
  console.log("🧹 Đã xóa tất cả chọn - reset trạng thái");
};

// ======================================================
// 🔹 Nút Trả Sách (Cập nhật logic dọn dẹp RTDB)
// ======================================================
window.submitReturnBookForm = async function(e) {
  e.preventDefault();
  const selected = document.querySelectorAll("#selectedBooksItems .selected-item");
  const studentId = document.getElementById("returnStudentId").value.trim();

  if (selected.length === 0) {
    document.getElementById("returnValidationMessage").style.display = "block";
    setTimeout(() => {
      document.getElementById("returnValidationMessage").style.display = "none";
    }, 2000);
    return;
  }
  
  const submitBtn = document.getElementById("returnSelectedBtn");
  submitBtn.disabled = true;
  submitBtn.style.opacity = "0.5";

  let successCount = 0;
  for (const div of selected) {
    const historyId = div.dataset.id;
    const bookName = div.querySelector('span').textContent;
    const result = await processReturnBook(historyId, studentId, bookName);
    if (result) {
        successCount++;
    }
  }

  alert(`✅ Trả thành công ${successCount} cuốn sách!`);
  
  // 💡 LOGIC CẬP NHẬT: CHỈ XÓA NODE CON LIÊN QUAN ĐẾN TRẢ SÁCH
  // Giữ lại node /temp nếu nó có dữ liệu không liên quan đến Trả sách (như cờ hoặc dữ liệu Mượn sách đang dùng).
  try {
    await remove(ref(rtdb, "temp/student"));
    await remove(ref(rtdb, "temp/book"));
    await remove(ref(rtdb, "temp/books"));
    await remove(ref(rtdb, "book1")); // Xóa node legacy
    
    console.log("🗑️ Đã xóa dữ liệu tạm của Trả sách (/temp/student, /temp/book, /temp/books, book1) để tránh xung đột với Mượn sách.");
  } catch (err) {
      console.error("❌ Lỗi khi xóa dữ liệu tạm của Trả sách:", err);
  }
  
  window.clearAllSelected();
  loadReturnBookList(studentId);
  submitBtn.disabled = false;
  submitBtn.style.opacity = "1";
};

// ======================================================
// 🔹 Xử lý từng sách khi trả (Giữ nguyên)
// ======================================================
async function processReturnBook(historyId, studentId, bookName) {
  try {
    const returnDate = new Date().toISOString().split("T")[0];
    const historyDocRef = doc(db, "history", historyId);
    const historyDoc = await getDoc(historyDocRef);
    
    if (!historyDoc.exists() || historyDoc.data().status !== 'Đang mượn') {
        console.warn(`⚠️ Lịch sử ID ${historyId} không tồn tại hoặc đã được trả.`);
        return false;
    }

    const data = historyDoc.data();
    const { bookId } = data;

    const firestoreUpdates = [
      updateDoc(historyDocRef, {
        status: "Đã trả",
        actualReturnDate: returnDate
      }),
      updateDoc(doc(db, "books", bookId), { status: "Còn" }),
      // XÓA sách khỏi subcollection users/[studentId]/books
      deleteDoc(doc(db, "users", studentId, "books", bookId)).catch((e) => {
          console.warn(`Lỗi khi xóa sub-doc user/${studentId}/books/${bookId}:`, e.message);
      }),
    ];
    
    const rtdbUpdates = [
      update(ref(rtdb, `history/${historyId}`), {
        status: "Đã trả",
        actualReturnDate: returnDate
      }),
      update(ref(rtdb, `books/${bookId}`), { status: "Còn" }),
      // XÓA sách khỏi sub-node users/[studentId]/books
      remove(ref(rtdb, `users/${studentId}/books/${bookId}`)),
    ];

    await Promise.all([...firestoreUpdates, ...rtdbUpdates]);

    console.log(`✅ Trả sách ${bookName} (${bookId}) thành công`);
    return true;

  } catch (err) {
    console.error("❌ Lỗi khi trả sách:", err);
    alert(`❌ Lỗi khi trả sách ${bookName}: ${err.message}`);
    return false;
  }
}

// ======================================================
// 🔹 Xử lý thông báo (Giữ nguyên)
// ======================================================
function showWrongReturnMessage() {
  if (wrongReturnMessageTimeout) {
    clearTimeout(wrongReturnMessageTimeout);
    wrongReturnMessageTimeout = null;
  }

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
  
  el.style.display = "block";
  el.style.animation = "fadeIn 0.3s ease";
  
  console.log("⚠️ Hiển thị thông báo: Trả sai sách vui lòng chọn sách khác");
  
  wrongReturnMessageTimeout = setTimeout(() => {
    console.log("⏰ Tự động ẩn thông báo sau 4 giây");
    hideWrongReturnMessage();
  }, 4000);
}

function hideWrongReturnMessage() {
  if (wrongReturnMessageTimeout) {
    clearTimeout(wrongReturnMessageTimeout);
    wrongReturnMessageTimeout = null;
  }

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

function updateSelectedSummary(payload) {
  const box = document.getElementById('selectedSummary');
  if (!box) return;
  if (!payload || payload.type === 'error') { 
    box.style.display = 'none'; 
    box.innerHTML = '';
    console.log("❌ Ẩn banner thành công khi có lỗi hoặc reset");
    
    if (payload && payload.type === 'error') {
        showWrongReturnMessage();
    }
    return; 
  }
  
  if (payload.type === 'success') {
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
  } 
}

window.loadReturnBookList = loadReturnBookList;
// ... (Giữ nguyên các hàm test RFID nếu bạn cần)