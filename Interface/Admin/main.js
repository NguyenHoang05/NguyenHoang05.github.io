// Admin Interface Main JavaScript
// Xử lý các chức năng chính của giao diện Admin

// Khởi tạo khi trang load
document.addEventListener("DOMContentLoaded", function () {
  console.log("Admin interface loaded");
  initializeAdminInterface();
});

// Khởi tạo giao diện Admin
function initializeAdminInterface() {
  // Thiết lập navigation
  setupNavigation();

  // Load dữ liệu ban đầu
  loadInitialData();

  // Thiết lập event listeners
  setupEventListeners();
}

// Thiết lập navigation
function setupNavigation() {
  const listItems = document.querySelectorAll(".list");

  listItems.forEach((item, index) => {
    item.addEventListener("click", function () {
      // Xóa active class từ tất cả items
      listItems.forEach((li) => li.classList.remove("active"));

      // Thêm active class cho item được click
      this.classList.add("active");

      // Hiển thị section tương ứng
      const title = this.querySelector(".title").textContent.trim();
      showSection(title);
    });
  });

  // Mặc định kích hoạt Home
  if (listItems.length > 0) {
    listItems[0].classList.add("active");
    showSection("Home");
  }
}

// Hiển thị section tương ứng
function showSection(sectionName) {
  // Ẩn tất cả sections
  const sections = [
    "homeSection",
    "infoSection",
    "historySection",
    "listSection",
    "analysisSection",
    "helpSection",
    "passwordSection",
    "signoutSection",
  ];

  sections.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.style.display = "none";
    }
  });

  // Hiển thị section được chọn
  let targetSectionId = "";
  switch (sectionName) {
    case "Home":
      targetSectionId = "homeSection";
      break;
    case "Thông tin":
      targetSectionId = "infoSection";
      loadInfoData();
      break;
    case "Thống kê":
      targetSectionId = "historySection";
      loadHistory();
      break;
    case "List":
      targetSectionId = "listSection";
      loadBookList();
      break;
    case "Analysis":
      targetSectionId = "analysisSection";
      loadAnalysis();
      break;
    case "Help":
      targetSectionId = "helpSection";
      break;
    case "Password":
      targetSectionId = "passwordSection";
      break;
    case "Sign out":
      targetSectionId = "signoutSection";
      updateCurrentTime();
      break;
    default:
      targetSectionId = "homeSection";
  }

  const targetSection = document.getElementById(targetSectionId);
  if (targetSection) {
    targetSection.style.display = "block";
  }
}

// Thiết lập event listeners
function setupEventListeners() {
  // Event listeners cho các form
  setupFormListeners();

  // Event listeners cho các modal
  setupModalListeners();

  // Event listeners cho các nút
  setupButtonListeners();
}

// Thiết lập form listeners
function setupFormListeners() {
  // Form mượn sách
  const borrowForm = document.getElementById("borrowForm");
  if (borrowForm) {
    borrowForm.addEventListener("submit", handleBorrowSubmit);
  }

  // Form thêm sách
  const addBookForm = document.getElementById("addBookForm");
  if (addBookForm) {
    addBookForm.addEventListener("submit", handleAddBookSubmit);
  }

  // Form đổi mật khẩu
  const changePasswordForm = document.getElementById("changePasswordForm");
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", handlePasswordChange);
  }
}

// Thiết lập modal listeners
function setupModalListeners() {
  // Modal mượn sách
  const borrowModal = document.getElementById("borrowModal");
  if (borrowModal) {
    borrowModal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeBorrowForm();
      }
    });
  }

  // Modal thêm sách
  const addBookModal = document.getElementById("addBookModal");
  if (addBookModal) {
    addBookModal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeAddBookForm();
      }
    });
  }

  // Modal trả sách
  const returnBookModal = document.getElementById("returnBookModal");
  if (returnBookModal) {
    returnBookModal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeReturnBookForm();
      }
    });
  }
}

// Thiết lập button listeners
function setupButtonListeners() {
  // Nút toggle password visibility
  const passwordToggles = document.querySelectorAll(
    '[onclick^="togglePasswordVisibility"]'
  );
  passwordToggles.forEach((button) => {
    button.addEventListener("click", function () {
      const inputId = this.getAttribute("onclick").match(/'([^']+)'/)[1];
      togglePasswordVisibility(inputId);
    });
  });
}

// Xử lý submit form mượn sách
function handleBorrowSubmit(event) {
  event.preventDefault();

  // Lấy thông tin sinh viên
  const studentInfo = {
    studentName: document.getElementById("studentName").value,
    studentId: document.getElementById("studentId").value,
    borrowDate: document.getElementById("borrowDate").value,
    returnDate: document.getElementById("returnDate").value,
  };

  // Lấy danh sách sách
  const books = getBooksFromForm();

  const formData = {
    ...studentInfo,
    books: books,
  };

  // Validate form data
  if (!validateBorrowForm(formData)) {
    return;
  }

  // Gửi dữ liệu lên Firebase
  submitBorrowToFirebase(formData);
}

// Lấy danh sách sách từ form
function getBooksFromForm() {
  const bookRows = document.querySelectorAll(".book-row");
  const books = [];

  bookRows.forEach((row) => {
    const bookId = row.querySelector('input[name="bookId"]').value.trim();
    const bookName = row.querySelector('input[name="bookName"]').value.trim();

    if (bookId && bookName) {
      books.push({
        bookId: bookId,
        bookName: bookName,
      });
    }
  });

  return books;
}

