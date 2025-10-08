import { db } from '.././firebase.js';
import { doc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Hàm load profile sinh viên (realtime)
function loadStudentProfile() {
  const iduser = localStorage.getItem("iduser");
  if (!iduser) {
    alert("❌ Không tìm thấy thông tin sinh viên. Vui lòng đăng nhập lại!");
    window.location.href = "../../index.html";
    return;
  }

  const userDocRef = doc(db, "users", iduser);
  // Realtime subscribe
  onSnapshot(userDocRef, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const nameEl = document.getElementById("studentName");
    const idEl = document.getElementById("studentId");
    const classEl = document.getElementById("studentClass");
    const statusEl = document.getElementById("studentStatus");
    const emailEl = document.getElementById("studentEmail");
    if (nameEl) nameEl.innerText = data.username || "Chưa có tên";
    if (idEl) idEl.innerText = data.mssv || data.iduser || iduser || "";
    if (classEl) classEl.innerText = data.class || "Chưa có lớp";
    if (statusEl) statusEl.innerText = data.active === false ? "Không hoạt động" : "Đang hoạt động";
    if (emailEl) emailEl.innerText = data.email || data.gmail || "Chưa có email";
    window.studentProfileLoaded = true;
  }, async () => {
    // fallback one-shot
    try {
      const s = await getDoc(userDocRef);
      if (!s.exists()) return;
      const d = s.data();
      const nameEl = document.getElementById("studentName");
      const idEl = document.getElementById("studentId");
      const classEl = document.getElementById("studentClass");
      const statusEl = document.getElementById("studentStatus");
      const emailEl = document.getElementById("studentEmail");
      if (nameEl) nameEl.innerText = d.username || "Chưa có tên";
      if (idEl) idEl.innerText = d.mssv || d.iduser || iduser || "";
      if (classEl) classEl.innerText = d.class || "Chưa có lớp";
      if (statusEl) statusEl.innerText = d.active === false ? "Không hoạt động" : "Đang hoạt động";
      if (emailEl) emailEl.innerText = d.email || d.gmail || "Chưa có email";
    } catch {}
  });
}

// Khởi tạo sớm để hiển thị nhanh
document.addEventListener("DOMContentLoaded", loadStudentProfile);
window.loadStudentProfile = loadStudentProfile;