// Xử lý submit form thêm sách
function handleAddBookSubmit(event) {
  event.preventDefault();

  const formData = {
    bookName: document.getElementById("bookName").value,
    bookId: document.getElementById("bookIdAdd").value,
    bookAuthor: document.getElementById("bookAuthor").value,
    bookGenre: document.getElementById("bookGenre").value,
    bookShelf: document.getElementById("bookShelf").value,
  };

  // Validate form data
  if (!validateAddBookForm(formData)) {
    return;
  }

  // Gửi dữ liệu lên Firebase (sẽ được implement sau)
  submitAddBookToFirebase(formData);
}

// Xử lý đổi mật khẩu
function handlePasswordChange(event) {
  event.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Validate password change
  if (!validatePasswordChange(currentPassword, newPassword, confirmPassword)) {
    return;
  }

  // Cập nhật mật khẩu (sẽ được implement sau)
  updatePasswordInFirebase(currentPassword, newPassword);
}

// Validate form mượn sách
function validateBorrowForm(data) {
  // Kiểm tra thông tin sinh viên
  if (!data.studentName || !data.studentId) {
    showAlert("Vui lòng điền đầy đủ thông tin sinh viên!", "error");
    return false;
  }

  // Kiểm tra ngày tháng
  if (data.borrowDate >= data.returnDate) {
    showAlert("Ngày trả phải sau ngày mượn!", "error");
    return false;
  }

  // Kiểm tra danh sách sách
  if (!data.books || data.books.length === 0) {
    showAlert("Vui lòng thêm ít nhất một cuốn sách!", "error");
    return false;
  }

  // Kiểm tra từng cuốn sách
  for (let i = 0; i < data.books.length; i++) {
    const book = data.books[i];
    if (!book.bookId || !book.bookName) {
      showAlert(
        `Vui lòng điền đầy đủ thông tin cho sách thứ ${i + 1}!`,
        "error"
      );
      return false;
    }
  }

  // Kiểm tra trùng lặp ID sách
  const bookIds = data.books.map((book) => book.bookId);
  const uniqueBookIds = [...new Set(bookIds)];
  if (bookIds.length !== uniqueBookIds.length) {
    showAlert("Không được mượn cùng một cuốn sách nhiều lần!", "error");
    return false;
  }

  return true;
}

// Validate form thêm sách
function validateAddBookForm(data) {
  if (
    !data.bookName ||
    !data.bookId ||
    !data.bookAuthor ||
    !data.bookGenre ||
    !data.bookShelf
  ) {
    showAlert("Vui lòng điền đầy đủ thông tin!", "error");
    return false;
  }

  return true;
}

// Validate đổi mật khẩu
function validatePasswordChange(current, newPass, confirm) {
  if (!current || !newPass || !confirm) {
    showAlert("Vui lòng điền đầy đủ thông tin!", "error");
    return false;
  }

  if (newPass !== confirm) {
    showAlert("Mật khẩu xác nhận không khớp!", "error");
    return false;
  }

  if (newPass.length < 8) {
    showAlert("Mật khẩu mới phải có ít nhất 8 ký tự!", "error");
    return false;
  }

  return true;
}

// Toggle password visibility
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(inputId + "Icon");

  if (input && icon) {
    if (input.type === "password") {
      input.type = "text";
      icon.name = "eye-off-outline";
    } else {
      input.type = "password";
      icon.name = "eye-outline";
    }
  }
}

// Load dữ liệu ban đầu
function loadInitialData() {
  // Load thống kê
  loadStatistics();

  // Load danh sách sách
  loadBookList();
}

// Load thống kê
function loadStatistics() {
  // Implement load statistics from Firebase
  console.log("Loading statistics...");
}

// Load danh sách sách
function loadBookList() {
  // Implement load book list from Firebase
  console.log("Loading book list...");
}

// Load lịch sử
function loadHistory() {
  // Implement load history from Firebase
  console.log("Loading history...");
}

// Load thông tin hệ thống - sử dụng hàm từ info.js
let studentsData = []; // Mảng lưu dữ liệu sinh viên

// Hàm load dữ liệu sinh viên từ Firebase (ví dụ Firestore)
export async function loadInfoData() {
  // ...lấy dữ liệu từ Firebase, ví dụ:
  // const snapshot = await firebase.firestore().collection('students').get();
  // studentsData = snapshot.docs.map(doc => doc.data());
  // Nếu đã có studentsData thì không cần gọi lại
  renderStudentTable(studentsData);
}

// Hàm render bảng sinh viên
function renderStudentTable(data) {
  const tbody = document.getElementById("infoBody");
  tbody.innerHTML = "";
  data.forEach((student) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td style="padding:12px 8px;border:1px solid #ddd;">${student.name}</td>
            <td style="padding:12px 8px;border:1px solid #ddd;">${student.studentId}</td>
        `;
    tbody.appendChild(tr);
  });
}

// Xử lý tìm kiếm và autocomplete
const searchInput = document.getElementById("studentSearch");
const suggestionsBox = document.getElementById("searchSuggestions");

searchInput.addEventListener("input", function () {
  const query = this.value.trim().toLowerCase();
  if (!query) {
    suggestionsBox.style.display = "none";
    renderStudentTable(studentsData);
    return;
  }
  // Lọc tên sinh viên theo query
  const matches = studentsData.filter((sv) =>
    sv.name.toLowerCase().includes(query)
  );
  // Hiển thị đề xuất
  suggestionsBox.innerHTML = "";
  matches.slice(0, 8).forEach((sv) => {
    const li = document.createElement("li");
    li.textContent = sv.name;
    li.style.padding = "10px 14px";
    li.style.cursor = "pointer";
    li.onmouseover = () => (li.style.background = "#f5f5f5");
    li.onmouseout = () => (li.style.background = "white");
    li.onclick = () => {
      searchInput.value = sv.name;
      suggestionsBox.style.display = "none";
      renderStudentTable([sv]);
    };
    suggestionsBox.appendChild(li);
  });
  suggestionsBox.style.display = matches.length ? "block" : "none";
  // Nếu chỉ gõ mà chưa chọn, bảng sẽ lọc theo tên
  renderStudentTable(matches);
});

// Ẩn đề xuất khi click ra ngoài
document.addEventListener("click", function (e) {
  if (!searchInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
    suggestionsBox.style.display = "none";
  }
});

// Submit mượn sách lên Firebase
function submitBorrowToFirebase(data) {
  // Implement Firebase submission
  console.log("Submitting borrow to Firebase:", data);
  showAlert("Đã mượn sách thành công!", "success");
  closeBorrowForm();
}

// Submit thêm sách lên Firebase
function submitAddBookToFirebase(data) {
  // Implement Firebase submission
  console.log("Submitting add book to Firebase:", data);
  showAlert("Đã thêm sách thành công!", "success");
  closeAddBookForm();
}

// Cập nhật mật khẩu trong Firebase
function updatePasswordInFirebase(current, newPass) {
  // Implement Firebase password update
  console.log("Updating password in Firebase");
  showAlert("Đã thay đổi mật khẩu thành công!", "success");
  document.getElementById("changePasswordForm").reset();
}

// Hiển thị thông báo
function showAlert(message, type = "info") {
  // Tạo thông báo đẹp
  const alertDiv = document.createElement("div");
  alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;

  switch (type) {
    case "success":
      alertDiv.style.background = "linear-gradient(135deg, #4CAF50, #66BB6A)";
      break;
    case "error":
      alertDiv.style.background = "linear-gradient(135deg, #f44336, #e57373)";
      break;
    default:
      alertDiv.style.background = "linear-gradient(135deg, #2196F3, #64B5F6)";
  }

  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);

  // Tự động ẩn sau 3 giây
  setTimeout(() => {
    alertDiv.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => {
      document.body.removeChild(alertDiv);
    }, 300);
  }, 3000);
}

// Cập nhật thời gian hiện tại
function updateCurrentTime() {
  const timeElement = document.getElementById("currentTime");
  if (timeElement) {
    const now = new Date();
    const timeString = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateString = now.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    timeElement.textContent = `${timeString} - ${dateString}`;
  }
}

// Hàm đóng form mượn sách
function closeBorrowForm() {
  document.getElementById("borrowModal").style.display = "none";
  document.getElementById("borrowForm").reset();

  // Reset về 1 sách duy nhất
  resetBookRows();
}

// Reset danh sách sách về 1 sách duy nhất
function resetBookRows() {
  const container = document.getElementById("booksContainer");
  const firstRow = container.querySelector(".book-row");

  // Xóa tất cả các row trừ row đầu tiên
  const allRows = container.querySelectorAll(".book-row");
  allRows.forEach((row, index) => {
    if (index > 0) {
      row.remove();
    }
  });

  // Reset input của row đầu tiên
  if (firstRow) {
    firstRow.querySelector('input[name="bookId"]').value = "";
    firstRow.querySelector('input[name="bookName"]').value = "";
  }

  // Cập nhật số lượng sách
  updateBookCount();
}

// Thêm một row sách mới
function addBookRow() {
  const container = document.getElementById("booksContainer");
  const newRow = document.createElement("div");

  newRow.className = "book-row";
  newRow.style.cssText =
    "display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:10px;align-items:end;padding:15px;margin-bottom:10px;background:white;border:2px solid #e1e5e9;border-radius:8px;transition:all 0.3s;";
  newRow.onmouseover = function () {
    this.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
  };
  newRow.onmouseout = function () {
    this.style.boxShadow = "none";
  };

  // Tính toán ngày mượn (hôm nay) và ngày trả (sau 3 tháng)
  const today = new Date();
  const returnDate = new Date(today);
  returnDate.setMonth(returnDate.getMonth() + 3); // Thêm 3 tháng

  const todayStr = today.toISOString().split("T")[0];
  const returnDateStr = returnDate.toISOString().split("T")[0];

  newRow.innerHTML = `
        <div>
            <label style="display:block;margin-bottom:5px;color:#333;font-weight:500;font-size:0.85rem;">Ngày Mượn:</label>
            <input type="date" name="borrowDate" required style="width:100%;padding:8px 12px;border:2px solid #e1e5e9;border-radius:6px;font-size:0.85rem;transition:all 0.3s;box-sizing:border-box;" onfocus="this.style.borderColor='#B20000';this.style.boxShadow='0 0 0 3px rgba(178,0,0,0.1)'" onblur="this.style.borderColor='#e1e5e9';this.style.boxShadow='none'" value="${todayStr}" readonly>
        </div>
        
        <div>
            <label style="display:block;margin-bottom:5px;color:#333;font-weight:500;font-size:0.85rem;">Ngày Trả:</label>
            <input type="date" name="returnDate" required style="width:100%;padding:8px 12px;border:2px solid #e1e5e9;border-radius:6px;font-size:0.85rem;transition:all 0.3s;box-sizing:border-box;" onfocus="this.style.borderColor='#B20000';this.style.boxShadow='0 0 0 3px rgba(178,0,0,0.1)'" onblur="this.style.borderColor='#e1e5e9';this.style.boxShadow='none'" value="${returnDateStr}" readonly>
        </div>
        
        <div>
            <label style="display:block;margin-bottom:5px;color:#333;font-weight:500;font-size:0.85rem;">ID Sách:</label>
            <input type="text" name="bookId" required style="width:100%;padding:8px 12px;border:2px solid #e1e5e9;border-radius:6px;font-size:0.85rem;transition:all 0.3s;box-sizing:border-box;" onfocus="this.style.borderColor='#B20000';this.style.boxShadow='0 0 0 3px rgba(178,0,0,0.1)'" onblur="this.style.borderColor='#e1e5e9';this.style.boxShadow='none'" placeholder="ID sách">
        </div>
        
        <div>
            <label style="display:block;margin-bottom:5px;color:#333;font-weight:500;font-size:0.85rem;">Tên Sách:</label>
            <input type="text" name="bookName" required style="width:100%;padding:8px 12px;border:2px solid #e1e5e9;border-radius:6px;font-size:0.85rem;transition:all 0.3s;box-sizing:border-box;" onfocus="this.style.borderColor='#B20000';this.style.boxShadow='0 0 0 3px rgba(178,0,0,0.1)'" onblur="this.style.borderColor='#e1e5e9';this.style.boxShadow='none'" placeholder="Tên sách">
        </div>
        
        <div style="display:flex;align-items:center;">
            <button type="button" onclick="removeBookRow(this)" style="background:linear-gradient(135deg,#f44336,#d32f2f);color:white;border:none;padding:8px 12px;border-radius:6px;font-size:0.8rem;cursor:pointer;transition:all 0.3s;display:flex;align-items:center;gap:4px;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" title="Xóa sách">
                <ion-icon name="trash-outline" style="font-size:0.9rem;"></ion-icon>
            </button>
        </div>
    `;

  container.appendChild(newRow);
  updateBookCount();

  // Focus vào input ID sách của row mới
  newRow.querySelector('input[name="bookId"]').focus();
}

// Xóa một row sách
function removeBookRow(button) {
  const row = button.closest(".book-row");
  const container = document.getElementById("booksContainer");
  const allRows = container.querySelectorAll(".book-row");

  // Chỉ cho phép xóa nếu còn nhiều hơn 1 row
  if (allRows.length > 1) {
    row.remove();
    updateBookCount();
  } else {
    showAlert("Phải có ít nhất một cuốn sách!", "warning");
  }
}

// Cập nhật số lượng sách
function updateBookCount() {
  const bookCount = document.querySelectorAll(".book-row").length;
  const countElement = document.getElementById("bookCount");
  if (countElement) {
    countElement.textContent = bookCount;
  }

  // Cập nhật màu sắc của thông báo
  const countInfo = document.getElementById("bookCountInfo");
  if (countInfo) {
    if (bookCount === 1) {
      countInfo.style.background = "rgba(33,150,243,0.1)";
      countInfo.style.border = "1px solid rgba(33,150,243,0.3)";
      countInfo.style.color = "#1976d2";
    } else if (bookCount <= 3) {
      countInfo.style.background = "rgba(76,175,80,0.1)";
      countInfo.style.border = "1px solid rgba(76,175,80,0.3)";
      countInfo.style.color = "#4CAF50";
    } else {
      countInfo.style.background = "rgba(255,152,0,0.1)";
      countInfo.style.border = "1px solid rgba(255,152,0,0.3)";
      countInfo.style.color = "#FF9800";
    }
  }
}

// Hàm load danh sách sách đang mượn (giả lập từ RFID)
function loadBorrowedBooks() {
  // Giả lập dữ liệu từ RFID - trong thực tế sẽ load từ Firebase dựa trên studentId
  const studentId = document.getElementById("returnStudentId").value.trim();

  if (!studentId) {
    showNoBooksMessage();
    return;
  }

  // Giả lập dữ liệu sách đang mượn
  const borrowedBooks = [
    {
      bookName: "Lập trình C++",
      bookId: "BOOK001",
      borrowDate: "2024-01-15",
      returnDate: "2024-01-29",
      status: "Đang mượn",
    },
    {
      bookName: "Cấu trúc dữ liệu",
      bookId: "BOOK002",
      borrowDate: "2024-01-10",
      returnDate: "2024-01-24",
      status: "Đang mượn",
    },
    {
      bookName: "Thuật toán",
      bookId: "BOOK003",
      borrowDate: "2024-01-20",
      returnDate: "2024-02-03",
      status: "Đang mượn",
    },
  ];

  const tbody = document.getElementById("borrowedBooksTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (borrowedBooks.length === 0) {
    showNoBooksMessage();
    return;
  }

  borrowedBooks.forEach((book, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td style="padding:8px;text-align:center;border:1px solid #ddd;">
        <input type="checkbox" class="book-checkbox" data-book-id="${book.bookId}" data-book-name="${book.bookName}" data-book-date="${book.borrowDate}" onchange="toggleBookSelection(this)" style="transform:scale(1.2);">
      </td>
      <td style="padding:8px;border:1px solid #ddd;font-size:0.85rem;">${book.bookName}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:0.85rem;">${book.bookId}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:0.85rem;text-align:center;">${book.borrowDate}</td>
    `;
    tbody.appendChild(row);
  });

  // Hiển thị bảng và cập nhật số lượng
  showBooksTable();
  document.getElementById("returnBookCount").textContent = borrowedBooks.length;

  // Reset danh sách đã chọn
  clearAllSelected();
}

// Hàm toggle chọn tất cả sách
function toggleAllBooks(selectAllCheckbox) {
  const bookCheckboxes = document.querySelectorAll(".book-checkbox");
  bookCheckboxes.forEach((checkbox) => {
    checkbox.checked = selectAllCheckbox.checked;
    toggleBookSelection(checkbox);
  });
}

// Hàm toggle chọn một sách
function toggleBookSelection(checkbox) {
  const bookId = checkbox.dataset.bookId;
  const bookName = checkbox.dataset.bookName;
  const bookDate = checkbox.dataset.bookDate;

  if (checkbox.checked) {
    addToSelectedBooks(bookId, bookName, bookDate);
  } else {
    removeFromSelectedBooks(bookId);
  }

  updateSelectedCount();
  updateReturnButton();
}

// Hàm thêm sách vào danh sách đã chọn
function addToSelectedBooks(bookId, bookName, bookDate) {
  const selectedItems = document.getElementById("selectedBooksItems");
  const existingItem = document.getElementById(`selected-${bookId}`);

  if (existingItem) return; // Đã tồn tại

  const item = document.createElement("div");
  item.id = `selected-${bookId}`;
  item.style.cssText = `
    display:flex;justify-content:space-between;align-items:center;padding:8px;margin-bottom:6px;
    background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3);border-radius:6px;
    transition:all 0.3s;
  `;

  item.innerHTML = `
    <div style="flex:1;">
      <div style="font-weight:600;font-size:0.85rem;color:#4CAF50;">${bookName}</div>
      <div style="font-size:0.75rem;color:#666;">ID: ${bookId} | Mượn: ${bookDate}</div>
    </div>
    <button onclick="removeFromSelectedBooks('${bookId}')" style="background:none;border:none;color:#f44336;cursor:pointer;padding:4px;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Bỏ chọn">
      <ion-icon name="close-circle" style="font-size:1.2rem;"></ion-icon>
    </button>
  `;

  selectedItems.appendChild(item);

  // Hiển thị danh sách đã chọn
  showSelectedBooksList();
}

// Hàm xóa sách khỏi danh sách đã chọn
function removeFromSelectedBooks(bookId) {
  const item = document.getElementById(`selected-${bookId}`);
  if (item) {
    item.remove();
  }

  // Bỏ tích checkbox
  const checkbox = document.querySelector(`[data-book-id="${bookId}"]`);
  if (checkbox) {
    checkbox.checked = false;
  }

  // Ẩn danh sách nếu không còn sách nào
  const selectedItems = document.getElementById("selectedBooksItems");
  if (selectedItems.children.length === 0) {
    hideSelectedBooksList();
  }

  updateSelectedCount();
  updateReturnButton();
}

// Hàm hiển thị danh sách đã chọn
function showSelectedBooksList() {
  const noSelectedMessage = document.getElementById("noSelectedBooksMessage");
  const selectedList = document.getElementById("selectedBooksList");

  if (noSelectedMessage) noSelectedMessage.style.display = "none";
  if (selectedList) selectedList.style.display = "block";
}

// Hàm ẩn danh sách đã chọn
function hideSelectedBooksList() {
  const noSelectedMessage = document.getElementById("noSelectedBooksMessage");
  const selectedList = document.getElementById("selectedBooksList");

  if (noSelectedMessage) noSelectedMessage.style.display = "flex";
  if (selectedList) selectedList.style.display = "none";
}

// Hàm xóa tất cả sách đã chọn
function clearAllSelected() {
  const selectedItems = document.getElementById("selectedBooksItems");
  if (selectedItems) {
    selectedItems.innerHTML = "";
  }

  // Bỏ tích tất cả checkbox
  const bookCheckboxes = document.querySelectorAll(".book-checkbox");
  bookCheckboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  const selectAllCheckbox = document.getElementById("selectAllBooks");
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
  }

  hideSelectedBooksList();
  updateSelectedCount();
  updateReturnButton();
}

// Hàm cập nhật số lượng sách đã chọn
function updateSelectedCount() {
  const selectedItems = document.getElementById("selectedBooksItems");
  const count = selectedItems ? selectedItems.children.length : 0;

  document.getElementById("selectedCount").textContent = count;
  document.getElementById("selectedCountBtn").textContent = count;
}

// Hàm cập nhật trạng thái nút trả sách
function updateReturnButton() {
  const returnBtn = document.getElementById("returnSelectedBtn");
  const validationMsg = document.getElementById("returnValidationMessage");
  const count = parseInt(document.getElementById("selectedCount").textContent);

  if (count > 0) {
    returnBtn.disabled = false;
    returnBtn.style.opacity = "1";
    returnBtn.style.cursor = "pointer";
    if (validationMsg) validationMsg.style.display = "none";
  } else {
    returnBtn.disabled = true;
    returnBtn.style.opacity = "0.5";
    returnBtn.style.cursor = "not-allowed";
    if (validationMsg) validationMsg.style.display = "block";
  }
}

// Hàm test quét RFID sách
function testBookRFIDScan() {
  const bookCheckboxes = document.querySelectorAll(".book-checkbox");
  if (bookCheckboxes.length === 0) {
    showAlert("Vui lòng quét thẻ RFID sinh viên trước!", "warning");
    return;
  }

  // Giả lập quét sách ngẫu nhiên
  const randomIndex = Math.floor(Math.random() * bookCheckboxes.length);
  const randomCheckbox = bookCheckboxes[randomIndex];

  if (!randomCheckbox.checked) {
    randomCheckbox.checked = true;
    toggleBookSelection(randomCheckbox);
    showAlert(`Đã quét sách: ${randomCheckbox.dataset.bookName}`, "success");
  } else {
    showAlert("Sách này đã được chọn rồi!", "info");
  }
}

// Hàm load danh sách sách đang mượn của sinh viên (cho modal Mượn sách)
function loadCurrentBorrowedBooks() {
  const studentId = document.getElementById("studentId").value.trim();

  if (!studentId) {
    showNoCurrentBooksMessage();
    return;
  }

  // Giả lập dữ liệu sách đang mượn
  const currentBorrowedBooks = [
    {
      bookName: "Lập trình Java",
      bookId: "BOOK004",
      borrowDate: "2024-01-05",
      returnDate: "2024-01-19",
      status: "Đang mượn",
    },
    {
      bookName: "Cơ sở dữ liệu",
      bookId: "BOOK005",
      borrowDate: "2024-01-12",
      returnDate: "2024-01-26",
      status: "Đang mượn",
    },
  ];

  const tbody = document.getElementById("currentBorrowedBooksTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (currentBorrowedBooks.length === 0) {
    showNoCurrentBooksMessage();
    return;
  }

  currentBorrowedBooks.forEach((book) => {
    const row = document.createElement("tr");
    const statusColor = book.status === "Đang mượn" ? "#4CAF50" : "#FF9800";
    row.innerHTML = `
      <td style="padding:8px;border:1px solid #ddd;font-size:0.85rem;">${book.bookName}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:0.85rem;">${book.bookId}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:0.85rem;text-align:center;">${book.borrowDate}</td>
      <td style="padding:8px;border:1px solid #ddd;font-size:0.85rem;text-align:center;">
        <span style="color:${statusColor};font-weight:600;">${book.status}</span>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Hiển thị bảng và cập nhật số lượng
  showCurrentBooksTable();
  document.getElementById("currentBorrowCount").textContent =
    currentBorrowedBooks.length;
}

// Hàm hiển thị thông báo chưa có sách đang mượn
function showNoCurrentBooksMessage() {
  const noCurrentMessage = document.getElementById("noCurrentBooksMessage");
  const booksTable = document.getElementById("currentBorrowedBooksTable");
  const bookCount = document.getElementById("borrowBookCount");

  if (noCurrentMessage) noCurrentMessage.style.display = "flex";
  if (booksTable) booksTable.style.display = "none";
  if (bookCount) bookCount.style.display = "none";
}

// Hàm hiển thị bảng sách đang mượn
function showCurrentBooksTable() {
  const noCurrentMessage = document.getElementById("noCurrentBooksMessage");
  const booksTable = document.getElementById("currentBorrowedBooksTable");
  const bookCount = document.getElementById("borrowBookCount");

  if (noCurrentMessage) noCurrentMessage.style.display = "none";
  if (booksTable) booksTable.style.display = "table";
  if (bookCount) bookCount.style.display = "flex";
}

// Hàm thêm sách vào danh sách sẽ mượn
function addToNewBorrowBooks(bookData) {
  const newBorrowItems = document.getElementById("newBorrowBooksItems");
  const existingItem = document.getElementById(`new-borrow-${bookData.bookId}`);

  if (existingItem) return; // Đã tồn tại

  const item = document.createElement("div");
  item.id = `new-borrow-${bookData.bookId}`;
  item.style.cssText = `
    display:flex;justify-content:space-between;align-items:center;padding:8px;margin-bottom:6px;
    background:rgba(33,150,243,0.1);border:1px solid rgba(33,150,243,0.3);border-radius:6px;
    transition:all 0.3s;
  `;

  item.innerHTML = `
    <div style="flex:1;">
      <div style="font-weight:600;font-size:0.85rem;color:#2196F3;">${bookData.bookName}</div>
      <div style="font-size:0.75rem;color:#666;">ID: ${bookData.bookId} | Mượn: ${bookData.borrowDate}</div>
    </div>
    <button onclick="removeFromNewBorrowBooks('${bookData.bookId}')" style="background:none;border:none;color:#f44336;cursor:pointer;padding:4px;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="Xóa sách">
      <ion-icon name="close-circle" style="font-size:1.2rem;"></ion-icon>
    </button>
  `;

  newBorrowItems.appendChild(item);

  // Hiển thị danh sách sẽ mượn
  showNewBorrowBooksList();
  updateNewBorrowCount();
  updateBorrowButton();
}

// Hàm xóa sách khỏi danh sách sẽ mượn
function removeFromNewBorrowBooks(bookId) {
  const item = document.getElementById(`new-borrow-${bookId}`);
  if (item) {
    item.remove();
  }

  // Ẩn danh sách nếu không còn sách nào
  const newBorrowItems = document.getElementById("newBorrowBooksItems");
  if (newBorrowItems.children.length === 0) {
    hideNewBorrowBooksList();
  }

  updateNewBorrowCount();
  updateBorrowButton();
}

// Hàm hiển thị danh sách sẽ mượn
function showNewBorrowBooksList() {
  const noNewMessage = document.getElementById("noNewBooksMessage");
  const newBorrowList = document.getElementById("newBorrowBooksList");

  if (noNewMessage) noNewMessage.style.display = "none";
  if (newBorrowList) newBorrowList.style.display = "block";
}

// Hàm ẩn danh sách sẽ mượn
function hideNewBorrowBooksList() {
  const noNewMessage = document.getElementById("noNewBooksMessage");
  const newBorrowList = document.getElementById("newBorrowBooksList");

  if (noNewMessage) noNewMessage.style.display = "flex";
  if (newBorrowList) newBorrowList.style.display = "none";
}

// Hàm xóa tất cả sách sẽ mượn
function clearAllNewBorrow() {
  const newBorrowItems = document.getElementById("newBorrowBooksItems");
  if (newBorrowItems) {
    newBorrowItems.innerHTML = "";
  }

  hideNewBorrowBooksList();
  updateNewBorrowCount();
  updateBorrowButton();
}

// Hàm cập nhật số lượng sách sẽ mượn
function updateNewBorrowCount() {
  const newBorrowItems = document.getElementById("newBorrowBooksItems");
  const count = newBorrowItems ? newBorrowItems.children.length : 0;

  document.getElementById("newBorrowCount").textContent = count;
  document.getElementById("totalBorrowCount").textContent = count;
}

// Hàm cập nhật trạng thái nút mượn sách
function updateBorrowButton() {
  const borrowBtn = document.getElementById("borrowSelectedBtn");
  const validationMsg = document.getElementById("borrowValidationMessage");
  const count = parseInt(document.getElementById("newBorrowCount").textContent);

  if (count > 0) {
    if (validationMsg) validationMsg.style.display = "none";
  } else {
    if (validationMsg) validationMsg.style.display = "block";
  }
}

// Hàm test quét RFID sinh viên cho modal Mượn sách
function testBorrowRFIDScan() {
  const testData = {
    name: "Nguyễn Văn B",
    id: "STU002",
    mssv: "B20DCCN002",
  };

  // Điền thông tin sinh viên
  document.getElementById("studentName").value = testData.name;
  document.getElementById("studentId").value = testData.id;
  document.getElementById("mssv").value = testData.mssv;

  // Load danh sách sách đang mượn
  loadCurrentBorrowedBooks();

  showAlert("Đã quét thẻ RFID sinh viên thành công!", "success");
}

// Hàm test quét RFID sách cho modal Mượn sách
function testBookBorrowRFIDScan() {
  const studentId = document.getElementById("studentId").value.trim();
  if (!studentId) {
    showAlert("Vui lòng quét thẻ RFID sinh viên trước!", "warning");
    return;
  }

  // Giả lập quét sách mới và tự động thêm vào form
  const newBookData = {
    bookName: "Lập trình Python",
    bookId: "BOOK006",
  };

  // Tự động thêm row sách mới
  addBookRow();

  // Điền thông tin sách vào row cuối cùng
  const bookRows = document.querySelectorAll(".book-row");
  const lastRow = bookRows[bookRows.length - 1];

  if (lastRow) {
    const bookIdInput = lastRow.querySelector('input[name="bookId"]');
    const bookNameInput = lastRow.querySelector('input[name="bookName"]');

    if (bookIdInput && bookNameInput) {
      bookIdInput.value = newBookData.bookId;
      bookNameInput.value = newBookData.bookName;

      // Trigger blur event để cập nhật UI
      bookIdInput.blur();
      bookNameInput.blur();
    }
  }

  showAlert(`Đã quét sách: ${newBookData.bookName}`, "success");
}

// Hàm xử lý trả sách
function returnBook(bookId, bookName) {
  if (confirm("Xác nhận trả sách?\n\nSách: " + bookName + "\nID: " + bookId)) {
    showAlert(
      "Đã trả sách thành công!\n\nSách: " +
        bookName +
        "\nID: " +
        bookId +
        "\nNgày trả: " +
        new Date().toLocaleDateString("vi-VN"),
      "success"
    );

    // Reload danh sách sau khi trả sách
    loadBorrowedBooks();
  }
}

// Hàm xử lý submit form trả sách
function submitReturnBookForm(event) {
  event.preventDefault();

  const studentName = document.getElementById("returnStudentName").value;
  const studentId = document.getElementById("returnStudentId").value;
  const mssv = document.getElementById("returnMssv").value;

  if (!studentName || !studentId || !mssv) {
    showAlert("Vui lòng điền đầy đủ thông tin sinh viên!", "error");
    return;
  }

  const selectedItems = document.getElementById("selectedBooksItems");
  const selectedCount = selectedItems ? selectedItems.children.length : 0;

  if (selectedCount === 0) {
    showAlert("Vui lòng chọn ít nhất một cuốn sách để trả!", "warning");
    return;
  }

  // Lấy danh sách sách đã chọn
  const selectedBooks = [];
  const selectedElements = selectedItems.children;
  for (let i = 0; i < selectedElements.length; i++) {
    const element = selectedElements[i];
    const bookName = element.querySelector("div div").textContent;
    const bookId = element
      .querySelector("div div:last-child")
      .textContent.split("ID: ")[1]
      .split(" |")[0];
    selectedBooks.push({ bookId, bookName });
  }

  // Hiển thị thông báo xác nhận
  const bookList = selectedBooks
    .map((book) => `• ${book.bookName} (${book.bookId})`)
    .join("\n");
  const confirmMessage = `Xác nhận trả ${selectedCount} cuốn sách?\n\nSinh viên: ${studentName} (${mssv})\n\nSách sẽ trả:\n${bookList}`;

  if (confirm(confirmMessage)) {
    // Giả lập trả sách thành công
    showAlert(
      `Đã trả thành công ${selectedCount} cuốn sách!\n\nSinh viên: ${studentName}\nNgày trả: ${new Date().toLocaleDateString(
        "vi-VN"
      )}`,
      "success"
    );

    // Reset form
    resetReturnForm();
  }
}

// Hàm hiển thị form trả sách
function openReturnBookForm() {
  const modal = document.getElementById("returnBookModal");
  if (modal) {
    modal.style.display = "flex";

    // Reset form về trạng thái ban đầu
    resetReturnForm();
  }
}

// Hàm reset form trả sách về trạng thái ban đầu
function resetReturnForm() {
  // Reset thông tin sinh viên
  document.getElementById("returnStudentName").value = "";
  document.getElementById("returnStudentId").value = "";
  document.getElementById("returnMssv").value = "";

  // Hiển thị placeholder và ẩn bảng dữ liệu
  showNoBooksMessage();

  // Focus vào field đầu tiên để sẵn sàng quét RFID
  setTimeout(() => {
    document.getElementById("returnStudentId").focus();
  }, 100);
}

// Hàm hiển thị thông báo chưa có dữ liệu
function showNoBooksMessage() {
  const noBooksMessage = document.getElementById("noBooksMessage");
  const booksTable = document.getElementById("returnBooksTable");
  const bookCountReturn = document.getElementById("bookCountReturn");

  if (noBooksMessage) noBooksMessage.style.display = "flex";
  if (booksTable) booksTable.style.display = "none";
  if (bookCountReturn) bookCountReturn.style.display = "none";
}

// Hàm hiển thị bảng dữ liệu sách
function showBooksTable() {
  const noBooksMessage = document.getElementById("noBooksMessage");
  const booksTable = document.getElementById("returnBooksTable");
  const bookCountReturn = document.getElementById("bookCountReturn");

  if (noBooksMessage) noBooksMessage.style.display = "none";
  if (booksTable) booksTable.style.display = "table";
  if (bookCountReturn) bookCountReturn.style.display = "flex";
}

// Hàm đóng form trả sách
function closeReturnBookForm() {
  const modal = document.getElementById("returnBookModal");
  if (modal) {
    modal.style.display = "none";
  }

  const form = document.getElementById("returnBookForm");
  if (form) {
    form.reset();
  }
}

// Hàm test RFID scan (demo)
function testRFIDScan() {
  const testData = {
    name: "Nguyễn Văn A",
    id: "STU001",
    mssv: "B20DCCN001",
  };

  simulateRFIDScan(testData);
}

// Export functions for global access
window.showSection = showSection;
window.togglePasswordVisibility = togglePasswordVisibility;
window.updateCurrentTime = updateCurrentTime;
window.closeBorrowForm = closeBorrowForm;
window.addBookRow = addBookRow;
window.removeBookRow = removeBookRow;
window.loadInfoData = loadInfoData;
window.openReturnBookForm = openReturnBookForm;
window.closeReturnBookForm = closeReturnBookForm;
window.loadBorrowedBooks = loadBorrowedBooks;
window.returnBook = returnBook;
window.submitReturnBookForm = submitReturnBookForm;
window.resetReturnForm = resetReturnForm;
window.showNoBooksMessage = showNoBooksMessage;
window.showBooksTable = showBooksTable;
window.simulateRFIDScan = simulateRFIDScan;
window.testRFIDScan = testRFIDScan;
window.toggleAllBooks = toggleAllBooks;
window.toggleBookSelection = toggleBookSelection;
window.addToSelectedBooks = addToSelectedBooks;
window.removeFromSelectedBooks = removeFromSelectedBooks;
window.showSelectedBooksList = showSelectedBooksList;
window.hideSelectedBooksList = hideSelectedBooksList;
window.clearAllSelected = clearAllSelected;
window.updateSelectedCount = updateSelectedCount;
window.updateReturnButton = updateReturnButton;
window.testBookRFIDScan = testBookRFIDScan;
window.loadCurrentBorrowedBooks = loadCurrentBorrowedBooks;
window.showNoCurrentBooksMessage = showNoCurrentBooksMessage;
window.showCurrentBooksTable = showCurrentBooksTable;
window.addToNewBorrowBooks = addToNewBorrowBooks;
window.removeFromNewBorrowBooks = removeFromNewBorrowBooks;
window.showNewBorrowBooksList = showNewBorrowBooksList;
window.hideNewBorrowBooksList = hideNewBorrowBooksList;
window.clearAllNewBorrow = clearAllNewBorrow;
window.updateNewBorrowCount = updateNewBorrowCount;
window.updateBorrowButton = updateBorrowButton;
window.testBorrowRFIDScan = testBorrowRFIDScan;
window.testBookBorrowRFIDScan = testBookBorrowRFIDScan;
